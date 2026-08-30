import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { triggerBookingNotification } from '@/lib/notifications';
import { getIstWeekday, istDateTimeToUtc, writeAuditLog } from '@/lib/booking-utils';

export async function POST(req: Request) {
  try {
    const { booking_id, start_time, end_time } = await req.json();

    if (!booking_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid dates.' }, { status: 400 });
    }

    const now = new Date();
    if (start.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'Cannot reschedule to a past time slot.' }, { status: 400 });
    }

    const bookingRef = adminDb.collection('bookings').doc(booking_id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const b = bookingSnap.data() || {};
    if (b.status === 'completed' || b.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot reschedule a ${b.status} session.` }, { status: 400 });
    }

    const oldStart = new Date(b.start_time);
    
    // 48-hour restriction check
    const timeDiff = oldStart.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    if (hoursDiff <= 48) {
      return NextResponse.json({ error: 'Rescheduling is unavailable. Your session is within 48 hours of the scheduled time.' }, { status: 400 });
    }

    const oldEnd = new Date(b.end_time || (oldStart.getTime() + 30 * 60_000));
    if (oldEnd.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'Cannot reschedule an already completed or past session.' }, { status: 400 });
    }

    // If it's a somatic package session, verify the new slot is within the 30-day package window
    if (b.user_id && b.is_somatic_plan) {
      // Find package
      const pkgSnap = await adminDb.collection('somatic_packages')
        .where('user_id', '==', b.user_id)
        .where('status', '==', 'active')
        .get();
      if (!pkgSnap.empty) {
        const pkg = pkgSnap.docs[0].data();
        if (start > new Date(pkg.expiry_date)) {
          return NextResponse.json({ error: 'Selected reschedule slot exceeds your 30-day package validity period.' }, { status: 400 });
        }
        if (start < new Date(pkg.start_date)) {
          return NextResponse.json({ error: 'Selected reschedule slot is before the package start date.' }, { status: 400 });
        }
      }
    }

    // Determine lock IDs
    const formatterDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
    const formatterTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' });

    // Format helper to YYYY-MM-DD
    const getIstDateString = (d: Date) => {
      const offset = 5.5 * 60 * 60_000;
      const istDate = new Date(d.getTime() + offset);
      return istDate.toISOString().split('T')[0];
    };

    const getIstTimeString = (d: Date) => {
      const offset = 5.5 * 60 * 60_000;
      const istDate = new Date(d.getTime() + offset);
      const hours = String(istDate.getUTCHours()).padStart(2, '0');
      const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const oldDateStr = getIstDateString(oldStart);
    const oldTimeStr = getIstTimeString(oldStart);
    const oldLockId = `${oldDateStr}_${oldTimeStr.replace(':', '-')}`;

    const newDateStr = getIstDateString(start);
    const newTimeStr = getIstTimeString(start);
    const newLockId = `${newDateStr}_${newTimeStr.replace(':', '-')}`;

    const oldLockRef = adminDb.collection('session_locks').doc(oldLockId);
    const newLockRef = adminDb.collection('session_locks').doc(newLockId);

    // Verify target slot is not locked in session_slots
    const weekday = getIstWeekday(newDateStr);
    const slotsSnap = await adminDb.collection('session_slots')
      .where('day_of_week', '==', weekday)
      .where('start_time', '==', newTimeStr)
      .get();
    if (!slotsSnap.empty) {
      const slotData = slotsSnap.docs[0].data();
      if (slotData && slotData.locked === true) {
        return NextResponse.json({ error: 'This slot is currently unavailable.' }, { status: 400 });
      }
    }

    try {
      await adminDb.runTransaction(async (transaction) => {
        // Read lock document of new slot to ensure it is not booked
        const newLockDoc = await transaction.get(newLockRef);
        if (newLockDoc.exists) {
          const lData = newLockDoc.data();
          if (lData && lData.booking_id && lData.booking_id !== booking_id) {
            const linkedBookingRef = adminDb.collection('bookings').doc(lData.booking_id);
            const linkedBooking = await transaction.get(linkedBookingRef);
            if (linkedBooking.exists) {
              const bStatus = linkedBooking.data()?.status;
              if (bStatus !== 'cancelled' && bStatus !== 'rejected') {
                throw new Error('SLOT_TAKEN');
              }
            }
          }
        }

        // Release old lock
        transaction.delete(oldLockRef);

        // Claim new lock
        transaction.set(newLockRef, {
          booking_id,
          status: 'rescheduled',
          start_time: start.toISOString(),
          created_at: new Date().toISOString()
        });

        // Update booking document details
        const timeline = b.status_timeline || [];
        const updatedTimeline = [
          ...timeline,
          {
            status: 'rescheduled',
            timestamp: new Date().toISOString(),
            updated_by: 'User',
            note: `Rescheduled from ${oldStart.toLocaleString()} to ${start.toLocaleString()}`
          }
        ];

        const rescheduleHistory = b.reschedule_history || [];
        const updatedRescheduleHistory = [
          ...rescheduleHistory,
          {
            old_start_time: b.start_time,
            old_end_time: b.end_time || null,
            new_start_time: start.toISOString(),
            new_end_time: end.toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        transaction.update(bookingRef, {
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'rescheduled',
          rescheduled_at: new Date().toISOString(),
          status_timeline: updatedTimeline,
          reschedule_history: updatedRescheduleHistory,
          updated_at: new Date().toISOString()
        });
      });
    } catch (txError: any) {
      if (txError.message === 'SLOT_TAKEN') {
        return NextResponse.json({ error: 'This slot is already booked. Please choose another slot.' }, { status: 409 });
      }
      throw txError;
    }

    // Trigger reschedule notifications and log audit info in the background
    const updatedBooking = {
      ...b,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed'
    };

    writeAuditLog('Booking Rescheduled', 'User', { 
      bookingId: booking_id, 
      clientName: b.client_name, 
      oldStart: b.start_time,
      newStart: start.toISOString()
    }).catch((err) => console.error('[Background Audit Error]:', err));

    triggerBookingNotification(booking_id, updatedBooking, 'meeting_updated')
      .catch((err) => console.error('[Background Notification Trigger Error]:', err));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Reschedule API error:', error);
    return NextResponse.json({ error: 'Reschedule request failed.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { queueNotification } from '@/lib/notifications/notification-service';

const WINDOW_TOLERANCE_MINUTES = 15; // ± minutes tolerance

export async function GET(req: Request) {
  try {
    // Secure the cron endpoint in production
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // 1. Fetch global settings (meeting link fallback and dynamic reminder window)
    let defaultMeetLink = '';
    let reminderHours = 24;
    const globalSettingsSnap = await getDoc(doc(db, 'settings', 'global'));
    if (globalSettingsSnap.exists()) {
      const gData = globalSettingsSnap.data();
      defaultMeetLink = gData.google_meet_link || '';
      reminderHours = Number(gData.reminder_hours_before) || 24;
    }

    // Dynamic reminder windows:
    // 1. Dynamic Configured window (e.g. 24h, 2h, etc)
    // 2. Final 30-minute reminder
    const activeReminderWindows = [
      { key: `reminder_sent_dyn_${reminderHours}h`, minutes: reminderHours * 60, label: `${reminderHours}h` },
      { key: 'reminder_sent_30m',                   minutes: 30,                 label: '30m' }
    ];

    // 2. Fetch all confirmed/booked/rescheduled bookings
    const q = query(collection(db, 'bookings'), where('status', 'in', ['confirmed', 'booked', 'rescheduled']));
    const snap = await getDocs(q);

    const now = new Date();
    const sentCount: any[] = [];

    for (const bookingDoc of snap.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      const startTime = new Date(booking.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      const endTime = new Date(booking.end_time || (startTime.getTime() + 60 * 60_000));
      if (now > endTime) {
        // Session has ended. Auto-complete it.
        try {
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          console.log(`[Remind-Cron] Auto-completed past booking ${bookingId}`);

          // Find if this booking is linked to a somatic package and increment progress
          const pkgQuery = query(
            collection(db, 'somatic_packages'),
            where('booking_ids', 'array-contains', bookingId)
          );
          const pkgSnap = await getDocs(pkgQuery);
          if (!pkgSnap.empty) {
            const pkgDoc = pkgSnap.docs[0];
            const pkgData = pkgDoc.data();
            const nextCompleted = (pkgData.completed_sessions || 0) + 1;
            const totalSess = pkgData.total_sessions || 4;
            const updates: Record<string, any> = {
              completed_sessions: nextCompleted,
              remaining_sessions: Math.max(0, totalSess - nextCompleted),
              updated_at: new Date().toISOString()
            };
            if (nextCompleted >= totalSess) {
              updates.status = 'completed';
            }
            await updateDoc(doc(db, 'somatic_packages', pkgDoc.id), updates);
            console.log(`[Remind-Cron] Incremented completed sessions on package ${pkgDoc.id}`);
          }
        } catch (err) {
          console.error(`[Remind-Cron] Failed auto-completion for ${bookingId}:`, err);
        }
        continue;
      }

      // Skip past sessions
      if (diffMinutes <= 0) continue;

      const { client_name, client_email, client_phone, service_title, user_id } = booking;
      const meetLink = booking.meeting_link || defaultMeetLink;

      const formatterDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', dateStyle: 'medium',
      });
      const formatterTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', timeStyle: 'short',
      });
      const dateStr = formatterDate.format(startTime);
      const timeStr = formatterTime.format(startTime);

      const updates: Record<string, any> = {};

      for (const window of activeReminderWindows) {
        // Already sent for this window?
        if (booking[window.key]) continue;

        // Is the session within this window (±tolerance)?
        const windowMin = window.minutes - WINDOW_TOLERANCE_MINUTES;
        const windowMax = window.minutes + WINDOW_TOLERANCE_MINUTES;
        if (diffMinutes < windowMin || diffMinutes > windowMax) continue;

        // Fire reminder notification
        try {
          await queueNotification(
            'booking_reminder',
            client_email,
            client_phone || null,
            {
              memberName: client_name,
              sessionDate: dateStr,
              sessionTime: timeStr,
              bookingId,
              bookingStatus: 'confirmed',
              meetLink,
              window: window.label,
            },
            bookingId,
            user_id || undefined
          );

          updates[window.key] = true;
          updates[`${window.key}_at`] = new Date().toISOString();

          sentCount.push({
            bookingId,
            window: window.label,
            client: client_name,
            email: client_email,
            phone: client_phone,
          });

          console.log(`[Remind-Cron] Fired ${window.label} reminder for booking ${bookingId} (${client_name})`);
        } catch (err) {
          console.error(`[Remind-Cron] Failed ${window.label} reminder for ${bookingId}:`, err);
        }
      }

      // Batch update booking document with reminder flags
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'bookings', bookingId), updates).catch((err) =>
          console.error(`[Remind-Cron] Failed to update booking ${bookingId}:`, err)
        );
      }
    }

    // 2.5 Expiration Sweep for active packages
    const activePackagesQuery = query(
      collection(db, 'somatic_packages'),
      where('status', '==', 'active')
    );
    const activePackagesSnap = await getDocs(activePackagesQuery);
    let expiredPackagesCount = 0;

    for (const pkgDoc of activePackagesSnap.docs) {
      const pkgData = pkgDoc.data();
      const expiryTime = new Date(pkgData.expiry_date).getTime();
      if (Date.now() > expiryTime) {
        await updateDoc(doc(db, 'somatic_packages', pkgDoc.id), {
          status: 'expired',
          updated_at: new Date().toISOString()
        });

        // Cancel future booked bookings belonging to this package that fall past expiry
        if (pkgData.booking_ids) {
          for (const bId of pkgData.booking_ids) {
            const bRef = doc(db, 'bookings', bId);
            const bSnap = await getDoc(bRef);
            if (bSnap.exists()) {
              const bData = bSnap.data();
              if (['confirmed', 'booked', 'rescheduled'].includes(bData.status) && new Date(bData.start_time).getTime() > expiryTime) {
                await updateDoc(bRef, {
                  status: 'expired',
                  expired_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                console.log(`[Remind-Cron] Marked booking ${bId} as EXPIRED due to package expiry.`);
              }
            }
          }
        }
        expiredPackagesCount++;
        console.log(`[Remind-Cron] Expired active package ${pkgDoc.id} due to expiry date.`);
      }
    }

    // 3. Expiration Cleanup for Pending Unpaid bookings older than 15 minutes
    const expirationLimit = new Date(now.getTime() - 15 * 60 * 1000);
    const pendingQuery = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending'),
      where('payment_status', '==', 'unpaid')
    );
    const pendingSnap = await getDocs(pendingQuery);
    let expiredCount = 0;

    for (const pendingDoc of pendingSnap.docs) {
      const pData = pendingDoc.data();
      const pId = pendingDoc.id;
      const createdAtTime = pData.created_at ? new Date(pData.created_at) : new Date(pData.start_time);
      
      if (createdAtTime < expirationLimit) {
        let expiredSuccessfully = false;
        const timeline = pData.status_timeline || [];
        const updatedTimeline = [
          ...timeline,
          {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            updated_by: 'System',
            note: 'Booking expired because payment was not completed'
          }
        ];
        const updatedBooking = {
          status: 'cancelled',
          status_timeline: updatedTimeline,
          updated_at: new Date().toISOString()
        };

        try {
          await runTransaction(db, async (transaction) => {
            const docRef = doc(db, 'bookings', pId);
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists()) return;
            const currentData = docSnap.data();
            if (currentData.status === 'pending' && currentData.payment_status === 'unpaid') {
              transaction.update(docRef, updatedBooking);
              expiredSuccessfully = true;
            }
          });
        } catch (err) {
          console.error(`[Remind-Cron] Transaction failed for expiring booking ${pId}:`, err);
        }

        if (expiredSuccessfully) {
          try {
            const { triggerBookingNotification } = await import('@/lib/notifications');
            await triggerBookingNotification(pId, { ...pData, ...updatedBooking }, 'cancelled');
          } catch (err) {
            console.error(`[Remind-Cron] Failed to trigger notification for expired booking ${pId}:`, err);
          }

          expiredCount++;
          console.log(`[Remind-Cron] Expired unpaid booking ${pId} (created at ${createdAtTime.toISOString()})`);
        }
      }
    }

    console.log(`[Remind-Cron] Done. ${sentCount.length} reminder(s) dispatched. ${expiredCount} booking(s) expired.`);
    return NextResponse.json({ ok: true, sentReminders: sentCount, expiredBookingsCount: expiredCount });
  } catch (err: any) {
    console.error('[Remind-Cron] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

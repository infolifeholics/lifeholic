import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';
import { getIstWeekday, istDateTimeToUtc, writeAuditLog } from '@/lib/booking-utils';

import { rateLimiter, getIpFromRequest } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getIpFromRequest(req);
    const limitCheck = rateLimiter(ip, { limit: 15, windowMs: 60 * 1000 });
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      service_id,
      client_name,
      client_email,
      client_phone,
      client_timezone,
      start_time,
      end_time,
      mode,
      notes,
      amount,
      currency,
      user_id,
      category,
      subcategory,
      problems,
      summary,
      is_somatic_plan,
      somatic_plan_name,
    } = body || {};

    const isSomatic = is_somatic_plan === true;

    if (isSomatic) {
      if (!somatic_plan_name || !client_name || !client_email || !start_time || !end_time || !mode) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }
    } else {
      if (!service_id || !client_name || !client_email || !start_time || !end_time || !mode) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!['online', 'offline'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }

    let service: any;
    if (isSomatic) {
      // Setup dynamic virtual service for somatic plan
      let duration = 60;
      if (somatic_plan_name.toLowerCase().includes('essential')) duration = 30;
      if (somatic_plan_name.toLowerCase().includes('elite')) duration = 90;
      
      service = {
        title: somatic_plan_name,
        duration_minutes: duration,
        mode: 'both',
      };
    } else {
      // Verify the service exists
      const serviceDoc = await getDoc(doc(db, 'services', service_id));
      if (!serviceDoc.exists()) {
        return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
      }
      service = serviceDoc.data();
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid times.' }, { status: 400 });
    }
    const expectedDuration = (end.getTime() - start.getTime()) / 60_000;
    if (Math.abs(expectedDuration - service.duration_minutes) > 1) {
      return NextResponse.json({ error: 'Session duration mismatch.' }, { status: 400 });
    }
    if (!isSomatic && ((service.mode === 'online' && mode === 'offline') || (service.mode === 'offline' && mode === 'online'))) {
      return NextResponse.json({ error: 'Mode not available for this service.' }, { status: 400 });
    }

    // Fetch all active healers
    const healersRef = collection(db, 'healers');
    const healersSnap = await getDocs(query(healersRef, where('active', '==', true)));
    const healers = healersSnap.docs.map((d) => d.data());
    
    // Filter by service support
    const assignedHealers = healers.filter((h) => h.services && h.services.includes(service_id));

    let assignedHealerId: string | null = null;
    let assignedHealerName: string | null = null;

    if (assignedHealers.length > 0) {
      const selectedDayName = start.toLocaleDateString('en-US', { weekday: 'long' });
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      const slotTimeStr = start.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const availableHealersList = [];

      for (const h of assignedHealers) {
        if (h.leaves && h.leaves.includes(dateString)) continue;
        if (h.working_days && !h.working_days.includes(selectedDayName)) continue;
        if (h.working_hours) {
          if (slotTimeStr < h.working_hours.start || slotTimeStr >= h.working_hours.end) continue;
        }
        if (h.break_time) {
          if (slotTimeStr >= h.break_time.start && slotTimeStr < h.break_time.end) continue;
        }

        const qHealerClash = query(
          collection(db, 'bookings'),
          where('healer_id', '==', h.id),
          where('start_time', '==', start.toISOString()),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const healerClashSnap = await getDocs(qHealerClash);
        if (!healerClashSnap.empty) continue;

        const qDailyBookings = query(
          collection(db, 'bookings'),
          where('healer_id', '==', h.id),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const dailySnap = await getDocs(qDailyBookings);
        const dailyCount = dailySnap.docs.filter((d) => {
          const bDate = new Date(d.data().start_time);
          return bDate.toDateString() === start.toDateString();
        }).length;

        if (dailyCount >= (h.max_daily_sessions || 6)) continue;

        availableHealersList.push({ healer: h, dailyCount });
      }

      if (availableHealersList.length === 0) {
        return NextResponse.json({ error: 'No practitioners are available at this time slot.' }, { status: 409 });
      }

      availableHealersList.sort((a, b) => a.dailyCount - b.dailyCount);
      const chosen = availableHealersList[0].healer;
      assignedHealerId = chosen.id;
      assignedHealerName = chosen.name;
    }

    // 1. Prevent booking for past dates
    if (start.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot book sessions in the past.' }, { status: 400 });
    }

    const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const dateStr = formatterDate.format(start); // YYYY-MM-DD
    const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    const timeStr = formatterTime.format(start); // HH:MM
    const weekday = getIstWeekday(dateStr);

    // 2. Prevent same user booking same slot twice
    if (user_id) {
      const userClashSnap = await getDocs(
        query(
          collection(db, 'bookings'),
          where('user_id', '==', user_id),
          where('start_time', '==', start.toISOString()),
          where('status', 'in', ['pending', 'confirmed'])
        )
      );
      if (!userClashSnap.empty) {
        return NextResponse.json({ error: 'You have already booked this session slot.' }, { status: 400 });
      }
    }

    // 3. Retrieve references for slot configuration and holidays to verify inside transaction
    const slotsRef = collection(db, 'session_slots');
    const qSlots = query(slotsRef, where('day_of_week', '==', weekday), where('start_time', '==', timeStr));
    const slotsSnap = await getDocs(qSlots);
    if (slotsSnap.empty) {
      return NextResponse.json({ error: 'This session slot is not configured.' }, { status: 400 });
    }
    const slotDocRef = doc(db, 'session_slots', slotsSnap.docs[0].id);

    const holidaysRef = collection(db, 'holidays');
    const qHolidays = query(holidaysRef, where('date', '==', dateStr));
    const holidaysSnap = await getDocs(qHolidays);
    const holidayDocRefs = holidaysSnap.docs.map(d => doc(db, 'holidays', d.id));

    // 4. Strict transactional check using lock documents to completely prevent double booking
    const lockDocRef = doc(db, 'session_locks', `${dateStr}_${timeStr.replace(':', '-')}`);
    let newBookingId = '';
    let insertedBookingData: any = null;

    try {
      await runTransaction(db, async (transaction) => {
        // Read and verify Slot configuration inside the transaction
        const slotDoc = await transaction.get(slotDocRef);
        if (!slotDoc.exists() || !slotDoc.data()?.active) {
          throw new Error('SLOT_INACTIVE');
        }

        // Read and verify Holiday documents inside the transaction
        for (const ref of holidayDocRefs) {
          const hDoc = await transaction.get(ref);
          if (hDoc.exists()) {
            const hData = hDoc.data();
            if (!hData.start_time || hData.start_time === timeStr) {
              throw new Error('HOLIDAY_BLOCK');
            }
          }
        }

        const lockDoc = await transaction.get(lockDocRef);
        if (lockDoc.exists()) {
          const lockData = lockDoc.data();
          if (lockData && lockData.booking_id) {
            const linkedBookingRef = doc(db, 'bookings', lockData.booking_id);
            const linkedBooking = await transaction.get(linkedBookingRef);
            if (linkedBooking.exists()) {
              const bStatus = linkedBooking.data()?.status;
              if (bStatus !== 'cancelled' && bStatus !== 'rejected') {
                throw new Error('SLOT_TAKEN');
              }
            }
          }
        }

        const initialStatus = body.status || 'pending';
        const initialPaymentStatus = body.payment_status || 'unpaid';

        // Fetch global settings inside the transaction to follow correct order (reads before writes)
        const globalSettingsRef = doc(db, 'settings', 'global');
        const globalSettingsSnap = await transaction.get(globalSettingsRef);
        let meetingLink = null;
        if (globalSettingsSnap.exists()) {
          const gSettings = globalSettingsSnap.data();
          if (gSettings.meeting_provider === 'gmeet' && gSettings.google_meet_link) {
            meetingLink = gSettings.google_meet_link;
          }
        }

        const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';

        // Check if we need to create a Razorpay Order
        let pgOrderId = null;
        const finalCurrency = currency || 'INR';
        const finalAmount = amount ?? 0;
        if (finalAmount > 0) {
          try {
            const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';
            const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
            
            const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
              },
              body: JSON.stringify({
                amount: Math.round(Number(finalAmount) * 100), // paise/cents
                currency: finalCurrency,
              }),
            });

            if (rzpRes.ok) {
              const rzpOrder = await rzpRes.json();
              pgOrderId = rzpOrder.id;
            } else {
              console.error('Razorpay order creation failed for booking:', await rzpRes.text());
            }
          } catch (err) {
            console.error('Error generating Razorpay Order ID for booking:', err);
          }
        }

        const insert: any = {
          service_id: isSomatic ? `somatic_${somatic_plan_name.toLowerCase().replace(/\s+/g, '_')}` : service_id,
          service_title: service.title || 'Therapy Session',
          is_somatic_plan: isSomatic,
          somatic_plan_name: isSomatic ? somatic_plan_name : null,
          user_id: user_id || null,
          client_name,
          client_email,
          client_phone: client_phone || null,
          client_timezone: client_timezone || 'Asia/Kolkata',
          client_country: clientCountry,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          mode,
          status: initialStatus,
          payment_status: initialPaymentStatus,
          amount: finalAmount,
          currency: finalCurrency,
          notes: notes || null,
          category: category || null,
          subcategory: subcategory || null,
          problems: problems || null,
          summary: summary || null,
          meeting_link: meetingLink,
          order_id: pgOrderId || null,
          status_timeline: [
            {
              status: initialStatus,
              timestamp: new Date().toISOString(),
              note: 'Booking created'
            }
          ],
          admin_updates: [],
          payment_history: [
            {
              payment_status: initialPaymentStatus,
              timestamp: new Date().toISOString(),
              amount: finalAmount,
              currency: finalCurrency,
            }
          ],
          healer_id: assignedHealerId,
          healer_name: assignedHealerName,
          created_at: new Date().toISOString(),
        };

        const newBookingRef = doc(collection(db, 'bookings'));
        newBookingId = newBookingRef.id;

        transaction.set(newBookingRef, insert);
        transaction.set(lockDocRef, {
          booking_id: newBookingId,
          status: initialStatus,
          start_time: start.toISOString(),
          created_at: new Date().toISOString()
        });

        insertedBookingData = insert;
      });
    } catch (txError: any) {
      if (txError.message === 'SLOT_TAKEN') {
        return NextResponse.json({ error: 'This slot is already booked. Please choose another slot.' }, { status: 409 });
      }
      if (txError.message === 'SLOT_INACTIVE') {
        return NextResponse.json({ error: 'This session slot is inactive.' }, { status: 400 });
      }
      if (txError.message === 'HOLIDAY_BLOCK') {
        return NextResponse.json({ error: 'Cannot book: Marked as holiday.' }, { status: 400 });
      }
      console.error('Transaction error:', txError);
      return NextResponse.json({ error: 'Double booking detected or transaction failed.' }, { status: 500 });
    }

    // Trigger Notification outside transaction (since it relies on network calls)
    if (insertedBookingData && newBookingId) {
      try {
        await writeAuditLog('Booking Created', 'User', { bookingId: newBookingId, clientName: insertedBookingData.client_name, start_time: insertedBookingData.start_time });
        await triggerBookingNotification(newBookingId, insertedBookingData, 'created');
      } catch (err) {
        console.error('[Notification Trigger/Audit Error]:', err);
      }
    }

    return NextResponse.json({ ok: true, id: newBookingId });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

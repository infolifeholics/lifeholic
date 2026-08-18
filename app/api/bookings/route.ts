import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';
import { getIstWeekday, istDateTimeToUtc, writeAuditLog } from '@/lib/booking-utils';

import { rateLimiter, getIpFromRequest } from '@/lib/rate-limit';

import { z } from 'zod';

const bookingBodySchema = z.object({
  service_id: z.string().optional().nullable(),
  client_name: z.string().min(1),
  client_email: z.string().email(),
  client_phone: z.string().optional().nullable(),
  client_timezone: z.string().optional().nullable(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  mode: z.enum(['online', 'offline']).optional().default('online'),
  notes: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  problems: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  summary: z.string().optional().nullable(),
  is_somatic_plan: z.boolean().optional().nullable(),
  somatic_plan_name: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const ip = getIpFromRequest(req);
    const limitCheck = rateLimiter(ip, { limit: 15, windowMs: 60 * 1000 });
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = bookingBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input parameters.' }, { status: 400 });
    }

    const {
      service_id,
      client_name,
      client_email,
      client_phone,
      client_timezone,
      start_time,
      end_time,
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
    } = parsed.data;

    const isSomatic = is_somatic_plan === true;
    const mode = 'online';

    if (isSomatic) {
      if (!somatic_plan_name || !client_name || !client_email || !start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }
    } else {
      if (!service_id || !client_name || !client_email || !start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }
    }

    const somaticPlanName = somatic_plan_name as string;
    const serviceId = service_id as string;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    let service: any;
    if (isSomatic) {
      // Setup dynamic virtual service for somatic plan
      let duration = 60;
      let friendlyTitle = '4-Week Deep Transformation Program';
      if (somaticPlanName.toLowerCase().includes('essential')) {
        duration = 30;
        friendlyTitle = 'Personal Healing & Clarity Session';
      } else if (somaticPlanName.toLowerCase().includes('elite')) {
        duration = 90;
        friendlyTitle = 'Ancestral Healing Session';
      }
      
      service = {
        title: friendlyTitle,
        duration_minutes: duration,
        mode: 'both',
      };
    } else {
      // Verify the service exists
      const serviceDoc = await getDoc(doc(db, 'services', serviceId));
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

    // Fetch all active healers
    const healersRef = collection(db, 'healers');
    const healersSnap = await getDocs(query(healersRef, where('active', '==', true)));
    const healers = healersSnap.docs.map((d) => d.data());
    
    // Filter by service support
    const assignedHealers = healers.filter((h) => h.services && h.services.includes(serviceId));

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

    let activePkg: any = null;
    let activePkgId: string | null = null;

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

      // Fetch active Somatic Package or Service Package if user is logged in
      try {
        // 1. Try legacy/somatic direct doc ID fetch
        const legacyDoc = await getDoc(doc(db, 'somatic_packages', user_id));
          if (legacyDoc.exists()) {
            const data = legacyDoc.data();
            if (data.status === 'active' && (isSomatic || data.package_type === 'somatic_plan' || data.is_somatic_plan)) {
              activePkg = data;
              activePkgId = legacyDoc.id;
            }
          }

          // 2. Query all active packages for this user
          if (!activePkg) {
            const qPkg = query(
              collection(db, 'somatic_packages'),
              where('user_id', '==', user_id),
              where('status', '==', 'active')
            );
            const pkgSnap = await getDocs(qPkg);
            for (const d of pkgSnap.docs) {
              const data = d.data();
              if (isSomatic && (data.package_type === 'somatic_plan' || data.is_somatic_plan)) {
                activePkg = data;
                activePkgId = d.id;
                break;
              } else if (!isSomatic && data.service_id === serviceId) {
                activePkg = data;
                activePkgId = d.id;
                break;
              }
            }
          }
        } catch (err) {
          console.error('Error querying somatic_packages:', err);
        }
      }

      if (activePkg) {
        const nowTime = Date.now();
        const expiryTime = new Date(activePkg.expiry_date).getTime();

        // 1. Check owner
        if (activePkg.user_id !== user_id) {
          return NextResponse.json({ error: 'Unauthorized package access.' }, { status: 403 });
        }
        // 2. Check expiration
        if (nowTime > expiryTime || activePkg.status === 'expired') {
          return NextResponse.json({ error: 'Your program package has expired.' }, { status: 400 });
        }
        // 3. Check remaining sessions
        if (activePkg.remaining_sessions <= 0) {
          return NextResponse.json({ error: `All ${activePkg.total_sessions} sessions for this package have already been completed or booked.` }, { status: 400 });
        }

        // Get last session status check
        if (activePkg.booking_ids && activePkg.booking_ids.length > 0) {
          const lastBookingId = activePkg.booking_ids[activePkg.booking_ids.length - 1];
          const lastBookingSnap = await getDoc(doc(db, 'bookings', lastBookingId));
          if (lastBookingSnap.exists()) {
            const lastB = lastBookingSnap.data();
            if (lastB.status !== 'completed' && lastB.status !== 'cancelled' && lastB.status !== 'rejected') {
              return NextResponse.json({ error: 'Your current session must be marked as Completed before booking the next slot.' }, { status: 400 });
            }
          }
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

        const isSubsequentBooking = activePkg ? true : false;
        const initialStatus = isSubsequentBooking ? 'confirmed' : (body.status || 'pending');
        const initialPaymentStatus = isSubsequentBooking ? 'paid' : (body.payment_status || 'unpaid');

        // Fetch global settings inside the transaction to follow correct order (reads before writes)
        const globalSettingsRef = doc(db, 'settings', 'global');
        const globalSettingsSnap = await transaction.get(globalSettingsRef);
        let meetingLink = null;
        let usdToInrRate = null;
        if (globalSettingsSnap.exists()) {
          const gSettings = globalSettingsSnap.data();
          if (gSettings.meeting_provider === 'gmeet' && gSettings.google_meet_link) {
            meetingLink = gSettings.google_meet_link;
          }
          if (typeof gSettings.usd_to_inr_rate === 'number' && gSettings.usd_to_inr_rate > 0) {
            usdToInrRate = gSettings.usd_to_inr_rate;
          }
        }

        const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';

        // Calculate and validate finalCurrency and finalAmount on the server side
        const isIndiaCountry = clientCountry === 'IN';
        const isIndiaTz = (client_timezone?.toLowerCase().includes('kolkata') ||
                           client_timezone?.toLowerCase().includes('calcutta') ||
                           client_timezone?.toLowerCase().includes('india'));
        const finalCurrency = (isIndiaCountry || isIndiaTz) ? 'INR' : 'USD';
        
        if (finalCurrency === 'USD' && (!usdToInrRate || isNaN(usdToInrRate))) {
          throw new Error('International payments are currently unavailable. USD to INR exchange rate is not configured by the admin.');
        }

        let calculatedBaseAmount = 0;
        if (!isSubsequentBooking) {
          if (isSomatic) {
            let basePriceInr = 11000;
            const planKey = somaticPlanName?.toLowerCase().includes('essential') ? 'essential' : somaticPlanName?.toLowerCase().includes('elite') ? 'elite' : 'premium';
            const somaticSettingsRef = doc(db, 'settings', 'somatic_plans');
            const somaticSettingsSnap = await transaction.get(somaticSettingsRef);
            if (somaticSettingsSnap.exists()) {
              const sData = somaticSettingsSnap.data();
              basePriceInr = sData[`${planKey}_price_inr`] ?? (planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000);
            } else {
              basePriceInr = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
            }
            calculatedBaseAmount = finalCurrency === 'USD' && usdToInrRate ? Math.round(basePriceInr / usdToInrRate) : basePriceInr;
          } else {
            calculatedBaseAmount = finalCurrency === 'USD' ? (service.price_usd || 0) : (service.price_inr || 0);
          }
        }

        const finalAmount = calculatedBaseAmount;
        let pgOrderId = null;

        // Check somatic package number tracking if user is booking a subsequent session
        let sessionNumber = null;
        let packageSnapForUpdate: any = null;
        if (activePkgId && user_id) {
          const packageRef = doc(db, 'somatic_packages', activePkgId);
          const packageSnap = await transaction.get(packageRef);
          if (packageSnap.exists()) {
            packageSnapForUpdate = packageSnap;
            const pkgData = packageSnap.data();
            const currentBookingCount = (pkgData.booking_ids || []).length;
            sessionNumber = currentBookingCount + 1;
          }
        } else if (isSomatic) {
          sessionNumber = 1;
        } else if (service && (service.included_sessions || 1) > 1) {
          sessionNumber = 1;
        }

        const insert: any = {
          service_id: isSomatic ? `somatic_${somaticPlanName.toLowerCase().replace(/\s+/g, '_')}` : serviceId,
          service_title: service.title || 'Therapy Session',
          is_somatic_plan: isSomatic,
          somatic_plan_name: isSomatic ? somaticPlanName : null,
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
          session_number: sessionNumber,
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

        // Write update to somatic package booking list inside the same transaction
        if (activePkgId && user_id && packageSnapForUpdate && packageSnapForUpdate.exists()) {
          const packageRef = doc(db, 'somatic_packages', activePkgId);
          const pkgData = packageSnapForUpdate.data();
          const currentBookingIds = pkgData.booking_ids || [];
          const totalSess = pkgData.total_sessions || 4;
          const nextBookingIds = [...currentBookingIds, newBookingId];
          const nextRemaining = Math.max(0, totalSess - nextBookingIds.length);
          transaction.update(packageRef, {
            booking_ids: nextBookingIds,
            remaining_sessions: nextRemaining,
            updated_at: new Date().toISOString()
          });
        }

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

    // Trigger Notification outside transaction in the background to return response instantly
    if (insertedBookingData && newBookingId) {
      writeAuditLog('Booking Created', 'User', { 
        bookingId: newBookingId, 
        clientName: insertedBookingData.client_name, 
        start_time: insertedBookingData.start_time 
      }).catch((err) => console.error('[Background Audit Error]:', err));

      triggerBookingNotification(newBookingId, insertedBookingData, 'created')
        .catch((err) => console.error('[Background Notification Error]:', err));
    }

    return NextResponse.json({ ok: true, id: newBookingId });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

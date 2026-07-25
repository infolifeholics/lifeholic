import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
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

    let assignedHealerId = null;
    let assignedHealerName = null;

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

    const bookingsRef = collection(db, 'bookings');
    const qClash = query(
      bookingsRef,
      where('start_time', '==', start.toISOString()),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const clashSnap = await getDocs(qClash);
    if (!clashSnap.empty && assignedHealers.length === 0) {
      // Suggest the next 3 available slots
      const suggestions = [];
      let checkTime = new Date(start.getTime() + service.duration_minutes * 60_000);
      let attempts = 0;
      while (suggestions.length < 3 && attempts < 15) {
        attempts++;
        const mins = checkTime.getMinutes();
        if (mins > 0 && mins < 30) {
          checkTime.setMinutes(30, 0, 0);
        } else if (mins > 30) {
          checkTime.setHours(checkTime.getHours() + 1, 0, 0, 0);
        }
        
        const testStart = checkTime.toISOString();
        const testEnd = new Date(checkTime.getTime() + service.duration_minutes * 60_000).toISOString();
        
        const qTest = query(
          bookingsRef,
          where('start_time', '==', testStart),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const testSnap = await getDocs(qTest);
        if (testSnap.empty) {
          suggestions.push({
            start_time: testStart,
            end_time: testEnd
          });
        }
        checkTime = new Date(checkTime.getTime() + 60 * 60_000);
      }

      return NextResponse.json(
        { 
          error: 'This slot is already booked. Please choose another slot.',
          suggestions 
        },
        { status: 409 }
      );
    }

    const initialStatus = body.status || 'pending';
    const initialPaymentStatus = body.payment_status || 'unpaid';

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
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      mode,
      status: initialStatus,
      payment_status: initialPaymentStatus,
      amount: amount ?? 0,
      currency: currency || 'INR',
      notes: notes || null,
      category: category || null,
      subcategory: subcategory || null,
      problems: problems || null,
      summary: summary || null,
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
          amount: amount ?? 0,
          currency: currency || 'INR',
        }
      ],
      healer_id: assignedHealerId,
      healer_name: assignedHealerName,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(bookingsRef, insert);

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

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
    } = body || {};

    if (!service_id || !client_name || !client_email || !start_time || !end_time || !mode) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!['online', 'offline'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }

    // Verify the service exists
    const serviceDoc = await getDoc(doc(db, 'services', service_id));
    if (!serviceDoc.exists()) {
      return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    }
    const service = serviceDoc.data();

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid times.' }, { status: 400 });
    }
    const expectedDuration = (end.getTime() - start.getTime()) / 60_000;
    if (Math.abs(expectedDuration - service.duration_minutes) > 1) {
      return NextResponse.json({ error: 'Session duration mismatch.' }, { status: 400 });
    }
    if ((service.mode === 'online' && mode === 'offline') || (service.mode === 'offline' && mode === 'online')) {
      return NextResponse.json({ error: 'Mode not available for this service.' }, { status: 400 });
    }

    // Final pre-flight: confirm the slot isn't already taken
    const bookingsRef = collection(db, 'bookings');
    const qClash = query(
      bookingsRef,
      where('service_id', '==', service_id),
      where('start_time', '==', start.toISOString()),
      where('mode', '==', mode),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const clashSnap = await getDocs(qClash);
    if (!clashSnap.empty) {
      return NextResponse.json(
        { error: 'This slot was just taken. Please choose another time.' },
        { status: 409 }
      );
    }

    const insert = {
      service_id,
      service_title: service.title || 'Therapy Session',
      user_id: user_id || null,
      client_name,
      client_email,
      client_phone: client_phone || null,
      client_timezone: client_timezone || 'Asia/Kolkata',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      mode,
      status: 'confirmed',
      payment_status: 'unpaid',
      amount: amount ?? 0,
      currency: currency || 'INR',
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(bookingsRef, insert);

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      workshop_id,
      client_name,
      client_email,
      client_phone,
      client_whatsapp,
      city,
      country,
      notes,
      user_id,
      currency = 'INR',
    } = body;

    if (!workshop_id || !client_name || !client_email || !client_phone) {
      return NextResponse.json({ error: 'Missing mandatory fields.' }, { status: 400 });
    }

    // 1. Fetch workshop details
    const wsRef = doc(db, 'workshops', workshop_id);
    const wsSnap = await getDoc(wsRef);
    if (!wsSnap.exists()) {
      return NextResponse.json({ error: 'Workshop not found.' }, { status: 404 });
    }
    const ws = wsSnap.data();

    // 2. Check seat availability
    const seatsTotal = ws.seats_total || 0;
    const seatsBooked = ws.seats_booked || 0;
    if (seatsBooked >= seatsTotal) {
      return NextResponse.json({ error: 'Workshop is fully booked.' }, { status: 400 });
    }

    // 3. Check registration timeframe
    const nowStr = new Date().toISOString();
    if (ws.registration_start && nowStr < ws.registration_start) {
      return NextResponse.json({ error: 'Registration has not opened yet.' }, { status: 400 });
    }
    if (ws.registration_end && nowStr > ws.registration_end) {
      return NextResponse.json({ error: 'Registration is closed.' }, { status: 400 });
    }

    // 4. Calculate dynamic pricing checking Early Bird
    let finalPrice = currency === 'USD' ? (ws.price_usd || 0) : (ws.price_inr || 0);

    if (ws.offer_expiry && nowStr <= ws.offer_expiry) {
      const earlyBird = currency === 'USD' ? ws.early_bird_price_usd : ws.early_bird_price_inr;
      if (earlyBird !== undefined && earlyBird > 0) {
        finalPrice = earlyBird;
      }
    }

    const regId = 'wreg_' + Math.random().toString(36).substring(7).toUpperCase();
    const orderId = 'order_ws_' + Math.random().toString(36).substring(7).toUpperCase();

    // 5. Save pending registration record
    const regData = {
      id: regId,
      workshop_id,
      workshop_title: ws.title,
      user_id: user_id || 'anonymous',
      client_name,
      client_email,
      client_phone,
      client_whatsapp: client_whatsapp || client_phone,
      city: city || '',
      country: country || '',
      notes: notes || '',
      amount: finalPrice,
      currency,
      payment_status: 'unpaid',
      payment_id: '',
      status: 'pending',
      created_at: new Date().toISOString(),
      order_id: orderId,
    };

    await addDoc(collection(db, 'workshopRegistrations'), regData);

    return NextResponse.json({
      ok: true,
      registration_id: regId,
      order_id: orderId,
      amount: finalPrice,
      currency,
    });
  } catch (error: any) {
    console.error('Workshop registration creation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

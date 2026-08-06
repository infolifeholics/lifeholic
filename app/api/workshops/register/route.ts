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

    // Check coupon code
    let discount = 0;
    if (body.coupon_code) {
      const couponRef = doc(db, 'coupons', body.coupon_code.toUpperCase());
      const couponSnap = await getDoc(couponRef);
      if (!couponSnap.exists()) {
        return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 });
      }
      const coupon = couponSnap.data();
      if (coupon.active === false) {
        return NextResponse.json({ error: 'Coupon is inactive.' }, { status: 400 });
      }
      if (coupon.applicable_to && coupon.applicable_to !== 'all' && coupon.applicable_to !== 'workshops') {
        return NextResponse.json({ error: 'Coupon is not applicable to workshops.' }, { status: 400 });
      }
      // Check expiry
      if (coupon.expiry_date && new Date() > new Date(coupon.expiry_date)) {
        return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 });
      }
      // Check limit
      if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
        return NextResponse.json({ error: 'Sorry, you are late! Coupon usage limit reached.' }, { status: 400 });
      }
      // Calculate discount
      if (coupon.type === 'percent') {
        discount = (finalPrice * (coupon.value || 0)) / 100;
        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }
      } else {
        discount = coupon.value || 0;
      }
      finalPrice = Math.max(0, finalPrice - discount);
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
      coupon_code: body.coupon_code || null,
      discount_amount: discount,
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

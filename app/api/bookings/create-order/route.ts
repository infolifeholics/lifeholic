import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { booking_id, coupon_code } = await req.json();

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    }

    // 1. Fetch booking details
    const bookingRef = doc(db, 'bookings', booking_id);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const b = bookingSnap.data();

    // Fetch global settings to get dynamic exchange rate
    let usdToInrRate = null;
    try {
      const globalSnap = await getDoc(doc(db, 'settings', 'global'));
      if (globalSnap.exists()) {
        const gData = globalSnap.data();
        if (typeof gData.usd_to_inr_rate === 'number' && gData.usd_to_inr_rate > 0) {
          usdToInrRate = gData.usd_to_inr_rate;
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rate in bookings create-order:', err);
    }

    const currency = b.currency || 'INR';

    if (currency === 'USD' && (!usdToInrRate || isNaN(usdToInrRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. USD to INR exchange rate is not configured by the admin.' }, { status: 400 });
    }

    // 2. Fetch the correct service/somatic plan price from the database
    let basePrice = 0;
    const isSomatic = b.is_somatic_plan === true;

    if (isSomatic) {
      let basePriceInr = 11000; // default for premium
      const planName = b.somatic_plan_name || '';
      const planKey = planName.toLowerCase().includes('essential') ? 'essential' : planName.toLowerCase().includes('elite') ? 'elite' : 'premium';
      try {
        const somaticSnap = await getDoc(doc(db, 'settings', 'somatic_plans'));
        if (somaticSnap.exists()) {
          const sData = somaticSnap.data();
          basePriceInr = sData[`${planKey}_price_inr`] ?? (planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000);
        } else {
          basePriceInr = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
        }
      } catch (err) {
        basePriceInr = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
      }
      basePrice = currency === 'USD' && usdToInrRate ? Math.round(basePriceInr / usdToInrRate) : basePriceInr;
    } else {
      const serviceSnap = await getDoc(doc(db, 'services', b.service_id));
      if (!serviceSnap.exists()) {
        return NextResponse.json({ error: 'Associated service not found.' }, { status: 404 });
      }
      const sData = serviceSnap.data();
      basePrice = currency === 'USD' ? (sData.price_usd || 0) : (sData.price_inr || 0);
    }

    // 3. Apply coupon discount if applicable
    let discount = 0;
    if (coupon_code) {
      try {
        const couponRef = doc(db, 'coupons', coupon_code.toUpperCase());
        const couponSnap = await getDoc(couponRef);
        if (couponSnap.exists()) {
          const coupon = couponSnap.data();
          const isExpired = coupon.expiry_date && new Date() > new Date(coupon.expiry_date);
          const limitReached = coupon.usage_limit && (coupon.uses || 0) >= coupon.usage_limit;
          const isContextValid = coupon.context === 'bookings' || coupon.context === 'all';

          if (!isExpired && !limitReached && isContextValid) {
            if (coupon.type === 'percent') {
              discount = (basePrice * coupon.value) / 100;
              if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
              }
            } else {
              discount = coupon.value;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in order creation:', err);
      }
    }

    // 4. Calculate total and GST (18% for INR only)
    const subtotal = Math.max(0, basePrice - discount);
    const gst = currency === 'INR' ? Math.round(subtotal * 0.18) : 0;
    let finalAmount = subtotal + gst;
    let chargeCurrency = currency;

    const supportUSD = process.env.RAZORPAY_SUPPORT_USD === 'true';
    if (chargeCurrency === 'USD' && !supportUSD) {
      // Convert the USD final amount back to INR (using dynamic rate) to create an INR order.
      finalAmount = Math.round(finalAmount * (usdToInrRate || 1));
      chargeCurrency = 'INR';
    }

    if (finalAmount <= 0) {
      return NextResponse.json({ error: 'Order amount must be greater than zero.' }, { status: 400 });
    }

    // 5. Create Razorpay Order server-side
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === 'rzp_test_mockKey123') {
      // Mock order ID for local/dev fallback
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(7).toUpperCase();
      await updateDoc(bookingRef, {
        order_id: mockOrderId,
        amount: basePrice,
        base_amount: basePrice,
        base_currency: currency,
        exchange_rate: usdToInrRate,
        charged_amount: finalAmount,
        charged_currency: chargeCurrency,
      });
      return NextResponse.json({
        ok: true,
        order_id: mockOrderId,
        amount: finalAmount,
        currency: chargeCurrency,
      });
    }

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
      },
      body: JSON.stringify({
        amount: Math.round(finalAmount * 100), // in paise/cents
        currency: chargeCurrency,
        receipt: booking_id,
      }),
    });

    if (!rzpRes.ok) {
      const errText = await rzpRes.text();
      console.error('Razorpay API Error:', errText);
      return NextResponse.json({ error: 'Razorpay order creation failed.' }, { status: 500 });
    }

    const rzpOrder = await rzpRes.json();

    // 6. Update booking doc with calculated amount and Razorpay order ID
    await updateDoc(bookingRef, {
      order_id: rzpOrder.id,
      amount: basePrice, // Store the base price in booking doc as per original schema
      base_amount: basePrice,
      base_currency: currency,
      exchange_rate: usdToInrRate,
      charged_amount: finalAmount,
      charged_currency: chargeCurrency,
    });

    return NextResponse.json({
      ok: true,
      order_id: rzpOrder.id,
      amount: finalAmount,
      currency: chargeCurrency,
    });
  } catch (error: any) {
    console.error('Create booking order error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

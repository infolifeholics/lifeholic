import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getExchangeRates } from '@/lib/exchange-rates';
import { convertInrToCurrency, toRazorpayAmount } from '@/lib/currency';

export async function POST(req: Request) {
  try {
    const { booking_id, coupon_code } = await req.json();

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    }

    // 1. Fetch booking details
    const bookingRef = adminDb.collection('bookings').doc(booking_id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const b = bookingSnap.data() || {};

    if (b.session_number > 1 || b.package_id) {
      return NextResponse.json({ error: 'Subsequent sessions in a package do not require payment.' }, { status: 400 });
    }


    // Fetch exchange rates
    let rates: Record<string, number> = {};
    try {
      const ratesData = await getExchangeRates();
      rates = ratesData.rates || {};
    } catch (err) {
      console.error('Error fetching exchange rate in bookings create-order:', err);
    }

    const currency = b.currency || 'INR';
    const targetRate = currency === 'INR' ? 1 : (rates[currency] || null);

    if (currency !== 'INR' && (!targetRate || isNaN(targetRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. Dynamic exchange rates failed to resolve.' }, { status: 400 });
    }

    // 2. Fetch the correct service/somatic plan price from the database in INR
    let basePriceInr = 0;
    const isSomatic = b.is_somatic_plan === true;

    if (isSomatic) {
      basePriceInr = 11000; // default for premium
      const planName = b.somatic_plan_name || '';
      const planKey = planName.toLowerCase().includes('essential') ? 'essential' : planName.toLowerCase().includes('elite') ? 'elite' : 'premium';
      try {
        const somaticSnap = await adminDb.collection('settings').doc('somatic_plans').get();
        if (somaticSnap.exists) {
          const sData = somaticSnap.data();
          if (sData) {
            basePriceInr = sData[`${planKey}_price_inr`] ?? (planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000);
          }
        } else {
          basePriceInr = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
        }
      } catch (err) {
        basePriceInr = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
      }
    } else {
      const serviceSnap = await adminDb.collection('services').doc(b.service_id).get();
      if (!serviceSnap.exists) {
        return NextResponse.json({ error: 'Associated service not found.' }, { status: 404 });
      }
      const sData = serviceSnap.data();
      if (sData) {
        basePriceInr = sData.price_inr || 0;
      }
    }

    // 3. Apply coupon discount if applicable
    let couponData = null;
    if (coupon_code) {
      try {
        const couponRef = adminDb.collection('coupons').doc(coupon_code.toUpperCase());
        const couponSnap = await couponRef.get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data();
          if (coupon) {
            const isExpired = coupon.expiry_date && new Date() > new Date(coupon.expiry_date);
            const limitReached = coupon.usage_limit && (coupon.uses || 0) >= coupon.usage_limit;
            const isContextValid = coupon.context === 'bookings' || coupon.context === 'all';
            if (!isExpired && !limitReached && isContextValid) {
              couponData = coupon;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in order creation:', err);
      }
    }

    // No longer fetching global settings for dynamic GST percentage. Session price is already tax-inclusive.

    // Calculate discount in INR first
    let discountInr = 0;
    if (couponData) {
      if (couponData.type === 'percent') {
        discountInr = (basePriceInr * couponData.value) / 100;
        if (couponData.max_discount && discountInr > couponData.max_discount) {
          discountInr = couponData.max_discount;
        }
      } else {
        if (currency !== 'INR' && targetRate) {
          discountInr = couponData.value / targetRate;
        } else {
          discountInr = couponData.value;
        }
      }
    }

    const subtotalInr = Math.max(0, basePriceInr - discountInr);
    const totalInr = subtotalInr;

    // Convert values to target currency
    let finalAmount = totalInr;
    let basePrice = basePriceInr;
    let discount = discountInr;

    if (currency !== 'INR' && targetRate) {
      finalAmount = convertInrToCurrency(totalInr, targetRate);
      basePrice = convertInrToCurrency(basePriceInr, targetRate);
      discount = convertInrToCurrency(discountInr, targetRate);
    }

    let chargeCurrency = currency;

    if (finalAmount <= 0) {
      return NextResponse.json({ error: 'Order amount must be greater than zero.' }, { status: 400 });
    }

    // 5. Create Razorpay Order server-side
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === 'rzp_test_mockKey123') {
      // Mock order ID for local/dev fallback
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(7).toUpperCase();
      await bookingRef.set({
        order_id: mockOrderId,
        amount: basePrice,
        base_amount: basePrice,
        base_currency: currency,
        exchange_rate: targetRate,
        charged_amount: finalAmount,
        charged_currency: chargeCurrency,
      }, { merge: true });
      return NextResponse.json({
        ok: true,
        order_id: mockOrderId,
        amount: finalAmount,
        currency: chargeCurrency,
      });
    }

    let rzpOrder;
    try {
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
        },
        body: JSON.stringify({
          amount: toRazorpayAmount(finalAmount, chargeCurrency), // in paise/cents
          currency: chargeCurrency,
          receipt: booking_id,
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error('Razorpay API Error:', errText);
        return NextResponse.json({ error: 'Razorpay order creation failed.' }, { status: 500 });
      }

      rzpOrder = await rzpRes.json();
    } catch (fetchErr: any) {
      console.warn('Razorpay API Connection failed. Falling back to Mock Order for local testing:', fetchErr.message);
      // Generate fallback Mock order ID
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(7).toUpperCase();
      await bookingRef.set({
        order_id: mockOrderId,
        amount: basePrice,
        base_amount: basePrice,
        base_currency: currency,
        exchange_rate: targetRate,
        charged_amount: finalAmount,
        charged_currency: chargeCurrency,
      }, { merge: true });
      return NextResponse.json({
        ok: true,
        order_id: mockOrderId,
        amount: finalAmount,
        currency: chargeCurrency,
        note: 'Mock order created due to Razorpay API connection timeout.'
      });
    }

    // 6. Update booking doc with calculated amount and Razorpay order ID
    await bookingRef.set({
      order_id: rzpOrder.id,
      amount: basePrice, // Store the base price in booking doc as per original schema
      base_amount: basePrice,
      base_currency: currency,
      exchange_rate: targetRate,
      gst_rate: 0,
      gst_amount: 0,
      charged_amount: finalAmount,
      charged_currency: chargeCurrency,
    }, { merge: true });

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

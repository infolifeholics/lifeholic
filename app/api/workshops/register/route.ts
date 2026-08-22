import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, addDoc } from 'firebase/firestore';
import { getExchangeRates } from '@/lib/exchange-rates';
import { convertInrToCurrency, getCurrencyForCountryCode, toRazorpayAmount } from '@/lib/currency';
import { getCountryByName } from '@/lib/countries';

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
    } = body;

    // Fetch global settings and exchange rates
    let rates: Record<string, number> = {};
    try {
      const ratesData = await getExchangeRates();
      rates = ratesData.rates || {};
    } catch (err) {
      console.error('Error fetching exchange rates in workshop registration:', err);
    }

    const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
    
    let currency = body.currency;
    if (!currency) {
      if (country) {
        const cleanCountry = country.trim();
        let code = '';
        if (cleanCountry.length === 2) {
          code = cleanCountry;
        } else {
          const countryObj = getCountryByName(cleanCountry);
          code = countryObj ? countryObj.code : '';
        }
        currency = getCurrencyForCountryCode(code);
      } else {
        currency = getCurrencyForCountryCode(clientCountry);
      }
    }

    if (!workshop_id || !client_name || !client_email || !client_phone) {
      return NextResponse.json({ error: 'Missing mandatory fields.' }, { status: 400 });
    }

    const targetRate = currency === 'INR' ? 1 : (rates[currency] || null);

    if (currency !== 'INR' && (!targetRate || isNaN(targetRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. Dynamic exchange rates failed to resolve.' }, { status: 400 });
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
    let finalPrice = ws.price_inr || 0;
    if (ws.offer_expiry && nowStr <= ws.offer_expiry && ws.early_bird_price_inr !== undefined && ws.early_bird_price_inr > 0) {
      finalPrice = ws.early_bird_price_inr;
    }

    if (currency !== 'INR' && targetRate) {
      finalPrice = convertInrToCurrency(finalPrice, targetRate);
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
        if (currency !== 'INR' && targetRate) {
          discount = (coupon.value || 0) * targetRate;
        } else {
          discount = coupon.value || 0;
        }
      }
      finalPrice = Math.max(0, finalPrice - discount);
    }

    let chargePrice = finalPrice;
    let chargeCurrency = currency;

    const supportUSD = process.env.RAZORPAY_SUPPORT_USD === 'true';
    if (chargeCurrency !== 'INR' && (chargeCurrency !== 'USD' || !supportUSD)) {
      chargePrice = Math.round(chargePrice / (targetRate || 1));
      chargeCurrency = 'INR';
    }

    const regId = 'wreg_' + Math.random().toString(36).substring(7).toUpperCase();

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

    let pgOrderId = null;
    if (chargePrice > 0 && keyId !== 'rzp_test_mockKey123') {
      try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
          },
          body: JSON.stringify({
            amount: toRazorpayAmount(chargePrice, chargeCurrency),
            currency: chargeCurrency,
            receipt: regId,
          }),
        });

        if (response.ok) {
          const rzpOrder = await response.json();
          pgOrderId = rzpOrder.id;
        } else {
          console.error('Razorpay order creation failed for workshop:', await response.text());
        }
      } catch (err) {
        console.error('Error calling Razorpay API for workshop:', err);
      }
    }

    const orderId = pgOrderId || 'order_ws_' + Math.random().toString(36).substring(7).toUpperCase();

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
      amount: chargePrice,
      currency: chargeCurrency,
      base_amount: finalPrice,
      base_currency: currency,
      exchange_rate: targetRate,
      charged_amount: chargePrice,
      charged_currency: chargeCurrency,
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
      amount: chargePrice,
      currency: chargeCurrency,
    });
  } catch (error: any) {
    console.error('Workshop registration creation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

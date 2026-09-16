import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getExchangeRates } from '@/lib/exchange-rates';
import { convertInrToCurrency, getUserCurrency, getCurrencyForCountryCode, toRazorpayAmount } from '@/lib/currency';

function orderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THL-${t}-${r}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, phone, address, items, coupon_code, user_id } = body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });
    }

    // Determine customer delivery country and currency
    const deliveryCountry = address?.country ? String(address.country).trim() : '';
    let isIndia = false;
    let currency = 'INR';

    if (deliveryCountry) {
      const norm = deliveryCountry.toLowerCase();
      isIndia = norm === 'india' || norm === 'in';
      if (isIndia) {
        currency = 'INR';
      } else {
        currency = getUserCurrency({ country: deliveryCountry });
      }
    } else if (user_id) {
      const profileSnap = await adminDb.collection('profiles').doc(user_id).get();
      if (profileSnap.exists) {
        const profile = profileSnap.data() || {};
        currency = getUserCurrency(profile);
        const norm = (profile.country || '').trim().toLowerCase();
        isIndia = norm === 'india' || norm === 'in';
      } else {
        const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
        isIndia = clientCountry.toUpperCase() === 'IN';
        currency = getCurrencyForCountryCode(clientCountry);
      }
    } else {
      const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
      isIndia = clientCountry.toUpperCase() === 'IN';
      currency = getCurrencyForCountryCode(clientCountry);
    }

    // Fetch global settings and exchange rates
    let rates: Record<string, number> = {};
    let shippingChargeIndia = 200;
    let shippingChargeInternational = 2500;

    try {
      const ratesData = await getExchangeRates();
      rates = ratesData.rates || {};

      const globalSnap = await adminDb.collection('settings').doc('global').get();
      if (globalSnap.exists) {
        const gData = globalSnap.data() || {};
        if (typeof gData.shipping_charge_india === 'number') {
          shippingChargeIndia = gData.shipping_charge_india;
        } else if (typeof gData.shipping_charge === 'number') {
          shippingChargeIndia = gData.shipping_charge;
        }

        if (typeof gData.shipping_charge_international === 'number') {
          shippingChargeInternational = gData.shipping_charge_international;
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rates in shop checkout:', err);
    }

    const targetRate = currency === 'INR' ? 1 : (rates[currency] || null);

    if (currency !== 'INR' && (!targetRate || isNaN(targetRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. Dynamic exchange rates failed to resolve.' }, { status: 400 });
    }

    // 1. Validate prices of all products on the server side in INR using adminDb
    let calculatedSubtotalInr = 0;
    const validatedItems = [];
    let hasPhysical = false;

    for (const item of items) {
      const productSnap = await adminDb.collection('products').doc(item.id).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: `Product not found.` }, { status: 404 });
      }
      const product = productSnap.data() || {};
      const itemType = item.type || product.type || 'digital';
      if (itemType === 'physical') hasPhysical = true;

      const priceInr = product.price_inr || 0;
      const convertedPrice = currency !== 'INR' ? convertInrToCurrency(priceInr, targetRate || 0, currency) : priceInr;
      
      calculatedSubtotalInr += priceInr * item.quantity;
      
      validatedItems.push({
        id: item.id,
        slug: item.slug || product.slug,
        name: item.name || product.name,
        price: convertedPrice,
        price_inr: priceInr,
        quantity: item.quantity,
        image: item.image || product.image || '',
        type: itemType,
      });
    }

    const calculatedSubtotal = currency !== 'INR'
      ? convertInrToCurrency(calculatedSubtotalInr, targetRate || 0, currency)
      : calculatedSubtotalInr;

    // 2. Validate and apply coupon code discount using adminDb
    let calculatedDiscountInr = 0;
    if (coupon_code) {
      try {
        const couponSnap = await adminDb.collection('coupons').doc(coupon_code.toUpperCase()).get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data() || {};
          const now = new Date();
          const isExpired = coupon.expiry_date && now > new Date(coupon.expiry_date);
          const limitReached = coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit;
          const isContextValid = !coupon.applicable_to || coupon.applicable_to === 'all' || coupon.applicable_to === 'shop';
          const isMinAmountValid = !coupon.min_amount || calculatedSubtotalInr >= coupon.min_amount;

          if (coupon.active !== false && !isExpired && !limitReached && isContextValid && isMinAmountValid) {
            if (coupon.type === 'percent') {
              calculatedDiscountInr = (calculatedSubtotalInr * coupon.value) / 100;
              if (coupon.max_discount && calculatedDiscountInr > coupon.max_discount) {
                calculatedDiscountInr = coupon.max_discount;
              }
            } else {
              calculatedDiscountInr = coupon.value;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in checkout:', err);
      }
    }

    const calculatedDiscount = currency !== 'INR'
      ? convertInrToCurrency(calculatedDiscountInr, targetRate || 0, currency)
      : calculatedDiscountInr;

    // 3. Calculate per-order shipping based on physical item presence & delivery region
    const baseShippingInr = hasPhysical
      ? (isIndia ? shippingChargeIndia : shippingChargeInternational)
      : 0;

    const finalShipping = baseShippingInr > 0
      ? (currency !== 'INR' ? convertInrToCurrency(baseShippingInr, targetRate || 0, currency) : baseShippingInr)
      : 0;

    const totalInr = Math.max(0, calculatedSubtotalInr - calculatedDiscountInr + baseShippingInr);
    const finalTotal = Math.max(0, calculatedSubtotal - calculatedDiscount + finalShipping);
    let chargeCurrency = currency;

    const number = orderNumber();
    
    // 4. Create Razorpay Order server-side
    let pgOrderId = null;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

    if (keyId !== 'rzp_test_mockKey123' && finalTotal > 0) {
      try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
          },
          body: JSON.stringify({
            amount: toRazorpayAmount(finalTotal, chargeCurrency), // paise/cents
            currency: chargeCurrency,
            receipt: number,
            notes: {
              email: email || '',
              full_name: full_name || '',
              phone: phone || '',
              address: address ? JSON.stringify(address) : '',
              items: JSON.stringify(validatedItems.map(i => ({ id: i.id, q: i.quantity, p: i.price, p_inr: i.price_inr }))),
              coupon_code: coupon_code || '',
              user_id: user_id || '',
            }
          }),
        });

        if (response.ok) {
          const rzpOrder = await response.json();
          pgOrderId = rzpOrder.id;
        } else {
          console.error('Razorpay order creation failed for shop checkout:', await response.text());
        }
      } catch (err) {
        console.error('Error calling Razorpay API during shop checkout:', err);
      }
    }

    const orderData = {
      number,
      email,
      full_name: full_name || null,
      phone: phone || null,
      address: address || null,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      subtotal_inr: calculatedSubtotalInr,
      discount: calculatedDiscount,
      discount_inr: calculatedDiscountInr,
      shipping: finalShipping,
      shipping_inr: baseShippingInr,
      total: finalTotal,
      total_inr: totalInr,
      base_amount_inr: totalInr,
      currency: chargeCurrency,
      base_amount: finalTotal,
      base_currency: currency,
      exchange_rate: targetRate,
      charged_amount: finalTotal,
      charged_currency: chargeCurrency,
      status: 'pending',
      order_status: 'pending',
      payment_status: 'unpaid',
      payment_method: 'razorpay',
      payment_provider: 'razorpay',
      payment_ref: pgOrderId || `order-${number}`,
      shipping_status: null,
      shiprocket_order_id: null,
      shipment_id: null,
      awb: null,
      courier_name: null,
      tracking_url: null,
      coupon_code: coupon_code || null,
      user_id: user_id || null,
      created_at: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('orders').add(orderData);

    return NextResponse.json({ ok: true, id: docRef.id, number, pgOrderId, total: finalTotal, currency: chargeCurrency });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}

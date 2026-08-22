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

    // Fetch user profile from Firestore to determine currency
    let currency = 'INR';
    if (user_id) {
      const profileSnap = await adminDb.collection('profiles').doc(user_id).get();
      if (profileSnap.exists) {
        const profile = profileSnap.data() || {};
        currency = getUserCurrency(profile);
      } else {
        const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
        currency = getCurrencyForCountryCode(clientCountry);
      }
    } else {
      const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
      currency = getCurrencyForCountryCode(clientCountry);
    }

    // Fetch global settings and exchange rates
    let rates: Record<string, number> = {};
    let shippingChargeSetting = 0;
    try {
      const ratesData = await getExchangeRates();
      rates = ratesData.rates || {};

      const globalSnap = await adminDb.collection('settings').doc('global').get();
      if (globalSnap.exists) {
        const gData = globalSnap.data() || {};
        if (typeof gData.shipping_charge === 'number') {
          shippingChargeSetting = gData.shipping_charge;
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rates in shop checkout:', err);
    }

    const targetRate = currency === 'INR' ? 1 : (rates[currency] || null);

    if (currency !== 'INR' && (!targetRate || isNaN(targetRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. Dynamic exchange rates failed to resolve.' }, { status: 400 });
    }

    // 1. Validate prices of all products on the server side using adminDb
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const productSnap = await adminDb.collection('products').doc(item.id).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: `Product not found.` }, { status: 404 });
      }
      const product = productSnap.data() || {};
      const price = currency !== 'INR' ? convertInrToCurrency(product.price_inr || 0, targetRate || 0) : (product.price_inr || 0);
      calculatedSubtotal += price * item.quantity;
      
      validatedItems.push({
        id: item.id,
        slug: item.slug || product.slug,
        name: item.name || product.name,
        price: price,
        quantity: item.quantity,
        image: item.image || product.image || '',
        type: item.type || product.type || 'digital',
      });
    }

    // 2. Validate and apply coupon code discount using adminDb
    let calculatedDiscount = 0;
    if (coupon_code) {
      try {
        const couponSnap = await adminDb.collection('coupons').doc(coupon_code.toUpperCase()).get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data() || {};
          const now = new Date();
          const isExpired = coupon.expiry_date && now > new Date(coupon.expiry_date);
          const limitReached = coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit;
          const isContextValid = !coupon.applicable_to || coupon.applicable_to === 'all' || coupon.applicable_to === 'shop';
          const isMinAmountValid = !coupon.min_amount || calculatedSubtotal >= coupon.min_amount;

          if (coupon.active !== false && !isExpired && !limitReached && isContextValid && isMinAmountValid) {
            if (coupon.type === 'percent') {
              calculatedDiscount = (calculatedSubtotal * coupon.value) / 100;
              if (coupon.max_discount && calculatedDiscount > coupon.max_discount) {
                calculatedDiscount = coupon.max_discount;
              }
            } else {
              // Convert coupon flat value (entered in INR) to target currency
              calculatedDiscount = currency !== 'INR' ? convertInrToCurrency(coupon.value, targetRate || 0) : coupon.value;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in checkout:', err);
      }
    }

    // 3. Calculate shipping
    const baseShippingInr = shippingChargeSetting || 0;
    const finalShipping = baseShippingInr > 0
      ? (currency !== 'INR' ? convertInrToCurrency(baseShippingInr, targetRate || 0) : baseShippingInr)
      : 0;

    const baseAmount = Math.max(0, calculatedSubtotal - calculatedDiscount + finalShipping);
    let finalTotal = baseAmount;
    let chargeCurrency = currency;

    const supportUSD = process.env.RAZORPAY_SUPPORT_USD === 'true';
    if (chargeCurrency !== 'INR' && (chargeCurrency !== 'USD' || !supportUSD)) {
      finalTotal = Math.round(finalTotal / (targetRate || 1));
      chargeCurrency = 'INR';
    }

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
              items: JSON.stringify(validatedItems.map(i => ({ id: i.id, q: i.quantity, p: i.price }))),
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
      discount: calculatedDiscount,
      shipping: finalShipping,
      total: finalTotal,
      currency: chargeCurrency,
      base_amount: baseAmount,
      base_currency: currency,
      exchange_rate: targetRate,
      charged_amount: finalTotal,
      charged_currency: chargeCurrency,
      status: 'pending',
      payment_status: 'unpaid',
      payment_provider: 'razorpay',
      payment_ref: pgOrderId || `order-${number}`,
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

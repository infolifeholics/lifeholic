import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { triggerOrderNotification } from '@/lib/notifications';

function orderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THL-${t}-${r}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, phone, address, items, coupon_code, user_id } = body || {};

    const clientCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'IN';
    const currency = clientCountry === 'IN' ? 'INR' : 'USD';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });
    }

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
      console.error('Error fetching exchange rate in shop checkout:', err);
    }

    if (currency === 'USD' && (!usdToInrRate || isNaN(usdToInrRate))) {
      return NextResponse.json({ error: 'International payments are currently unavailable. USD to INR exchange rate is not configured by the admin.' }, { status: 400 });
    }

    // 1. Validate prices of all products on the server side
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const productDoc = await getDoc(doc(db, 'products', item.id));
      if (!productDoc.exists()) {
        return NextResponse.json({ error: `Product not found.` }, { status: 404 });
      }
      const product = productDoc.data();
      const price = currency === 'USD' && usdToInrRate ? (product.price_usd || Math.round(product.price_inr / usdToInrRate)) : (product.price_inr || 0);
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

    // 2. Validate and apply coupon code discount
    let calculatedDiscount = 0;
    if (coupon_code) {
      try {
        const couponRef = doc(db, 'coupons', coupon_code.toUpperCase());
        const couponSnap = await getDoc(couponRef);
        if (couponSnap.exists()) {
          const coupon = couponSnap.data();
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
              calculatedDiscount = coupon.value;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in checkout:', err);
      }
    }

    // 3. Calculate shipping
    const hasPhysical = validatedItems.some((i) => i.type === 'physical');
    const baseShippingInr = calculatedSubtotal > 1500 || !hasPhysical ? 0 : 149;
    const finalShipping = currency === 'USD' && usdToInrRate ? Math.round(baseShippingInr / usdToInrRate) : baseShippingInr;

    const baseAmount = Math.max(0, calculatedSubtotal - calculatedDiscount + finalShipping);
    let finalTotal = baseAmount;
    let chargeCurrency = currency;

    const supportUSD = process.env.RAZORPAY_SUPPORT_USD === 'true';
    if (chargeCurrency === 'USD' && !supportUSD) {
      finalTotal = Math.round(finalTotal * (usdToInrRate || 1));
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
            amount: Math.round(Number(finalTotal) * 100), // paise/cents
            currency: chargeCurrency,
            receipt: number,
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
      exchange_rate: usdToInrRate,
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

    const docRef = await addDoc(collection(db, 'orders'), orderData);

    return NextResponse.json({ ok: true, id: docRef.id, number, pgOrderId, total: finalTotal, currency: chargeCurrency });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}

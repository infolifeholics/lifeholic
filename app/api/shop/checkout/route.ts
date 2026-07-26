import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { triggerOrderNotification } from '@/lib/notifications';

function orderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THL-${t}-${r}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, phone, address, items, subtotal, discount, shipping, total, currency, coupon_code, user_id } = body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });
    }

    const number = orderNumber();
    
    // Create Razorpay Order if currency is INR and gateway is Razorpay
    let pgOrderId = null;
    if (currency === 'INR' || !currency) {
      try {
        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
        
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
          },
          body: JSON.stringify({
            amount: Math.round(Number(total) * 100), // paise
            currency: 'INR',
            receipt: number,
          }),
        });

        if (response.ok) {
          const rzpOrder = await response.json();
          pgOrderId = rzpOrder.id;
        } else {
          console.error('Razorpay order creation failed:', await response.text());
        }
      } catch (err) {
        console.error('Error calling Razorpay API:', err);
      }
    }

    const orderData = {
      number,
      email,
      full_name: full_name || null,
      phone: phone || null,
      address: address || null,
      items,
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      shipping: Number(shipping) || 0,
      total: Number(total) || 0,
      currency: currency || 'INR',
      status: 'pending',
      payment_status: 'unpaid',
      payment_provider: 'razorpay',
      payment_ref: pgOrderId || `order-${number}`,
      coupon_code: coupon_code || null,
      user_id: user_id || null,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'orders'), orderData);

    return NextResponse.json({ ok: true, id: docRef.id, number, pgOrderId, total });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}

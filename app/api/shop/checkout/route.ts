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
      status: 'paid',
      payment_provider: 'manual',
      payment_ref: `demo-${number}`,
      coupon_code: coupon_code || null,
      user_id: user_id || null,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'orders'), orderData);

    // Trigger notification
    try {
      await triggerOrderNotification(docRef.id, orderData);
    } catch (err) {
      console.error('Failed to trigger order notification:', err);
    }

    // Increment coupon usage if a code was used
    if (coupon_code) {
      try {
        const q = query(collection(db, 'coupons'), where('code', '==', coupon_code.toUpperCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const couponDoc = snap.docs[0];
          const newUses = (couponDoc.data().uses || 0) + 1;
          await setDoc(couponDoc.ref, { uses: newUses }, { merge: true });
        }
      } catch (err) {
        console.error('Error incrementing coupon uses:', err);
      }
    }

    return NextResponse.json({ ok: true, id: docRef.id, number });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}

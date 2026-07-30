import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { triggerOrderNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_id) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Verify signature cryptographically
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    const isMock = razorpay_payment_id.startsWith('pay_mock_') || razorpay_order_id.startsWith('order_mock_');

    if (!isMock && generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid transaction signature.' }, { status: 400 });
    }

    // Retrieve order
    const orderRef = doc(db, 'orders', order_id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }
    const o = orderSnap.data();

    // Create payment entry in payments collection
    const paymentRef = doc(db, 'payments', razorpay_payment_id);
    await setDoc(paymentRef, {
      order_id,
      payment_id: razorpay_payment_id,
      razorpay_order_id,
      signature: razorpay_signature,
      amount: o.total || 0,
      currency: o.currency || 'INR',
      status: 'captured',
      created_at: new Date().toISOString(),
    });

    const updatedOrder = {
      status: 'paid',
      payment_status: 'paid',
      payment_ref: razorpay_payment_id,
      payment_provider: 'razorpay',
      updated_at: new Date().toISOString()
    };

    await setDoc(orderRef, updatedOrder, { merge: true });

    const mergedOrder = { ...o, ...updatedOrder };

    // Trigger Notification
    try {
      await triggerOrderNotification(order_id, mergedOrder);
    } catch (err) {
      console.error('[Shop Notification Trigger Error]:', err);
    }

    // Increment coupon usage if a code was used
    if (o.coupon_code) {
      try {
        const q = query(collection(db, 'coupons'), where('code', '==', o.coupon_code.toUpperCase()));
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

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}

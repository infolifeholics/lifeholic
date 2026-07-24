import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Verify signature cryptographically
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid transaction signature.' }, { status: 400 });
    }

    // Retrieve booking
    const bookingRef = doc(db, 'bookings', booking_id);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const b = bookingSnap.data();

    // Create payment entry in payments collection
    const paymentRef = doc(db, 'payments', razorpay_payment_id);
    await setDoc(paymentRef, {
      booking_id,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      signature: razorpay_signature,
      amount: b.amount || 0,
      currency: b.currency || 'INR',
      status: 'captured',
      created_at: new Date().toISOString(),
    });

    // Update booking timeline
    const timeline = b.status_timeline || [];
    const updatedTimeline = [
      ...timeline,
      {
        status: 'Payment Successful',
        timestamp: new Date().toISOString(),
        updated_by: 'Razorpay',
        note: `Payment ID ${razorpay_payment_id} verified securely.`
      },
      {
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        updated_by: 'System',
        note: 'Booking confirmed automatically after payment verification.'
      }
    ];

    const paymentHistory = b.payment_history || [];
    const updatedHistory = [
      ...paymentHistory,
      {
        payment_status: 'paid',
        timestamp: new Date().toISOString(),
        amount: b.amount || 0,
        currency: b.currency || 'INR',
      }
    ];

    await setDoc(bookingRef, {
      payment_status: 'paid',
      status: 'confirmed',
      status_timeline: updatedTimeline,
      payment_history: updatedHistory,
      updated_at: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}

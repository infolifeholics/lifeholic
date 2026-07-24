import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { booking_id, refund_type, amount, note } = await req.json();

    if (!booking_id || !refund_type || amount === undefined) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    const bookingRef = doc(db, 'bookings', booking_id);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const b = bookingSnap.data();

    // Calculate maximum refundable amount
    const maxRefund = b.amount || 0;
    if (amount > maxRefund) {
      return NextResponse.json({ error: `Amount exceeds original paid amount of ${maxRefund}.` }, { status: 400 });
    }

    // Simulate Razorpay refund transaction or update local status
    const refundId = 'rfnd_' + Math.random().toString(36).substring(7).toUpperCase();

    // Pushes event to status timeline
    const timeline = b.status_timeline || [];
    const updatedTimeline = [
      ...timeline,
      {
        status: `Refund ${refund_type}`,
        timestamp: new Date().toISOString(),
        updated_by: 'Admin',
        note: `Processed refund of ${amount} (${b.currency}). Reason: ${note || 'None'}. Refund ID: ${refundId}.`
      }
    ];

    const refundHistory = b.refund_history || [];
    const updatedRefundHistory = [
      ...refundHistory,
      {
        refund_id: refundId,
        type: refund_type,
        amount,
        currency: b.currency || 'INR',
        timestamp: new Date().toISOString(),
        note: note || '',
      }
    ];

    // Auto notify user by creating in-app notification doc
    if (b.user_id) {
      await setDoc(doc(collection(db, 'notifications')), {
        user_id: b.user_id,
        type: 'refund',
        title: 'Refund Processed',
        message: `A ${refund_type} refund of ${amount} (${b.currency}) has been processed for booking ${booking_id}.`,
        read: false,
        created_at: new Date().toISOString()
      });
    }

    await setDoc(bookingRef, {
      payment_status: refund_type === 'full' ? 'refunded' : 'partially_refunded',
      status: 'cancelled',
      status_timeline: updatedTimeline,
      refund_history: updatedRefundHistory,
      updated_at: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ ok: true, refundId });
  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json({ error: 'Refund processing failed.' }, { status: 500 });
  }
}

// Helper to support collection import in the notifications addition
import { collection } from 'firebase/firestore';

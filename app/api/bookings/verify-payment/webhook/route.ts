import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Find booking by order_id
      const q = query(collection(db, 'bookings'), where('order_id', '==', orderId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const bookingDoc = snap.docs[0];
        const bookingId = bookingDoc.id;
        const b = bookingDoc.data();

        // Update payment & booking status
        const bookingRef = doc(db, 'bookings', bookingId);
        const timeline = b.status_timeline || [];
        
        // Check if already paid to prevent duplicate timeline logs
        if (b.payment_status !== 'paid') {
          const updatedTimeline = [
            ...timeline,
            {
              status: 'Payment Successful',
              timestamp: new Date().toISOString(),
              updated_by: 'Razorpay Webhook',
              note: `Payment ID ${payment.id} verified via webhook.`
            },
            {
              status: 'confirmed',
              timestamp: new Date().toISOString(),
              updated_by: 'System',
              note: 'Booking confirmed automatically after webhook verification.'
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

          const updatedBooking = {
            payment_status: 'paid',
            status: 'confirmed',
            status_timeline: updatedTimeline,
            payment_history: updatedHistory,
            updated_at: new Date().toISOString()
          };

          await setDoc(bookingRef, updatedBooking, { merge: true });

          // Trigger Notification
          try {
            await triggerBookingNotification(bookingId, { ...b, ...updatedBooking }, 'confirmed');
          } catch (err) {
            console.error('[Notification Trigger Error]:', err);
          }

          // Save payment entry
          await setDoc(doc(db, 'payments', payment.id), {
            booking_id: bookingId,
            payment_id: payment.id,
            order_id: orderId,
            amount: b.amount || 0,
            status: 'captured',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

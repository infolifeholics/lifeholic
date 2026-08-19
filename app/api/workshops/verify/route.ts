import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { z } from 'zod';

const verifySchema = z.object({
  registration_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input parameters.' }, { status: 400 });
    }
    const { registration_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    // 1. Locate the registration document
    const regQuery = query(
      collection(db, 'workshopRegistrations'),
      where('id', '==', registration_id)
    );
    const querySnap = await getDocs(regQuery);
    if (querySnap.empty) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }
    const regDoc = querySnap.docs[0];
    const reg = regDoc.data();

    // Verify signature cryptographically
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const razorpay_order_id = reg.order_id;

    const isLive = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_live_');
    const isMock = !isLive && (razorpay_payment_id.startsWith('pay_mock_') || razorpay_payment_id.startsWith('pay_ws_') || razorpay_payment_id.startsWith('pay_retry_'));

    if (!isMock && razorpay_order_id) {
      const crypto = await import('crypto');
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid transaction signature.' }, { status: 400 });
      }
    }

    // 2. Perform dynamic Firestore transaction to update payment state & seats count
    const wsRef = doc(db, 'workshops', reg.workshop_id);
    
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const ticketUrl = `${protocol}://${host}/workshops/${registration_id}/ticket?name=${encodeURIComponent(reg.client_name || '')}&email=${encodeURIComponent(reg.client_email || '')}&phone=${encodeURIComponent(reg.client_phone || '')}&workshop=${encodeURIComponent(reg.workshop_title || '')}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticketUrl)}`;

    await runTransaction(db, async (transaction) => {
      const wsDoc = await transaction.get(wsRef);
      if (!wsDoc.exists()) {
        throw new Error('Workshop not found.');
      }
      
      const seatsBooked = wsDoc.data().seats_booked || 0;
      const seatsTotal = wsDoc.data().seats_total || 0;
      
      // Update seat bookings
      transaction.update(wsRef, {
        seats_booked: Math.min(seatsTotal, seatsBooked + 1),
      });

      // Update coupon usage count if a coupon was used
      if (reg.coupon_code) {
        const couponRef = doc(db, 'coupons', reg.coupon_code.toUpperCase());
        const couponDoc = await transaction.get(couponRef);
        if (couponDoc.exists()) {
          const currentCount = couponDoc.data().usage_count || 0;
          const usageLimit = couponDoc.data().usage_limit;
          if (usageLimit && currentCount >= usageLimit) {
            throw new Error('Sorry, you are late! Coupon usage limit reached.');
          }
          transaction.update(couponRef, {
            usage_count: currentCount + 1
          });
        }
      }

      // Update registration details
      transaction.update(regDoc.ref, {
        payment_status: 'paid',
        status: 'confirmed',
        payment_id: razorpay_payment_id || 'mock_pay_123',
        qr_code: qrCodeUrl,
      });
    });

    // 3. Dispatch Notification
    const notifRef = collection(db, 'notifications');
    if (reg.user_id && reg.user_id !== 'anonymous') {
      await addDoc(notifRef, {
        user_id: reg.user_id,
        type: 'workshop',
        title: 'Workshop Confirmed!',
        message: `Your ticket for "${reg.workshop_title}" is confirmed. Download your ticket inside your dashboard.`,
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    // Trigger Email & WhatsApp notifications safely
    try {
      const { triggerWorkshopNotification } = await import('@/lib/notifications');
      await triggerWorkshopNotification(registration_id, { ...reg, payment_status: 'paid', status: 'confirmed' }, host, protocol);
    } catch (err) {
      console.error('Failed to trigger workshop notifications:', err);
    }

    return NextResponse.json({ ok: true, ticket_qr: qrCodeUrl });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: error.message || 'Verification failure.' }, { status: 500 });
  }
}

// Helper to support collection import
import { addDoc } from 'firebase/firestore';

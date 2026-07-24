import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, runTransaction } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { registration_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!registration_id) {
      return NextResponse.json({ error: 'Registration reference is required.' }, { status: 400 });
    }

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

    // 2. Perform dynamic Firestore transaction to update payment state & seats count
    const wsRef = doc(db, 'workshops', reg.workshop_id);
    
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

      // Update registration details
      transaction.update(regDoc.ref, {
        payment_status: 'paid',
        status: 'confirmed',
        payment_id: razorpay_payment_id || 'mock_pay_123',
        qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${registration_id}`,
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

    return NextResponse.json({ ok: true, ticket_qr: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${registration_id}` });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: error.message || 'Verification failure.' }, { status: 500 });
  }
}

// Helper to support collection import
import { addDoc } from 'firebase/firestore';

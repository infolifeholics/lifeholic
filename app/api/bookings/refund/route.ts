import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';

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

    // Block refund if one or more sessions in the package have been completed
    let packageRefToUpdate: any = null;
    if (b.is_somatic_plan && b.user_id) {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const pkgQuery = query(
        collection(db, 'somatic_packages'),
        where('booking_ids', 'array-contains', booking_id)
      );
      const pkgSnap = await getDocs(pkgQuery);
      if (!pkgSnap.empty) {
        packageRefToUpdate = pkgSnap.docs[0].ref;
        const pkgData = pkgSnap.docs[0].data();
        if ((pkgData.completed_sessions || 0) > 0) {
          return NextResponse.json({ error: 'Refunds are not allowed once one or more sessions in the package have been completed.' }, { status: 400 });
        }
      }
    }

    // Calculate maximum refundable amount
    const maxRefund = b.amount || 0;
    const refundHistory = b.refund_history || [];
    const totalAlreadyRefunded = refundHistory.reduce((acc: number, r: any) => acc + (r.amount || 0), 0);
    const maxRefundable = maxRefund - totalAlreadyRefunded;

    if (amount <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than zero.' }, { status: 400 });
    }

    if (amount > maxRefundable) {
      return NextResponse.json({ error: `Amount exceeds remaining refundable amount of ${maxRefundable} ${b.currency || 'INR'}.` }, { status: 400 });
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

    const updatedBooking = {
      payment_status: refund_type === 'full' ? 'refunded' : 'partially_refunded',
      status: 'cancelled',
      status_timeline: updatedTimeline,
      refund_history: updatedRefundHistory,
      updated_at: new Date().toISOString()
    };

    await setDoc(bookingRef, updatedBooking, { merge: true });

    if (packageRefToUpdate) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(packageRefToUpdate, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      });
    }

    // Trigger Notification
    try {
      await triggerBookingNotification(booking_id, { ...b, ...updatedBooking }, 'cancelled');
    } catch (err) {
      console.error('[Notification Trigger Error]:', err);
    }

    return NextResponse.json({ ok: true, refundId });
  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json({ error: 'Refund processing failed.' }, { status: 500 });
  }
}

// Helper to support collection import in the notifications addition
import { collection } from 'firebase/firestore';

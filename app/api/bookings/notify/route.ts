import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { triggerBookingNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const { bookingId, eventType } = await req.json();

    if (!bookingId || !eventType) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const bookingData = bookingSnap.data();

    await triggerBookingNotification(bookingId, bookingData, eventType);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Notify API Route Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

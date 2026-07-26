import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/booking-utils';
import { pushNotificationJob } from '@/lib/queue/producer';
import { NotificationJob } from '@/lib/queue/types';

/**
 * POST /api/admin/queue/retry
 * Body: { dlqId: string }
 *
 * Re-queues a failed DLQ job by its Firestore document ID.
 * Resets the attempt counter so it gets a fresh retry cycle.
 */
export async function POST(req: Request) {
  const isAdmin = await verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dlqId } = await req.json();
    if (!dlqId) return NextResponse.json({ error: 'Missing dlqId' }, { status: 400 });

    const dlqDocRef = doc(db, 'failed_notifications', dlqId);
    const dlqSnap = await getDoc(dlqDocRef);

    if (!dlqSnap.exists()) {
      return NextResponse.json({ error: 'DLQ entry not found' }, { status: 404 });
    }

    const entry = dlqSnap.data();
    const originalJob = entry.payload as NotificationJob;

    // Re-queue with attempt reset to 0 (fresh retry cycle)
    await pushNotificationJob(
      originalJob.type,
      originalJob.recipientEmail,
      originalJob.recipientPhone,
      originalJob.vars,
      originalJob.bookingId,
      originalJob.userId,
      originalJob.channel
    );

    // Remove from DLQ after successful re-queue
    await deleteDoc(dlqDocRef);

    return NextResponse.json({ ok: true, message: `Job ${originalJob.jobId} re-queued successfully.` });
  } catch (err: any) {
    console.error('[Queue Retry API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

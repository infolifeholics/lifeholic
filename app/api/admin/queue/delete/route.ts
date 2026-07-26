import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/booking-utils';

/**
 * DELETE /api/admin/queue/delete
 * Body: { dlqId: string }
 *
 * Permanently removes a job from the Dead Letter Queue.
 */
export async function DELETE(req: Request) {
  const isAdmin = await verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dlqId } = await req.json();
    if (!dlqId) return NextResponse.json({ error: 'Missing dlqId' }, { status: 400 });

    await deleteDoc(doc(db, 'failed_notifications', dlqId));

    return NextResponse.json({ ok: true, message: `DLQ entry ${dlqId} permanently deleted.` });
  } catch (err: any) {
    console.error('[Queue Delete API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

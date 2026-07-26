import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { verifyAdminRequest } from '@/lib/booking-utils';

export async function GET(req: Request) {
  const isAdmin = await verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logsRef = collection(db, 'notification_logs');
    const dlqRef = collection(db, 'failed_notifications');

    // Fetch stats in parallel
    const [deliveredSnap, failedSnap, pendingSnap, dlqSnap, recentSnap] = await Promise.all([
      getDocs(query(logsRef, where('deliveryStatus', '==', 'delivered'))),
      getDocs(query(logsRef, where('deliveryStatus', '==', 'failed'))),
      getDocs(query(logsRef, where('deliveryStatus', '==', 'pending'))),
      getDocs(dlqRef),
      getDocs(query(logsRef, where('deliveryStatus', '==', 'delivered'), orderBy('completedAt', 'desc'), limit(100))),
    ]);

    // Calculate average processing time from last 100 delivered
    let avgProcessingMs = 0;
    let lastSuccessAt: string | null = null;
    const processingTimes: number[] = [];

    recentSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.processingMs) processingTimes.push(data.processingMs);
      if (!lastSuccessAt && data.completedAt) lastSuccessAt = data.completedAt;
    });

    if (processingTimes.length > 0) {
      avgProcessingMs = Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length);
    }

    const qstashConfigured = !!(process.env.QSTASH_TOKEN && process.env.QSTASH_WORKER_URL);

    return NextResponse.json({
      ok: true,
      queueStatus: qstashConfigured ? 'connected' : 'fallback_inline',
      workerStatus: 'active',
      stats: {
        delivered: deliveredSnap.size,
        failed: failedSnap.size,
        pending: pendingSnap.size,
        dlqCount: dlqSnap.size,
      },
      performance: {
        avgProcessingMs,
        lastSuccessAt,
        sampleSize: processingTimes.length,
      },
    });
  } catch (err: any) {
    console.error('[Queue Health API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

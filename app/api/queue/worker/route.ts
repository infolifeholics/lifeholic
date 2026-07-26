import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { processNotificationJob } from '@/lib/queue/worker';
import { NotificationJob } from '@/lib/queue/types';

/**
 * QStash webhook endpoint — called by Upstash for every notification job.
 *
 * Security: The @upstash/qstash/nextjs verifySignatureAppRouter wrapper
 * automatically validates the QStash signature using QSTASH_CURRENT_SIGNING_KEY
 * and QSTASH_NEXT_SIGNING_KEY environment variables.
 *
 * QStash retry behavior:
 * - Returns 200 → QStash marks job as successful
 * - Returns 5xx → QStash retries per the retry schedule
 */
import { rateLimiter, getIpFromRequest } from '@/lib/rate-limit';

async function handler(req: Request): Promise<Response> {
  try {
    const ip = getIpFromRequest(req);
    const limitCheck = rateLimiter(ip, { limit: 120, windowMs: 60 * 1000 });
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json() as NotificationJob;

    if (!body?.jobId || !body?.type) {
      console.error('[Worker Endpoint] Invalid job payload received:', body);
      return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
    }

    console.log(`[Worker Endpoint] Processing job ${body.jobId} (${body.type}), attempt ${body.attempt}`);

    await processNotificationJob(body);

    return NextResponse.json({ ok: true, jobId: body.jobId });
  } catch (err: any) {
    console.error('[Worker Endpoint] Job processing failed:', err);
    // Return 5xx so QStash will retry this job
    return NextResponse.json(
      { error: err.message || 'Worker processing failed' },
      { status: 500 }
    );
  }
}

// Wrap handler with QStash signature verification
// Falls back gracefully if signing keys are not set (local dev)
export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;

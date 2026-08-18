import { Client } from '@upstash/qstash';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotificationJob, NotificationChannel, NotificationType } from './types';
import { TemplateVars } from '@/lib/notifications/templates';

let _qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;
  if (!_qstashClient) {
    _qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
  }
  return _qstashClient;
}

/**
 * Generates a deterministic idempotency key for a notification.
 * Prevents duplicate sends even if the same job is pushed twice.
 */
function generateJobId(
  type: NotificationType,
  recipient: string,
  bookingId?: string,
  suffix?: string
): string {
  const parts = [type, recipient, bookingId || 'no-booking'];
  if (suffix) {
    parts.push(suffix);
  }
  const base = parts
    .join('::')
    .replace(/[^a-zA-Z0-9:_-]/g, '_');
  // Keep it reasonably short
  return base.slice(0, 120);
}

/**
 * Checks whether a notification with this jobId was already successfully delivered.
 * Returns true if a duplicate was found (should skip).
 */
async function isDuplicate(jobId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'notification_logs'),
      where('jobId', '==', jobId),
      where('deliveryStatus', '==', 'delivered'),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    // On error, allow the job through (fail open for notifications)
    return false;
  }
}

/**
 * Pushes a notification job to Upstash QStash for background processing.
 * Falls back to inline fire-and-forget if QStash is not configured.
 */
export async function pushNotificationJob(
  type: NotificationType,
  recipientEmail: string,
  recipientPhone: string | null,
  vars: TemplateVars,
  bookingId?: string,
  userId?: string,
  channel: NotificationChannel = 'both'
): Promise<void> {
  const jobId = generateJobId(type, recipientEmail || recipientPhone || 'unknown', bookingId);

  // Idempotency check — skip if already delivered
  const alreadyDone = await isDuplicate(jobId);
  if (alreadyDone) {
    console.log(`[Producer] Duplicate detected for job ${jobId}. Skipping.`);
    return;
  }

  const job: NotificationJob = {
    jobId,
    type,
    recipientEmail,
    recipientPhone,
    vars,
    bookingId,
    userId,
    channel,
    attempt: 0,
    createdAt: new Date().toISOString(),
  };

  const client = getQStashClient();
  const isDev = process.env.NODE_ENV === 'development';

  if (client && !isDev) {
    // ── QStash path ────────────────────────────────────────────────────────
    const workerUrl = process.env.QSTASH_WORKER_URL;
    if (!workerUrl) {
      console.warn('[Producer] QSTASH_WORKER_URL not set. Falling back to inline execution.');
      await runInline(job);
      return;
    }

    try {
      await client.publishJSON({
        url: workerUrl,
        body: job,
        retries: 5,
        // QStash will retry with delays; our worker returns 5xx to trigger retry
      });
      console.log(`[Producer] Job ${jobId} (${type}) pushed to QStash.`);
    } catch (err) {
      console.error('[Producer] Failed to push to QStash. Falling back to inline:', err);
      await runInline(job);
    }
  } else {
    // ── Fallback: inline fire-and-forget (no QStash configured) ─────────────
    console.log(`[Producer] QStash not configured. Running job ${jobId} inline.`);
    runInline(job).catch((err) =>
      console.error(`[Producer] Inline job ${jobId} failed:`, err)
    );
  }
}

/**
 * Fallback inline executor — used during local dev or when QStash is not configured.
 * Imports and runs the worker processor directly.
 */
async function runInline(job: NotificationJob): Promise<void> {
  try {
    const { processNotificationJob } = await import('./worker');
    await processNotificationJob(job);
  } catch (err) {
    console.error(`[Producer] Inline execution failed for job ${job.jobId}:`, err);
  }
}

import { adminDb } from '@/lib/firebase-admin';
import { NotificationJob, NotificationChannel, NotificationType } from './types';
import { TemplateVars } from '@/lib/notifications/templates';

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
    const snap = await adminDb.collection('notification_logs')
      .where('jobId', '==', jobId)
      .where('deliveryStatus', '==', 'delivered')
      .limit(1)
      .get();
    return !snap.empty;
  } catch {
    // On error, allow the job through (fail open for notifications)
    return false;
  }
}

/**
 * Pushes a notification job directly to inline fire-and-forget processing.
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

  // ── Execute inline directly (No QStash dependency) ─────────────────────
  console.log(`[Producer] Running job ${jobId} inline.`);
  await runInline(job);
}

/**
 * Fallback inline executor.
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

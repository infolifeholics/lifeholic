import { adminDb } from '@/lib/firebase-admin';
import { NotificationJob, DLQEntry } from './types';

/**
 * Writes a failed notification job to the Dead Letter Queue (failed_notifications collection).
 * Called after all retry attempts are exhausted.
 */
export async function writeToDLQ(job: NotificationJob, error: string): Promise<void> {
  try {
    const entry: DLQEntry = {
      jobId: job.jobId,
      notificationType: job.type,
      bookingId: job.bookingId || null,
      userId: job.userId || null,
      channel: job.channel,
      provider: job.recipientEmail ? 'SMTP + WhatsAppAPI' : 'WhatsAppAPI',
      retryCount: job.attempt,
      failureReason: error,
      failedAt: new Date().toISOString(),
      payload: job,
    };

    await adminDb.collection('failed_notifications').add(entry);
    console.log(`[DLQ] Job ${job.jobId} (${job.type}) written to dead letter queue after ${job.attempt} attempts.`);
  } catch (dlqError) {
    // Never throw from DLQ writer — avoid cascading failures
    console.error('[DLQ] Critical: Failed to write to dead letter queue:', dlqError);
  }
}

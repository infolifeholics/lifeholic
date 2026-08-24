import { adminDb } from '@/lib/firebase-admin';
import { EMAIL_TEMPLATES, WHATSAPP_TEMPLATES } from '@/lib/notifications/templates';
import { sendEmail } from '@/lib/notifications/email';
import { sendWhatsAppMessage } from '@/lib/notifications/whatsapp';
import { NotificationJob, NotificationLogEntry } from './types';
import { MAX_RETRY_ATTEMPTS } from './retry';
import { writeToDLQ } from './dead-letter';

const EMAIL_SUBJECTS: Record<string, string> = {
  welcome: 'Welcome to TheLifeHolics!',
  booking_confirmation: 'Session Booking Received',
  booking_pending_payment: 'Booking Payment Pending',
  booking_payment_expired: 'Booking Hold Expired',
  booking_cancelled: 'Session Booking Cancelled',
  booking_reminder: 'Upcoming Session Reminder',
  booking_status_changed: 'Booking Status Update',
  certificate_generated: 'Congratulations! Your Certificate is Ready',
  rec_letter_generated: 'Your Recommendation Letter is Ready',
  password_reset: 'Password Reset Request',
  admin_alert: 'Admin System Notification',
  community_admin_alert: 'New Lifeholics Community Application',
  community_user_confirmation: 'Thank You for Your Interest in the Lifeholics Community',
  order_confirmation: 'Order Confirmation',
  admin_order_alert: 'New Product Order Placed',
};

/**
 * Core job processor. Called by the QStash worker endpoint.
 * Sends email and/or WhatsApp in parallel, logs results, handles DLQ.
 */
export async function processNotificationJob(job: NotificationJob): Promise<void> {
  const startMs = Date.now();
  const startedAt = new Date().toISOString();

  console.log(`[Worker] Starting job ${job.jobId} (${job.type}) on channel(s): ${job.channel}`);

  const tasks: Promise<{ channel: 'Email' | 'WhatsApp'; success: boolean; error: string }>[] = [];

  const shouldSendEmail = (job.channel === 'both' || job.channel === 'email') && job.recipientEmail;
  const shouldSendWhatsApp = (job.channel === 'both' || job.channel === 'whatsapp') && job.recipientPhone;

  // ── 1. Push Email Task ───────────────────────────────────────────────────
  if (shouldSendEmail) {
    let subject = EMAIL_SUBJECTS[job.type] || 'LifeHolics Notification';
    if (job.type === 'admin_alert') {
      const actionLower = job.vars.bookingStatus?.toLowerCase() || '';
      const detailsLower = job.vars.actionDetails?.toLowerCase() || '';
      const isProduct = actionLower.includes('order') || actionLower.includes('product') || detailsLower.includes('order') || detailsLower.includes('product');
      subject = isProduct ? 'Product Alert' : 'Session Alert';
    }
    const templateFn = EMAIL_TEMPLATES[job.type as keyof typeof EMAIL_TEMPLATES];

    if (!templateFn) {
      console.error(`[Worker] Missing email template for type: ${job.type}`);
    } else {
      const html = templateFn(job.vars);
      tasks.push(
        sendEmail(job.recipientEmail, subject, html)
          .then(() => ({ channel: 'Email' as const, success: true, error: '' }))
          .catch((err: any) => ({ channel: 'Email' as const, success: false, error: err?.message || 'SMTP delivery failure' }))
      );
    }
  }

  // ── 2. Push WhatsApp Task ────────────────────────────────────────────────
  if (shouldSendWhatsApp) {
    const templateFn = WHATSAPP_TEMPLATES[job.type as keyof typeof WHATSAPP_TEMPLATES];
    if (!templateFn) {
      console.error(`[Worker] Missing WhatsApp template for type: ${job.type}`);
    } else {
      const text = templateFn(job.vars);
      tasks.push(
        sendWhatsAppMessage(job.recipientPhone!, text)
          .then((res) => ({
            channel: 'WhatsApp' as const,
            success: true,
            error: res?.skipped ? (res.reason || 'WhatsApp skipped') : ''
          }))
          .catch((err: any) => ({ channel: 'WhatsApp' as const, success: false, error: err?.message || 'WhatsApp API failure' }))
      );
    }
  }

  if (tasks.length === 0) {
    console.log(`[Worker] No applicable channels for job ${job.jobId}. Skipping.`);
    return;
  }

  // ── 4. Execute in parallel ────────────────────────────────────────────────
  const results = await Promise.allSettled(tasks);
  const completedAt = new Date().toISOString();
  const processingMs = Date.now() - startMs;
  let anyFailure = false;
  let lastError = '';

  for (const result of results) {
    const outcome = result.status === 'fulfilled' ? result.value : { channel: 'Email' as const, success: false, error: 'Promise rejected' };

    // Write per-channel log using adminDb
    try {
      const logEntry = {
        jobId: job.jobId,
        userId: job.userId || null,
        bookingId: job.bookingId || null,
        notificationType: job.type,
        channel: outcome.channel,
        provider: outcome.channel === 'Email' ? 'SMTP' : 'WhatsAppAPI',
        recipient: outcome.channel === 'Email' ? job.recipientEmail : (job.recipientPhone || ''),
        deliveryStatus: outcome.success ? 'delivered' : 'failed',
        retryCount: job.attempt,
        createdAt: job.createdAt,
        startedAt,
        completedAt,
        processingMs,
        errorMessage: outcome.success ? null : outcome.error,
        providerResponse: outcome.success ? `${outcome.channel} sent successfully` : null,
      };
      await adminDb.collection('notification_logs').add(logEntry);
    } catch (logErr) {
      console.error('[Worker] Failed to write notification log:', logErr);
    }

    if (!outcome.success) {
      anyFailure = true;
      lastError = outcome.error;
      // Log notification channel failures
      const recipient = outcome.channel === 'Email' ? job.recipientEmail : (job.recipientPhone || 'N/A');
      const { logSystemError } = require('@/lib/error-tracker');
      logSystemError(
        `${outcome.channel} dispatch failed for ${recipient}: ${outcome.error}`,
        outcome.channel === 'Email' ? 'Email' : 'WhatsApp',
        { userId: job.userId, bookingId: job.bookingId, metadata: { jobId: job.jobId, type: job.type } }
      );
    }
  }

  // ── 5. Handle failure → DLQ if max retries exceeded ──────────────────────
  if (anyFailure) {
    if (job.attempt >= MAX_RETRY_ATTEMPTS - 1) {
      console.error(`[Worker] Job ${job.jobId} exhausted all ${MAX_RETRY_ATTEMPTS} retries. Writing to DLQ.`);
      await writeToDLQ(job, lastError);
      
      const { logSystemError } = require('@/lib/error-tracker');
      logSystemError(
        `Job ${job.jobId} (${job.type}) exhausted retries and was moved to DLQ.`,
        'Queue',
        { userId: job.userId, bookingId: job.bookingId, metadata: { jobId: job.jobId } }
      );
    } else {
      // Re-throw so callers / retriers catch it
      throw new Error(`[Worker] Job ${job.jobId} failed (attempt ${job.attempt + 1}): ${lastError}`);
    }
  } else {
    console.log(`[Worker] Job ${job.jobId} (${job.type}) completed successfully in ${processingMs}ms.`);
  }
}

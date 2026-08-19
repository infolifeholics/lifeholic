import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EMAIL_TEMPLATES, WHATSAPP_TEMPLATES } from '@/lib/notifications/templates';
import { sendEmail } from '@/lib/notifications/email';
import { sendWhatsAppMessage } from '@/lib/notifications/whatsapp';
import { NotificationJob, NotificationLogEntry } from './types';
import { MAX_RETRY_ATTEMPTS } from './retry';
import { writeToDLQ } from './dead-letter';

const EMAIL_SUBJECTS: Record<string, string> = {
  welcome: 'Welcome to TheLifeHolics!',
  booking_confirmation: 'Session Booking Received',
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
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  // ── 1. Load notification settings from Firestore ──────────────────────────
  let emailEnabled = true;
  let whatsappEnabled = true;
  let notificationToggles: Record<string, boolean> = {};
  let vars = { ...job.vars };

  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'notifications'));
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      emailEnabled = data.email_notifications_enabled !== false;
      whatsappEnabled = data.whatsapp_notifications_enabled !== false;
      notificationToggles = data.toggles || {};
      vars.orgName = data.sender_name || vars.orgName || 'TheLifeHolics';
      vars.supportEmail = data.support_email || vars.supportEmail || 'support@thelifeholics.com';
      vars.supportPhone = data.support_phone || vars.supportPhone || process.env.NEXT_PUBLIC_CONTACT_PHONE || process.env.PUBLIC_CONTACT_NUMBER || '';
    }
  } catch (e) {
    console.warn('[Worker] Could not load notification settings, using defaults:', e);
  }

  // ── 2. Check if notification type is disabled ────────────────────────────
  if (notificationToggles[job.type] === false) {
    console.log(`[Worker] Notification type "${job.type}" is disabled by admin. Skipping job ${job.jobId}.`);
    return;
  }

  // ── 3. Build parallel tasks ──────────────────────────────────────────────
  const tasks: Promise<{ channel: 'Email' | 'WhatsApp'; success: boolean; error: string }>[] = [];

  const shouldEmail = emailEnabled && job.recipientEmail && (job.channel === 'email' || job.channel === 'both');
  const shouldWhatsApp = whatsappEnabled && job.recipientPhone && (job.channel === 'whatsapp' || job.channel === 'both');

  if (shouldEmail) {
    const subject = EMAIL_SUBJECTS[job.type] || 'Notification Update';
    const html = EMAIL_TEMPLATES[job.type as keyof typeof EMAIL_TEMPLATES](vars);
    tasks.push(
      sendEmail(job.recipientEmail, subject, html)
        .then(() => ({ channel: 'Email' as const, success: true, error: '' }))
        .catch((err: any) => ({ channel: 'Email' as const, success: false, error: err?.message || 'SMTP failure' }))
    );
  }

  if (shouldWhatsApp) {
    const text = WHATSAPP_TEMPLATES[job.type as keyof typeof WHATSAPP_TEMPLATES](vars);
    tasks.push(
      sendWhatsAppMessage(job.recipientPhone!, text)
        .then(() => ({ channel: 'WhatsApp' as const, success: true, error: '' }))
        .catch((err: any) => ({ channel: 'WhatsApp' as const, success: false, error: err?.message || 'WhatsApp API failure' }))
    );
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

    // Write per-channel log
    try {
      const logEntry: Omit<NotificationLogEntry, 'jobId'> & { jobId: string } = {
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
      await addDoc(collection(db, 'notification_logs'), logEntry);
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
      // Re-throw so QStash retries based on the HTTP 5xx response
      throw new Error(`[Worker] Job ${job.jobId} failed (attempt ${job.attempt + 1}): ${lastError}`);
    }
  } else {
    console.log(`[Worker] Job ${job.jobId} (${job.type}) completed successfully in ${processingMs}ms.`);
  }
}

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EMAIL_TEMPLATES, TemplateVars } from './templates';
import { pushNotificationJob } from '@/lib/queue/producer';
import { NotificationType } from '@/lib/queue/types';

/**
 * Queues a notification for background delivery via Upstash QStash.
 * Returns immediately — notification is processed asynchronously.
 *
 * Falls back to inline execution if QStash is not configured.
 */
export async function queueNotification(
  type: keyof typeof EMAIL_TEMPLATES,
  recipientEmail: string,
  recipientPhone: string | null,
  vars: TemplateVars,
  bookingId?: string,
  userId?: string
): Promise<void> {
  await pushNotificationJob(
    type as NotificationType,
    recipientEmail,
    recipientPhone,
    vars,
    bookingId,
    userId,
    'both'
  );
}

/**
 * Notifies all admin users about a platform event.
 * Fetches admin profiles from Firestore and queues one job per admin.
 */
export async function notifyAdmins(
  action: string,
  actorName: string,
  details: string,
  bookingId?: string
): Promise<void> {
  try {
    const q = query(collection(db, 'profiles'), where('is_admin', '==', true));
    const snap = await getDocs(q);

    const vars: TemplateVars = {
      memberName: actorName,
      bookingStatus: action,
      actionDetails: details,
      bookingId: bookingId,
    };

    const pushTasks = snap.docs
      .map((d) => d.data())
      .filter((data) => !!data.email)
      .map((data) =>
        pushNotificationJob(
          'admin_alert',
          data.email,
          data.phone || null,
          vars,
          bookingId,
          undefined,
          'both'
        ).catch((err) =>
          console.error(`[NotificationService] Failed to queue admin alert for ${data.email}:`, err)
        )
      );

    await Promise.allSettled(pushTasks);
  } catch (err) {
    console.error('[NotificationService] Failed to notify admins:', err);
  }
}

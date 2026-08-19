import { adminDb } from '@/lib/firebase-admin';
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
    let clientEmail = '';
    let clientPhone = '';
    let meetLink = '';
    let sessionDate = '';
    let sessionTime = '';

    if (bookingId) {
      const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get();
      if (bookingDoc.exists) {
        const b = bookingDoc.data() || {};
        clientEmail = b.client_email || '';
        clientPhone = b.client_phone || '';
        
        let defaultMeetLink = '';
        try {
          const settingsSnap = await adminDb.collection('settings').doc('global').get();
          if (settingsSnap.exists) {
            defaultMeetLink = (settingsSnap.data() || {}).google_meet_link || '';
          }
        } catch (e) {
          console.error('Error fetching global settings for meet link:', e);
        }
        meetLink = b.meeting_link || defaultMeetLink;
        
        if (b.start_time) {
          const dateObj = new Date(b.start_time);
          const formatterDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
          const formatterTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', timeStyle: 'short', hour12: true });
          sessionDate = formatterDate.format(dateObj);
          sessionTime = formatterTime.format(dateObj) + ' IST';
        }
      }
    }

    const adminQuery = await adminDb.collection('profiles')
      .where('is_admin', '==', true)
      .get();

    const vars: TemplateVars = {
      memberName: actorName,
      bookingStatus: action,
      actionDetails: details,
      bookingId: bookingId,
      clientEmail,
      clientPhone,
      meetLink,
      sessionDate,
      sessionTime,
    };

    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';

    const pushTasks = adminQuery.docs
      .map((d) => d.data())
      .filter((data) => !!data.email)
      .map((data) =>
        pushNotificationJob(
          'admin_alert',
          data.email,
          ownerPhone, // Static route owner WhatsApp alerts to WASENDER_OWNER_PHONE
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

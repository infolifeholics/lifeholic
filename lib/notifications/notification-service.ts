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

    let paymentStatus = '';
    let actualStatus = '';

    if (bookingId) {
      const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get();
      if (bookingDoc.exists) {
        const b = bookingDoc.data() || {};
        clientEmail = b.client_email || '';
        clientPhone = b.client_phone || '';
        paymentStatus = b.payment_status || '';
        actualStatus = b.status || '';
        
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

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';

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
      paymentStatus,
      actualStatus,
    };

    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';

    await pushNotificationJob(
      'admin_alert',
      adminEmail,
      ownerPhone,
      vars,
      bookingId,
      undefined,
      'both'
    );
  } catch (err) {
    console.error('[NotificationService] Failed to notify admins:', err);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendEmailNotification, sendWhatsAppNotification } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    // 1. Fetch global settings
    let reminderHours = 24;
    let defaultMeetLink = '';
    const globalSettingsRef = doc(db, 'settings', 'global');
    const globalSettingsSnap = await getDoc(globalSettingsRef);
    if (globalSettingsSnap.exists()) {
      const gSettings = globalSettingsSnap.data();
      reminderHours = gSettings.reminder_hours_before || 24;
      defaultMeetLink = gSettings.google_meet_link || '';
    }

    // 2. Fetch all confirmed bookings
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('status', '==', 'confirmed'));
    const snap = await getDocs(q);

    const now = new Date();
    const sentCount = [];

    for (const d of snap.docs) {
      const booking = d.data();
      if (booking.reminder_sent) continue;

      const startTime = new Date(booking.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Check if session is in the future and within the notification window
      if (diffHours > 0 && diffHours <= reminderHours) {
        const bookingId = d.id;
        const { client_name, client_email, client_phone, service_title } = booking;
        const meetLink = booking.meeting_link || defaultMeetLink;

        const dateStr = startTime.toLocaleDateString();
        const timeStr = startTime.toLocaleTimeString();

        // Send Email
        const emailSubject = `Reminder: Somatic Session "${service_title}" (ID: ${bookingId})`;
        const emailBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #c5a880;">Session Reminder</h2>
            <p>Hello ${client_name}, this is a friendly reminder that your upcoming session <strong>${service_title}</strong> is starting soon.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <ul style="list-style: none; padding-left: 0; line-height: 1.8;">
              <li><strong>Session ID:</strong> ${bookingId}</li>
              <li><strong>Date:</strong> ${dateStr}</li>
              <li><strong>Time:</strong> ${timeStr}</li>
              ${meetLink ? `<li><strong>Join Meeting:</strong> <a href="${meetLink}" style="color: #c5a880; font-weight: bold;">${meetLink}</a></li>` : ''}
            </ul>
          </div>
        `;

        try {
          await sendEmailNotification({
            to: client_email,
            subject: emailSubject,
            html: emailBody
          });
        } catch (e) {
          console.error(`Failed to send reminder email for booking ${bookingId}:`, e);
        }

        // Send WhatsApp
        if (client_phone) {
          const reminderMsg = `Hello ${client_name}, this is a reminder for your session "${service_title}" on ${dateStr} at ${timeStr}.${meetLink ? ` Join link: ${meetLink}` : ''}`;
          try {
            await sendWhatsAppNotification(client_phone, reminderMsg);
          } catch (e) {
            console.error(`Failed to send reminder WhatsApp for booking ${bookingId}:`, e);
          }
        }

        // Update the booking document
        const bookingDocRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingDocRef, {
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString()
        });

        sentCount.push({
          id: bookingId,
          client: client_name,
          email: client_email,
          phone: client_phone,
          meetLink
        });
      }
    }

    return NextResponse.json({ ok: true, sentReminders: sentCount });
  } catch (err: any) {
    console.error('[TEST CRON] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

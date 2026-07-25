import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Setup dynamic SMTP Transporter
function getMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });
}

/**
 * Sends a WhatsApp message using Meta's WhatsApp Cloud API.
 */
export async function sendWhatsAppNotification(to: string, bodyText: string, templateData: any = null) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credentials missing. Skipping notification.');
    return;
  }

  const cleanPhone = to.replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
  };

  if (templateData) {
    payload.type = 'template';
    payload.template = {
      name: templateData.name,
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: templateData.params.map((p: any) => ({ type: 'text', text: String(p) })),
        },
      ],
    };
  } else {
    payload.type = 'text';
    payload.text = { body: bodyText };
  }

  let attempt = 0;
  const maxRetries = 3;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      // Log delivery status in whatsappLogs collection
      await addDoc(collection(db, 'whatsappLogs'), {
        to: cleanPhone,
        payload,
        result,
        status: response.ok ? 'delivered' : 'failed',
        attempt,
        timestamp: serverTimestamp(),
      });

      if (response.ok) {
        console.log(`[WhatsApp] Notification successfully sent to ${cleanPhone}`);
        break;
      } else {
        console.error(`[WhatsApp] Attempt ${attempt} failed with Meta API error:`, result);
      }
    } catch (error: any) {
      console.error(`[WhatsApp] Attempt ${attempt} exception:`, error);
      if (attempt === maxRetries) {
        await addDoc(collection(db, 'whatsappLogs'), {
          to: cleanPhone,
          payload,
          error: error.message,
          status: 'failed_exception',
          attempt,
          timestamp: serverTimestamp(),
        });
      }
    }
  }
}

/**
 * Sends an email using Nodemailer.
 */
export async function sendEmailNotification(options: { to: string; subject: string; html: string }) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"TheLifeHolics" <no-reply@thelifeholics.com>';
  const transporter = getMailTransporter();
  
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`[Email] Mail sent successfully: ${info.messageId} to ${options.to}`);
    return info;
  } catch (error) {
    console.error(`[Email] Failed to send email to ${options.to}:`, error);
    throw error;
  }
}

/**
 * Central function to trigger notifications based on booking events.
 */
export async function triggerBookingNotification(
  bookingId: string,
  bookingData: any,
  eventType: 'created' | 'confirmed' | 'meeting_updated' | 'cancelled'
) {
  const {
    client_name,
    client_email,
    client_phone,
    service_title,
    start_time,
    status,
    meeting_link,
    user_id,
  } = bookingData;

  const dateObj = new Date(start_time);
  const dateStr = dateObj.toLocaleDateString();
  const timeStr = dateObj.toLocaleTimeString();

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info.lifeholics@gmail.com';

  console.log(`[Notifications] Triggering ${eventType} notification for Booking ID: ${bookingId}`);

  // 1. Handle Event-specific logic
  if (eventType === 'created') {
    // Add Dashboard Notification
    if (user_id) {
      await addDoc(collection(db, 'notifications'), {
        user_id,
        type: 'booking_created',
        title: 'Booking Request Submitted',
        message: `Your booking request for ${service_title} is submitted (ID: ${bookingId}).`,
        read: false,
        created_at: serverTimestamp(),
      });
    }

    const emailSubject = `Booking Submitted (ID: ${bookingId})`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #c5a880;">Lifeholics Booking Request</h2>
        <p>Hello ${client_name}, your booking request has been submitted and is currently pending payment.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <ul style="list-style: none; padding-left: 0; line-height: 1.8;">
          <li><strong>Booking ID:</strong> ${bookingId}</li>
          <li><strong>Service:</strong> ${service_title}</li>
          <li><strong>Date:</strong> ${dateStr}</li>
          <li><strong>Time:</strong> ${timeStr}</li>
          <li><strong>Status:</strong> ${status}</li>
        </ul>
        <div style="text-align: center; margin-top: 25px;">
          <a href="https://thelifeholics.com/account" style="background-color: #c5a880; color: white; padding: 10px 20px; text-decoration: none; border-radius: 30px; font-weight: bold;">View Booking Pass</a>
        </div>
      </div>
    `;

    try {
      await sendEmailNotification({
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
      await sendEmailNotification({
        to: adminEmail,
        subject: `[ADMIN] ${emailSubject}`,
        html: emailBody,
      });
    } catch (e) {
      console.error('[Notifications] Failed to send creation emails:', e);
    }

    if (client_phone) {
      const userMsg = `Hello ${client_name}, your booking for ${service_title} on ${dateStr} is created (ID: ${bookingId}).`;
      await sendWhatsAppNotification(client_phone, userMsg, {
        name: 'booking_created',
        params: [bookingId, client_name, service_title, dateStr, timeStr, status],
      });
    }
  }

  else if (eventType === 'confirmed') {
    if (user_id) {
      await addDoc(collection(db, 'notifications'), {
        user_id,
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: `Your booking for ${service_title} is confirmed for ${dateStr} at ${timeStr}.`,
        read: false,
        created_at: serverTimestamp(),
      });
    }

    const emailSubject = `Booking Confirmed! (ID: ${bookingId})`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #4caf50;">Lifeholics Session Confirmed</h2>
        <p>Hello ${client_name}, your booking with ID ${bookingId} has been confirmed!</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <ul style="list-style: none; padding-left: 0; line-height: 1.8;">
          <li><strong>Service:</strong> ${service_title}</li>
          <li><strong>Date:</strong> ${dateStr}</li>
          <li><strong>Time:</strong> ${timeStr}</li>
          ${meeting_link ? `<li><strong>Meeting Link:</strong> <a href="${meeting_link}">${meeting_link}</a></li>` : ''}
        </ul>
      </div>
    `;

    try {
      await sendEmailNotification({
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      console.error('[Notifications] Failed to send confirmation email:', e);
    }

    if (client_phone) {
      const confirmMsg = `Hello ${client_name}, your booking (ID: ${bookingId}) is confirmed for ${service_title} on ${dateStr}!`;
      await sendWhatsAppNotification(client_phone, confirmMsg, {
        name: 'booking_confirmed',
        params: [bookingId, client_name, service_title, dateStr, timeStr, 'Confirmed'],
      });
    }
  }

  else if (eventType === 'meeting_updated') {
    if (user_id) {
      await addDoc(collection(db, 'notifications'), {
        user_id,
        type: 'meeting_updated',
        title: 'Meeting Link Added',
        message: `Meeting link for ${service_title} has been added: ${meeting_link}`,
        read: false,
        created_at: serverTimestamp(),
      });
    }

    const emailSubject = `Meeting Link Added (Booking ID: ${bookingId})`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #c5a880;">Your Session Meeting Link</h2>
        <p>Hello ${client_name}, the meeting link for your upcoming session ${service_title} has been set:</p>
        <p style="font-size: 16px; font-weight: bold; text-align: center;">
          <a href="${meeting_link}" style="color: #c5a880;">Join Session URL</a>
        </p>
      </div>
    `;

    try {
      await sendEmailNotification({
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      console.error('[Notifications] Failed to send meeting link email:', e);
    }

    if (client_phone && meeting_link) {
      await sendWhatsAppNotification(client_phone, `Your meeting link for booking ${bookingId} has been added: ${meeting_link}`);
    }
  }

  else if (eventType === 'cancelled') {
    if (user_id) {
      await addDoc(collection(db, 'notifications'), {
        user_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Your booking for ${service_title} (ID: ${bookingId}) has been cancelled.`,
        read: false,
        created_at: serverTimestamp(),
      });
    }

    const emailSubject = `Booking Cancelled (ID: ${bookingId})`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #f44336;">Booking Cancelled</h2>
        <p>Hello ${client_name}, your booking with ID ${bookingId} has been cancelled.</p>
      </div>
    `;

    try {
      await sendEmailNotification({
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      console.error('[Notifications] Failed to send cancelled email:', e);
    }
  }
}

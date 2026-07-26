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
  eventType: 'created' | 'confirmed' | 'meeting_updated' | 'cancelled' | 'rejected' | 'completed'
) {
  const {
    client_name,
    client_email,
    client_phone,
    service_title,
    start_time,
    status,
    user_id,
  } = bookingData;

  const dateObj = new Date(start_time);
  const formatterDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
  const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', timeStyle: 'short' });
  const dateStr = formatterDate.format(dateObj);
  const timeStr = formatterTime.format(dateObj);

  console.log(`[Notifications] Delegating ${eventType} notification to new Queue Service for Booking ID: ${bookingId}`);

  try {
    const { queueNotification, notifyAdmins } = await import('@/lib/notifications/notification-service');

    const vars = {
      memberName: client_name,
      sessionDate: dateStr,
      sessionTime: timeStr,
      bookingId: bookingId,
      bookingStatus: eventType === 'created' ? 'pending' : (eventType === 'meeting_updated' ? 'rescheduled' : eventType),
    };

    let templateType: any = 'booking_status_changed';
    if (eventType === 'created') {
      templateType = 'booking_confirmation';
    } else if (eventType === 'cancelled') {
      templateType = 'booking_cancelled';
    }

    await queueNotification(
      templateType,
      client_email,
      client_phone || null,
      vars,
      bookingId,
      user_id || undefined
    );

    // Save dashboard notification
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'notifications'), {
      user_id: user_id || null,
      type: eventType === 'created' ? 'booking_created' : `booking_${eventType}`,
      title: `Booking Update: ${eventType}`,
      message: `Your session booking ${service_title} is ${eventType === 'created' ? 'pending' : eventType}.`,
      read: false,
      created_at: serverTimestamp(),
    }).catch((err) => console.error('[Notifications] Failed to save DB notification:', err));

    // Admin Alert
    if (eventType === 'created' || eventType === 'cancelled') {
      await notifyAdmins(
        eventType === 'created' ? 'New Booking' : 'Booking Cancelled',
        client_name,
        `Session for ${service_title} scheduled on ${dateStr} at ${timeStr} IST`,
        bookingId
      );
    }
  } catch (err) {
    console.error('[Notifications] Failed to run triggerBookingNotification:', err);
  }
}

/**
 * Sends notifications for shop order placement.
 */
export async function triggerOrderNotification(orderId: string, orderData: any) {
  const {
    number: orderNumber,
    email,
    full_name,
    phone,
    items,
    total,
    currency,
    user_id,
  } = orderData;

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info.lifeholics@gmail.com';
  console.log(`[Notifications] Triggering order notification for Order Number: ${orderNumber}`);

  // Add Dashboard Notification
  if (user_id) {
    try {
      await addDoc(collection(db, 'notifications'), {
        user_id,
        type: 'order_created',
        title: 'Order Confirmed',
        message: `Your order ${orderNumber} for ${items.length} item(s) has been placed successfully.`,
        read: false,
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('[Notifications] Failed to add order notification to Firestore:', err);
    }
  }

  // Construct Email HTML
  const emailSubject = `Order Confirmation (ID: ${orderNumber})`;
  const emailBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: #c5a880; margin-bottom: 20px;">Lifeholics Order Confirmation</h2>
      <p>Hello ${full_name || 'Customer'}, thank you for your order!</p>
      <p>We are processing your order <strong>${orderNumber}</strong>. Here are the details:</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <h3 style="color: #333; margin-bottom: 10px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #eee; font-weight: bold; color: #555;">
            <th style="text-align: left; padding: 8px;">Item</th>
            <th style="text-align: center; padding: 8px;">Qty</th>
            <th style="text-align: right; padding: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">${item.title || 'Product'}</td>
              <td style="text-align: center; padding: 8px;">${item.quantity || 1}</td>
              <td style="text-align: right; padding: 8px;">${item.price} ${currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 15px; text-align: right; font-weight: bold; font-size: 16px; color: #333;">
        Total: ${total} ${currency}
      </div>
    </div>
  `;

  try {
    await sendEmailNotification({
      to: email,
      subject: emailSubject,
      html: emailBody,
    });
    await sendEmailNotification({
      to: adminEmail,
      subject: `[ADMIN] ${emailSubject}`,
      html: emailBody,
    });
  } catch (e) {
    console.error('[Notifications] Failed to send order emails:', e);
  }

  // Send WhatsApp Notification
  if (phone) {
    const userMsg = `Hello ${full_name || 'Customer'}, thank you for shopping with Lifeholics! Your order ${orderNumber} is confirmed. Total: ${total} ${currency}.`;
    await sendWhatsAppNotification(phone, userMsg, {
      name: 'order_confirmed',
      params: [orderNumber, full_name || 'Customer', total, currency],
    });
  }
}


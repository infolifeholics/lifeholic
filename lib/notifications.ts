import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { sendWhatsAppMessage } from '@/lib/notifications/whatsapp';

// Setup dynamic SMTP Transporter
function getMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });
}

/**
 * Sends a WhatsApp message using WasenderAPI.
 */
export async function sendWhatsAppNotification(to: string, bodyText: string, templateData: any = null) {
  const cleanPhone = to.replace(/[^0-9]/g, '');
  try {
    const result = await sendWhatsAppMessage(cleanPhone, bodyText, templateData);

    // Log delivery status in whatsappLogs collection
    await addDoc(collection(db, 'whatsappLogs'), {
      to: cleanPhone,
      bodyText,
      result,
      status: 'delivered',
      timestamp: serverTimestamp(),
    });

    console.log(`[WhatsApp] Notification successfully sent to ${cleanPhone}`);
    return result;
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send notification to ${cleanPhone}:`, error);
    await addDoc(collection(db, 'whatsappLogs'), {
      to: cleanPhone,
      bodyText,
      error: error.message,
      status: 'failed',
      timestamp: serverTimestamp(),
    });
  }
}

/**
 * Sends an email using Nodemailer.
 */
export async function sendEmailNotification(options: { to: string; subject: string; html: string }) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"LifeHolics" <support@thelifeholics.com>';
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
  const formatterTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', timeStyle: 'short', hour12: true });
  const dateStr = formatterDate.format(dateObj);
  const timeStr = formatterTime.format(dateObj);

  console.log(`[Notifications] Delegating ${eventType} notification to new Queue Service for Booking ID: ${bookingId}`);

  try {
    const { queueNotification, notifyAdmins } = await import('@/lib/notifications/notification-service');
    const { doc, getDoc } = await import('firebase/firestore');

    // Fetch default meet link from global settings
    let defaultMeetLink = '';
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        defaultMeetLink = settingsSnap.data().google_meet_link || '';
      }
    } catch (e) {
      console.error('Error fetching global settings for meet link:', e);
    }

    const sessionSuffix = bookingData.session_number ? ` (Session ${bookingData.session_number})` : '';
    const vars = {
      memberName: client_name,
      sessionDate: dateStr,
      sessionTime: timeStr,
      bookingId: bookingId,
      bookingStatus: eventType === 'created' ? 'pending' : (eventType === 'meeting_updated' ? 'rescheduled' : eventType),
      actionDetails: `${service_title}${sessionSuffix}`,
      meetLink: bookingData.meeting_link || defaultMeetLink,
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

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'support@thelifeholics.com';
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

  // Send WhatsApp Notifications
  try {
    const formattedItems = items.map((item: any) => 
      `- ${item.name || item.title || 'Product'} (x${item.quantity || 1})`
    ).join('\n');
    
    const formattedAddress = orderData.address 
      ? `${orderData.address.line1 || ''}, ${orderData.address.city || ''}, ${orderData.address.state || ''}, ${orderData.address.postal_code || ''}, ${orderData.address.country || ''}`
      : 'Digital Delivery';

    const customerMsg = `🛍️ Order Confirmed\n\nHi ${full_name || 'Customer'},\n\nYour order has been successfully placed.\n\nOrder ID: ${orderNumber}\n\nItems:\n${formattedItems}\n\nTotal Amount: ${total} ${currency}\n\nPayment Status: ${orderData.payment_status || 'Paid'}\n\nShipping Address:\n${formattedAddress}\n\nThank you for shopping with Lifeholics.`;
    
    if (phone) {
      await sendWhatsAppNotification(phone, customerMsg);
    }

    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';
    const ownerMsg = `🛍️ New Product Order\n\nA new order has been placed.\n\nOrder ID: ${orderNumber}\n\nCustomer:\n${full_name || 'Customer'}\n\nPhone:\n${phone || 'N/A'}\n\nEmail:\n${email}\n\nItems:\n${formattedItems}\n\nTotal:\n${total} ${currency}\n\nPayment:\n${orderData.payment_status || 'Paid'}\n\nShipping Address:\n${formattedAddress}`;
    
    await sendWhatsAppNotification(ownerPhone, ownerMsg);
  } catch (waErr) {
    console.error('[Notifications] Failed to send order WhatsApp messages:', waErr);
  }
}

/**
 * Sends notifications for workshop registration confirmation.
 */
export async function triggerWorkshopNotification(
  registrationId: string,
  regData: any,
  host: string,
  protocol: string
) {
  try {
    const wsRef = doc(db, 'workshops', regData.workshop_id);
    const wsSnap = await getDoc(wsRef);
    const ws = wsSnap.exists() ? wsSnap.data() : {};

    const ticketUrl = `${protocol}://${host}/workshops/${registrationId}/ticket?name=${encodeURIComponent(regData.client_name || '')}&email=${encodeURIComponent(regData.client_email || '')}&phone=${encodeURIComponent(regData.client_phone || '')}&workshop=${encodeURIComponent(regData.workshop_title || '')}`;

    const emailSubject = `Workshop Registration Confirmed: ${regData.workshop_title}`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #c5a880; margin-bottom: 20px;">Workshop Registration Confirmed!</h2>
        <p>Hello ${regData.client_name},</p>
        <p>Your registration for the workshop <strong>${regData.workshop_title}</strong> is confirmed. Here are the details:</p>
        <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Registration ID:</strong> ${regData.id || registrationId}</p>
          <p><strong>Date:</strong> ${ws.date || 'N/A'}</p>
          <p><strong>Time:</strong> ${ws.start_time || 'N/A'} - ${ws.end_time || 'N/A'} (${ws.timezone || 'IST'})</p>
          ${ws.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${ws.meeting_link}" style="color: #c5a880;">${ws.meeting_link}</a></p>` : ''}
        </div>
        <p>You can view and download your entry ticket here:</p>
        <a href="${ticketUrl}" style="background-color: #c5a880; color: white; padding: 10px 20px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; margin-top: 10px;">Download Ticket</a>
      </div>
    `;

    // 1. Send Customer Email
    await sendEmailNotification({
      to: regData.client_email,
      subject: emailSubject,
      html: emailBody,
    });

    // 2. Send Admin/Owner Email
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'support@thelifeholics.com';
    await sendEmailNotification({
      to: adminEmail,
      subject: `[ADMIN] ${emailSubject}`,
      html: emailBody,
    });

    // 3. Send Customer WhatsApp Notification
    if (regData.client_phone) {
      const userMsg = `🎉 Workshop Registration Confirmed!\n\nHi ${regData.client_name},\n\nYour registration for the workshop "${regData.workshop_title}" has been successfully confirmed.\n\n📅 Date: ${ws.date || 'N/A'}\n🕒 Time: ${ws.start_time || 'N/A'} - ${ws.end_time || 'N/A'} (${ws.timezone || 'IST'})\n🔗 Meeting Link: ${ws.meeting_link || 'Will be shared soon'}\n🎟️ Ticket Link: ${ticketUrl}\n\nWe look forward to seeing you there.\n\nTeam Lifeholics`;
      await sendWhatsAppNotification(regData.client_phone, userMsg);
    }

    // 4. Send Owner WhatsApp Notification
    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';
    const ownerMsg = `📌 New Workshop Registration\n\nName: ${regData.client_name}\nPhone: ${regData.client_phone}\nEmail: ${regData.client_email}\nWorkshop: ${regData.workshop_title}\nDate: ${ws.date || 'N/A'}\nTime: ${ws.start_time || 'N/A'} - ${ws.end_time || 'N/A'} (${ws.timezone || 'IST'})\nMeeting Link: ${ws.meeting_link || 'N/A'}\nPayment Status: ${regData.payment_status || 'Paid'}\nBooking/Registration ID: ${regData.id || registrationId}`;
    await sendWhatsAppNotification(ownerPhone, ownerMsg);
  } catch (err) {
    console.error('[Notifications] Failed to run triggerWorkshopNotification:', err);
  }
}


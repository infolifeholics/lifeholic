import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  
  let targetTo = options.to;
  let finalSubject = options.subject;
  const isDummy = options.to.includes('example.com') || options.to.includes('test.com') || options.to.includes('dummy');
  if (process.env.EMAIL_DEMO_MODE === 'true' && isDummy) {
    targetTo = process.env.EMAIL_DEMO_RECIPIENT || 'support@thelifeholics.com';
    finalSubject = `DEMO - [To: ${options.to}] - ${options.subject}`;
  }
  
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetTo,
      subject: finalSubject,
      html: options.html,
    });
    console.log(`[Email] Mail sent successfully: ${info.messageId} to ${targetTo} (Original: ${options.to})`);
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
  eventType: 'created' | 'confirmed' | 'meeting_updated' | 'cancelled' | 'rejected' | 'completed',
  oldStartTime?: string
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

  let oldDateStr = '';
  let oldTimeStr = '';
  if (oldStartTime) {
    try {
      const oldDateObj = new Date(oldStartTime);
      oldDateStr = formatterDate.format(oldDateObj);
      oldTimeStr = formatterTime.format(oldDateObj);
    } catch (e) {
      console.error('Error formatting old start time:', e);
    }
  }

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
      oldSessionDate: oldDateStr || undefined,
      oldSessionTime: oldTimeStr || undefined,
      bookingId: bookingId,
      bookingStatus: eventType === 'created' ? 'pending' : (eventType === 'meeting_updated' ? 'rescheduled' : eventType),
      actionDetails: `${service_title}${sessionSuffix}`,
      meetLink: bookingData.meeting_link || defaultMeetLink,
      paymentStatus: bookingData.payment_status || '',
      actualStatus: bookingData.status || '',
    };

    let templateType: any = 'booking_status_changed';
    if (eventType === 'created') {
      templateType = 'booking_pending_payment';
    } else if (eventType === 'confirmed') {
      templateType = 'booking_confirmation';
    } else if (eventType === 'cancelled') {
      const isExpired = bookingData.status_timeline?.some((t: any) => t.note?.toLowerCase().includes('expired') || t.status?.toLowerCase().includes('expired')) || false;
      templateType = isExpired ? 'booking_payment_expired' : 'booking_cancelled';
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

    // Admin Alert: Only alert admin when a session is fully paid and confirmed
    if (eventType === 'confirmed') {
      await notifyAdmins(
        'New Confirmed Booking',
        client_name,
        `Session for ${service_title} scheduled on ${dateStr} at ${timeStr} IST. Payment confirmed.`,
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

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';
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

  const formattedAddress = orderData.address 
    ? `${orderData.address.line1 || ''}, ${orderData.address.city || ''}, ${orderData.address.state || ''}, ${orderData.address.postal_code || ''}, ${orderData.address.country || ''}`
    : 'Digital Delivery';

  const vars = {
    memberName: full_name || 'Customer',
    orderNumber: orderNumber || 'N/A',
    orderItems: items || [],
    orderTotal: total || 0,
    orderCurrency: currency || 'INR',
    shippingAddress: formattedAddress,
    clientEmail: email || '',
    clientPhone: phone || '',
  };

  try {
    const { queueNotification } = await import('@/lib/notifications/notification-service');
    
    // 1. Queue User Notification
    await queueNotification(
      'order_confirmation',
      email,
      phone || null,
      vars,
      orderId,
      user_id || undefined
    );

    // 2. Queue Admin Notification
    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';
    await queueNotification(
      'admin_order_alert',
      adminEmail,
      ownerPhone,
      vars,
      orderId,
      undefined
    );
    console.log(`[Notifications] Successfully queued order notifications for Order Number: ${orderNumber}`);
  } catch (err) {
    console.error('[Notifications] Failed to queue order notifications:', err);
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
    // Check Idempotency on workshopRegistrations document to prevent duplicate notifications
    const regRef = doc(db, 'workshopRegistrations', registrationId);
    const regSnap = await getDoc(regRef);
    if (regSnap.exists() && regSnap.data().notified_email) {
      console.log(`[Notifications] Workshop registration ${registrationId} already notified. Skipping duplicate notification.`);
      return;
    }

    const wsRef = doc(db, 'workshops', regData.workshop_id);
    const wsSnap = await getDoc(wsRef);
    const ws = wsSnap.exists() ? wsSnap.data() : {};

    const ticketUrl = `${protocol}://${host}/workshops/${registrationId}/ticket?name=${encodeURIComponent(regData.client_name || '')}&email=${encodeURIComponent(regData.client_email || '')}&phone=${encodeURIComponent(regData.client_phone || '')}&workshop=${encodeURIComponent(regData.workshop_title || '')}`;

    // 1. USER EMAIL TEMPLATE
    const userEmailSubject = `Workshop Registration Confirmed: ${regData.workshop_title}`;
    const userEmailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #c5a880; margin-bottom: 20px;">Workshop Registration Confirmed!</h2>
        <p>Hello ${regData.client_name || 'Participant'},</p>
        <p>Your registration for the workshop <strong>${regData.workshop_title}</strong> is confirmed. Here are the details:</p>
        <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Registration ID:</strong> ${regData.id || registrationId}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${ws.date || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${ws.start_time || 'N/A'} - ${ws.end_time || 'N/A'} (${ws.timezone || 'IST'})</p>
          ${ws.meeting_link ? `<p style="margin: 4px 0;"><strong>Meeting Link:</strong> <a href="${ws.meeting_link}" style="color: #c5a880;">${ws.meeting_link}</a></p>` : ''}
        </div>
        <p>You can view and download your entry ticket here:</p>
        <a href="${ticketUrl}" style="background-color: #c5a880; color: white; padding: 10px 20px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; margin-top: 10px;">Download Ticket</a>
      </div>
    `;

    // Send Customer Email (EMAIL #1)
    if (regData.client_email) {
      await sendEmailNotification({
        to: regData.client_email,
        subject: userEmailSubject,
        html: userEmailBody,
      });
    }

    // 2. ADMIN EMAIL TEMPLATE
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';
    const adminEmailSubject = `New Workshop Registration - ${regData.workshop_title}`;
    const adminEmailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #c5a880; margin-bottom: 6px;">New Workshop Registration</h2>
        <p style="color: #666; font-size: 14px; margin-top: 0;">A new participant has registered for a workshop.</p>

        <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <h3 style="margin-top: 0; color: #333; font-size: 15px;">Workshop Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Workshop:</strong> ${regData.workshop_title}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Date:</strong> ${ws.date || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${ws.start_time || 'N/A'} - ${ws.end_time || 'N/A'} (${ws.timezone || 'IST'})</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Meeting Link:</strong> ${ws.meeting_link ? `<a href="${ws.meeting_link}" style="color: #c5a880;">${ws.meeting_link}</a>` : 'N/A'}</p>
        </div>

        <div style="background-color: #f8f9fa; border-left: 4px solid #4a5568; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <h3 style="margin-top: 0; color: #333; font-size: 15px;">Participant Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Participant Name:</strong> ${regData.client_name || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Participant Email:</strong> ${regData.client_email || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Participant Phone:</strong> ${regData.client_phone || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Booking / Registration ID:</strong> ${regData.id || registrationId}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Payment Status:</strong> ${regData.payment_status || 'Paid / Confirmed'}</p>
        </div>
      </div>
    `;

    // Send Admin Email (EMAIL #2)
    await sendEmailNotification({
      to: adminEmail,
      subject: adminEmailSubject,
      html: adminEmailBody,
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

    // Mark registration document as notified in Firestore for idempotency
    await updateDoc(regRef, { notified_email: true }).catch((err) => console.error('[Notifications] Failed to update notified_email flag:', err));
  } catch (err) {
    console.error('[Notifications] Failed to run triggerWorkshopNotification:', err);
  }
}


const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Initialize SMTP Transporter for Email Notifications
const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
});

/**
 * Sends a WhatsApp message using Meta's WhatsApp Cloud API.
 */
async function sendWhatsAppNotification(to, bodyText, templateData = null) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    logger.warn("WhatsApp API credentials missing. Skipping notification.");
    return;
  }

  const cleanPhone = to.replace(/[^0-9]/g, "");
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
  };

  if (templateData) {
    payload.type = "template";
    payload.template = {
      name: templateData.name,
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: templateData.params.map(p => ({ type: "text", text: String(p) })),
        },
      ],
    };
  } else {
    payload.type = "text";
    payload.text = { body: bodyText };
  }

  // Implementation of Meta API with simple retry logic
  let attempt = 0;
  const maxRetries = 3;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      
      // Log delivery status in whatsappLogs collection
      await db.collection("whatsappLogs").add({
        to: cleanPhone,
        payload,
        result,
        status: response.ok ? "delivered" : "failed",
        attempt,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (response.ok) {
        logger.info(`WhatsApp notification successfully sent to ${cleanPhone}`);
        break;
      } else {
        logger.error(`Attempt ${attempt} failed with Meta API error:`, result);
      }
    } catch (error) {
      logger.error(`Attempt ${attempt} exception:`, error);
      if (attempt === maxRetries) {
        // Log final failure
        await db.collection("whatsappLogs").add({
          to: cleanPhone,
          payload,
          error: error.message,
          status: "failed_exception",
          attempt,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

/**
 * Firestore trigger to handle Notifications, Emails & WhatsApp updates.
 */
exports.handleBookingNotification = onDocumentWritten("bookings/{bookingId}", async (event) => {
  const bookingId = event.params.bookingId;
  const beforeData = event.data.before ? event.data.before.data() : null;
  const afterData = event.data.after ? event.data.after.data() : null;

  if (!afterData) {
    logger.info(`Booking ${bookingId} was deleted.`);
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@thelifeholics.com";
  const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER || "";

  const {
    user_id,
    client_name,
    client_email,
    client_phone,
    service_title,
    start_time,
    status,
    payment_status,
    summary,
    problems,
    meeting_link,
  } = afterData;

  const dateStr = start_time ? new Date(start_time).toLocaleDateString() : "—";
  const timeStr = start_time ? new Date(start_time).toLocaleTimeString() : "—";
  const problemsStr = Array.isArray(problems) ? problems.join(", ") : "None";

  const isNew = !beforeData;
  const statusChanged = beforeData && beforeData.status !== status;
  const paymentChanged = beforeData && beforeData.payment_status !== payment_status;
  const meetingChanged = beforeData && beforeData.meeting_link !== meeting_link;

  // 1. Booking Created
  if (isNew) {
    // Add Notification to User Dashboard
    if (user_id) {
      await db.collection("notifications").add({
        user_id,
        type: "booking_created",
        title: "Booking Request Submitted",
        message: `Your booking request for ${service_title} is submitted (ID: ${bookingId}).`,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Email templates
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
      await mailTransport.sendMail({
        from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
      await mailTransport.sendMail({
        from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
        to: adminEmail,
        subject: `[ADMIN] ${emailSubject}`,
        html: emailBody,
      });
    } catch (e) {
      logger.error("Failed to send creation emails:", e);
    }

    const userMsg = `Hello ${client_name}, your booking for ${service_title} on ${dateStr} is created (ID: ${bookingId}).`;
    if (client_phone) {
      await sendWhatsAppNotification(client_phone, userMsg, {
        name: "booking_created",
        params: [bookingId, client_name, service_title, dateStr, timeStr, status]
      });
    }
  }

  // 2. Booking Confirmed
  if (statusChanged && status === "confirmed") {
    if (user_id) {
      await db.collection("notifications").add({
        user_id,
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking for ${service_title} is confirmed for ${dateStr} at ${timeStr}.`,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
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
          ${meeting_link ? `<li><strong>Meeting Link:</strong> <a href="${meeting_link}">${meeting_link}</a></li>` : ""}
        </ul>
      </div>
    `;

    try {
      await mailTransport.sendMail({
        from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      logger.error("Failed to send confirmation email:", e);
    }

    const confirmMsg = `Hello ${client_name}, your booking (ID: ${bookingId}) is confirmed for ${service_title} on ${dateStr}!`;
    if (client_phone) {
      await sendWhatsAppNotification(client_phone, confirmMsg, {
        name: "booking_confirmed",
        params: [bookingId, client_name, service_title, dateStr, timeStr, "Confirmed"]
      });
    }
  }

  // 3. Meeting Link Added/Updated
  if (meetingChanged && meeting_link) {
    if (user_id) {
      await db.collection("notifications").add({
        user_id,
        type: "meeting_updated",
        title: "Meeting Link Added",
        message: `Meeting link for ${service_title} has been added: ${meeting_link}`,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
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
      await mailTransport.sendMail({
        from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      logger.error("Failed to send meeting link email:", e);
    }

    if (client_phone) {
      await sendWhatsAppNotification(client_phone, `Your meeting link for booking ${bookingId} has been added: ${meeting_link}`);
    }
  }

  // 4. Booking Cancelled
  if (statusChanged && status === "cancelled") {
    if (user_id) {
      await db.collection("notifications").add({
        user_id,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Your booking for ${service_title} (ID: ${bookingId}) has been cancelled.`,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
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
      await mailTransport.sendMail({
        from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
        to: client_email,
        subject: emailSubject,
        html: emailBody,
      });
    } catch (e) {
      logger.error("Failed to send cancelled email:", e);
    }
  }
});

const { onSchedule } = require("firebase-functions/v2/scheduler");

/**
 * Scheduled function running every 15 minutes to send booking reminders.
 */
exports.sendSessionReminders = onSchedule("every 15 minutes", async (event) => {
  logger.info("Executing scheduled session reminder check...");
  
  // 1. Fetch global settings
  let reminderHours = 24;
  let defaultMeetLink = "";
  try {
    const settingsDoc = await db.collection("settings").doc("global").get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      reminderHours = settings.reminder_hours_before || 24;
      defaultMeetLink = settings.google_meet_link || "";
    }
  } catch (err) {
    logger.error("Failed to fetch global settings for reminder:", err);
  }

  // 2. Fetch confirmed, upcoming bookings that haven't received reminders
  const now = new Date();
  try {
    const bookingsSnap = await db.collection("bookings")
      .where("status", "==", "confirmed")
      .get();

    logger.info(`Found ${bookingsSnap.size} confirmed bookings. Filtering for reminder eligibility...`);

    for (const docSnap of bookingsSnap.docs) {
      const booking = docSnap.data();
      
      // Skip if already sent or cancelled/completed
      if (booking.reminder_sent) continue;

      const startTime = new Date(booking.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Check if session is in the future and within the notification window
      if (diffHours > 0 && diffHours <= reminderHours) {
        const bookingId = docSnap.id;
        const { client_name, client_email, client_phone, service_title, meeting_link } = booking;
        const meetLink = meeting_link || defaultMeetLink;

        const dateStr = startTime.toLocaleDateString();
        const timeStr = startTime.toLocaleTimeString();

        logger.info(`Sending reminder for booking ${bookingId} to ${client_name} (${client_email})`);

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
              ${meetLink ? `<li><strong>Join Meeting:</strong> <a href="${meetLink}" style="color: #c5a880; font-weight: bold;">${meetLink}</a></li>` : ""}
            </ul>
          </div>
        `;

        try {
          await mailTransport.sendMail({
            from: process.env.SMTP_FROM || '"TheLifeHolics" <no-reply@thelifeholics.com>',
            to: client_email,
            subject: emailSubject,
            html: emailBody,
          });
        } catch (e) {
          logger.error(`Failed to send reminder email for booking ${bookingId}:`, e);
        }

        // Send WhatsApp
        if (client_phone) {
          const reminderMsg = `Hello ${client_name}, this is a reminder for your session "${service_title}" on ${dateStr} at ${timeStr}.${meetLink ? ` Join link: ${meetLink}` : ""}`;
          try {
            await sendWhatsAppNotification(client_phone, reminderMsg);
          } catch (e) {
            logger.error(`Failed to send reminder WhatsApp for booking ${bookingId}:`, e);
          }
        }

        // Mark as sent
        await docSnap.ref.update({
          reminder_sent: true,
          reminder_sent_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (err) {
    logger.error("Error in sendSessionReminders cron execution:", err);
  }
});

async function getEmailConfig() {
  try {
    const settingsSnap = await db.collection("settings").doc("notifications").get();
    if (settingsSnap.exists) {
      const data = settingsSnap.data();
      if (data.smtp_host && data.smtp_user) {
        return {
          smtp_host: data.smtp_host,
          smtp_port: parseInt(data.smtp_port || "465"),
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
          smtp_from: data.smtp_from || `"${data.sender_name || 'TheLifeHolics'}" <${data.smtp_user}>`,
        };
      }
    }

    const globalSnap = await db.collection("settings").doc("global").get();
    if (globalSnap.exists) {
      const data = globalSnap.data();
      if (data.smtp_host && data.smtp_user) {
        return {
          smtp_host: data.smtp_host,
          smtp_port: parseInt(data.smtp_port || "465"),
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
          smtp_from: data.smtp_from || `"${data.business_name || 'TheLifeHolics'}" <${data.smtp_user}>`,
        };
      }
    }
  } catch (e) {
    logger.error("Error reading SMTP settings from firestore:", e);
  }

  return {
    smtp_host: process.env.SMTP_HOST || "smtp.gmail.com",
    smtp_port: parseInt(process.env.SMTP_PORT || "465"),
    smtp_user: process.env.SMTP_USER || "",
    smtp_password: process.env.SMTP_PASSWORD || "",
    smtp_from: process.env.SMTP_FROM || '"TheLifeHolics" <info.lifeholics@gmail.com>',
  };
}

async function sendOtpEmail(to, otp) {
  const config = await getEmailConfig();
  if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
    logger.warn("SMTP settings not configured. Skipping OTP email.");
    throw new Error("SMTP credentials missing");
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_password,
    },
  });

  const subject = "Your Password Reset OTP - TheLifeHolics";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: #c5a880; text-align: center;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the reset. This OTP is valid for 10 minutes.</p>
      <div style="background: #fdfaf6; border: 1px dashed #c5a880; border-radius: 8px; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #c5a880; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #777;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.smtp_from,
    to,
    subject,
    html,
  });
}

exports.requestPasswordResetOtp = onCall({ cors: true }, async (request) => {
  try {
    const { email } = request.data;
    if (!email) {
      throw new Error("Email is required");
    }

    // Check if user exists in Firebase Auth
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      // Return success even if user not found to prevent user enumeration
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return { success: true, message: "OTP sent if account exists" };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to Firestore
    await db.collection("password_reset_otps").doc(email).set({
      email,
      otp,
      expiresAt,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email
    await sendOtpEmail(email, otp);

    logger.info(`OTP successfully sent to ${email}`);
    return { success: true, message: "OTP sent successfully" };
  } catch (err) {
    logger.error("Error in requestPasswordResetOtp:", err);
    throw new Error(err.message || "Failed to request OTP");
  }
});

exports.confirmPasswordResetOtp = onCall({ cors: true }, async (request) => {
  try {
    const { email, otp, newPassword } = request.data;
    if (!email || !otp || !newPassword) {
      throw new Error("Email, OTP, and newPassword are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const otpDoc = await db.collection("password_reset_otps").doc(email).get();
    if (!otpDoc.exists) {
      throw new Error("No OTP request found. Please request a new OTP.");
    }

    const data = otpDoc.data();
    if (data.otp !== otp) {
      throw new Error("Invalid OTP. Please try again.");
    }

    if (Date.now() > data.expiresAt) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    // Get user from Auth
    const user = await admin.auth().getUserByEmail(email);

    // Update password
    await admin.auth().updateUser(user.uid, { password: newPassword });

    // Delete OTP
    await db.collection("password_reset_otps").doc(email).delete();

    logger.info(`Password successfully reset for user ${email}`);
    return { success: true, message: "Password updated successfully" };
  } catch (err) {
    logger.error("Error in confirmPasswordResetOtp:", err);
    throw new Error(err.message || "Failed to confirm password reset");
  }
});



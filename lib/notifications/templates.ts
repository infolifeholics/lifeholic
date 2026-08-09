export interface TemplateVars {
  memberName: string;
  sessionDate?: string;
  sessionTime?: string;
  bookingId?: string;
  bookingStatus?: string;
  orgName?: string;
  supportEmail?: string;
  supportPhone?: string;
  resetLink?: string;
  certUrl?: string;
  recLetterUrl?: string;
  actionDetails?: string;
  meetLink?: string;
  window?: string; // reminder window label e.g. "24h", "2h", "30m"
  clientEmail?: string;
  clientPhone?: string;
}

const DEFAULT_VARS = {
  orgName: 'TheLifeHolics',
  supportEmail: 'info.lifeholics@gmail.com',
  supportPhone: '+919999999999',
};

function getBaseHtml(title: string, bodyContent: string, vars: TemplateVars): string {
  const org = vars.orgName || DEFAULT_VARS.orgName;
  const email = vars.supportEmail || DEFAULT_VARS.supportEmail;
  const phone = vars.supportPhone || DEFAULT_VARS.supportPhone;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f7f7f7;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f7f7;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #111111;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #d4af37;
      margin: 0;
      font-size: 24px;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .content h2 {
      margin-top: 0;
      color: #111111;
      font-size: 20px;
    }
    .details-box {
      background-color: #f9f9f9;
      border-left: 4px solid #d4af37;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .details-row {
      margin-bottom: 10px;
    }
    .details-row:last-child {
      margin-bottom: 0;
    }
    .label {
      font-weight: bold;
      color: #666666;
      width: 120px;
      display: inline-block;
    }
    .value {
      color: #111111;
    }
    .btn {
      display: inline-block;
      background-color: #d4af37;
      color: #111111 !important;
      text-decoration: none;
      padding: 12px 30px;
      font-weight: bold;
      border-radius: 30px;
      margin: 20px 0 0 0;
      text-align: center;
    }
    .footer {
      background-color: #f1f1f1;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e5e5e5;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #d4af37;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${org}</h1>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>Questions? Contact us at <a href="mailto:${email}">${email}</a> or call <a href="tel:${phone}">${phone}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${org}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const EMAIL_TEMPLATES = {
  welcome: (vars: TemplateVars) => {
    const content = `
      <h2>Welcome to ${vars.orgName || DEFAULT_VARS.orgName}, ${vars.memberName}!</h2>
      <p>Thank you for registering with us. We are dedicated to supporting your healing and transformation journey.</p>
      <p>You can now book healing sessions, enroll in somatic plan workshops, and track your progress in real-time on your dashboard.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/account" class="btn">Go to Dashboard</a>
    `;
    return getBaseHtml('Welcome to TheLifeHolics', content, vars);
  },

  booking_confirmation: (vars: TemplateVars) => {
    const content = `
      <h2>Your Session Booking with Lifeholics is Confirmed!</h2>
      <p>Hello ${vars.memberName},</p>
      <p>Your session booking request has been successfully received and confirmed. Here are the details:</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Booking ID:</span><span class="value">${vars.bookingId || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Session:</span><span class="value">${vars.actionDetails || 'Session'}</span></div>
        <div class="details-row"><span class="label">Date:</span><span class="value">${vars.sessionDate || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Time:</span><span class="value">${vars.sessionTime || 'N/A'} (IST)</span></div>
        ${vars.meetLink ? `<div class="details-row"><span class="label">Meeting Link:</span><span class="value"><a href="${vars.meetLink}" style="color:#d4af37; text-decoration:underline;">${vars.meetLink}</a></span></div>` : ''}
      </div>
      <div style="background-color: #fdfaf6; border: 1px solid #f5ebd5; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <strong style="color: #c5a880;">Kindly Note:</strong>
        <ul style="margin: 5px 0 0 15px; padding: 0; color: #555;">
          <li>Please join a few minutes before your scheduled time.</li>
          <li>Sessions are non-refundable.</li>
          <li>If you’re unable to attend, you may reschedule at least 48 hours in advance.</li>
          <li>Requests within 48 hours may not be accommodated.</li>
        </ul>
      </div>
      <p>We look forward to supporting you on your healing journey.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/account" class="btn">View Booking Details</a>
    `;
    return getBaseHtml('Booking Confirmed', content, vars);
  },

  booking_cancelled: (vars: TemplateVars) => {
    const content = `
      <h2>Session Booking Cancelled</h2>
      <p>Hello ${vars.memberName},</p>
      <p>Your session booking has been cancelled. If this was not requested by you, please reach out immediately.</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Booking ID:</span><span class="value">${vars.bookingId || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Date:</span><span class="value">${vars.sessionDate || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Time:</span><span class="value">${vars.sessionTime || 'N/A'} (IST)</span></div>
      </div>
      <p>Any payments made will be refunded or credited back to your balance according to our policy.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/booking" class="btn">Book Another Session</a>
    `;
    return getBaseHtml('Booking Cancelled', content, vars);
  },

  booking_reminder: (vars: TemplateVars) => {
    const windowLabel = vars.window ? `(${vars.window} before)` : '';
    const meetButton = vars.meetLink
      ? `<a href="${vars.meetLink}" class="btn" style="margin-top:8px;">Join Meeting Room</a>`
      : `<a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/account" class="btn">View Dashboard</a>`;
    const content = `
      <h2>Upcoming Session Reminder ${windowLabel}</h2>
      <p>Hello ${vars.memberName},</p>
      <p>This is a reminder that you have an upcoming healing session scheduled with us:</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Booking ID:</span><span class="value">${vars.bookingId || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Date:</span><span class="value">${vars.sessionDate || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Time:</span><span class="value">${vars.sessionTime || 'N/A'} (IST)</span></div>
        ${vars.meetLink ? `<div class="details-row"><span class="label">Meeting Link:</span><span class="value"><a href="${vars.meetLink}" style="color:#c5a880;">${vars.meetLink}</a></span></div>` : ''}
      </div>
      <p>Please be ready at least 5 minutes before your scheduled time.</p>
      ${meetButton}
    `;
    return getBaseHtml('Session Reminder', content, vars);
  },

  booking_status_changed: (vars: TemplateVars) => {
    const content = `
      <h2>Session Status Updated</h2>
      <p>Hello ${vars.memberName},</p>
      <p>The status of your session booking has been updated:</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Booking ID:</span><span class="value">${vars.bookingId || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Date:</span><span class="value">${vars.sessionDate || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Time:</span><span class="value">${vars.sessionTime || 'N/A'} (IST)</span></div>
        <div class="details-row"><span class="label">New Status:</span><span class="value" style="text-transform: capitalize; font-weight: bold; color: #22c55e;">${vars.bookingStatus || 'N/A'}</span></div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/account" class="btn">View Booking Details</a>
    `;
    return getBaseHtml('Booking Status Update', content, vars);
  },

  certificate_generated: (vars: TemplateVars) => {
    const content = `
      <h2>Congratulations! Your Certificate is Ready</h2>
      <p>Hello ${vars.memberName},</p>
      <p>We are delighted to share that your program completion certificate has been generated successfully.</p>
      <p>You can download it directly from your dashboard or click the button below to view it.</p>
      <a href="${vars.certUrl || '#'}" class="btn">Download Certificate</a>
    `;
    return getBaseHtml('Certificate Ready', content, vars);
  },

  rec_letter_generated: (vars: TemplateVars) => {
    const content = `
      <h2>Your Recommendation Letter is Ready</h2>
      <p>Hello ${vars.memberName},</p>
      <p>Your official recommendation letter has been compiled and is ready for download.</p>
      <a href="${vars.recLetterUrl || '#'}" class="btn">Download Letter</a>
    `;
    return getBaseHtml('Recommendation Letter Ready', content, vars);
  },

  password_reset: (vars: TemplateVars) => {
    const content = `
      <h2>Password Reset Request</h2>
      <p>Hello ${vars.memberName},</p>
      <p>We received a request to reset the password for your account. Click the button below to secure a new password:</p>
      <a href="${vars.resetLink || '#'}" class="btn">Reset Password</a>
      <p style="margin-top: 30px; font-size: 11px; color: #999999;">If you did not request a password reset, you can safely ignore this email.</p>
    `;
    return getBaseHtml('Password Reset Request', content, vars);
  },

  admin_alert: (vars: TemplateVars) => {
    const content = `
      <h2>System Administration Alert</h2>
      <p>Hello Admin,</p>
      <p>An administrative action was performed on the booking platform:</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Action:</span><span class="value" style="font-weight: bold;">${vars.bookingStatus || 'Notification'}</span></div>
        <div class="details-row"><span class="label">Performed By:</span><span class="value">${vars.memberName || 'N/A'}</span></div>
        ${vars.actionDetails ? `<div class="details-row"><span class="label">Details:</span><span class="value">${vars.actionDetails}</span></div>` : ''}
        ${vars.bookingId ? `<div class="details-row"><span class="label">Target ID:</span><span class="value">${vars.bookingId}</span></div>` : ''}
      </div>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/admin" class="btn">Open Admin Portal</a>
    `;
    return getBaseHtml('Admin System Alert', content, vars);
  },

  promo_offer: (vars: TemplateVars) => {
    const content = `
      <h2>Special Promo Offer: ${vars.actionDetails || 'Limited Time Discount'}</h2>
      <p>Hello,</p>
      <p>We are delighted to share a new discount offer with you at <strong>${vars.orgName || 'TheLifeHolics'}</strong>!</p>
      <div class="details-box" style="text-align: center; padding: 25px;">
        <p style="font-size: 13px; margin-bottom: 5px; color: #666666; text-transform: uppercase; tracking-spacing: 1px;">Use Code At Checkout:</p>
        <div style="font-size: 26px; font-weight: bold; color: #d4af37; border: 2px dashed #d4af37; display: inline-block; padding: 8px 25px; border-radius: 8px; letter-spacing: 2px; margin: 10px 0;">
          ${vars.bookingId || 'PROMO'}
        </div>
        <p style="font-size: 15px; font-weight: bold; margin-top: 15px; color: #111111;">
          Get ${vars.bookingStatus || 'Discount'} off on your next session!
        </p>
      </div>
      <p>Use it at checkout while booking your next session or enrolling in somatic workshops.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/booking" class="btn">Book Session Now</a>
    `;
    return getBaseHtml(vars.actionDetails || 'Special Promo Offer', content, vars);
  },

  community_admin_alert: (vars: TemplateVars) => {
    const content = `
      <h2>New Lifeholics Community Application</h2>
      <p>Hello Admin,</p>
      <p>A new application to join the Lifeholics Exclusive Community has been submitted.</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Name:</span><span class="value">${vars.memberName || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Email:</span><span class="value">${vars.clientEmail || 'N/A'}</span></div>
        <div class="details-row"><span class="label">Phone:</span><span class="value">${vars.clientPhone || 'N/A'}</span></div>
        <div class="details-row" style="margin-top: 15px;"><span class="label" style="display: block; width: 100%; margin-bottom: 5px; font-weight: bold;">Application Message:</span><div class="value" style="white-space: pre-wrap; background: #f9f9f9; padding: 10px; border-radius: 4px; border-left: 3px solid #d4af37; margin-top: 5px;">${vars.actionDetails || 'N/A'}</div></div>
        <div class="details-row" style="margin-top: 15px;"><span class="label">Status:</span><span class="value" style="font-weight: bold; color: #d4af37;">Pending</span></div>
        <div class="details-row"><span class="label">Submitted At:</span><span class="value">${vars.sessionDate || 'N/A'}</span></div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/admin" class="btn">Open Admin Portal</a>
    `;
    return getBaseHtml('New Community Application', content, vars);
  },

  community_user_confirmation: (vars: TemplateVars) => {
    const content = `
      <h2>Thank You for Your Interest in the Lifeholics Community</h2>
      <p>Hi ${vars.memberName},</p>
      <p>Thank you for your interest in joining the Lifeholics Exclusive Community.</p>
      <p>We have successfully received your application.</p>
      <p>Our team will personally review your application and get back to you after reviewing it.</p>
      <div class="details-box">
        <div class="details-row"><span class="label">Application Status:</span><span class="value" style="font-weight: bold; color: #d4af37;">Pending</span></div>
      </div>
      <p>We look forward to connecting with you.</p>
      <p style="margin-top: 20px; font-weight: bold; color: #d4af37;">— The Lifeholics Team</p>
    `;
    return getBaseHtml('Thank You for Your Interest in the Lifeholics Community', content, vars);
  },
};

export const WHATSAPP_TEMPLATES = {
  welcome: (vars: TemplateVars) => {
    return `Hello ${vars.memberName}, welcome to ${vars.orgName || DEFAULT_VARS.orgName}! Your account registration was successful. You can manage your bookings here: ${process.env.NEXT_PUBLIC_SITE_URL}/account`;
  },
  booking_confirmation: (vars: TemplateVars) => {
    return `Your session with Lifeholics is confirmed!\n\nHi ${vars.memberName},\n\nYour ${vars.actionDetails || 'session'} has been successfully booked.\n\n📅 Date: ${vars.sessionDate}\n🕒 Time: ${vars.sessionTime}\n\n🔗 Meeting Link:\n${vars.meetLink || 'Will be shared soon'}\n\nKindly Note:\n• Please join a few minutes before your scheduled time.\n• Sessions are non-refundable.\n• If you’re unable to attend, you may reschedule at least 48 hours in advance.\n• Requests within 48 hours may not be accommodated.\n\nWe look forward to supporting you on your healing journey.\n\nTeam Lifeholics`;
  },
  booking_cancelled: (vars: TemplateVars) => {
    return `Hello ${vars.memberName}, your booking (ID: ${vars.bookingId}) for ${vars.sessionDate} at ${vars.sessionTime} IST has been cancelled. Contact support for assistance.`;
  },
  booking_reminder: (vars: TemplateVars) => {
    const windowLabel = vars.window ? ` (${vars.window} reminder)` : '';
    const meetPart = vars.meetLink ? ` Join your session: ${vars.meetLink}` : ` Login to your dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}/account`;
    return `Reminder${windowLabel}: Hello ${vars.memberName}, you have an upcoming healing session (ID: ${vars.bookingId}) scheduled for ${vars.sessionDate} at ${vars.sessionTime} IST.${meetPart}`;
  },
  booking_status_changed: (vars: TemplateVars) => {
    if (vars.bookingStatus === 'confirmed') {
      return `Your session with Lifeholics is confirmed!\n\nHi ${vars.memberName},\n\nYour ${vars.actionDetails || 'session'} has been successfully booked.\n\n📅 Date: ${vars.sessionDate}\n🕒 Time: ${vars.sessionTime}\n\n🔗 Meeting Link:\n${vars.meetLink || 'Will be provided before the session'}\n\nKindly Note:\n• Please join a few minutes before your scheduled time.\n• Sessions are non-refundable.\n• If you’re unable to attend, you may reschedule at least 48 hours in advance.\n• Requests within 48 hours may not be accommodated.\n\nWe look forward to supporting you on your healing journey.\n\nTeam Lifeholics`;
    }
    return `Hello ${vars.memberName}, the status of your booking (ID: ${vars.bookingId}) has been updated to: *${vars.bookingStatus?.toUpperCase()}*. Details: ${process.env.NEXT_PUBLIC_SITE_URL}/account`;
  },
  certificate_generated: (vars: TemplateVars) => {
    return `Congratulations ${vars.memberName}! Your program completion certificate is ready. View/Download it here: ${vars.certUrl || (process.env.NEXT_PUBLIC_SITE_URL + '/account')}`;
  },
  rec_letter_generated: (vars: TemplateVars) => {
    return `Hello ${vars.memberName}, your official recommendation letter is ready. Download it here: ${vars.recLetterUrl || (process.env.NEXT_PUBLIC_SITE_URL + '/account')}`;
  },
  password_reset: (vars: TemplateVars) => {
    return `Hello ${vars.memberName}, a password reset was requested for your account. If you did not request this, please contact support immediately.`;
  },
  admin_alert: (vars: TemplateVars) => {
    if (vars.bookingStatus === 'New Booking') {
      return `📌 New Session Booking\n\nA new session has been booked.\n\nName: ${vars.memberName}\nPhone: ${vars.clientPhone || 'N/A'}\nEmail: ${vars.clientEmail || 'N/A'}\nSession: ${vars.actionDetails || 'N/A'}\nDate: ${vars.sessionDate || 'N/A'}\nTime: ${vars.sessionTime || 'N/A'}\nMeeting Link: ${vars.meetLink || 'N/A'}\n\nPlease review the booking and prepare for the session.`;
    }
    return `[Admin Alert] Action: ${vars.bookingStatus}. User: ${vars.memberName}. Details: ${vars.actionDetails || 'None'}.`;
  },
  promo_offer: (vars: TemplateVars) => {
    return `Hello! Get ${vars.bookingStatus} off on your next session at TheLifeHolics using coupon code: ${vars.bookingId}. Book here: ${process.env.NEXT_PUBLIC_SITE_URL}/booking`;
  },
  community_admin_alert: (vars: TemplateVars) => {
    return `New Lifeholics Community Application\n\nName: ${vars.memberName}\nEmail: ${vars.clientEmail || 'N/A'}\nPhone: ${vars.clientPhone || 'N/A'}\n\nReason:\n${vars.actionDetails}\n\nStatus: Pending`;
  },
  community_user_confirmation: (vars: TemplateVars) => {
    return `Hi ${vars.memberName},\n\nThank you for applying to join the Lifeholics Exclusive Community.\n\nYour application has been successfully received and is currently under review.\n\nOur team will personally review your application and get back to you soon.\n\nStatus: Pending\n\n— The Lifeholics Team`;
  },
};

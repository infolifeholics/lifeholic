import { NextResponse } from 'next/server';
import { EMAIL_TEMPLATES } from '@/lib/notifications/templates';
import { sendEmailNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/notifications/email';

export async function POST(req: Request) {
  // Only allow execution if in EMAIL_DEMO_MODE to prevent production abuse
  if (process.env.EMAIL_DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Email demo mode is disabled in production settings.' },
      { status: 403 }
    );
  }

  const results: Record<string, { success: boolean; error?: string }> = {};

  const dummyVars = {
    memberName: 'John Doe',
    sessionDate: '2026-08-20',
    sessionTime: '10:00 AM - 11:00 AM',
    bookingId: 'BK-TEST-123',
    bookingStatus: 'confirmed',
    orgName: 'LifeHolics',
    supportEmail: 'support@thelifeholics.com',
    supportPhone: '+918006880222',
    resetLink: 'https://thelifeholics.com/auth/reset-password?token=test-token',
    certUrl: 'https://thelifeholics.com/certificates/cert-test.pdf',
    recLetterUrl: 'https://thelifeholics.com/recs/rec-test.pdf',
    actionDetails: 'Deep Transformation Healing Session',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    window: '24h',
    clientEmail: 'john.doe.test@example.com',
    clientPhone: '+919999999999'
  };

  // 1. Send all templates in templates.ts
  for (const [name, getHtml] of Object.entries(EMAIL_TEMPLATES)) {
    try {
      const html = getHtml(dummyVars);
      const subject = `Test notification: ${name}`;
      await sendEmailNotification({
        to: 'user@example.com',
        subject,
        html
      });
      results[name] = { success: true };
    } catch (err: any) {
      results[name] = { success: false, error: err.message || err };
    }
  }

  // 2. Send inline OTP template
  try {
    const otpSubject = 'Your Password Reset OTP - TheLifeHolics';
    const otpHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #c5a880; text-align: center;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the reset. This OTP is valid for 10 minutes.</p>
        <div style="background: #fdfaf6; border: 1px dashed #c5a880; border-radius: 8px; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #c5a880; margin: 20px 0;">
          987654
        </div>
        <p style="font-size: 12px; color: #777;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;
    await sendEmail('user@example.com', otpSubject, otpHtml);
    results['otp_email'] = { success: true };
  } catch (err: any) {
    results['otp_email'] = { success: false, error: err.message || err };
  }

  // 3. Send free call booking template
  try {
    const freeCallHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #c5a880; margin-bottom: 20px;">New Free 10-Minute Discovery Call Booked</h2>
        <p>A new Discovery Call has been requested.</p>
        <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Booking ID:</strong> FC-TEST-123</p>
          <p><strong>Name:</strong> John Doe</p>
          <p><strong>Phone:</strong> +919999999999</p>
          <p><strong>Service Page:</strong> Personal Healing & Clarity</p>
          <p><strong>Date:</strong> 2026-08-20</p>
          <p><strong>Time:</strong> 10:00 AM (IST)</p>
          <p><strong>Duration:</strong> 10 Minutes</p>
          <p><strong>Status:</strong> Pending</p>
        </div>
        <p>Please check the admin panel to update its status once contacted.</p>
      </div>
    `;
    await sendEmailNotification({
      to: 'admin@example.com',
      subject: `[ADMIN] New Free Call Booked - John Doe`,
      html: freeCallHtml
    });
    results['free_call_admin_alert'] = { success: true };
  } catch (err: any) {
    results['free_call_admin_alert'] = { success: false, error: err.message || err };
  }

  // 4. Send newsletter template
  try {
    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TheLifeHolics</title>
        <style>
          body { font-family: sans-serif; background-color: #f7f7f7; margin: 0; padding: 0; color: #333; }
          .wrapper { width: 100%; background-color: #f7f7f7; padding: 20px 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
          .header { background-color: #111111; padding: 20px; text-align: center; color: white; }
          .content { padding: 30px; line-height: 1.6; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; background-color: #fafafa; }
          .btn { background-color: #c5a880; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>THE LIFEHOLICS</h1>
            </div>
            <div class="content">
              <h2>Welcome to the Circle</h2>
              <p>Thank you for subscribing to stay connected with LifeHolics. You will be the first to receive our latest insights, updates, and future newsletters straight to your inbox.</p>
              <p>Let's begin this journey of deeper self-exploration and awareness together.</p>
              <a href="https://thelifeholics.com" class="btn">Explore LifeHolics</a>
            </div>
            <div class="footer">
              <p>Crafted with intention.</p>
              <p>Questions? Contact us at <a href="mailto:support@thelifeholics.com">support@thelifeholics.com</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail('subscriber@example.com', 'Welcome to TheLifeHolics!', welcomeHtml);
    results['newsletter_welcome'] = { success: true };
  } catch (err: any) {
    results['newsletter_welcome'] = { success: false, error: err.message || err };
  }

  return NextResponse.json({
    message: 'Demo emails test complete. Checked in EMAIL_DEMO_MODE=true.',
    results
  });
}

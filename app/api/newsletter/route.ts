import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/notifications/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const colRef = adminDb.collection('newsletter');
    const emailStr = email.trim().toLowerCase();
    const snap = await colRef.where('email', '==', emailStr).get();

    if (snap.empty) {
      await colRef.add({
        email: emailStr,
        created_at: new Date().toISOString(),
      });

      // Send a welcome email to the subscriber
      try {
        const welcomeHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to TheLifeHolics</title>
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #161210;
                margin: 0;
                padding: 0;
                color: #ffffff;
              }
              .wrapper {
                width: 100%;
                background-color: #110e0d;
                padding: 40px 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #161210;
                border: 1px solid rgba(212, 175, 55, 0.2);
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
              }
              .header {
                background-color: #110e0d;
                padding: 40px 30px;
                text-align: center;
                border-bottom: 1px solid rgba(212, 175, 55, 0.15);
              }
              .header h1 {
                color: #d4af37;
                margin: 0;
                font-size: 28px;
                font-weight: 500;
                letter-spacing: 2px;
              }
              .content {
                padding: 50px 40px;
                line-height: 1.8;
                text-align: center;
              }
              .content h2 {
                margin-top: 0;
                color: #ffffff;
                font-size: 22px;
                font-weight: 400;
                letter-spacing: 1px;
              }
              .content p {
                color: rgba(255, 255, 255, 0.8);
                font-size: 15px;
                margin-bottom: 30px;
              }
              .btn {
                display: inline-block;
                background-color: #d4af37;
                color: #161210 !important;
                text-decoration: none;
                padding: 14px 35px;
                font-weight: bold;
                border-radius: 30px;
                letter-spacing: 1px;
                box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
                transition: all 0.3s ease;
              }
              .footer {
                background-color: #110e0d;
                padding: 30px;
                text-align: center;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                border-top: 1px solid rgba(212, 175, 55, 0.1);
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
                  <h1>THE LIFEHOLICS</h1>
                </div>
                <div class="content">
                  <h2>Welcome to the Circle</h2>
                  <p>Thank you for subscribing to stay connected with LifeHolics. You will be the first to receive our latest insights, updates, and future newsletters straight to your inbox.</p>
                  <p>Let's begin this journey of deeper self-exploration and awareness together.</p>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelifeholics.com'}" class="btn">Explore LifeHolics</a>
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
        await sendEmail(
          emailStr,
          'Welcome to TheLifeHolics!',
          welcomeHtml
        );
      } catch (emailErr) {
        console.error('[Newsletter] Failed to send welcome email:', emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

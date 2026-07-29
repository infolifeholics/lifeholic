import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/notifications/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(email);
    } catch (e: any) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ ok: true, message: 'OTP sent if account exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to Firestore
    await adminDb.collection('password_reset_otps').doc(email).set({
      email,
      otp,
      expiresAt,
      created_at: new Date(),
    });

    // Send email
    const subject = 'Your Password Reset OTP - TheLifeHolics';
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

    await sendEmail(email, subject, html);

    return NextResponse.json({ ok: true, message: 'OTP sent successfully' });
  } catch (err: any) {
    console.error('[API Forgot Password] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and newPassword are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const otpDoc = await adminDb.collection('password_reset_otps').doc(email).get();
    if (!otpDoc.exists) {
      return NextResponse.json({ error: 'No OTP request found. Please request a new OTP.' }, { status: 400 });
    }

    const data = otpDoc.data();
    if (!data || data.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

    if (Date.now() > data.expiresAt) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Get user from Auth
    const user = await adminAuth.getUserByEmail(email);

    // Update password
    await adminAuth.updateUser(user.uid, { password: newPassword });

    // Delete OTP
    await adminDb.collection('password_reset_otps').doc(email).delete();

    return NextResponse.json({ ok: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('[API Reset Password OTP] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

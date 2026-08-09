import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { queueNotification } from '@/lib/notifications/notification-service';
import { logSystemError } from '@/lib/error-tracker';

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    // Simple phone formatting check (digits, plus, dashes, spaces) - at least 8 chars
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required.' }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Please enter a message explaining why you would like to join.' }, { status: 400 });
    }

    // 2. Prevent duplicate pending applications
    const q = query(
      collection(db, 'community_applications'),
      where('email', '==', email.trim().toLowerCase()),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'You already have a pending Community application. Our team will get back to you after reviewing it.' },
        { status: 400 }
      );
    }

    // 3. Create document in firestore
    const newDoc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      message: message.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'community_applications'), newDoc);

    // 4. Send Notifications
    try {
      // 4a. Admin alert (Email + WhatsApp)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info.lifeholics@gmail.com';
      const adminPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';
      const formattedDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) + ' IST';

      await queueNotification(
        'community_admin_alert',
        adminEmail,
        adminPhone,
        {
          memberName: name.trim(),
          clientEmail: email.trim().toLowerCase(),
          clientPhone: phone.trim(),
          actionDetails: message.trim(), // reason/message
          sessionDate: formattedDate,
        }
      );

      // 4b. User confirmation (Email + WhatsApp)
      await queueNotification(
        'community_user_confirmation',
        email.trim().toLowerCase(),
        phone.trim(),
        {
          memberName: name.trim(),
        }
      );
    } catch (notifErr: any) {
      // Notification failure should NOT fail the application itself
      console.error('[API Community] Notification dispatch failed:', notifErr);
      await logSystemError(
        `Failed to queue notifications for community application of ${email}: ${notifErr.message || notifErr}`,
        'Email',
        { error: notifErr }
      );
    }

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error('[API Community] Server error:', error);
    await logSystemError(
      `API community endpoint failed: ${error.message || error}`,
      'API',
      { error }
    );
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

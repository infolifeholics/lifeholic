import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { rateLimiter, getIpFromRequest } from '@/lib/rate-limit';
import { sendEmailNotification, sendWhatsAppNotification } from '@/lib/notifications';
import { z } from 'zod';

const freeCallSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^(?:\+91|91)?[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  service_id: z.string().min(1, 'Service ID is required'),
  service_name: z.string().min(1, 'Service Name is required'),
});

export async function POST(req: Request) {
  try {
    const ip = getIpFromRequest(req);
    const limitCheck = rateLimiter(ip, { limit: 10, windowMs: 60 * 1000 });
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = freeCallSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid parameters.';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { name, phone, date, start_time, end_time, service_id, service_name } = parsed.data;

    // Normalize phone number (remove any leading +91 or 91 to get 10 digits)
    const normalizedPhone = phone.replace(/^(?:\+91|91)/, '').replace(/[^0-9]/g, '');

    // 1. Prevent past bookings
    if (new Date(start_time).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot book slots in the past.' }, { status: 400 });
    }

    // 2. Duplicate Booking Protection for the same phone number (active pending/contacted)
    const duplicateSnap = await adminDb.collection('free_call_bookings')
      .where('phone', '==', normalizedPhone)
      .where('status', 'in', ['pending', 'contacted'])
      .get();
    if (!duplicateSnap.empty) {
      return NextResponse.json(
        { error: 'You already have an active pending Discovery Call request.' },
        { status: 409 }
      );
    }

    // 3. Double Booking prevention for the same time slot
    // Check paid bookings
    const paidClashSnap = await adminDb.collection('bookings')
      .where('start_time', '==', start_time)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();
    if (!paidClashSnap.empty) {
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 409 });
    }

    // Check free call bookings
    const freeClashSnap = await adminDb.collection('free_call_bookings')
      .where('start_time', '==', start_time)
      .get();
    const activeFreeClashes = freeClashSnap.docs
      .map(d => d.data())
      .filter((f: any) => f.status !== 'cancelled');

    if (activeFreeClashes.length > 0) {
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 409 });
    }

    // 4. Save free call booking
    const bookingDoc = {
      name,
      phone: normalizedPhone,
      date,
      start_time,
      end_time,
      duration: 10,
      status: 'pending',
      serviceId: service_id,
      serviceName: service_name,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('free_call_bookings').add(bookingDoc);

    // 5. Trigger Admin Notifications (Failures should not fail the booking itself)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';
    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';

    const formattedDate = new Date(start_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const formattedTime = new Date(start_time).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Send Email
    try {
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #c5a880; margin-bottom: 20px;">New Free 10-Minute Discovery Call Booked</h2>
          <p>A new Discovery Call has been requested.</p>
          <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Booking ID:</strong> ${docRef.id}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> +91${normalizedPhone}</p>
            <p><strong>Service Page:</strong> ${service_name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime} (IST)</p>
            <p><strong>Duration:</strong> 10 Minutes</p>
            <p><strong>Status:</strong> Pending</p>
          </div>
          <p>Please check the admin panel to update its status once contacted.</p>
        </div>
      `;

      await sendEmailNotification({
        to: adminEmail,
        subject: `[ADMIN] New Free Call Booked - ${name}`,
        html: emailBody,
      });
    } catch (err) {
      console.error('[FreeCall API] Failed to send admin notification email:', err);
    }

    // Send WhatsApp
    try {
      const whatsappMsg = `📞 *New Free Call Booking*\n\nA new 10-minute free call has been booked.\n\n👤 *Name:* ${name}\n📱 *Phone:* +91${normalizedPhone}\n💼 *Service:* ${service_name}\n📅 *Date:* ${formattedDate}\n🕒 *Time:* ${formattedTime} (IST)\n⏳ *Duration:* 10 minutes\n🆔 *Booking ID:* ${docRef.id}\n\nPlease check the admin panel for complete details.`;
      await sendWhatsAppNotification(ownerPhone, whatsappMsg);
    } catch (err) {
      console.error('[FreeCall API] Failed to send admin WhatsApp message:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Your Free Call is Booked!',
      booking: { id: docRef.id, ...bookingDoc },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Free call booking error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

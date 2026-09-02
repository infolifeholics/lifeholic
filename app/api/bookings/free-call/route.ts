import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { rateLimiter, getIpFromRequest } from '@/lib/rate-limit';
import { sendEmailNotification, sendWhatsAppNotification } from '@/lib/notifications';
import { z } from 'zod';

const freeCallSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  preferred_time: z.string().optional().default('Anytime'),
  note: z.string().optional().default(''),
  service_id: z.string().optional().default('general'),
  service_name: z.string().optional().default('Discovery Call'),
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

    const { name, phone, email, preferred_time, note, service_id, service_name } = parsed.data;

    // Clean phone number
    const cleanPhone = phone.trim();

    // 1. Save Discovery Call lead
    const bookingDoc = {
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      preferred_time: preferred_time || 'Anytime',
      note: note ? note.trim() : '',
      duration: 10,
      status: 'pending',
      serviceId: service_id,
      serviceName: service_name,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('free_call_bookings').add(bookingDoc);

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'support@thelifeholics.com';
    const ownerPhone = process.env.WASENDER_OWNER_PHONE || '917485001044';

    // 2. Send User Confirmation Email
    try {
      const userEmailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 16px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #c5a880; font-size: 26px; margin: 0; font-weight: 700;">The LifeHolics</h1>
            <p style="color: #666; font-size: 14px; margin-top: 4px;">Holistic Health & Wellness</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #1a1a1a;">
            Hi <strong>${name}</strong>, ✨
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #333; margin-top: 16px;">
            Thank you for booking your Free 10-Minute Discovery Call with LifeHolics. 🤍
          </p>

          <p style="font-size: 15px; line-height: 1.6; color: #333; margin-top: 16px;">
            This call is a space for you to get a basic understanding of our healing sessions, workshops, products, or anything else you’d like to know about how we work.
          </p>

          <p style="font-size: 15px; line-height: 1.6; color: #333; margin-top: 16px;">
            Since the call is only 10 minutes, it is not a space for detailed sharing of personal issues or for addressing specific life situations. It is simply an opportunity to ask your questions, understand the process, and see what may be right for you.
          </p>

          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
            With Love,<br />
            <strong>The LifeHolics 🌿</strong>
          </div>
        </div>
      `;

      await sendEmailNotification({
        to: email,
        subject: `Your Discovery Call Request Received — The LifeHolics`,
        html: userEmailHtml,
      });
    } catch (err) {
      console.error('[FreeCall API] Failed to send user confirmation email:', err);
    }

    // 3. Send Admin Notification Email
    try {
      const adminEmailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #c5a880; margin-bottom: 20px;">New Free 10-Minute Discovery Call Requested</h2>
          <p>A new Discovery Call callback lead has been received from the website.</p>
          <div style="background-color: #fdfaf6; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Lead ID:</strong> ${docRef.id}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> <a href="tel:${cleanPhone}">${cleanPhone}</a></p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Service Page:</strong> ${service_name}</p>
            <p><strong>Preferred Timing:</strong> ${preferred_time}</p>
            ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
            <p><strong>Status:</strong> Pending</p>
          </div>
          <p>Please check the Admin Panel to review and mark as contacted.</p>
        </div>
      `;

      await sendEmailNotification({
        to: adminEmail,
        subject: `[LEAD] New Discovery Call Request - ${name}`,
        html: adminEmailHtml,
      });
    } catch (err) {
      console.error('[FreeCall API] Failed to send admin notification email:', err);
    }

    // 4. Send Admin WhatsApp Notification
    try {
      const whatsappMsg = `📞 *New Discovery Call Request*\n\nA new 10-minute free discovery call inquiry has been received.\n\n👤 *Name:* ${name}\n📱 *Phone:* ${cleanPhone}\n✉️ *Email:* ${email}\n💼 *Service:* ${service_name}\n🕒 *Preferred Time:* ${preferred_time}\n${note ? `📝 *Note:* ${note}\n` : ''}🆔 *Lead ID:* ${docRef.id}\n\nPlease check the Admin Panel for full details.`;
      await sendWhatsAppNotification(ownerPhone, whatsappMsg);
    } catch (err) {
      console.error('[FreeCall API] Failed to send admin WhatsApp message:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Your Discovery Call Request is Received!',
      booking: { id: docRef.id, ...bookingDoc },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Free call booking error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

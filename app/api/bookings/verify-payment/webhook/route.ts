import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { triggerBookingNotification, triggerOrderNotification, triggerWorkshopNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload.payment?.entity;
      const order = event.payload.order?.entity;
      const orderId = payment?.order_id || order?.id || event.payload.payment_link?.entity?.order_id;
      const paymentId = payment?.id || 'webhook_' + Math.random().toString(36).substring(7);

      if (!orderId) {
        return NextResponse.json({ ok: true, note: 'No order ID found in webhook payload.' });
      }

      // ─── 1. CHECK BOOKINGS ───
      const bookingSnap = await adminDb.collection('bookings').where('order_id', '==', orderId).get();
      if (!bookingSnap.empty) {
        const bookingDoc = bookingSnap.docs[0];
        const bookingId = bookingDoc.id;
        const b = bookingDoc.data();

        if (b && b.payment_status !== 'paid') {
          const timeline = b.status_timeline || [];
          const updatedTimeline = [
            ...timeline,
            {
              status: 'Payment Successful',
              timestamp: new Date().toISOString(),
              updated_by: 'Razorpay Webhook',
              note: `Payment ID ${paymentId} verified via webhook.`
            },
            {
              status: 'booked',
              timestamp: new Date().toISOString(),
              updated_by: 'System',
              note: 'Booking confirmed automatically after webhook verification.'
            }
          ];

          const paymentHistory = b.payment_history || [];
          const updatedHistory = [
            ...paymentHistory,
            {
              payment_status: 'paid',
              timestamp: new Date().toISOString(),
              amount: b.amount || 0,
              currency: b.currency || 'INR',
            }
          ];

          const updatedBooking = {
            payment_status: 'paid',
            status: 'booked',
            payment_verified: true,
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            status_timeline: updatedTimeline,
            payment_history: updatedHistory,
            updated_at: new Date().toISOString()
          };

          await adminDb.collection('bookings').doc(bookingId).set(updatedBooking, { merge: true });

          // Handle package initialization for somatic plans OR multi-session services
          const isSomatic = b.is_somatic_plan === true;
          const isService = !isSomatic && b.service_id && !b.service_id.startsWith('somatic_');
          
          let totalSessions = 1;
          let packageName = isSomatic ? (b.somatic_plan_name || 'Somatic Plan') : (b.service_title || 'Service Plan');
          if (isSomatic && b.somatic_plan_name) {
            if (b.somatic_plan_name.toLowerCase().includes('essential')) {
              packageName = 'Personal Healing & Clarity Session';
            } else if (b.somatic_plan_name.toLowerCase().includes('elite')) {
              packageName = 'Ancestral Healing Session';
            } else if (b.somatic_plan_name.toLowerCase().includes('premium')) {
              packageName = '4-Week Deep Transformation Program';
            }
          }
          let packageType: 'somatic_plan' | 'service' = isSomatic ? 'somatic_plan' : 'service';
          
          if (isSomatic && b.user_id) {
            try {
              const somaticDocRef = adminDb.collection('settings').doc('somatic_plans');
              const somaticSnap = await somaticDocRef.get();
              let key = 'premium';
              const planNameLower = (b.somatic_plan_name || '').toLowerCase();
              if (planNameLower.includes('essential') || planNameLower.includes('clarity')) {
                key = 'essential';
              } else if (planNameLower.includes('elite') || planNameLower.includes('ancestral')) {
                key = 'elite';
              }
              if (somaticSnap.exists) {
                const sData = somaticSnap.data();
                if (sData) {
                  totalSessions = sData[`${key}_sessions`] ?? (key === 'essential' ? 1 : key === 'premium' ? 4 : 8);
                }
              } else {
                totalSessions = key === 'essential' ? 1 : key === 'premium' ? 4 : 8;
              }
            } catch (err) {
              console.error('Error fetching somatic plans settings:', err);
              totalSessions = 4; // fallback
            }
          } else if (isService && b.user_id) {
            try {
              const serviceDocRef = adminDb.collection('services').doc(b.service_id);
              const serviceSnap = await serviceDocRef.get();
              if (serviceSnap.exists) {
                const sData = serviceSnap.data();
                if (sData) {
                  totalSessions = sData.included_sessions || 1;
                  packageName = sData.title || packageName;
                }
              }
            } catch (err) {
              console.error('Error fetching service details:', err);
            }
          }

          if (totalSessions >= 1 && b.user_id) {
            try {
              const purchaseDate = new Date();
              const session1Start = b.start_time ? new Date(b.start_time) : purchaseDate;
              const expiryDate = new Date(session1Start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity from Session 1
              
              let packageDocRef;
              if (isSomatic) {
                // Use user_id as doc ID for somatic plans to retain backward compatibility
                packageDocRef = adminDb.collection('somatic_packages').doc(b.user_id);
              } else {
                // Create new unique document for services
                packageDocRef = adminDb.collection('somatic_packages').doc();
              }

              await packageDocRef.set({
                user_id: b.user_id,
                client_name: b.client_name,
                client_email: b.client_email,
                purchase_date: purchaseDate.toISOString(),
                expiry_date: expiryDate.toISOString(),
                start_date: session1Start.toISOString(),
                validity_days: 30,
                status: 'active',
                package_type: packageType,
                package_name: packageName,
                service_id: isSomatic ? null : b.service_id,
                plan_key: isSomatic ? (packageName.toLowerCase().includes('essential') ? 'essential' : packageName.toLowerCase().includes('elite') ? 'elite' : 'premium') : null,
                total_sessions: totalSessions,
                completed_sessions: 0,
                remaining_sessions: totalSessions,
                booking_ids: [bookingId] // First session ID linked
              }, { merge: true });
              
              // Mark current session as session 1 and link package_id
              await adminDb.collection('bookings').doc(bookingId).set({
                session_number: 1,
                package_id: packageDocRef.id
              }, { merge: true });
            } catch (err) {
              console.error('[VerifyPayment Webhook] Error initializing package:', err);
            }
          }

          try {
            await triggerBookingNotification(bookingId, { ...b, ...updatedBooking }, 'confirmed');
          } catch (err) {
            console.error('[Notification Trigger Error]:', err);
          }

          await adminDb.collection('payments').doc(paymentId).set({
            booking_id: bookingId,
            payment_id: paymentId,
            order_id: orderId,
            amount: b.amount || 0,
            status: 'captured',
            created_at: new Date().toISOString(),
          });
        }
        return NextResponse.json({ ok: true, processed: 'booking' });
      }

      // ─── 2. CHECK SHOP ORDERS ───
      const orderSnap = await adminDb.collection('orders').where('payment_ref', '==', orderId).get();
      if (!orderSnap.empty) {
        const oDoc = orderSnap.docs[0];
        const orderIdDb = oDoc.id;
        const o = oDoc.data();

        if (o && o.payment_status !== 'paid') {
          const updatedOrder = {
            status: 'paid',
            payment_status: 'paid',
            payment_ref: paymentId,
            payment_provider: 'razorpay',
            updated_at: new Date().toISOString()
          };

          await adminDb.collection('orders').doc(orderIdDb).set(updatedOrder, { merge: true });

          try {
            await triggerOrderNotification(orderIdDb, { ...o, ...updatedOrder });
          } catch (err) {
            console.error('[Shop Webhook Notification Error]:', err);
          }

          if (o.coupon_code) {
            try {
              const couponSnap = await adminDb.collection('coupons')
                .where('code', '==', o.coupon_code.toUpperCase())
                .get();
              if (!couponSnap.empty) {
                const couponDoc = couponSnap.docs[0];
                const newUses = (couponDoc.data()?.uses || 0) + 1;
                await couponDoc.ref.set({ uses: newUses }, { merge: true });
              }
            } catch (err) {
              console.error('Error incrementing coupon uses via webhook:', err);
            }
          }

          await adminDb.collection('payments').doc(paymentId).set({
            order_id: orderIdDb,
            payment_id: paymentId,
            razorpay_order_id: orderId,
            amount: o.total || 0,
            currency: o.currency || 'INR',
            status: 'captured',
            created_at: new Date().toISOString(),
          });
        }
        return NextResponse.json({ ok: true, processed: 'shop_order' });
      }

      // ─── 3. CHECK WORKSHOP REGISTRATIONS ───
      const workshopSnap = await adminDb.collection('workshopRegistrations').where('order_id', '==', orderId).get();
      if (!workshopSnap.empty) {
        const regDoc = workshopSnap.docs[0];
        const registrationId = regDoc.id;
        const reg = regDoc.data();

        if (reg && reg.payment_status !== 'paid') {
          const wsRef = adminDb.collection('workshops').doc(reg.workshop_id);
          const host = req.headers.get('host') || 'localhost:3000';
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const ticketUrl = `${protocol}://${host}/workshops/${registrationId}/ticket?name=${encodeURIComponent(reg.client_name || '')}&email=${encodeURIComponent(reg.client_email || '')}&phone=${encodeURIComponent(reg.client_phone || '')}&workshop=${encodeURIComponent(reg.workshop_title || '')}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticketUrl)}`;

          await adminDb.runTransaction(async (transaction) => {
            const wsDoc = await transaction.get(wsRef);
            if (!wsDoc.exists) {
              throw new Error('Workshop not found.');
            }
            
            const seatsBooked = wsDoc.data()?.seats_booked || 0;
            const seatsTotal = wsDoc.data()?.seats_total || 0;
            
            transaction.update(wsRef, {
              seats_booked: Math.min(seatsTotal, seatsBooked + 1),
            });

            if (reg.coupon_code) {
              const couponRef = adminDb.collection('coupons').doc(reg.coupon_code.toUpperCase());
              const couponDoc = await transaction.get(couponRef);
              if (couponDoc.exists) {
                const currentCount = couponDoc.data()?.usage_count || 0;
                transaction.update(couponRef, {
                  usage_count: currentCount + 1
                });
              }
            }

            transaction.update(regDoc.ref, {
              payment_status: 'paid',
              status: 'confirmed',
              payment_id: paymentId,
              qr_code: qrCodeUrl,
            });
          });

          if (reg.user_id && reg.user_id !== 'anonymous') {
            await adminDb.collection('notifications').add({
              user_id: reg.user_id,
              type: 'workshop',
              title: 'Workshop Confirmed!',
              message: `Your ticket for "${reg.workshop_title}" is confirmed. Download your ticket inside your dashboard.`,
              read: false,
              created_at: new Date().toISOString(),
            });
          }

          try {
            await triggerWorkshopNotification(registrationId, { ...reg, payment_status: 'paid', status: 'confirmed' }, host, protocol);
          } catch (err) {
            console.error('Failed to trigger workshop webhook notifications:', err);
          }
        }
        return NextResponse.json({ ok: true, processed: 'workshop' });
      }
    }

    return NextResponse.json({ ok: true, note: 'No matching records found for this webhook event.' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

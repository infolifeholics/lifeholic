import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { triggerOrderNotification } from '@/lib/notifications';
import { fromRazorpayAmount, toRazorpayAmount } from '@/lib/currency';
import { createShiprocketOrder, buildShiprocketPayload } from '@/lib/shiprocket';
import { sendMetaPurchase } from '@/lib/meta-conversions';

async function claimMetaPurchase(orderDocRef: FirebaseFirestore.DocumentReference, eventId: string) {
  let claimed = false;
  await adminDb.runTransaction(async (transaction) => {
    claimed = false;
    const snapshot = await transaction.get(orderDocRef);
    if (!snapshot.exists) return;
    const order = snapshot.data() || {};
    const now = Date.now();
    if (order.purchase_event_id !== eventId || order.purchase_capi_status === 'sent') return;
    if (order.purchase_capi_status === 'sending' && (order.purchase_capi_lease_until || 0) > now) return;
    if ((order.purchase_capi_retry_after || 0) > now) return;

    transaction.update(orderDocRef, {
      purchase_capi_status: 'sending',
      purchase_capi_lease_until: now + 30000,
      purchase_capi_attempts: (order.purchase_capi_attempts || 0) + 1,
    });
    claimed = true;
  });
  return claimed;
}

async function recordMetaPurchaseResult(orderDocRef: FirebaseFirestore.DocumentReference, eventId: string, sent: boolean) {
  try {
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderDocRef);
      if (!snapshot.exists || snapshot.data()?.purchase_event_id !== eventId) return;
      transaction.update(orderDocRef, {
        purchase_capi_status: sent ? 'sent' : 'pending',
        purchase_capi_lease_until: 0,
        purchase_capi_retry_after: sent ? 0 : Date.now() + 60000,
        purchase_capi_updated_at: new Date().toISOString(),
      });
    });
  } catch {
    // Keep verification successful even if tracking state cannot be updated.
  }
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_id) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Verify signature cryptographically
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    const isMock = !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_live_') &&
      (razorpay_payment_id.startsWith('pay_mock_') || razorpay_order_id.startsWith('order_mock_'));

    if (isMock && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Demo payments are disabled in production.' }, { status: 400 });
    }
    if (isMock && (!razorpay_payment_id.startsWith('pay_mock_') || !razorpay_order_id.startsWith('order_mock_'))) {
      return NextResponse.json({ error: 'Invalid demo payment.' }, { status: 400 });
    }

    if (!isMock && generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid transaction signature.' }, { status: 400 });
    }

    // Retrieve order
    const orderDocRef = adminDb.collection('orders').doc(order_id);
    let orderSnap = await orderDocRef.get();
    let o: any;

    if (!orderSnap.exists) {
      console.warn(`[VerifyPayment] Order ${order_id} not found in Firestore. Attempting self-healing recovery...`);
      // Retrieve order metadata securely from Razorpay API to reconstruct
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

      if (keyId !== 'rzp_test_mockKey123') {
        try {
          const rzpOrderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: {
              'Authorization': 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
            }
          });

          if (rzpOrderResponse.ok) {
            const rzpOrder = await rzpOrderResponse.json();
            const notes = rzpOrder.notes || {};

            let itemsParsed = [];
            try {
              if (notes.items) {
                const simplifiedItems = JSON.parse(notes.items);
                for (const sItem of simplifiedItems) {
                  const prodSnap = await adminDb.collection('products').doc(sItem.id).get();
                  if (prodSnap.exists) {
                    const p = prodSnap.data() || {};
                    itemsParsed.push({
                      id: sItem.id,
                      slug: p.slug || '',
                      name: p.name || '',
                      price: sItem.p,
                      quantity: sItem.q,
                      image: p.image || '',
                      type: p.type || 'digital',
                    });
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing items from notes:', e);
            }

            let addressParsed = null;
            try {
              if (notes.address) {
                addressParsed = JSON.parse(notes.address);
              }
            } catch (e) {}

            const orderData = {
              number: rzpOrder.receipt || `THL-${Date.now().toString(36).toUpperCase()}`,
              email: notes.email || '',
              full_name: notes.full_name || null,
              phone: notes.phone || null,
              address: addressParsed,
              items: itemsParsed,
              total: fromRazorpayAmount(rzpOrder.amount, rzpOrder.currency || 'INR'),
              currency: rzpOrder.currency || 'INR',
              status: 'pending',
              payment_status: 'unpaid',
              payment_provider: 'razorpay',
              razorpay_order_id: rzpOrder.id,
              payment_ref: rzpOrder.id,
              coupon_code: notes.coupon_code || null,
              user_id: notes.user_id || null,
              created_at: new Date().toISOString(),
            };

            await orderDocRef.set(orderData);
            orderSnap = await orderDocRef.get();
          } else {
            console.error('Failed to retrieve Razorpay order during self-healing recovery:', await rzpOrderResponse.text());
          }
        } catch (err) {
          console.error('Error during self-healing recovery checkout:', err);
        }
      }
    }

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }
    o = orderSnap.data();
    const paymentDocRef = adminDb.collection('payments').doc(razorpay_payment_id);
    let capturedPayment: any = null;

    if (!isMock) {
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Payment verification is not configured.' }, { status: 503 });
      }

      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64') },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return NextResponse.json({ error: 'Could not verify payment with Razorpay.' }, { status: 502 });
      }
      capturedPayment = await response.json();
      if (
        capturedPayment.order_id !== razorpay_order_id ||
        capturedPayment.status !== 'captured' ||
        capturedPayment.captured !== true
      ) {
        return NextResponse.json({ error: 'Razorpay payment is not captured.' }, { status: 400 });
      }

      const expectedCurrency = String(o.currency || o.charged_currency || 'INR').toUpperCase();
      const expectedAmount = toRazorpayAmount(Number(o.total), expectedCurrency);
      if (
        !Number.isFinite(Number(o.total)) ||
        capturedPayment.amount !== expectedAmount ||
        String(capturedPayment.currency || '').toUpperCase() !== expectedCurrency
      ) {
        return NextResponse.json({ error: 'Razorpay payment does not match the order amount and currency.' }, { status: 400 });
      }
    }

    const candidateEventId = crypto.randomUUID();
    let newlyPaid = false;
    let eventId: string | null = null;
    let mergedOrder: any = null;

    try {
      await adminDb.runTransaction(async (transaction) => {
        newlyPaid = false;
        eventId = null;
        mergedOrder = null;
        const [currentOrderSnap, paymentSnap] = await Promise.all([
          transaction.get(orderDocRef),
          transaction.get(paymentDocRef),
        ]);
        if (!currentOrderSnap.exists) throw new Error('Order not found.');
        const currentOrder: any = currentOrderSnap.data() || {};
        const alreadyPaid = currentOrder.payment_status === 'paid' || currentOrder.status === 'paid';
        const paymentRecord: any = paymentSnap.exists ? paymentSnap.data() : null;
        const storedRazorpayOrderId = currentOrder.razorpay_order_id ||
          (alreadyPaid ? paymentRecord?.razorpay_order_id : currentOrder.payment_ref);

        if (paymentRecord && (paymentRecord.order_id !== order_id || paymentRecord.razorpay_order_id !== razorpay_order_id)) {
          throw new Error('Payment is already associated with another order.');
        }

        if (isMock) {
          if (razorpay_order_id !== `order_mock_${order_id}` || razorpay_payment_id !== `pay_mock_${order_id}`) {
            throw new Error('Demo payment does not match the stored order.');
          }
        } else if (storedRazorpayOrderId !== razorpay_order_id) {
          throw new Error('Razorpay order does not match the stored order.');
        }

        if (alreadyPaid && currentOrder.razorpay_payment_id && currentOrder.razorpay_payment_id !== razorpay_payment_id) {
          throw new Error('Order is already paid with a different payment.');
        }

        if (!isMock) {
          const expectedCurrency = String(currentOrder.currency || currentOrder.charged_currency || 'INR').toUpperCase();
          if (
            capturedPayment.order_id !== storedRazorpayOrderId ||
            capturedPayment.amount !== toRazorpayAmount(Number(currentOrder.total), expectedCurrency) ||
            String(capturedPayment.currency || '').toUpperCase() !== expectedCurrency
          ) {
            throw new Error('Razorpay payment no longer matches the stored order.');
          }
        }

        if (paymentRecord && paymentRecord.status !== (isMock ? 'mock' : 'captured')) {
          throw new Error('Payment record is not captured.');
        }

        if (!alreadyPaid) {
          const now = new Date().toISOString();
          const paymentData = {
            order_id,
            payment_id: razorpay_payment_id,
            razorpay_order_id,
            signature: razorpay_signature,
            amount: currentOrder.total || 0,
            currency: currentOrder.currency || 'INR',
            status: isMock ? 'mock' : 'captured',
            created_at: paymentRecord?.created_at || now,
          };
          transaction.set(paymentDocRef, paymentData, { merge: true });
          const update: Record<string, any> = {
            status: 'paid',
            order_status: 'processing',
            payment_status: 'paid',
            payment_method: currentOrder.payment_method || 'razorpay',
            payment_ref: razorpay_payment_id,
            razorpay_order_id,
            razorpay_payment_id,
            payment_provider: 'razorpay',
            updated_at: now,
          };
          if (!isMock) {
            eventId = currentOrder.purchase_event_id || candidateEventId;
            update.purchase_event_id = eventId;
            update.purchase_capi_status = currentOrder.purchase_capi_status || 'pending';
            update.purchase_capi_attempts = currentOrder.purchase_capi_attempts || 0;
          }
          transaction.set(orderDocRef, update, { merge: true });
          newlyPaid = true;
          mergedOrder = { ...currentOrder, ...update };
        } else {
          eventId = currentOrder.purchase_event_id || null;
          mergedOrder = currentOrder;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment verification failed.';
      const status = message === 'Order not found.' ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const hasConsent = req.cookies.get('thl_ad_consent')?.value === 'granted';
    const contents = (mergedOrder.items || []).filter((item: any) => item?.id);
    const purchase = !isMock && hasConsent && eventId
      ? {
          eventId,
          value: Number(mergedOrder.total),
          currency: String(mergedOrder.currency || 'INR').toUpperCase(),
          content_ids: contents.map((item: any) => String(item.id)),
          content_type: 'product',
          num_items: contents.reduce((count: number, item: any) => count + Math.max(0, Number(item.quantity) || 0), 0),
        }
      : null;

    const purchaseEventId = purchase ? eventId : null;
    if (purchase && purchaseEventId) {
      try {
        if (await claimMetaPurchase(orderDocRef, purchaseEventId)) {
          const sent = await sendMetaPurchase({
            eventId: purchaseEventId,
            value: purchase.value,
            currency: purchase.currency,
            contentIds: purchase.content_ids,
            numItems: purchase.num_items,
            requestUrl: req.url,
            headers: req.headers,
            cookies: req.cookies,
          });
          await recordMetaPurchaseResult(orderDocRef, purchaseEventId, sent);
        }
      } catch {
        // Meta tracking is best effort and must not affect verified payment.
      }
    }

    if (newlyPaid) {
    // Create Shiprocket PREPAID shipment (only for orders with physical items)
    const hasPhysical = (mergedOrder.items || []).some((i: any) => i.type === 'physical');
    if (hasPhysical) {
      try {
        // Idempotency: skip if Shiprocket order already exists
        if (!mergedOrder.shiprocket_order_id) {
          const srPayload = buildShiprocketPayload(mergedOrder, 'PREPAID');
          const srResult = await createShiprocketOrder(srPayload);
          if (srResult) {
            await orderDocRef.set({
              shiprocket_order_id: srResult.shiprocketOrderId,
              shipment_id: srResult.shipmentId,
              awb: srResult.awb,
              courier_name: srResult.courierName,
              tracking_url: srResult.trackingUrl,
              shipping_status: srResult.shippingStatus,
            }, { merge: true });
          }
        }
      } catch (srErr) {
        console.error('[VerifyPayment] Shiprocket error (non-fatal):', srErr);
      }
    }

    // Trigger Notification
    try {
      await triggerOrderNotification(order_id, mergedOrder);
    } catch (err) {
      console.error('[Shop Notification Trigger Error]:', err);
    }

    // Trigger Google Sheets Order Sync asynchronously
    try {
      const { syncOrderToGoogleSheet } = await import('@/lib/google-sheets');
      await syncOrderToGoogleSheet({
        id: order_id,
        number: mergedOrder.number,
        user_id: mergedOrder.user_id,
        full_name: mergedOrder.full_name,
        email: mergedOrder.email,
        phone: mergedOrder.phone,
        items: mergedOrder.items,
        subtotal: mergedOrder.subtotal,
        shipping: mergedOrder.shipping,
        total: mergedOrder.total,
        currency: mergedOrder.currency,
        payment_status: mergedOrder.payment_status,
        status: mergedOrder.status,
        order_status: mergedOrder.order_status,
        payment_ref: mergedOrder.payment_ref,
        created_at: mergedOrder.created_at,
        updated_at: mergedOrder.updated_at,
        address: mergedOrder.address,
        is_gift: Boolean(mergedOrder.is_gift || (mergedOrder.items || []).some((i: any) => i.is_gift)),
      });
    } catch (gsErr) {
      console.error('[VerifyPayment] Google Sheets sync error (non-fatal):', gsErr);
    }

    // Increment coupon usage if a code was used
    if (o.coupon_code) {
      try {
        const couponQuery = await adminDb.collection('coupons')
          .where('code', '==', o.coupon_code.toUpperCase())
          .get();
        if (!couponQuery.empty) {
          const couponDoc = couponQuery.docs[0];
          const newUses = ((couponDoc.data() || {}).uses || 0) + 1;
          await couponDoc.ref.update({ uses: newUses });
        }
      } catch (err) {
        console.error('Error incrementing coupon uses:', err);
      }
    }
    }

    return NextResponse.json({ ok: true, purchase });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}

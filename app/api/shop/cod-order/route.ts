import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createShiprocketOrder, buildShiprocketPayload } from '@/lib/shiprocket';
import { triggerOrderNotification } from '@/lib/notifications';

function orderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THL-${t}-${r}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, phone, address, items, coupon_code, user_id } = body || {};

    // COD is only available for India
    const deliveryCountry = (address?.country || '').trim().toLowerCase();
    if (deliveryCountry && deliveryCountry !== 'india') {
      return NextResponse.json(
        { error: 'Cash on Delivery is only available for India. Please use online payment.' },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });
    }

    // Ensure cart has at least one physical item (COD requires shipping)
    const hasPhysical = items.some((i: any) => i.type === 'physical');
    if (!hasPhysical) {
      return NextResponse.json(
        { error: 'COD is only available for physical products.' },
        { status: 400 }
      );
    }

    if (!address?.line1 || !address?.city || !address?.state || !address?.postal_code) {
      return NextResponse.json(
        { error: 'Complete shipping address is required for COD orders.' },
        { status: 400 }
      );
    }

    // Server-side price validation in INR (COD is always INR)
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const productSnap = await adminDb.collection('products').doc(item.id).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }
      const product = productSnap.data() || {};
      const price = product.price_inr || 0;
      calculatedSubtotal += price * item.quantity;

      validatedItems.push({
        id: item.id,
        slug: item.slug || product.slug,
        name: item.name || product.name,
        price: price,
        price_inr: price,
        quantity: item.quantity,
        image: item.image || product.image || '',
        type: item.type || product.type || 'physical',
      });
    }

    // Apply coupon (INR only)
    let calculatedDiscount = 0;
    if (coupon_code) {
      try {
        const couponSnap = await adminDb.collection('coupons').doc(coupon_code.toUpperCase()).get();
        if (couponSnap.exists) {
          const coupon = couponSnap.data() || {};
          const now = new Date();
          const isExpired = coupon.expiry_date && now > new Date(coupon.expiry_date);
          const limitReached = coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit;
          const isContextValid = !coupon.applicable_to || coupon.applicable_to === 'all' || coupon.applicable_to === 'shop';
          const isMinAmountValid = !coupon.min_amount || calculatedSubtotal >= coupon.min_amount;

          if (coupon.active !== false && !isExpired && !limitReached && isContextValid && isMinAmountValid) {
            if (coupon.type === 'percent') {
              calculatedDiscount = (calculatedSubtotal * coupon.value) / 100;
              if (coupon.max_discount && calculatedDiscount > coupon.max_discount) {
                calculatedDiscount = coupon.max_discount;
              }
            } else {
              calculatedDiscount = coupon.value;
            }
          }
        }
      } catch (err) {
        console.error('Error applying coupon in COD order:', err);
      }
    }

    // Shipping charge (INR)
    let shippingCharge = 0;
    try {
      const globalSnap = await adminDb.collection('settings').doc('global').get();
      if (globalSnap.exists) {
        const gData = globalSnap.data() || {};
        if (typeof gData.shipping_charge === 'number') {
          shippingCharge = gData.shipping_charge;
        }
      }
    } catch (err) {
      console.error('Error fetching shipping charge for COD:', err);
    }

    const totalInr = Math.max(0, calculatedSubtotal - calculatedDiscount + shippingCharge);
    const number = orderNumber();
    const now = new Date().toISOString();

    const orderData: Record<string, any> = {
      number,
      email,
      full_name: full_name || null,
      phone: phone || null,
      address: address || null,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      subtotal_inr: calculatedSubtotal,
      discount: calculatedDiscount,
      shipping: shippingCharge,
      total: totalInr,
      base_amount_inr: totalInr,
      currency: 'INR',
      base_currency: 'INR',
      charged_amount: totalInr,
      charged_currency: 'INR',
      exchange_rate: 1,
      status: 'processing',
      order_status: 'processing',
      payment_status: 'pending',
      payment_method: 'cod',
      payment_provider: 'cod',
      payment_ref: null,
      shipping_status: null,
      shiprocket_order_id: null,
      shipment_id: null,
      awb: null,
      courier_name: null,
      tracking_url: null,
      coupon_code: coupon_code || null,
      user_id: user_id || null,
      created_at: now,
    };

    const docRef = await adminDb.collection('orders').add(orderData);
    const orderId = docRef.id;

    // Trigger order notification
    try {
      await triggerOrderNotification(orderId, orderData);
    } catch (err) {
      console.error('[COD Order] Notification error:', err);
    }

    // Increment coupon usage
    if (coupon_code) {
      try {
        const couponQuery = await adminDb
          .collection('coupons')
          .where('code', '==', coupon_code.toUpperCase())
          .get();
        if (!couponQuery.empty) {
          const couponDoc = couponQuery.docs[0];
          const newUses = ((couponDoc.data() || {}).uses || 0) + 1;
          await couponDoc.ref.update({ uses: newUses });
        }
      } catch (err) {
        console.error('[COD Order] Coupon increment error:', err);
      }
    }

    // Create Shiprocket shipment (COD)
    try {
      const srPayload = buildShiprocketPayload({ ...orderData, id: orderId }, 'COD');
      const srResult = await createShiprocketOrder(srPayload);
      if (srResult) {
        await docRef.update({
          shiprocket_order_id: srResult.shiprocketOrderId,
          shipment_id: srResult.shipmentId,
          awb: srResult.awb,
          courier_name: srResult.courierName,
          tracking_url: srResult.trackingUrl,
          shipping_status: srResult.shippingStatus,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[COD Order] Shiprocket error (non-fatal):', err);
    }

    return NextResponse.json({ ok: true, id: orderId, number });
  } catch (error: any) {
    console.error('[COD Order] Error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}

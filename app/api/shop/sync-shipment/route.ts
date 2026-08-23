import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/shop/sync-shipment
 * Webhook endpoint for Shiprocket shipment status updates.
 * Configure this URL in Shiprocket dashboard → Webhooks.
 *
 * Also supports manual GET polling:
 * GET /api/shop/sync-shipment?order_id=<firestoreOrderId>
 */

// Shiprocket status → our internal order_status
function mapShiprocketStatus(srStatus: string): {
  orderStatus: string;
  shippingStatus: string;
} {
  const s = (srStatus || '').toLowerCase();
  if (s.includes('delivered')) {
    return { orderStatus: 'delivered', shippingStatus: 'delivered' };
  }
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) {
    return { orderStatus: 'out_for_delivery', shippingStatus: 'out_for_delivery' };
  }
  if (s.includes('in transit') || s.includes('in_transit')) {
    return { orderStatus: 'in_transit', shippingStatus: 'in_transit' };
  }
  if (s.includes('shipped') || s.includes('pickup done')) {
    return { orderStatus: 'shipped', shippingStatus: 'shipped' };
  }
  if (s.includes('rto') || s.includes('return')) {
    return { orderStatus: 'rto', shippingStatus: 'rto' };
  }
  return { orderStatus: 'processing', shippingStatus: srStatus || 'processing' };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Shiprocket sends different webhook payloads. Support common formats.
    const srOrderId =
      String(body?.order_id || body?.shipment?.order_id || body?.data?.order_id || '');
    const srStatus =
      String(body?.current_status || body?.status || body?.shipment?.status || '');
    const awb =
      String(body?.awb || body?.shipment?.awb || body?.data?.awb || '');
    const courierName =
      String(body?.courier_name || body?.shipment?.courier_name || '');

    if (!srOrderId) {
      return NextResponse.json({ error: 'Missing order_id in webhook payload.' }, { status: 400 });
    }

    // Find order by shiprocket_order_id
    const query = await adminDb
      .collection('orders')
      .where('shiprocket_order_id', '==', srOrderId)
      .limit(1)
      .get();

    if (query.empty) {
      console.warn('[SyncShipment] No order found for Shiprocket order_id:', srOrderId);
      return NextResponse.json({ ok: true, warn: 'Order not found' });
    }

    const orderDoc = query.docs[0];
    const orderData = orderDoc.data();
    const { orderStatus, shippingStatus } = mapShiprocketStatus(srStatus);

    const updatePayload: Record<string, any> = {
      shipping_status: shippingStatus,
      order_status: orderStatus,
      updated_at: new Date().toISOString(),
    };
    if (awb) updatePayload.awb = awb;
    if (courierName) updatePayload.courier_name = courierName;

    // If delivered + razorpay → mark as completed
    if (orderStatus === 'delivered' && orderData.payment_method === 'razorpay') {
      updatePayload.order_status = 'completed';
      updatePayload.status = 'completed';
    }

    // If delivered + COD → mark as delivered but keep payment_status pending
    // COD payment confirmed separately via admin or courier confirmation
    if (orderStatus === 'delivered' && orderData.payment_method === 'cod') {
      updatePayload.order_status = 'delivered';
      updatePayload.status = 'delivered';
      // payment_status stays 'pending' until COD is confirmed
    }

    await orderDoc.ref.update(updatePayload);

    return NextResponse.json({ ok: true, orderStatus, shippingStatus });
  } catch (error: any) {
    console.error('[SyncShipment] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

/** GET: manually sync a single order by Firestore order_id */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    if (!orderId) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const orderData = orderDoc.data() || {};
    const shipmentId = orderData.shipment_id;
    if (!shipmentId) {
      return NextResponse.json({ ok: true, message: 'No shipment linked to this order.' });
    }

    // Import dynamically to avoid circular issues
    const { getShipmentStatus } = await import('@/lib/shiprocket');
    const status = await getShipmentStatus(shipmentId);
    if (!status) {
      return NextResponse.json({ ok: true, message: 'Could not fetch status from Shiprocket.' });
    }

    const { orderStatus, shippingStatus } = mapShiprocketStatus(status.status);
    const updatePayload: Record<string, any> = {
      shipping_status: shippingStatus,
      order_status: orderStatus,
      updated_at: new Date().toISOString(),
    };
    if (status.awb) updatePayload.awb = status.awb;
    if (status.courierName) updatePayload.courier_name = status.courierName;

    if (orderStatus === 'delivered' && orderData.payment_method === 'razorpay') {
      updatePayload.order_status = 'completed';
      updatePayload.status = 'completed';
    }
    if (orderStatus === 'delivered' && orderData.payment_method === 'cod') {
      updatePayload.order_status = 'delivered';
      updatePayload.status = 'delivered';
    }

    await orderDoc.ref.update(updatePayload);

    return NextResponse.json({ ok: true, orderStatus, shippingStatus, awb: status.awb });
  } catch (error: any) {
    console.error('[SyncShipment GET] Error:', error);
    return NextResponse.json({ error: 'Failed to sync shipment.' }, { status: 500 });
  }
}

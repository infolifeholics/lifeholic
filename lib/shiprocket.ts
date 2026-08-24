/**
 * lib/shiprocket.ts
 * Centralized Shiprocket API service for TheLifeHolics shop.
 * Used ONLY for Product/Shop orders — never for sessions, bookings, or workshops.
 * All credentials are server-side only (no NEXT_PUBLIC_ prefix).
 */

const SHIPROCKET_API_URL =
  process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';

// Module-level token cache (valid for ~10 days per Shiprocket docs)
let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

/** Authenticate with Shiprocket and return a bearer token. Caches token for 9 days. */
async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn('[Shiprocket] SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not configured. Skipping.');
    return null;
  }

  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) {
    return _cachedToken;
  }

  try {
    const res = await fetch(`${SHIPROCKET_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      console.error('[Shiprocket] Auth failed:', await res.text());
      return null;
    }

    const data = await res.json();
    if (!data.token) {
      console.error('[Shiprocket] No token in auth response:', data);
      return null;
    }

    _cachedToken = data.token;
    // Cache for 9 days (token valid for 10 days per Shiprocket docs)
    _tokenExpiry = now + 9 * 24 * 60 * 60 * 1000;
    return _cachedToken;
  } catch (err) {
    console.error('[Shiprocket] Auth error:', err);
    return null;
  }
}

export interface ShiprocketOrderPayload {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: Array<{
    name: string;
    sku: string;
    units: number;
    sellingPrice: number;
    discount?: number;
    tax?: number;
  }>;
  totalAmountInr: number;
  paymentMethod: 'PREPAID' | 'COD';
  pickupLocation?: string;
}

export interface ShiprocketResult {
  shiprocketOrderId: string;
  shipmentId: string;
  awb: string;
  courierName: string;
  trackingUrl: string;
  shippingStatus: string;
}

export async function createShiprocketOrder(
  payload: ShiprocketOrderPayload
): Promise<ShiprocketResult | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  const {
    orderNumber,
    orderDate,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    items,
    totalAmountInr,
    paymentMethod,
    pickupLocation = 'Primary',
  } = payload;

  const orderBody = {
    order_id: orderNumber,
    order_date: orderDate,
    pickup_location: pickupLocation,
    channel_id: '',
    comment: `TheLifeHolics order ${orderNumber}`,
    billing_customer_name: customerName,
    billing_last_name: '',
    billing_address: shippingAddress.line1,
    billing_address_2: '',
    billing_city: shippingAddress.city,
    billing_pincode: shippingAddress.postal_code,
    billing_state: shippingAddress.state,
    billing_country: shippingAddress.country,
    billing_email: customerEmail,
    billing_phone: customerPhone || '9999999999',
    shipping_is_billing: true,
    shipping_customer_name: customerName,
    shipping_last_name: '',
    shipping_address: shippingAddress.line1,
    shipping_address_2: '',
    shipping_city: shippingAddress.city,
    shipping_pincode: shippingAddress.postal_code,
    shipping_country: shippingAddress.country,
    shipping_state: shippingAddress.state,
    shipping_email: customerEmail,
    shipping_phone: customerPhone || '9999999999',
    order_items: items.map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.units,
      selling_price: item.sellingPrice,
      discount: item.discount || 0,
      tax: item.tax || 0,
    })),
    payment_method: paymentMethod,
    sub_total: totalAmountInr,
    length: 10,
    breadth: 10,
    height: 5,
    weight: 0.5,
  };

  try {
    const createRes = await fetch(`${SHIPROCKET_API_URL}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderBody),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      // Handle duplicate order gracefully
      if (
        String(createData?.message || '').includes('already exists') ||
        createData?.status_code === 422
      ) {
        console.warn('[Shiprocket] Order already exists:', orderNumber);
        return await getExistingShiprocketOrder(token, orderNumber);
      }
      console.error('[Shiprocket] Create order failed:', createData);
      return null;
    }

    const shiprocketOrderId = String(createData.order_id || createData.id || '');
    const shipmentId = String(createData.shipment_id || '');

    if (shipmentId) {
      await assignAWB(token, shipmentId);
    }

    const tracking = await getShipmentTracking(token, shiprocketOrderId, shipmentId);

    return {
      shiprocketOrderId,
      shipmentId,
      awb: tracking.awb,
      courierName: tracking.courierName,
      trackingUrl: tracking.trackingUrl,
      shippingStatus: 'processing',
    };
  } catch (err) {
    console.error('[Shiprocket] createShiprocketOrder error:', err);
    return null;
  }
}

async function assignAWB(token: string, shipmentId: string): Promise<void> {
  try {
    await fetch(`${SHIPROCKET_API_URL}/courier/assign/awb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shipment_id: [Number(shipmentId)], courier_id: '' }),
    });
  } catch (err) {
    console.warn('[Shiprocket] AWB assign warning:', err);
  }
}

async function getShipmentTracking(
  token: string,
  shiprocketOrderId: string,
  shipmentId: string
): Promise<{ awb: string; courierName: string; trackingUrl: string }> {
  try {
    const res = await fetch(
      `${SHIPROCKET_API_URL}/orders/show/${shiprocketOrderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { awb: '', courierName: '', trackingUrl: '' };
    const data = await res.json();
    const shipments = data?.data?.shipments || [];
    const shipment =
      shipments.find((s: any) => String(s.id) === String(shipmentId)) ||
      shipments[0] ||
      {};
    const awb = shipment.awb || '';
    const courierName = shipment.courier?.name || shipment.courier_name || '';
    const trackingUrl = awb ? `https://shiprocket.co/tracking/${awb}` : '';
    return { awb, courierName, trackingUrl };
  } catch {
    return { awb: '', courierName: '', trackingUrl: '' };
  }
}

async function getExistingShiprocketOrder(
  token: string,
  orderNumber: string
): Promise<ShiprocketResult | null> {
  try {
    const res = await fetch(
      `${SHIPROCKET_API_URL}/orders?filter_by=order_id&filter=${encodeURIComponent(orderNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const order = data?.data?.[0];
    if (!order) return null;
    const shipment = order.shipments?.[0] || {};
    return {
      shiprocketOrderId: String(order.id || ''),
      shipmentId: String(shipment.id || ''),
      awb: shipment.awb || '',
      courierName: shipment.courier?.name || '',
      trackingUrl: shipment.awb ? `https://shiprocket.co/tracking/${shipment.awb}` : '',
      shippingStatus: order.status || 'processing',
    };
  } catch {
    return null;
  }
}

export async function getShipmentStatus(
  shipmentId: string
): Promise<{ status: string; awb: string; courierName: string } | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${SHIPROCKET_API_URL}/courier/track/shipment/${shipmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      status: data?.tracking_data?.shipment_status || '',
      awb: data?.tracking_data?.awb_code || '',
      courierName: data?.tracking_data?.courier_name || '',
    };
  } catch {
    return null;
  }
}

export function buildShiprocketPayload(
  order: Record<string, any>,
  paymentMethod: 'PREPAID' | 'COD'
): ShiprocketOrderPayload {
  const address = order.address || {};
  return {
    orderNumber: order.number,
    orderDate: order.created_at || new Date().toISOString(),
    customerName: order.full_name || order.email || 'Customer',
    customerEmail: order.email || '',
    customerPhone: order.phone || '9999999999',
    shippingAddress: {
      line1: address.line1 || 'Not provided',
      city: address.city || 'Not provided',
      state: address.state || 'Not provided',
      postal_code: address.postal_code || '000000',
      country: address.country || 'India',
    },
    items: (order.items || []).map((item: any, idx: number) => ({
      name: item.name || `Product ${idx + 1}`,
      sku: item.id || `SKU-${idx + 1}`,
      units: item.quantity || 1,
      sellingPrice: item.price_inr || item.price || 0,
      discount: 0,
      tax: 0,
    })),
    totalAmountInr:
      order.base_amount_inr ||
      (order.currency === 'INR' ? order.total : order.subtotal_inr || 0),
    paymentMethod,
  };
}

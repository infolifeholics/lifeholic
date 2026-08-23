import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, Package, Truck, MapPin } from 'lucide-react';
import { adminDb } from '@/lib/firebase-admin';
import { formatPrice } from '@/lib/format';
import { ThankYouAnimation } from '@/components/shop/thank-you-animation';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-success/15 text-success',
    yellow: 'bg-yellow-500/15 text-yellow-500',
    blue: 'bg-blue-500/15 text-blue-400',
    gray: 'bg-muted/30 text-muted-foreground',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

function getPaymentBadge(paymentStatus: string, paymentMethod: string) {
  if (paymentMethod === 'cod') {
    return <StatusBadge label="COD — Pay on Delivery" color="yellow" />;
  }
  if (paymentStatus === 'paid') return <StatusBadge label="Paid" color="green" />;
  return <StatusBadge label="Pending" color="yellow" />;
}

function getShippingStatusLabel(status: string) {
  const map: Record<string, string> = {
    processing: 'Processing',
    shipped: 'Shipped',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    rto: 'Returned',
  };
  return map[status] || status || 'Processing';
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; method?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const number = resolvedSearchParams.order;
  const method = resolvedSearchParams.method;
  let order: any = null;

  if (number) {
    try {
      const snap = await adminDb.collection('orders').where('number', '==', number).limit(1).get();
      if (!snap.empty) {
        order = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (err) {
      console.warn('Could not fetch order from Firestore:', err);
    }
  }

  const isCod = order?.payment_method === 'cod' || method === 'cod';
  const hasTracking = order?.awb || order?.courier_name || order?.tracking_url;

  return (
    <div className="relative bg-background/30 backdrop-blur-[2px] z-10 min-h-screen flex items-center pt-32">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <ThankYouAnimation />
          <div className="checkmark-container mb-4">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-foreground text-balance">
            Thank you for your order
          </h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            {isCod
              ? 'Your COD order is confirmed. Please keep cash ready to pay on delivery.'
              : 'Your order is confirmed. A receipt is on its way to your inbox.'}
            {order?.items?.some((i: any) => i.type === 'digital') &&
              ' Digital downloads are available right away in your account.'}
          </p>

          {order && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-secondary/40 p-6 text-left space-y-4">
              {/* Order header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-display text-lg font-medium text-foreground">Order {order.number}</p>
                <div className="flex flex-wrap gap-2">
                  {getPaymentBadge(order.payment_status, order.payment_method)}
                  {order.order_status && (
                    <StatusBadge
                      label={getShippingStatusLabel(order.order_status)}
                      color={order.order_status === 'completed' || order.order_status === 'delivered' ? 'green' : 'blue'}
                    />
                  )}
                </div>
              </div>

              {/* Items */}
              <ul className="space-y-2 text-sm">
                {order.items?.map((i: any, idx: number) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{i.name} × {i.quantity}</span>
                    <span className="font-medium text-foreground">{formatPrice(i.price * i.quantity, order.currency)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-display text-2xl font-medium text-foreground">{formatPrice(order.total, order.currency)}</span>
              </div>

              {/* Tracking info */}
              {hasTracking && (
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-gold shrink-0" />
                    <span className="font-medium text-foreground">Shipping</span>
                  </div>
                  {order.courier_name && (
                    <p className="text-sm text-muted-foreground">Courier: <span className="text-foreground font-medium">{order.courier_name}</span></p>
                  )}
                  {order.awb && (
                    <p className="text-sm text-muted-foreground">AWB / Tracking #: <span className="text-foreground font-mono font-medium">{order.awb}</span></p>
                  )}
                  {order.shipping_status && (
                    <p className="text-sm text-muted-foreground">Status: <span className="text-foreground font-medium">{getShippingStatusLabel(order.shipping_status)}</span></p>
                  )}
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/10 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Track Shipment
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/account?tab=orders" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Package className="h-4 w-4" /> View my orders
            </Link>
            <Link href="/shop" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              Keep shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Questions? {process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com'}
          </p>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download, Mail, Package } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { formatPrice } from '@/lib/format';
import { ThankYouAnimation } from '@/components/shop/thank-you-animation';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const number = resolvedSearchParams.order;
  let order: any = null;

  if (number) {
    try {
      const qOrder = query(
        collection(db, 'orders'),
        where('number', '==', number),
        limit(1)
      );
      const snap = await getDocs(qOrder);
      if (!snap.empty) {
        order = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (err) {
      console.warn('Could not fetch order from Firestore:', err);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center pt-32">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <ThankYouAnimation />
          <div className="checkmark-container mb-4">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-foreground text-balance">
            Thank you for your order
          </h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            Your order is confirmed. A receipt is on its way to your inbox.
            {order?.items?.some((i: any) => i.type === 'digital') && ' Digital downloads are available right away in your account.'}
          </p>

          {order && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-secondary/40 p-6 text-left">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-medium text-foreground">Order {order.number}</p>
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">Paid</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {order.items?.map((i: any, idx: number) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{i.name} × {i.quantity}</span>
                    <span className="font-medium text-foreground">{formatPrice(i.price * i.quantity, order.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-display text-2xl font-medium text-foreground">{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/account" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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

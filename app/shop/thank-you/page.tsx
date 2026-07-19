import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Download, Mail, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: { searchParams: { order?: string } }) {
  const number = searchParams.order;
  let order: any = null;
  if (number) {
    const { data } = await supabase.from('orders').select('*').eq('number', number).maybeSingle();
    order = data;
  }

  return (
    <div className="flex min-h-[80vh] items-center pt-32">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
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
            <Mail className="h-3.5 w-3.5" /> Questions? hello@thelifeholics.com
          </p>
        </div>
      </div>
    </div>
  );
}

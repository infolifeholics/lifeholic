'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  number: string;
  email: string;
  full_name: string | null;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items: Array<{ name: string; quantity: number }>;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(50));
    getDocs(q)
      .then((snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order);
        setOrders(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching orders:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…</p>;
  if (orders.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-display text-xl text-foreground">No orders yet</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{o.number}</p>
              <p className="text-xs text-muted-foreground">{o.full_name || o.email}</p>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusColor(o.status))}>{o.status}</span>
          </div>
          <ul className="mt-3 text-sm text-muted-foreground">
            {o.items.map((i, idx) => <li key={idx}>{i.name} × {i.quantity}</li>)}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-sm">
            <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="font-medium text-foreground">{formatPrice(o.total, o.currency as 'INR' | 'USD')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function statusColor(s: string): string {
  return ({
    paid: 'bg-success/15 text-success',
    fulfilled: 'bg-success/15 text-success',
    pending: 'bg-warning/15 text-warning',
    cancelled: 'bg-destructive/15 text-destructive',
    refunded: 'bg-secondary text-muted-foreground',
  } as Record<string, string>)[s] || 'bg-secondary text-muted-foreground';
}

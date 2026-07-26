'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package, ArrowLeft, Mail, MessageSquare, Phone, User, ExternalLink, ShieldCheck, MapPin, Tag } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type OrderItem = {
  id: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type?: 'digital' | 'physical';
};

type Order = {
  id: string;
  number: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: Record<string, string> | null;
  status: string;
  total: number;
  currency: string;
  discount: number;
  shipping: number;
  subtotal: number;
  payment_provider: string | null;
  payment_ref: string | null;
  coupon_code: string | null;
  user_id: string | null;
  created_at: string;
  items: OrderItem[];
};

type Profile = {
  id: string;
  member_id?: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  timezone?: string | null;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail selection states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [memberProfile, setMemberProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(100));
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

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setMemberProfile(null);
    if (order.user_id) {
      setLoadingProfile(true);
      try {
        const docRef = doc(db, 'profiles', order.user_id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setMemberProfile({ id: snap.id, ...snap.data() } as Profile);
        }
      } catch (err) {
        console.error('Error loading member profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const sendWhatsApp = (phoneStr: string, name: string) => {
    const formattedPhone = phoneStr.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${name}, regarding your order ${selectedOrder?.number}...`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading orders…</p>;
  
  if (orders.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-display text-xl text-foreground">No orders yet</p>
      </div>
    );

  if (selectedOrder) {
    const order = selectedOrder;
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="rounded-full gap-2 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> Back to orders list
        </Button>

        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          {/* Left: Items and totals */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-foreground">Order Items</h3>
                  <p className="text-xs text-muted-foreground">Order Ref: {order.number}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', statusColor(order.status))}>
                  {order.status}
                </span>
              </div>

              <ul className="divide-y divide-border/40">
                {order.items?.map((item, idx) => {
                  const itemSlug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return (
                    <li key={idx} className="flex py-4 gap-4 items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/50" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center border border-border/50">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.type || 'Physical'} · Qty {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm text-foreground">{formatPrice(item.price * item.quantity, order.currency as 'INR' | 'USD')}</span>
                        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full hover:bg-secondary text-xs gap-1">
                          <a href={`/shop/${itemSlug}`} target="_blank" rel="noopener noreferrer">
                            Link <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border/50 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal || (order.total - order.shipping + order.discount), order.currency as 'INR' | 'USD')}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>−{formatPrice(order.discount, order.currency as 'INR' | 'USD')}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping, order.currency as 'INR' | 'USD')}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-3 text-base font-semibold text-foreground">
                  <span>Total Amount</span>
                  <span className="font-display text-lg text-primary">{formatPrice(order.total, order.currency as 'INR' | 'USD')}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
              <h3 className="font-display text-base font-medium text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Payment details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase block">Provider</span>
                  <p className="text-foreground capitalize mt-0.5">{order.payment_provider || 'Direct Gateway'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase block">Transaction ID / Ref</span>
                  <p className="text-foreground mt-0.5 font-mono text-xs select-all bg-secondary/30 px-2 py-1 rounded w-fit">{order.payment_ref || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Customer Profile */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h3 className="font-display text-base font-medium text-foreground">Customer Profile</h3>
              </div>

              {order.user_id ? (
                loadingProfile ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading member details...
                  </div>
                ) : memberProfile ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3.5">
                      <div className="h-14 w-14 rounded-full overflow-hidden border border-border/40 bg-secondary flex items-center justify-center">
                        {memberProfile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={memberProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-display font-medium text-foreground text-base">{memberProfile.full_name || 'No Name'}</h4>
                        <span className="inline-block mt-0.5 text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                          Member ID: {memberProfile.member_id || 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-sm">
                      {memberProfile.bio && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase block">Bio</span>
                          <p className="text-foreground mt-0.5 text-xs leading-relaxed italic">{memberProfile.bio}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase block">Email Address</span>
                        <p className="text-foreground mt-0.5 flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {memberProfile.email || 'No email'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase block">Phone / WhatsApp</span>
                        <p className="text-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {memberProfile.phone || 'No phone'}
                        </p>
                      </div>
                      {memberProfile.address && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase block">Profile Saved Address</span>
                          <p className="text-foreground mt-0.5 text-xs whitespace-pre-line bg-secondary/10 p-2.5 rounded-xl border border-border/40">
                            {memberProfile.address}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      {memberProfile.phone && (
                        <Button onClick={() => sendWhatsApp(memberProfile.phone!, memberProfile.full_name || '')} className="rounded-full w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                          <MessageSquare className="h-4 w-4" /> WhatsApp Message
                        </Button>
                      )}
                      {memberProfile.email && (
                        <Button asChild variant="outline" className="rounded-full w-full gap-2">
                          <a href={`mailto:${memberProfile.email}`}>
                            <Mail className="h-4 w-4" /> Email Member
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ordered via Account (ID: {order.user_id}), but profile could not be retrieved.</p>
                )
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4 text-center">
                    <User className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-xs font-medium text-foreground">Guest Checkout</p>
                    <p className="text-[11px] text-muted-foreground">This order was placed without an account.</p>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">Full name</span>
                      <p className="text-foreground mt-0.5">{order.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">Email</span>
                      <p className="text-foreground mt-0.5">{order.email}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">Phone</span>
                      <p className="text-foreground mt-0.5">{order.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {order.address && (
                <div className="pt-5 border-t border-border/40 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Shipping Delivery Address
                  </span>
                  <div className="text-sm text-foreground bg-secondary/20 border border-border/40 p-3.5 rounded-2xl space-y-1">
                    <p>{order.full_name}</p>
                    <p>{order.address.line1}</p>
                    <p>{order.address.city}, {order.address.state} - {order.address.postal_code}</p>
                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mt-1">{order.address.country}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div
          key={o.id}
          onClick={() => handleSelectOrder(o)}
          className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/60 hover:bg-card hover:shadow-soft transition-all duration-300 cursor-pointer group"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">{o.number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{o.full_name || o.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusColor(o.status))}>{o.status}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
          </div>
          <ul className="mt-3 text-sm text-muted-foreground divide-y divide-border/20">
            {o.items?.map((i, idx) => (
              <li key={idx} className="py-1 flex justify-between">
                <span>{i.name} × {i.quantity}</span>
              </li>
            ))}
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
    fulfilled: 'bg-success/15 text-success border border-success/30',
    pending: 'bg-warning/15 text-warning border border-warning/30',
    cancelled: 'bg-destructive/15 text-destructive border border-destructive/30',
    refunded: 'bg-secondary text-muted-foreground border border-border/30',
  } as Record<string, string>)[s] || 'bg-secondary text-muted-foreground';
}

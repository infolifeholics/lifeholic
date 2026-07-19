'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Tag, X } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';

export function CheckoutView() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    email: user?.email || '',
    full_name: user?.user_metadata?.full_name || '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  const hasPhysical = items.some((i) => i.type === 'physical');
  const baseShipping = subtotal > 1500 || !hasPhysical ? 0 : 149;
  const discount = applied?.discount || 0;
  const shipping = Math.max(0, baseShipping);
  const total = Math.max(0, subtotal - discount + shipping);

  const applyCoupon = async () => {
    if (!coupon) return;
    setCouponLoading(true);
    try {
      const res = await fetch('/api/shop/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not apply code.');
        setApplied(null);
        return;
      }
      setApplied({ code: data.code, discount: data.discount });
      toast.success(`Code ${data.code} applied — you saved ${formatPrice(data.discount, 'INR')}.`);
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setCouponLoading(false);
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const address = hasPhysical
        ? { line1: form.line1, city: form.city, state: form.state, postal_code: form.postal_code, country: form.country }
        : null;

      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          phone: form.phone,
          address,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
            type: i.type,
          })),
          subtotal,
          discount,
          shipping,
          total,
          currency: 'INR',
          coupon_code: applied?.code || null,
          user_id: user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not place order.');
        return;
      }
      clear();
      router.push(`/shop/thank-you?order=${data.number}`);
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Your bag is empty</h1>
        <p className="mt-3 text-muted-foreground">Add something before checking out.</p>
        <Button asChild className="mt-6 rounded-full"><a href="/shop">Browse the shop</a></Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={placeOrder} className="space-y-6">
          <fieldset className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <legend className="px-2 font-display text-lg font-medium text-foreground">Contact</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
            </div>
          </fieldset>

          {hasPhysical && (
            <fieldset className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
              <legend className="px-2 font-display text-lg font-medium text-foreground">Shipping address</legend>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">Address</Label>
                  <Input id="line1" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="mt-1.5" />
                </div>
                <div><Label htmlFor="city">City</Label><Input id="city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" /></div>
                <div><Label htmlFor="state">State / Province</Label><Input id="state" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1.5" /></div>
                <div><Label htmlFor="postal">Postal code</Label><Input id="postal" required value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="mt-1.5" /></div>
                <div><Label htmlFor="country">Country</Label><Input id="country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1.5" /></div>
              </div>
            </fieldset>
          )}

          <fieldset className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <legend className="px-2 font-display text-lg font-medium text-foreground">Payment</legend>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-gold" />
              You&apos;ll be redirected to a secure payment page (Razorpay for India, Stripe for international).
              This demo confirms the order instantly for you to experience the flow.
            </div>
          </fieldset>

          <Button type="submit" size="lg" disabled={placing} className="w-full rounded-full">
            {placing ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Placing order…</>) : `Place order · ${formatPrice(total, 'INR')}`}
          </Button>
        </form>

        <aside className="h-fit rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-medium text-foreground">Order summary</h2>
          <ul className="mt-5 space-y-3">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {i.quantity}</p>
                </div>
                <span className="text-sm font-medium text-foreground">{formatPrice(i.price * i.quantity, 'INR')}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Coupon code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                className="rounded-full pl-9 uppercase"
              />
            </div>
            <Button type="button" onClick={applyCoupon} disabled={couponLoading} variant="outline" className="rounded-full">
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </div>

          {applied && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-success/10 px-3 py-2 text-sm">
              <span className="text-success">{applied.code} applied</span>
              <button onClick={() => setApplied(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <dl className="mt-5 space-y-3 border-t border-border/50 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium text-foreground">{formatPrice(subtotal, 'INR')}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-success">Discount</dt><dd className="font-medium text-success">−{formatPrice(discount, 'INR')}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="font-medium text-foreground">{shipping === 0 ? 'Free' : formatPrice(shipping, 'INR')}</dd></div>
            <div className="flex justify-between border-t border-border/50 pt-3"><dt className="font-medium text-foreground">Total</dt><dd className="font-display text-2xl font-medium text-foreground">{formatPrice(total, 'INR')}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

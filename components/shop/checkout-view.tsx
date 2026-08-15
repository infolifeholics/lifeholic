'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Tag, X, ShieldCheck } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';
import Script from 'next/script';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function CheckoutView() {
  const { items, subtotal, clear } = useCart();
  const { user, loading } = useAuth();
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
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [detectedCurrency, setDetectedCurrency] = useState<'INR' | 'USD'>('INR');

  useEffect(() => {
    // Detect currency dynamically based on client timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const isIndia = tz.toLowerCase().includes('kolkata') || tz.toLowerCase().includes('india');
      setDetectedCurrency(isIndia ? 'INR' : 'USD');
      setForm((prev) => ({
        ...prev,
        country: isIndia ? 'India' : 'United States',
      }));
    } catch {
      setDetectedCurrency('INR');
      setForm((prev) => ({ ...prev, country: 'India' }));
    }
  }, []);

  // Update currency dynamically if user manually changes country input
  useEffect(() => {
    if (form.country) {
      const isIndia = form.country.trim().toLowerCase() === 'india';
      setDetectedCurrency(isIndia ? 'INR' : 'USD');
    }
  }, [form.country]);

  // Sync profile details if they load dynamically later
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        email: user.email || prev.email,
        full_name: user.user_metadata?.full_name || prev.full_name,
      }));
    }
  }, [user]);

  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState(false);
  useEffect(() => {
    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.usd_to_inr_rate === 'number' && data.usd_to_inr_rate > 0) {
          setExchangeRate(data.usd_to_inr_rate);
          return;
        }
      }
      setRateError(true);
    }).catch(err => {
      console.error(err);
      setRateError(true);
    });
  }, []);

  const hasPhysical = items.some((i) => i.type === 'physical');
  const currencyRate = detectedCurrency === 'USD' ? (exchangeRate || 1) : 1;

  const convertedSubtotal = items.reduce((acc, item) => {
    const price = detectedCurrency === 'USD' 
      ? (item.price_usd || Math.round((item.price_inr || item.price) / (exchangeRate || 1))) 
      : (item.price_inr || item.price);
    return acc + price * item.quantity;
  }, 0);

  const discount = applied?.discount || 0;
  const convertedDiscount = discount / currencyRate;

  const baseShippingInr = subtotal > 1500 || !hasPhysical ? 0 : 149;
  const convertedShipping = detectedCurrency === 'USD' ? Math.round(baseShippingInr / (exchangeRate || 1)) : baseShippingInr;

  const total = Math.max(0, convertedSubtotal - convertedDiscount + convertedShipping);

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
      toast.success(`Code ${data.code} applied — you saved ${formatPrice(data.discount / currencyRate, detectedCurrency)}.`);
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setCouponLoading(false);
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Razorpay script check
    if (!(window as any).Razorpay) {
      toast.error('Razorpay SDK is loading. Please wait a moment and try again.');
      return;
    }

    // Cancellation warning pop-up
    const userConfirmed = window.confirm('Ek bar order karne ke baad cancel nahi hoga. Kya aap confirm karna chahte hain?');
    if (!userConfirmed) {
      return;
    }

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
            slug: i.slug,
            name: i.name,
            price: detectedCurrency === 'USD' ? (i.price_usd || Math.round((i.price_inr || i.price) / (exchangeRate || 1))) : (i.price_inr || i.price),
            quantity: i.quantity,
            image: i.image,
            type: i.type,
          })),
          subtotal: convertedSubtotal,
          discount: convertedDiscount,
          shipping: convertedShipping,
          total,
          currency: detectedCurrency,
          coupon_code: applied?.code || null,
          user_id: user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not place order.');
        setPlacing(false);
        return;
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';

      if (keyId === 'rzp_test_mockKey123') {
        toast.info('Using Demo/Test Payment Mode. Processing order confirmation...');
        setTimeout(async () => {
          try {
            const verifyRes = await fetch('/api/shop/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: 'pay_mock_' + data.id,
                razorpay_order_id: 'order_mock_' + data.id,
                razorpay_signature: 'sig_mock_' + data.id,
                order_id: data.id,
              }),
            });

            if (!verifyRes.ok) throw new Error('Verification failed.');

            toast.success('Test payment verified & order confirmed!');
            clear();
            router.push(`/shop/thank-you?order=${data.number}`);
          } catch (err) {
            toast.error('Failed to verify test payment status.');
            setPlacing(false);
          }
        }, 1500);
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round(Number(data.total) * 100),
        currency: detectedCurrency,
        name: 'TheLifeHolics',
        description: `Order ${data.number}`,
        image: '/logo.svg',
        order_id: data.pgOrderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/shop/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                order_id: data.id,
              }),
            });

            if (!verifyRes.ok) throw new Error('Verification failed.');

            toast.success('Payment verified & order confirmed!');
            clear();
            router.push(`/shop/thank-you?order=${data.number}`);
          } catch (err) {
            toast.error('Failed to verify payment status.');
            setPlacing(false);
          }
        },
        prefill: {
          name: form.full_name,
          email: form.email,
          contact: form.phone || '',
        },
        theme: {
          color: '#d4af37',
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment cancelled. You can retry placing the order.');
            setPlacing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Something went wrong.');
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">Sign in required</h1>
        <p className="mt-3 max-w-sm text-pretty text-muted-foreground">
          You must be signed in to check out and complete your order.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <a href={`/auth/login?redirect=/shop/checkout`}>Sign in to continue</a>
        </Button>
      </div>
    );
  }

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
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        onLoad={() => setRazorpayReady(true)}
      />
      <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={placeOrder} className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-foreground">Contact</h2>
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
          </div>

          {hasPhysical && (
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
              <h2 className="font-display text-lg font-medium text-foreground">Shipping address</h2>
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
            </div>
          )}

          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-foreground">Payment</h2>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-gold" />
              <div>
                <p className="font-semibold text-foreground">Secure Payment Gateway</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Fast &amp; secure transaction powered by Razorpay. Note: Orders once placed cannot be cancelled.
                </p>
              </div>
            </div>
          </div>

          {detectedCurrency === 'USD' && !exchangeRate && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium rounded-2xl border border-destructive/20 leading-relaxed">
              International payments are currently unavailable because the exchange rate has not been configured. Please contact the administrator.
            </div>
          )}

          <div className="flex items-start gap-2.5 bg-secondary/30 p-3 rounded-2xl border border-border/50">
            <input
              type="checkbox"
              id="accept-shop-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
            />
            <label htmlFor="accept-shop-terms" className="text-xs text-muted-foreground leading-relaxed select-none">
              I accept the{' '}
              <Link href="/legal/terms" target="_blank" className="text-gold hover:underline font-semibold">
                Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/legal/refund" target="_blank" className="text-gold hover:underline font-semibold">
                    Cancellation &amp; Refund Policy
                  </Link>.
            </label>
          </div>

          <Button type="submit" size="lg" disabled={placing || !acceptedTerms || (detectedCurrency === 'USD' && !exchangeRate)} className="w-full rounded-full">
            {placing ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing payment…</>) : `Pay Now · ${formatPrice(total, detectedCurrency)}`}
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
                <span className="text-sm font-medium text-foreground">{formatPrice((detectedCurrency === 'USD' ? (i.price_usd || Math.round((i.price_inr || i.price) / (exchangeRate || 1))) : (i.price_inr || i.price)) * i.quantity, detectedCurrency)}</span>
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
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium text-foreground">{formatPrice(convertedSubtotal, detectedCurrency)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-success">Discount</dt><dd className="font-medium text-success">−{formatPrice(convertedDiscount, detectedCurrency)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="font-medium text-foreground">{convertedShipping === 0 ? 'Free' : formatPrice(convertedShipping, detectedCurrency)}</dd></div>
            <div className="flex justify-between border-t border-border/50 pt-3"><dt className="font-medium text-foreground">Total</dt><dd className="font-display text-2xl font-medium text-foreground">{formatPrice(total, detectedCurrency)}</dd></div>
            {detectedCurrency === 'USD' && process.env.NEXT_PUBLIC_RAZORPAY_SUPPORT_USD !== 'true' && (
              <div className="text-[10px] text-amber-500 text-right mt-1 font-medium">
                Note: Charged in INR equivalent: {formatPrice(Math.round(total * (exchangeRate || 1)), 'INR')}
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}

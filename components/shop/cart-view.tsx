'use client';

import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';

import { toast } from 'sonner';
import { convertInrToCurrency, getUserCurrency } from '@/lib/currency';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function CartView() {
  const { items, setQuantity, remove, clear, count } = useCart();
  const { user, profile } = useAuth();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesError, setRatesError] = useState(false);
  const [shippingChargeSetting, setShippingChargeSetting] = useState<number | null>(null);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('INR');

  useEffect(() => {
    const currency = getUserCurrency(profile);
    setDetectedCurrency(currency);
  }, [profile]);

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data && data.rates) {
          setRates(data.rates);
        } else {
          setRatesError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load exchange rates in CartView:', err);
        setRatesError(true);
      });

    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.shipping_charge === 'number') {
          setShippingChargeSetting(data.shipping_charge);
        }
      }
    }).catch((err) => console.error(err));
  }, []);

  const isInternational = detectedCurrency !== 'INR';
  const rate = isInternational ? rates[detectedCurrency] : 1;
  const isLoadingRates = isInternational && Object.keys(rates).length === 0 && !ratesError;
  const hasError = isInternational && ratesError && Object.keys(rates).length === 0;

  const convertedSubtotal = items.reduce((acc, item) => {
    const itemPrice = isInternational
      ? convertInrToCurrency(item.price_inr || item.price, rate || 0)
      : (item.price_inr || item.price);
    return acc + itemPrice * item.quantity;
  }, 0);

  const baseShippingInr = shippingChargeSetting || 0;
  const convertedShipping = baseShippingInr > 0
    ? (isInternational ? convertInrToCurrency(baseShippingInr, rate || 0) : baseShippingInr)
    : 0;

  const total = convertedSubtotal + convertedShipping;

  if (count === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div
          className="flex flex-col items-center rounded-3xl border border-white/10 p-10 sm:p-14 backdrop-blur-md shadow-2xl"
          style={{ backgroundColor: 'rgba(10, 8, 6, 0.85)' }}
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-medium" style={{ color: '#D4AF37' }}>Your bag is empty</h1>
          <p className="mt-3 max-w-sm text-pretty text-white/75">
            Explore the shop for meditations, journals and ritual objects to support your practice.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/shop">Browse the shop <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="inline-block">
        <h1 className="font-display text-4xl font-medium tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }}>Your bag</h1>
        <p className="mt-1 text-sm font-medium text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{count} {count === 1 ? 'item' : 'items'}</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {items.map((i) => (
            <div key={i.id} className="flex gap-4 rounded-3xl border border-border/60 bg-card/60 p-4 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.image} alt={i.name} className="h-24 w-24 rounded-2xl object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{i.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{i.type}</p>
                  </div>
                  <button
                    onClick={() => {
                      remove(i.id);
                      toast.success(`${i.name} removed from cart`);
                    }}
                    aria-label="Remove"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  {i.type === 'physical' ? (
                    <div className="inline-flex items-center rounded-full border border-border bg-card">
                      <button
                        onClick={() => {
                          if (i.quantity <= 1) {
                            remove(i.id);
                            toast.success(`${i.name} removed from cart`);
                          } else {
                            setQuantity(i.id, i.quantity - 1);
                            toast.success(`${i.name} quantity updated`);
                          }
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-l-full hover:bg-secondary"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button
                        onClick={() => {
                          setQuantity(i.id, i.quantity + 1);
                          toast.success(`${i.name} quantity updated`);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-r-full hover:bg-secondary"
                        aria-label="Increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Digital · {i.quantity} ×</span>
                  )}
                  <span className="font-medium text-foreground">
                    {formatPrice(
                      (isInternational
                        ? convertInrToCurrency(i.price_inr || i.price, rate || 0)
                        : (i.price_inr || i.price)) * i.quantity,
                      detectedCurrency
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between rounded-2xl px-2 py-1" style={{ backgroundColor: 'rgba(10, 8, 6, 0.75)' }}>
            <Button variant="ghost" onClick={clear} className="rounded-full text-white/80 hover:text-white hover:bg-white/10">
              <Trash2 className="mr-1 h-4 w-4" /> Clear bag
            </Button>
            <Button asChild variant="ghost" className="rounded-full text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-medium text-foreground">Order summary</h2>
          {hasError && (
            <div className="mt-4 text-xs text-rose-400 border border-rose-500/20 bg-rose-500/5 p-3 rounded-xl">
              Pricing is temporarily unavailable for your region. Please try again later.
            </div>
          )}
          {isLoadingRates ? (
            <div className="mt-4 text-xs text-white/50 animate-pulse p-3">
              Loading regional prices...
            </div>
          ) : (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium text-foreground">{formatPrice(convertedSubtotal, detectedCurrency)}</dd></div>
              {baseShippingInr > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="font-medium text-foreground">{formatPrice(convertedShipping, detectedCurrency)}</dd></div>
              )}
              <div className="flex justify-between border-t border-border/50 pt-3"><dt className="font-medium text-foreground">Total</dt><dd className="font-display text-2xl font-medium text-foreground">{formatPrice(total, detectedCurrency)}</dd></div>
            </dl>
          )}
          <Button asChild={!isLoadingRates && !hasError} disabled={isLoadingRates || hasError} className="mt-6 w-full rounded-full" size="lg">
            {isLoadingRates ? (
              <span className="flex items-center justify-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Loading rates...</span>
            ) : hasError ? (
              <span className="text-rose-400">Pricing Unavailable</span>
            ) : (
              <Link href={user ? "/shop/checkout" : "/auth/login?redirect=/shop/checkout"}>
                Proceed to checkout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout · Razorpay (INR) · Stripe (USD)</p>
        </aside>
      </div>
    </div>
  );
}

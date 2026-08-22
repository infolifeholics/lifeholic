'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Loader2, CreditCard, ShieldCheck, CheckCircle2, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';
import Script from 'next/script';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [serviceData, setServiceData] = useState<any>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to checkout options once details are loaded
  useEffect(() => {
    if (!loading && bookingData) {
      setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
    }
  }, [loading, bookingData]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  // International simulated payment
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paying, setPaying] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!bookingId) {
      toast.error('No booking reference found.');
      router.push('/');
      return;
    }

    const fetchBooking = async () => {
      try {
        const docRef = doc(db, 'bookings', bookingId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          toast.error('Booking not found.');
          router.push('/');
          return;
        }
        const data = docSnap.data();
        setBookingData({ id: docSnap.id, ...data });

        // Fetch associated service
        if (data.service_id) {
          const serviceRef = doc(db, 'services', data.service_id);
          const serviceSnap = await getDoc(serviceRef);
          if (serviceSnap.exists()) {
            setServiceData(serviceSnap.data());
          }
        }

        // Fetch exchange rates from the API endpoint
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            setRates(data.rates);
          }
        }

        // Fetch active coupons
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        const fetchedCoupons = couponsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c: any) => {
            const now = new Date();
            const isExpired = c.expiry_date && now > new Date(c.expiry_date);
            const limitReached = c.usage_limit && (c.usage_count || 0) >= c.usage_limit;
            const isContextValid = !c.applicable_to || c.applicable_to === 'all' || c.applicable_to === 'sessions';
            const isActive = c.active !== false;
            return isActive && !isExpired && !limitReached && isContextValid;
          });
        setAvailableCoupons(fetchedCoupons);
      } catch (err) {
        console.error('Error fetching booking:', err);
        toast.error('Could not load booking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  // Load Razorpay Script status helper
  const [razorpayReady, setRazorpayReady] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setApplying(true);
    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          amount: bookingData.amount,
          context: 'sessions',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setDiscount(data.discount);
        setAppliedCoupon(data.code);
        toast.success(`Coupon "${data.code}" applied! You saved ${formatPrice(data.discount, bookingData.currency)}`);
      } else {
        toast.error(data.error || 'Invalid or expired coupon code.');
      }
    } catch {
      toast.error('Could not apply coupon.');
    } finally {
      setApplying(false);
    }
  };
  const applyDirectCoupon = async (codeToApply: string) => {
    setApplying(true);
    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToApply,
          amount: bookingData.amount,
          context: 'sessions',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setDiscount(data.discount);
        setAppliedCoupon(data.code);
        setCouponCode(data.code);
        toast.success(`Coupon "${data.code}" applied! You saved ${formatPrice(data.discount, bookingData.currency)}`);
      } else {
        toast.error(data.error || 'Invalid or expired coupon code.');
      }
    } catch {
      toast.error('Could not apply coupon.');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon code removed.');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto" />
          <p className="text-muted-foreground text-sm">Preparing your secure checkout...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) return null;

  const subtotal = bookingData.amount;
  const currency = bookingData.currency;

  // GST calculation (18% if INR)
  const gst = currency === 'INR' ? Math.round((subtotal - discount) * 0.18) : 0;
  const total = subtotal - discount + gst;

  const handleRazorpayPayment = async () => {
    if (!(window as any).Razorpay) {
      toast.error('Razorpay SDK failed to load. Please try again.');
      return;
    }

    setPaying(true);
    const toastId = toast.loading('Initiating secure order...');

    try {
      // Call create-order to calculate server-validated amount and fetch order ID
      const orderRes = await fetch('/api/bookings/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingData.id,
          coupon_code: appliedCoupon || null,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order on server.');
      }

      toast.dismiss(toastId);

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';

      if (keyId === 'rzp_test_mockKey123') {
        toast.info('Using Demo/Test Payment Mode. Confirming your session booking...');
        setTimeout(async () => {
          try {
            const res = await fetch('/api/bookings/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: 'pay_mock_' + bookingData.id,
                razorpay_order_id: orderData.order_id,
                razorpay_signature: 'sig_mock_' + bookingData.id,
                booking_id: bookingData.id,
              }),
            });
            if (res.ok) {
              toast.success('Test payment successful! Booking confirmed.');
              router.push(`/booking/success?service=${serviceData?.slug || ''}&date=${encodeURIComponent(bookingData.start_time)}&tz=${encodeURIComponent(bookingData.client_timezone)}`);
            } else {
              toast.error('Test payment verification failed.');
              setPaying(false);
            }
          } catch (err) {
            toast.error('Test payment failed.');
            setPaying(false);
          }
        }, 1500);
        return;
      }

      const options: any = {
        key: keyId,
        amount: Math.round(Number(orderData.amount) * 100), // paise/cents
        currency: orderData.currency || 'INR',
        name: 'TheLifeHolics',
        description: bookingData.service_title,
        image: '/logo.svg',
        order_id: orderData.order_id,
        handler: async function (response: any) {
          setPaying(true);
          try {
            const res = await fetch('/api/bookings/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: bookingData.id,
              }),
            });

            if (!res.ok) throw new Error('Verification failed.');

            // If coupon was applied, increment coupon usage
            if (appliedCoupon) {
              const { doc, runTransaction } = await import('firebase/firestore');
              const couponRef = doc(db, 'coupons', appliedCoupon);
              await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(couponRef);
                if (sfDoc.exists()) {
                  const newCount = (sfDoc.data().usage_count || 0) + 1;
                  transaction.update(couponRef, { usage_count: newCount });
                }
              });
            }

            toast.success('Payment verified & booking confirmed!');
            router.push(`/booking/success?service=${serviceData?.slug || ''}&date=${encodeURIComponent(bookingData.start_time)}&tz=${encodeURIComponent(bookingData.client_timezone)}`);
          } catch (err) {
            toast.error('Failed to verify payment status.');
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: bookingData.client_name,
          email: bookingData.client_email,
          contact: bookingData.client_phone || '',
        },
        theme: {
          color: '#d4af37',
        },
        modal: {
          ondismiss: async function () {
            // If payment cancelled/closed, update to pending and redirect to profile
            try {
              const bookingRef = doc(db, 'bookings', bookingData.id);
              await updateDoc(bookingRef, {
                status: 'pending',
                payment_status: 'unpaid',
              });
              toast.info('Payment cancelled. Your booking status is pending.');
              router.push('/account');
            } catch (err) {
              router.push('/account');
            }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Error preparing Razorpay payment.');
      setPaying(false);
    }
  };

  // Simulated international card payment
  const handleInternationalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      toast.error('Please fill in card details.');
      return;
    }
    setPaying(true);
    setTimeout(async () => {
      try {
        const bookingRef = doc(db, 'bookings', bookingData.id);
        await updateDoc(bookingRef, {
          status: 'confirmed',
          payment_status: 'paid',
        });
        toast.success('International payment completed via Stripe!');
        router.push(`/booking/success?service=${serviceData?.slug || ''}&date=${encodeURIComponent(bookingData.start_time)}&tz=${encodeURIComponent(bookingData.client_timezone)}`);
      } catch (err) {
        toast.error('Payment verification failed.');
      } finally {
        setPaying(false);
      }
    }, 2000);
  };

  const handleCancelPayment = async () => {
    try {
      const bookingRef = doc(db, 'bookings', bookingData.id);
      await updateDoc(bookingRef, {
        status: 'pending',
        payment_status: 'unpaid',
      });
      toast.info('Payment cancelled. You can pay later from your profile dashboard.');
      router.push('/account');
    } catch {
      router.push('/account');
    }
  };

  return (
    <div className="min-h-screen pt-32 sm:pt-40 pb-20 px-4 max-w-5xl mx-auto">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

      <div className="text-center max-w-2xl mx-auto rounded-[2rem] border border-white/10 bg-black/80 p-6 md:p-8 backdrop-blur-md shadow-lg text-white mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Secure Gateway</span>
        <h1 className="mt-2 font-display text-4xl text-white font-medium">Complete Your Payment</h1>
        <p className="mt-2 text-white/80 text-sm">
          Please review your session details below and finalize payment to confirm your booking.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 mt-12 items-start">
        {/* Left Side: Summary & Totals */}
        <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              LH
            </div>
            <div>
              <h3 className="font-display text-xl font-medium text-foreground">{bookingData.service_title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Timezone: {bookingData.client_timezone}</p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Date</span>
              <span className="text-foreground font-medium">
                {new Date(bookingData.start_time).toLocaleDateString(undefined, { dateStyle: 'full' })}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Time</span>
              <span className="text-foreground font-medium">
                {new Date(bookingData.start_time).toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </span>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="border-t border-border/60 pt-6">
            <Label htmlFor="coupon" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Have a coupon code?</Label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between mt-2 p-3 bg-gold/5 border border-gold/30 rounded-xl">
                <div className="flex items-center gap-2 text-gold">
                  <Ticket className="h-4 w-4" />
                  <span className="font-medium text-sm">{appliedCoupon} Applied</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 rounded-full hover:bg-gold/10 text-gold/70 hover:text-gold transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="coupon"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    // placeholder="WELCOME10, HEAL50"
                    className="rounded-xl uppercase font-semibold"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applying || !couponCode}
                    className="rounded-xl px-5"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {availableCoupons.length > 0 && (
                  <div className="mt-3.5 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Available Offers:</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableCoupons.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => applyDirectCoupon(c.code)}
                          className="flex flex-col items-start p-3 rounded-2xl border border-dashed border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-left transition-all duration-200 cursor-pointer w-full group"
                        >
                          <span className="font-mono font-bold text-xs text-gold uppercase flex items-center gap-1.5">
                            <Ticket className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-200" />
                            {c.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-1 font-medium leading-normal">
                            {c.type === 'percent' ? `${c.value}% OFF` : `${formatPrice(c.value, currency)} OFF`}
                            {c.min_amount > 0 && ` on orders above ${formatPrice(c.min_amount, currency)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Calculations */}
          <div className="border-t border-border/60 pt-6 space-y-3.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Session Price</span>
              <span className="text-foreground">{formatPrice(subtotal, currency)}</span>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-between text-success">
                <span>Coupon Discount</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            )}

            {gst > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>GST (18%)</span>
                <span>{formatPrice(gst, currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/60 pt-4 text-base font-medium">
              <span className="text-foreground font-display text-lg">Total Amount</span>
              <span className="text-foreground font-normal">{formatPrice(total, currency)}</span>
            </div>
            {currency !== 'INR' && process.env.NEXT_PUBLIC_RAZORPAY_SUPPORT_USD !== 'true' && (
              <div className="text-[10px] text-amber-500 text-right mt-1 font-medium">
                Note: Charged in INR equivalent: {formatPrice(Math.round(total / (rates[currency] || 1)), 'INR')}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Payment Portal */}
        <div className="lg:col-span-2 space-y-6">
          <div ref={paymentRef} className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6">
            <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold" />
              <span>Checkout Options</span>
            </h3>

            <div className="p-3 rounded-2xl bg-warning/5 border border-warning/20 text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-semibold text-warning uppercase text-[9px] tracking-wider mb-1">Cancellation &amp; Refund Policy</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Cancel up to 24 hours before your slot for a <strong>Full Refund</strong>.</li>
                <li>Cancel between 12 to 24 hours before your slot for a <strong>50% Refund</strong>.</li>
                <li>Cancellations under 12 hours are non-refundable.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fast &amp; secure transaction processing (supporting domestic bank transfers, international cards and wallets) powered securely by Razorpay.
              </p>

              {currency !== 'INR' && Object.keys(rates).length === 0 && (
                <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium rounded-2xl border border-destructive/20 leading-relaxed">
                  International payments are currently unavailable because the exchange rate service failed. Please support.
                </div>
              )}

              <div className="flex items-start gap-2.5 bg-secondary/30 p-3 rounded-2xl border border-border/50">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                />
                <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed select-none">
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

              <Button
                onClick={handleRazorpayPayment}
                disabled={paying || !acceptedTerms || (currency !== 'INR' && Object.keys(rates).length === 0)}
                className="w-full rounded-full py-6 text-base font-semibold shadow-glow bg-gold hover:bg-gold-hover text-gold-foreground"
              >
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay Now via Razorpay (${currency})`}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                <span>Secure 256-bit SSL encrypted connection</span>
              </div>
            </div>

            <button
              onClick={handleCancelPayment}
              disabled={paying}
              className="w-full text-center text-xs text-muted-foreground hover:underline mt-4"
            >
              Cancel Payment &amp; Book as Pending
            </button>
          </div>



        </div>
      </div>
    </div>
  );
}

export default function BookingPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

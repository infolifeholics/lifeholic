'use client';

import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Check, Clock, Globe, Loader2, Calendar, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { COMMON_TIMEZONES, currencyForTimezone, detectTimezone, formatInTz, formatPrice } from '@/lib/format';
import { useAuth } from '@/components/providers/auth-provider';
import { AuthModal } from '@/components/auth/auth-modal';


type Slot = {
  start: string;
  end: string;
  modes: ('online' | 'offline')[];
  booked?: boolean;
};

function SomaticBookingFlowContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, profile } = useAuth();
  const continueBtnRef = useRef<HTMLDivElement>(null);

  const [planName, setPlanName] = useState('Premium');
  const [planTitle, setPlanTitle] = useState('4-Week Deep Transformation Program');
  const [price, setPrice] = useState(10800);
  const [survey, setSurvey] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState(false);

  const [step, setStep] = useState(0); // 0: Date & Time, 1: Details, 2: Confirm

  // Auto scroll to top of viewport when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const [tz, setTz] = useState(detectTimezone());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [details, setDetails] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const serviceId = useMemo(() => {
    return `somatic_${planName.toLowerCase()}`;
  }, [planName]);

  // Load selection context
  useEffect(() => {
    const fetchServiceDetails = async () => {
      let finalServiceId = serviceId;
      try {
        const stored = localStorage.getItem('somatic_booking_context');
        let currentPlan = 'Premium';
        let currentPrice = 11000;
        let currentSurvey = null;
        let currentTitle = '4-Week Deep Transformation Program';

        if (stored) {
          const parsed = JSON.parse(stored);
          currentPlan = parsed.plan || 'Premium';
          currentPrice = parsed.price || 11000;
          currentSurvey = parsed.survey || null;
          finalServiceId = parsed.service_id || finalServiceId;
          currentTitle = parsed.title || (currentPlan.toLowerCase() === 'essential' ? 'Personal Healing & Clarity Session' : currentPlan.toLowerCase() === 'elite' ? 'Ancestral Healing Session' : '4-Week Deep Transformation Program');
        } else {
          const qPlan = search.get('plan') || 'premium';
          currentPlan = qPlan.charAt(0).toUpperCase() + qPlan.slice(1);
          const qServiceId = search.get('service_id') || `somatic_${qPlan}`;
          finalServiceId = qServiceId;
          currentTitle = currentPlan.toLowerCase() === 'essential' ? 'Personal Healing & Clarity Session' : currentPlan.toLowerCase() === 'elite' ? 'Ancestral Healing Session' : '4-Week Deep Transformation Program';
        }

        setPlanName(currentPlan);
        setPlanTitle(currentTitle);
        setSurvey(currentSurvey);

        // Fetch price dynamically from Firestore Settings to stay connected to Admin Panel edits
        const somaticDocRef = doc(db, 'settings', 'somatic_plans');
        const somaticSnap = await getDoc(somaticDocRef);
        const globalRef = doc(db, 'settings', 'global');
        const globalSnap = await getDoc(globalRef);
        let usdToInrRate = null;
        if (globalSnap.exists()) {
          const gData = globalSnap.data();
          if (typeof gData.usd_to_inr_rate === 'number' && gData.usd_to_inr_rate > 0) {
            usdToInrRate = gData.usd_to_inr_rate;
            setExchangeRate(usdToInrRate);
          }
        }

        const currency = currencyForTimezone(tz);
        if (currency === 'USD' && !usdToInrRate) {
          setRateError(true);
        }

        if (somaticSnap.exists()) {
          const sData = somaticSnap.data();
          let priceKey = 'premium_price_inr';
          if (finalServiceId.toLowerCase().includes('essential') || finalServiceId.toLowerCase().includes('clarity')) {
            priceKey = 'essential_price_inr';
          } else if (finalServiceId.toLowerCase().includes('elite') || finalServiceId.toLowerCase().includes('ancestral')) {
            priceKey = 'elite_price_inr';
          }
          const rawPrice = sData[priceKey] || currentPrice;
          setPrice(currency === 'USD' && usdToInrRate ? Math.round(rawPrice / usdToInrRate) : rawPrice);
        } else {
          setPrice(currency === 'USD' && usdToInrRate ? Math.round(currentPrice / usdToInrRate) : currentPrice);
        }
      } catch (e) {
        console.error('Error fetching service details:', e);
      }
    };
    fetchServiceDetails();
  }, [search, serviceId, tz]);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      setDetails((prev) => ({
        ...prev,
        name: profile?.full_name || user.displayName || prev.name,
        email: profile?.email || user.email || prev.email,
        phone: profile?.phone || prev.phone,
      }));
    }
  }, [user, profile]);


  // Fetch slots
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`/api/bookings/slots?service_id=${serviceId}&date=${selectedDate}&tz=${encodeURIComponent(tz)}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
        setSelectedSlot(null);
      })
      .catch(() => {
        toast.error('Failed to load slots.');
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate, serviceId, tz]);

  // Days mapping
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Padding before
    const startDay = start.getDay(); // 0 is Sunday
    const pad = startDay === 0 ? 6 : startDay - 1; // Mon is first
    for (let i = 0; i < pad; i++) {
      arr.push(null);
    }

    for (let i = 1; i <= end.getDate(); i++) {
      const d = new Date(month.getFullYear(), month.getMonth(), i);
      arr.push({
        date: d,
        formatted: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        disabled: d < today,
      });
    }
    return arr;
  }, [month]);

  const prevMonth = () => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  const submit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          client_name: details.name,
          client_email: details.email,
          client_phone: details.phone,
          client_timezone: tz,
          start_time: selectedSlot.start,
          end_time: new Date(
            new Date(selectedSlot.start).getTime() + 
            (planName.toLowerCase().includes('essential') ? 30 : planName.toLowerCase().includes('elite') ? 90 : 60) * 60_000
          ).toISOString(),
          mode,
          notes: details.notes,
          amount: price,
          currency: currencyForTimezone(tz),
          user_id: user?.uid || null,
          status: 'pending',
          payment_status: 'unpaid',
          category: survey?.category || null,
          subcategory: survey?.subcategory || null,
          problems: survey?.problems || null,
          is_somatic_plan: true,
          somatic_plan_name: `Plan ${planName.charAt(0)} · ${planName}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not complete booking.');
        return;
      }
      // Redirect to unified checkout details page
      router.push(`/booking/payment?id=${data.id}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    submit();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-semibold text-foreground">Complete Your Booking</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Scheduling your first session for <strong className="text-gold">Plan {planName.charAt(0)} · {planName}</strong>
        </p>
      </div>

      {/* Booking Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Steps & Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Steps Indicator */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            {['Schedule Session', 'Your Details', 'Review & Pay'].map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border transition-all",
                  step === i ? "bg-gold border-gold text-gold-foreground" : 
                  step > i ? "bg-gold/10 border-gold text-gold" : "border-border/60 text-muted-foreground"
                )}>
                  {step > i ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn(
                  "text-xs font-medium hidden sm:inline",
                  step === i ? "text-foreground" : "text-muted-foreground"
                )}>{name}</span>
              </div>
            ))}
          </div>

          {/* STEP 0: CALENDAR AND SLOTS */}
          {step === 0 && (
            <div className="rounded-3xl border border-border/60 bg-card/40 p-6 shadow-soft space-y-6">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">Select Date &amp; Time</h3>
                <p className="text-xs text-muted-foreground mt-1">Select a date to view available time slots.</p>
              </div>

              {/* Timezone picker */}
              <div className="space-y-1.5">
                <Label htmlFor="timezone" className="text-xs">Your Timezone</Label>
                <Select value={tz} onValueChange={setTz}>
                  <SelectTrigger id="timezone" className="rounded-xl border-border/60">
                    <Globe className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COMMON_TIMEZONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="p-2 rounded-full border border-border/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="font-display text-sm font-semibold capitalize text-foreground">
                  {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} className="p-2 rounded-full border border-border/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <span key={i} className="font-semibold text-muted-foreground py-2">{day}</span>
                ))}
                {days.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="p-2" />;
                  const isSelected = selectedDate === day.formatted;
                  return (
                    <button
                      key={day.formatted}
                      disabled={day.disabled}
                      onClick={() => {
                        setSelectedDate(day.formatted);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl font-medium transition-all relative",
                        day.disabled ? "text-muted-foreground/30 cursor-not-allowed" : "text-foreground hover:bg-gold/15",
                        isSelected && "bg-gold text-gold-foreground hover:bg-gold"
                      )}
                    >
                      {day.date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Slots List */}
              {selectedDate && (
                <div className="border-t border-border/40 pt-6 space-y-4">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Available Slots</h4>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No availability found for this date.
                    </div>
                  ) : (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                      {slots.map((slot, i) => {
                        const isSelected = selectedSlot?.start === slot.start;
                        const isBooked = slot.booked;
                        const label = formatInTz(slot.start, tz, { timeStyle: 'short' });
                        return (
                          <button
                            key={i}
                            disabled={isBooked}
                            onClick={() => {
                              if (isBooked) return;
                              setSelectedSlot(slot);
                              setTimeout(() => {
                                continueBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }, 100);
                            }}
                            className={cn(
                              "border p-3 rounded-2xl text-xs font-medium transition-all",
                              isBooked
                                ? "border-rose-500/20 bg-rose-500/5 text-muted-foreground/30 line-through cursor-not-allowed"
                                : isSelected
                                  ? "bg-gold text-gold-foreground border-gold shadow-sm"
                                  : "bg-background/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60 hover:border-gold"
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation button */}
              <div ref={continueBtnRef} className="flex justify-end pt-4 border-t border-border/20">
                <Button
                  disabled={!selectedSlot}
                  onClick={() => setStep(1)}
                  className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6 font-semibold"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: PERSONAL DETAILS */}
          {step === 1 && (
            <div className="rounded-3xl border border-border/60 bg-card/40 p-6 shadow-soft space-y-6">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">Your Information</h3>
                <p className="text-xs text-muted-foreground mt-1">Please provide your contact details to secure the booking.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name</Label>
                  <Input
                    id="name"
                    value={details.name}
                    onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    placeholder="Enter your name"
                    className="rounded-xl border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={details.email}
                    onChange={(e) => setDetails({ ...details, email: e.target.value })}
                    placeholder="name@example.com"
                    className="rounded-xl border-border/60"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="rounded-xl border-border/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mode" className="text-xs">Session Mode</Label>
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Online (Google Meet)
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Optional Message / Somatic Intentions</Label>
                <Textarea
                  id="notes"
                  value={details.notes}
                  onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                  placeholder="Share anything you want us to keep in mind for your session..."
                  className="rounded-2xl border-border/60 min-h-[100px]"
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-border/20">
                <Button variant="ghost" onClick={() => setStep(0)} className="rounded-full">Back</Button>
                <Button
                  disabled={!details.name || !details.email}
                  onClick={() => setStep(2)}
                  className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6 font-semibold"
                >
                  Review Details
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIRMATION REVIEW */}
          {step === 2 && (
            <div className="rounded-3xl border border-border/60 bg-card/40 p-6 shadow-soft space-y-6">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">Review &amp; Reserve</h3>
                <p className="text-xs text-muted-foreground mt-1">Please confirm all details before proceeding to checkout.</p>
              </div>

              <div className="border border-border/40 rounded-2xl bg-background/30 p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Client Name</span>
                    <span className="font-semibold text-foreground">{details.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Email &amp; Phone</span>
                    <span className="font-semibold text-foreground">{details.email} · {details.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Date &amp; Time</span>
                    <span className="font-semibold text-foreground">
                      {selectedSlot ? formatInTz(selectedSlot.start, tz, { dateStyle: 'full' }) : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Scheduled Slot</span>
                    <span className="font-semibold text-foreground">
                      {selectedSlot ? `${formatInTz(selectedSlot.start, tz, { timeStyle: 'short' })} - ${formatInTz(selectedSlot.end, tz, { timeStyle: 'short' })}` : ''}
                      <span className="text-xs text-muted-foreground block">({tz})</span>
                    </span>
                  </div>
                </div>

                {survey && survey.problems && (
                  <div className="border-t border-border/20 pt-3">
                    <span className="text-xs text-muted-foreground block mb-1">Dynamic Somatic Mapping Category:</span>
                    <span className="text-xs font-semibold text-foreground bg-gold/10 px-2 py-0.5 rounded-full">{survey.category}</span>
                  </div>
                )}
              </div>

              {/* Auth banner check */}
              {!user && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3 text-xs text-warning">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold block">Authentication Required</span>
                    Please register or sign in to save this booking record in your profile logs.
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              {currencyForTimezone(tz) === 'USD' && rateError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3 text-xs text-destructive mb-3">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold block">International Bookings Unavailable</span>
                    International bookings are currently unavailable because the exchange rate has not been configured by the admin. Please contact the administrator.
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border/20">
                <Button variant="ghost" onClick={() => setStep(1)} className="rounded-full">Back</Button>
                <Button
                  disabled={submitting || (currencyForTimezone(tz) === 'USD' && rateError)}
                  onClick={handleBook}
                  className="rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-8 font-semibold shadow-soft"
                >
                  {submitting ? 'Creating reservation...' : 'Reserve & Checkout'}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Order Summary Panel */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft space-y-6 backdrop-blur-md sticky top-32">
            <h3 className="font-display text-lg font-semibold text-gold border-b border-border/40 pb-3">Selected Plan</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest block font-bold">Category</span>
                <span className="text-sm font-semibold text-foreground">{planTitle}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest block font-bold">Session Duration</span>
                <span className="text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-4 w-4 text-gold" />
                  {planName.toLowerCase().includes('elite') ? '90 minutes' : '30 minutes'}
                </span>
              </div>

              {selectedSlot && (
                <div className="border-t border-border/20 pt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest block font-bold">Schedule</span>
                  <span className="text-xs text-foreground block font-semibold mt-1">
                    {formatInTz(selectedSlot.start, tz, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border/40 pt-4 flex items-center justify-between font-display">
              <span className="text-sm font-medium text-foreground">Total Price:</span>
              <span className="text-2xl font-semibold text-gold">{formatPrice(price, currencyForTimezone(tz))}</span>
            </div>
          </div>
        </div>

      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => {
          setShowAuthModal(false);
          // Wait briefly for auth context state synchronization and submit
          setTimeout(() => {
            submit();
          }, 600);
        }} 
      />
    </div>
  );
}

export default function SomaticBookingPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 sm:pt-36 bg-background">
      <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading checkout...</div>}>
        <SomaticBookingFlowContent />
      </Suspense>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Clock, Globe, Loader2, MapPin, Video } from 'lucide-react';
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

type Service = {
  id: string;
  slug: string;
  title: string;
  duration_minutes: number;
  price_inr: number;
  price_usd: number;
  mode: 'online' | 'offline' | 'both';
};

type Slot = {
  start: string;
  end: string;
  modes: ('online' | 'offline')[];
};

const STEPS = ['Service', 'Date & time', 'Your details', 'Confirm'] as const;

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BookingFlow({ services }: { services: Service[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const continueBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step]);
  const [serviceSlug, setServiceSlug] = useState<string>(
    search.get('service') || services[0]?.slug || ''
  );
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
  const [suggestions, setSuggestions] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [holidayNote, setHolidayNote] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [questionnaire, setQuestionnaire] = useState<{
    category: string;
    subcategory: string;
    problems: string[];
    totalIssues: number;
    summary: string;
    serviceSlug: string;
  } | null>(null);

  useEffect(() => {
    if (search.get('from_search') === 'true') {
      try {
        const saved = localStorage.getItem('booking_questionnaire');
        if (saved) {
          const parsed = JSON.parse(saved);
          setQuestionnaire(parsed);
          if (parsed.serviceSlug) {
            setServiceSlug(parsed.serviceSlug);
          }
          setStep(1); // skip service selection
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [search]);

  const service = useMemo(
    () => services.find((s) => s.slug === serviceSlug) || services[0],
    [services, serviceSlug]
  );

  const currency = useMemo(() => currencyForTimezone(tz), [tz]);
  const price = currency === 'INR' ? service?.price_inr ?? 0 : service?.price_usd ?? 0;

  // Pre-fill details from auth
  useEffect(() => {
    if (user) {
      setDetails((d) => ({
        ...d,
        name: d.name || (user.user_metadata?.full_name as string) || '',
        email: d.email || user.email || '',
      }));
    }
  }, [user]);

  // When service/mode change, reset slot selection
  useEffect(() => {
    setSelectedSlot(null);
  }, [serviceSlug, mode]);

  // Fetch slots when date changes
  // Fetch slots in real-time when date, service, or Firestore booking/slots/holiday state changes
  useEffect(() => {
    if (!selectedDate || !service) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);

    let active = true;

    const fetchSlotsData = () => {
      if (!active) return;
      fetch(`/api/bookings/slots?service_id=${service.id}&date=${selectedDate}&tz=${encodeURIComponent(tz)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          setSlots(d.slots || []);
          if (d.holiday) {
            setHolidayNote(d.holiday);
          } else {
            setHolidayNote(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingSlots(false);
        });
    };

    let unsubBookings: () => void = () => {};
    let unsubHolidays: () => void = () => {};
    let unsubSlots: () => void = () => {};

    // Load firebase dynamic listeners dynamically to support SSR
    const initListeners = async () => {
      const { collection, query, where, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const qBookings = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'confirmed']));
      const qHolidays = query(collection(db, 'holidays'), where('date', '==', selectedDate));
      const qSlots = query(collection(db, 'session_slots'));

      // Call initially
      fetchSlotsData();

      // Listeners
      unsubBookings = onSnapshot(qBookings, () => fetchSlotsData());
      unsubHolidays = onSnapshot(qHolidays, () => fetchSlotsData());
      unsubSlots = onSnapshot(qSlots, () => fetchSlotsData());
    };

    initListeners().catch((e) => {
      console.error('Failed to init real-time listeners:', e);
      // Fallback
      fetchSlotsData();
    });

    return () => {
      active = false;
      unsubBookings();
      unsubHolidays();
      unsubSlots();
    };
  }, [selectedDate, service, tz, refreshTrigger]);

  const days = useMemo(() => {
    const first = new Date(month);
    const startWeekday = first.getDay();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) arr.push(new Date(first.getFullYear(), first.getMonth(), i));
    return arr;
  }, [month]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const canNext = (() => {
    if (step === 0) return Boolean(service);
    if (step === 1) return Boolean(selectedSlot);
    if (step === 2) return details.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email);
    if (step === 3) return true;
    return false;
  })();

  const submit = async () => {
    if (!service || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: service.id,
          client_name: details.name,
          client_email: details.email,
          client_phone: details.phone,
          client_timezone: tz,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          mode,
          notes: details.notes,
          amount: price,
          currency,
          user_id: user?.id || null,
          status: 'pending',
          payment_status: 'unpaid',
          category: questionnaire?.category || null,
          subcategory: questionnaire?.subcategory || null,
          problems: questionnaire?.problems || null,
          summary: questionnaire?.summary || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error("This session has just been booked by another user. Please select another available slot.");
          setRefreshTrigger((prev) => prev + 1);
          setStep(1);
          setSelectedSlot(null);
        } else {
          toast.error(data.error || 'Could not book the session.');
        }
        return;
      }
      router.push(`/booking/payment?id=${data.id}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAndBook = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    submit();
  };

  const next = () => {
    if (step === 3) {
      handleConfirmAndBook();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Determine available modes from all slots if none is selected
  const availableModes = useMemo(() => {
    if (selectedSlot) return selectedSlot.modes || [];
    const allModes = new Set<string>();
    slots.forEach(s => s.modes?.forEach(m => allModes.add(m)));
    return allModes.size > 0 ? Array.from(allModes) as ('online' | 'offline')[] : ['online', 'offline'];
  }, [selectedSlot, slots]);

  const effectiveMode = (availableModes.includes(mode) ? mode : availableModes[0] || 'online') as 'online' | 'offline';

  return (
    <div ref={containerRef} className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* Stepper */}
      <ol className="mx-auto mt-8 flex max-w-2xl items-center justify-between">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-all',
                  i < step && 'border-success bg-success/15 text-success',
                  i === step && 'border-primary bg-primary text-primary-foreground',
                  i > step && 'border-border bg-card text-muted-foreground'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('text-xs', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn('mx-2 h-px flex-1', i < step ? 'bg-success/40' : 'bg-border')} />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft sm:p-8">
          <AnimatePresence mode="wait">
            {/* STEP 0 — service */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-display text-2xl font-medium text-foreground">Choose your session</h2>
                <div className="mt-6 grid gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServiceSlug(s.slug);
                        setTimeout(() => {
                          continueBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 100);
                      }}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all',
                        serviceSlug === s.slug
                          ? 'border-primary bg-primary/5 shadow-soft'
                          : 'border-border bg-card hover:border-gold/40'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(s as any).image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatPrice(currency === 'INR' ? s.price_inr : s.price_usd, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 1 — date & time */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-medium text-foreground">Pick a time</h2>
                  <Select value={tz} onValueChange={setTz}>
                    <SelectTrigger className="w-auto gap-2 rounded-full">
                      <Globe className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month nav */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
                    aria-label="Previous month"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <p className="font-display text-lg font-medium text-foreground">
                    {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
                    aria-label="Next month"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Calendar */}
                <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {days.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const past = d < today;
                    const value = ymd(d);
                    const selected = selectedDate === value;
                    return (
                      <button
                        key={i}
                        disabled={past}
                        onClick={() => setSelectedDate(value)}
                        className={cn(
                          'aspect-square rounded-xl text-sm transition-all',
                          past && 'cursor-not-allowed text-muted-foreground/30',
                          !past && !selected && 'border border-border bg-card hover:border-gold/50 hover:bg-secondary',
                          selected && 'bg-primary text-primary-foreground shadow-soft'
                        )}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                {suggestions.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-warning/10 border border-warning/20 space-y-2 text-left">
                    <p className="text-xs font-semibold text-warning">This slot is already taken. Suggested alternative slots:</p>
                    <div className="flex gap-2 flex-wrap">
                      {suggestions.map((sug, idx) => {
                        const dateObj = new Date(sug.start_time);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedSlot({ start: sug.start_time, end: sug.end_time, modes: [mode] });
                              const yyyy = dateObj.getFullYear();
                              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                              const dd = String(dateObj.getDate()).padStart(2, '0');
                              setSelectedDate(`${yyyy}-${mm}-${dd}`);
                              setSuggestions([]);
                              toast.success('Alternative slot selected.');
                            }}
                            className="bg-warning/20 border border-warning/30 text-warning hover:bg-warning/30 text-[10px] font-semibold rounded-full px-3 py-1 transition-colors"
                          >
                            {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slots */}
                {selectedDate && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-foreground">
                      {formatInTz(`${selectedDate}T00:00:00`, tz, { dateStyle: 'full' })}
                    </p>
                    {loadingSlots ? (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Finding available times…
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center">
                        <p className="text-sm font-medium text-foreground">
                          {holidayNote ? 'Holiday - No Sessions Available' : 'No sessions available this day.'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {holidayNote ? holidayNote : 'Working hours are Mon–Sat (IST). Try another date.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Mode toggle */}
                        {availableModes.length > 1 && (
                          <div className="mt-4 flex gap-2">
                            {availableModes.map((m) => (
                              <button
                                key={m}
                                onClick={() => setMode(m as 'online' | 'offline')}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                                  effectiveMode === m
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {m === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                {m}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="mt-4 text-xs text-muted-foreground">
                          Showing {slots.filter((s) => s.modes.includes(effectiveMode)).length} slots · times in {tz.replace('_', ' ')}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots
                            .filter((s) => s.modes.includes(effectiveMode))
                            .map((s) => {
                              const active = selectedSlot?.start === s.start;
                              return (
                                <button
                                  key={s.start}
                                  onClick={() => {
                                    setSelectedSlot(s);
                                    setTimeout(() => {
                                      continueBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }, 100);
                                  }}
                                  className={cn(
                                    'rounded-xl border px-2 py-2.5 text-sm transition-all',
                                    active
                                      ? 'border-primary bg-primary/5 text-foreground shadow-soft'
                                      : 'border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground'
                                  )}
                                >
                                  {formatInTz(s.start, tz, { timeStyle: 'short' })}
                                </button>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!selectedDate && (
                  <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
                    Select a date to see available times.
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2 — details */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-display text-2xl font-medium text-foreground">Your details</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  So I can send your confirmation and the session link.
                </p>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={details.name}
                      onChange={(e) => setDetails({ ...details, name: e.target.value })}
                      className="mt-1.5"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={details.email}
                      onChange={(e) => setDetails({ ...details, email: e.target.value })}
                      className="mt-1.5"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="phone"
                      value={details.phone}
                      onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                      className="mt-1.5"
                      placeholder="+91 ..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Anything you&apos;d like me to know? <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      id="notes"
                      value={details.notes}
                      onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      className="mt-1.5"
                      rows={4}
                      placeholder="Share as much or as little as you like."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — confirm */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-display text-2xl font-medium text-foreground">Confirm your session</h2>
                <dl className="mt-6 space-y-3 text-sm">
                  {[
                    ['Selected Category', questionnaire?.category],
                    ['Selected Subcategory', questionnaire?.subcategory],
                    ['Selected Problems', questionnaire?.problems?.join(', ')],
                    ['Selected Service', service?.title],
                    ['Date', selectedSlot ? formatInTz(selectedSlot.start, tz, { dateStyle: 'full' }) : '—'],
                    ['Time', selectedSlot ? formatInTz(selectedSlot.start, tz, { timeStyle: 'short' }) : '—'],
                    ['Duration', `${service?.duration_minutes} min`],
                    ['Mode', effectiveMode],
                    ['Timezone', tz],
                    ['Name', details.name],
                    ['Email', details.email],
                    ['Price', formatPrice(price, currency)],
                  ].filter(([k, v]) => !!v).map(([k, v]) => (
                    <div key={k as string} className="flex items-center justify-between border-b border-border/50 pb-3">
                      <dt className="text-muted-foreground">{k as string}</dt>
                      <dd className="font-medium text-foreground capitalize text-right max-w-[60%] line-clamp-2">{v as string}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-xs text-muted-foreground">
                  By confirming, you agree to the cancellation policy: free reschedule up to 24h before.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav */}
          <div ref={continueBtnRef} className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0 || submitting} className="rounded-full">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={next} disabled={!canNext || submitting} className="rounded-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Confirming…
                </>
              ) : step === 3 ? (
                <>
                  Confirm &amp; Pay <ArrowRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false);
              submit();
            }}
          />
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <h3 className="font-display text-xl font-medium text-foreground">Summary</h3>
            {service && (
              <>
                <p className="mt-3 text-sm font-medium text-foreground">{service.title}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {service.duration_minutes} minutes
                </p>
                {questionnaire && (
                  <div className="mt-3 border-t border-border/40 pt-3 space-y-1.5 text-xs">
                    <p className="text-muted-foreground"><span className="font-semibold text-foreground">Category:</span> {questionnaire.category}</p>
                    <p className="text-muted-foreground"><span className="font-semibold text-foreground">Area:</span> {questionnaire.subcategory}</p>
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Challenges:</span>
                      <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                        {questionnaire.problems.map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="mt-4 space-y-2 border-t border-border/50 pt-4 text-sm">
                  {selectedSlot ? (
                    <>
                      <p className="text-muted-foreground">
                        {formatInTz(selectedSlot.start, tz, { dateStyle: 'long' })}
                      </p>
                      <p className="text-foreground">
                        {formatInTz(selectedSlot.start, tz, { timeStyle: 'short' })} · {effectiveMode}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Select a date and time to continue.</p>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-2xl font-medium text-foreground">
                    {formatPrice(price, currency)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pay after confirmation · INR for India, USD for international
                </p>
              </>
            )}
          </div>
          <div className="mt-4 rounded-3xl border border-border/60 bg-secondary/40 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">A note on payment</p>
            <p className="mt-2 leading-relaxed">
              Your slot is reserved the moment you confirm. A payment link follows by email —
              Razorpay for India, Stripe for international clients.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

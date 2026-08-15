'use client';

import { useState, useEffect } from 'react';
import { Phone, Headphones, X, Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

interface DiscoveryCallModalProps {
  serviceId: string;
  serviceName: string;
  showButtonOnly?: boolean;
  showPopupOnly?: boolean;
}

export function DiscoveryCallModal({
  serviceId,
  serviceName,
  showButtonOnly = false,
  showPopupOnly = false,
}: DiscoveryCallModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Time zone for slot lookup
  const tz = 'Asia/Kolkata';

  // Get today's date in IST format YYYY-MM-DD
  const getIstTodayString = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(d); // YYYY-MM-DD
  };

  // Get date 14 days from now in IST format YYYY-MM-DD
  const getIstMaxDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(d);
  };

  const todayStr = getIstTodayString();
  const maxDateStr = getIstMaxDateString();

  // Handle auto-popup trigger with a 5-second delay
  useEffect(() => {
    if (!mounted || showButtonOnly) return;

    // Check for query parameter force_popup=true to bypass storage check in deployment testing
    const searchParams = new URLSearchParams(window.location.search);
    const forcePopup = searchParams.get('force_popup') === 'true';

    const isBooked = localStorage.getItem('free_call_booked') === 'true';
    const isDismissed = sessionStorage.getItem('free_call_popup_dismissed') === 'true';
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev || forcePopup || (!isBooked && !isDismissed)) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mounted, showButtonOnly]);



  // Fetch slots whenever the date changes
  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    setLoadingSlots(true);
    setSelectedSlot(null);
    setSlots([]);

    fetch(`/api/bookings/slots?service_id=${serviceId}&date=${date}&tz=${encodeURIComponent(tz)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.holiday) {
          toast.info(`Note: ${data.holiday}`);
          setSlots([]);
        } else {
          setSlots(data.slots || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load slots:', err);
        toast.error('Could not fetch available slots.');
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [date, serviceId]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('free_call_popup_dismissed', 'true');
    // Clear form on close if not completed
    if (!successData) {
      setName('');
      setPhone('');
      setDate('');
      setSelectedSlot(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name.');
    if (!/^[6-9]\d{9}$/.test(phone.replace(/^(?:\+91|91)/, '').replace(/[^0-9]/g, ''))) {
      return toast.error('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!date) return toast.error('Please select a date.');
    if (!selectedSlot) return toast.error('Please select a time slot.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/free-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          date,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          service_id: serviceId,
          service_name: serviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book free call.');
      }

      localStorage.setItem('free_call_booked', 'true');
      setSuccessData({
        date: new Date(selectedSlot.start).toLocaleDateString('en-IN', { timeZone: tz }),
        time: new Date(selectedSlot.start).toLocaleTimeString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }),
      });
      toast.success('Your free call has been booked successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating Button */}
      {!showPopupOnly && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[9.5rem] md:bottom-20 right-6 z-[9999] flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-glow hover:bg-white/90 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border border-white/20"
          aria-label="Book a free Discovery Call"
        >
          <img src="/images/support-agent.png" alt="Support Agent" className="h-full w-full object-cover" />
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          {/* Modal Card */}
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-background/90 p-6 sm:p-8 shadow-float backdrop-blur-xl text-left text-foreground animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-secondary transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            {!successData ? (
              // Booking Form State
              <div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
                    ⚡ Discovery call
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-foreground mt-2">
                    Need Help Choosing the Right Service?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Book a FREE 10-minute Discovery call with us. We’ll understand your concern and help you select the path that fits you best.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fc-name" className="text-xs font-semibold">Your Name</Label>
                    <Input
                      id="fc-name"
                      placeholder="e.g. The Life Holics"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      className="rounded-xl border-white/10 bg-secondary/20"
                      required
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fc-phone" className="text-xs font-semibold">Indian Mobile Number</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">+91</span>
                      <Input
                        id="fc-phone"
                        type="tel"
                        placeholder="0000000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={submitting}
                        className="rounded-xl pl-12 border-white/10 bg-secondary/20"
                        required
                      />
                    </div>
                  </div>

                  {/* Date Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fc-date" className="text-xs font-semibold">Preferred Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fc-date"
                        type="date"
                        min={todayStr}
                        max={maxDateStr}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={submitting}
                        className="rounded-xl pl-10 border-white/10 bg-secondary/20"
                        required
                      />
                    </div>
                  </div>

                  {/* Time Slots Selector */}
                  {date && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Available Time Slots</Label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border border-dashed border-border rounded-xl">
                          <Loader2 className="h-4 w-4 animate-spin text-gold" />
                          <span>Searching available slots...</span>
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="text-xs text-rose-400 p-3 border border-dashed border-rose-500/20 bg-rose-500/5 rounded-xl">
                          No slots available for this date. Please select another date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                          {slots.map((s) => {
                            const isSelected = selectedSlot?.start === s.start;
                            // Format slot time for display
                            const timeStr = new Date(s.start).toLocaleTimeString('en-US', {
                              timeZone: tz,
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            });
                            return (
                              <button
                                key={s.start}
                                type="button"
                                onClick={() => setSelectedSlot(s)}
                                className={cn(
                                  "rounded-xl border py-2 text-xs font-semibold transition-all duration-200",
                                  isSelected
                                    ? "bg-gold text-gold-foreground border-gold shadow-glow"
                                    : "border-white/10 bg-secondary/20 hover:border-white/20 text-foreground"
                                )}
                              >
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-gold hover:bg-gold-hover text-gold-foreground font-semibold h-11 transition-all duration-300 mt-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Booking Discovery Call...
                      </>
                    ) : (
                      'Book Discovery Call'
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-1">No payment required.</p>
                </form>
              </div>
            ) : (
              // Success Screen State
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
                </div>
                <h3 className="font-display text-3xl font-bold text-foreground">
                  Your Free Call is Booked! 🎉
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Your 10-minute Discovery Call has been successfully requested. We will contact you on the provided mobile number.
                </p>

                <div className="bg-secondary/20 border border-white/5 rounded-2xl p-4 max-w-sm mx-auto text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold">{successData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-semibold">{successData.time} (IST)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exchange:</span>
                    <span className="font-semibold text-emerald-400">FREE</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleClose}
                    className="rounded-full bg-secondary hover:bg-secondary/80 text-foreground px-8"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

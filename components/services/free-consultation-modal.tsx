'use client';

import { useState, useEffect } from 'react';
import { Phone, Mail, Clock, Loader2, CheckCircle2, X, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { createPortal } from 'react-dom';

interface DiscoveryCallModalProps {
  serviceId: string;
  serviceName: string;
  showButtonOnly?: boolean;
  showPopupOnly?: boolean;
}

const PREFERRED_TIME_OPTIONS = [
  'Anytime (Fastest Response)',
  'Morning (10:00 AM – 01:00 PM IST)',
  'Afternoon (01:00 PM – 05:00 PM IST)',
  'Evening (05:00 PM – 08:00 PM IST)',
];

export function DiscoveryCallModal({
  serviceId,
  serviceName,
  showButtonOnly = false,
  showPopupOnly = false,
}: DiscoveryCallModalProps) {
  const { user, profile, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredTime, setPreferredTime] = useState(PREFERRED_TIME_OPTIONS[0]);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; phone: string; email: string; preferredTime: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user || profile) {
      if (profile?.full_name && !name) setName(profile.full_name);
      if (user?.email && !email) setEmail(user.email);
      if (profile?.phone && !phone) setPhone(profile.phone);
    }
  }, [user, profile]);



  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('free_call_popup_dismissed', 'true');
    if (user) {
      localStorage.setItem(`free_call_popup_dismissed_${user.uid}`, 'true');
    }
    if (!successData) {
      setName('');
      setPhone('');
      setEmail('');
      setNote('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name.');
    if (!phone.trim() || phone.trim().length < 6) {
      return toast.error('Please enter a valid contact phone number.');
    }
    if (!email.trim() || !email.includes('@')) {
      return toast.error('Please enter a valid email address.');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/free-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          preferred_time: preferredTime,
          note: note.trim(),
          service_id: serviceId || 'general',
          service_name: serviceName || 'General Discovery Call',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit discovery call request.');
      }

      localStorage.setItem('free_call_booked', 'true');
      if (user) {
        localStorage.setItem(`free_call_booked_${user.uid}`, 'true');
      }

      setSuccessData({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        preferredTime,
      });

      toast.success('Your Discovery Call request has been submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating Support Button */}
      {!showPopupOnly && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[9.5rem] md:bottom-20 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground shadow-glow hover:bg-white/90 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border border-white/20"
          aria-label="Request a free Discovery Call"
        >
          <img src="/images/support-agent.png" alt="Support Agent" className="h-full w-full object-cover" />
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          {/* Modal Card */}
          <div className="relative w-full max-w-lg rounded-3xl border border-gold/30 bg-zinc-950/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] text-left text-white animate-in fade-in zoom-in-95 duration-200">
            {/* Ambient Top Glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-72 rounded-full bg-gold/15 blur-3xl" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {!successData ? (
              // Inquiry Form State
              <div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
                    <Sparkles className="h-3 w-3" /> FREE 10-MINUTE DISCOVERY CALL
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white tracking-tight">
                    Understand How We Can Support You
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    A complimentary introductory conversation to understand your needs, answer your questions, and guide you towards the right healing journey.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                  {/* Name Input */}
                  <div className="space-y-1">
                    <Label htmlFor="dc-name" className="text-xs font-semibold text-zinc-300">Your Full Name</Label>
                    <Input
                      id="dc-name"
                      placeholder="e.g. Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      className="rounded-xl border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                      required
                    />
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone Input */}
                    <div className="space-y-1">
                      <Label htmlFor="dc-phone" className="text-xs font-semibold text-zinc-300">Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                          id="dc-phone"
                          type="tel"
                          placeholder="e.g. +91 0000000000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          className="rounded-xl pl-9 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                          required
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1">
                      <Label htmlFor="dc-email" className="text-xs font-semibold text-zinc-300">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                          id="dc-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={submitting}
                          className="rounded-xl pl-9 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferred Time Window */}
                  <div className="space-y-1">
                    <Label htmlFor="dc-time" className="text-xs font-semibold text-zinc-300">Preferred Call Window</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                      <select
                        id="dc-time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                      >
                        {PREFERRED_TIME_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-zinc-950 text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Optional Note / Topic */}
                  <div className="space-y-1">
                    <Label htmlFor="dc-note" className="text-xs font-semibold text-zinc-300">What would you like clarity on? (Optional)</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
                      <textarea
                        id="dc-note"
                        placeholder="Briefly describe what challenges or questions you would like guidance on..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={submitting}
                        rows={2}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold resize-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-gradient-to-r from-gold via-amber-400 to-gold text-zinc-950 font-bold h-11 transition-all duration-300 hover:brightness-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] mt-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2 text-zinc-950" />
                        Submitting Request...
                      </>
                    ) : (
                      'Request Free Discovery Call'
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-zinc-400 italic">
                    Free 10-minute clarity call · An email confirmation will be sent to you
                  </p>
                </form>
              </div>
            ) : (
              // Success Screen State
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-14 w-14 text-emerald-400 animate-bounce" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Discovery Call Requested! 🎉
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong>{successData.name}</strong>! We have sent a confirmation email to <strong>{successData.email}</strong>. Our team will contact you on <strong>{successData.phone}</strong> during your preferred hours.
                </p>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 max-w-sm mx-auto text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Phone:</span>
                    <span className="font-semibold text-white">{successData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Preferred Window:</span>
                    <span className="font-semibold text-white">{successData.preferredTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Consultation Fee:</span>
                    <span className="font-semibold text-emerald-400">100% FREE</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleClose}
                    className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white px-8 text-xs font-semibold"
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

export default DiscoveryCallModal;

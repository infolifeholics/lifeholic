'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Reveal } from '@/components/site/reveal';

export function CommunityForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error('Please fill in all the required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const cleanPhone = form.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      toast.error('Please enter a valid phone number (minimum 8 digits).');
      return;
    }

    if (form.message.trim().length < 20) {
      toast.error('Please share some more details in your application (at least 20 characters).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to submit application.');
        return;
      }

      toast.success('Your application has been submitted successfully.');
      setSubmitted(true);
      setForm({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Reveal>
        <div className="rounded-3xl border border-border/60 bg-card/60 p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold text-xl font-bold">
            ✓
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Application Submitted
          </h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Thank you for your interest in joining the Lifeholics Community.</p>
            <p>Your application has been submitted successfully.</p>
            <p>Our team will personally review your application and get back to you soon.</p>
          </div>
          <Button
            onClick={() => setSubmitted(false)}
            variant="outline"
            className="mt-4 rounded-full"
          >
            Submit another application
          </Button>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <form
        onSubmit={submit}
        className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft sm:p-8 space-y-4 text-left"
      >
        <h3 className="font-display text-xl font-medium text-foreground mb-4">
          Apply to Join
        </h3>

        <div>
          <Label htmlFor="comm-name">Full Name</Label>
          <Input
            id="comm-name"
            className="mt-1.5"
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="comm-email">Email Address</Label>
            <Input
              id="comm-email"
              type="email"
              className="mt-1.5"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="comm-phone">Phone Number</Label>
            <Input
              id="comm-phone"
              type="tel"
              className="mt-1.5"
              required
              placeholder="e.g. +91 99999 99999"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="comm-msg">Why join & how can the community support you?</Label>
          <Textarea
            id="comm-msg"
            rows={5}
            className="mt-1.5"
            required
            placeholder="Tell us in 4–5 lines why you would like to join the Lifeholics Community and how you believe it can support your journey."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-full mt-6 rounded-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              Submit Application
              <Send className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Reveal>
  );
}

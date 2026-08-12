'use client';

import { useState } from 'react';
import {
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Reveal } from '@/components/site/reveal';

export function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    body: '',
  });

  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.body) {
      toast.error('Please fill in your name, email and message.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not send message.');
        return;
      }

      toast.success(
        'Thank you — your message is on its way. I will reply soon.'
      );

      setForm({
        name: '',
        email: '',
        subject: '',
        body: '',
      });
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal>
      <form
        onSubmit={submit}
        className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              className="mt-1.5"
              required
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              className="mt-1.5"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="c-subject">Subject</Label>
          <Input
            id="c-subject"
            className="mt-1.5"
            value={form.subject}
            onChange={(e) =>
              setForm({
                ...form,
                subject: e.target.value,
              })
            }
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="c-body">Message</Label>
          <Textarea
            id="c-body"
            rows={6}
            className="mt-1.5"
            required
            value={form.body}
            onChange={(e) =>
              setForm({
                ...form,
                body: e.target.value,
              })
            }
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-6 rounded-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send message
              <Send className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Reveal>
  );
}

export function ContactInfo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Email */}
      <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <Mail className="h-4 w-4" />
        </span>

        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Email
        </p>

        <a
          href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
            'support@thelifeholics.com'
            }`}
          className="mt-1 block font-medium text-foreground hover:underline"
        >
          {process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
            'support@thelifeholics.com'}
        </a>
      </div>

      {/* Phone */}
      <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <Phone className="h-4 w-4" />
        </span>

        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Phone
        </p>

        <a
          href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+919999999999'
            }`}
          className="mt-1 block font-medium text-foreground hover:underline"
        >
          {process.env.NEXT_PUBLIC_CONTACT_PHONE ||
            '+91 99999 99999'}
        </a>
      </div>

      {/* WhatsApp */}
      <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <MessageCircle className="h-4 w-4" />
        </span>

        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          WhatsApp
        </p>

        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '919999999999'
            }`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block font-medium text-foreground hover:underline"
        >
          Chat on WhatsApp
        </a>
      </div>

      {/* Studio */}
      <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <MapPin className="h-4 w-4" />
        </span>

        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Studio
        </p>

        <p className="mt-1 font-medium text-foreground">
          Online worldwide · In India
        </p>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Loader2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Reveal } from '@/components/site/reveal';

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', body: '' });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not send message.');
        return;
      }
      toast.success('Thank you — your message is on its way. I will reply soon.');
      setForm({ name: '', email: '', subject: '', body: '' });
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal>
      <form onSubmit={submit} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" required />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" required />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="c-subject">Subject</Label>
          <Input id="c-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1.5" />
        </div>
        <div className="mt-4">
          <Label htmlFor="c-body">Message</Label>
          <Textarea id="c-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="mt-1.5" required />
        </div>
        <Button type="submit" disabled={loading} className="mt-6 rounded-full" size="lg">
          {loading ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Sending…</>) : (<>Send message <Send className="ml-1 h-4 w-4" /></>)}
        </Button>
      </form>
    </Reveal>
  );
}

export function ContactInfo() {
  const items = [
    { icon: Mail, label: 'Email', value: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@thelifeholics.com', href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@thelifeholics.com'}` },
    { icon: Phone, label: 'Phone', value: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+91 99999 99999', href: `tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+919999999999'}` },
    { icon: MessageCircle, label: 'WhatsApp', value: 'Chat on WhatsApp', href: `https://wa.me/${process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '919999999999'}` },
    { icon: MapPin, label: 'Studio', value: 'Online worldwide · In person in Pune, India', href: null },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-3xl border border-border/60 bg-card/50 p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
            <it.icon className="h-4 w-4" />
          </span>
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{it.label}</p>
          {it.href ? (
            <a href={it.href} target={it.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="mt-1 block font-medium text-foreground hover:underline">
              {it.value}
            </a>
          ) : (
            <p className="mt-1 font-medium text-foreground">{it.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

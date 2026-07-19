'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reveal, RevealText } from '@/components/site/reveal';

export function NewsletterBlock() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Welcome. A gentle hello is on its way to your inbox.');
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/60 p-10 text-center shadow-soft sm:p-14">
            <motion.div
              aria-hidden
              className="absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Mail className="h-5 w-5" />
              </span>
              <RevealText
                as="h2"
                text="Letters of stillness"
                className="mt-5 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
              />
              <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
                Slow, thoughtful notes on healing, presence and the inner life. No noise, ever.
              </p>
              <form onSubmit={subscribe} className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-full"
                  required
                />
                <Button type="submit" disabled={loading} className="rounded-full px-6">
                  {loading ? 'Joining…' : 'Join the circle'}
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">Unsubscribe anytime. Your inbox is sacred.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

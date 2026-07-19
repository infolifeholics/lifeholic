'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Reveal, RevealText } from '@/components/site/reveal';

export function HomeCTA() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-gradient-to-br from-primary/95 via-primary to-primary/90 p-12 text-center shadow-float sm:p-20">
            {/* animated glow */}
            <motion.div
              aria-hidden
              className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/30 blur-3xl"
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-breathe" />
                A place to begin
              </span>
              <RevealText
                as="h2"
                text="Your next chapter starts with one quiet yes"
                className="mx-auto mt-6 max-w-2xl font-display text-4xl font-medium leading-[1.1] tracking-tight text-primary-foreground sm:text-5xl text-balance"
              />
              <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-primary-foreground/80">
                Book a single session and feel the difference presence makes. No commitment, no pressure.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/booking"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary-foreground px-7 py-3.5 text-sm font-medium text-primary transition-all hover:scale-[1.02]"
                >
                  Book a Session
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  Explore Services
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

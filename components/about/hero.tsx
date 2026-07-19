'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { RevealText, Reveal } from '@/components/site/reveal';

const FOUNDER_IMAGE = '/images/founder/photo.jpg';

export function AboutHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.4]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 sm:pt-44">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — copy */}
          <div className="lg:pt-8">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px w-6 bg-gold/70" /> About
              </span>
            </Reveal>
            <RevealText
              as="h1"
              text="Hello, I am here to walk with you"
              className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl text-balance"
            />
            <Reveal delay={0.25}>
              <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                I am a spiritual psychologist and therapist. For nearly a decade I have held space
                for people as they grieve, heal, question, and come home to themselves — gently,
                without judgement, and always at their own pace.
              </p>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FOUNDER_IMAGE}
                  alt="TheLifeHolics founder"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.pexels.com/photos/5699516/pexels-photo-5699516.jpeg?auto=compress&cs=tinysrgb&w=200';
                  }}
                  className="h-14 w-14 rounded-full object-cover object-top border-2 border-gold/30"
                />
                <div>
                  <p className="font-display text-lg font-medium text-foreground">TheLifeHolics</p>
                  <p className="text-sm text-muted-foreground">Spiritual Psychologist &amp; Therapist</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.38}>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  ['9+', 'years'],
                  ['1.2k+', 'sessions'],
                  ['14', 'countries'],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-border/60 bg-card/50 p-4 text-center">
                    <p className="font-display text-3xl font-medium text-foreground">{v}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* RIGHT — founder portrait */}
          <motion.div style={{ y, opacity }} className="relative lg:sticky lg:top-24">
            {/* Main portrait */}
            <div className="relative overflow-hidden rounded-[2rem] shadow-float">
              <div className="aspect-[3/4] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FOUNDER_IMAGE}
                  alt="TheLifeHolics, spiritual psychologist"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.pexels.com/photos/5699516/pexels-photo-5699516.jpeg?auto=compress&cs=tinysrgb&w=1200';
                  }}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              {/* Gentle warm overlay at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              {/* Name badge */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-2xl glass-strong px-5 py-4 shadow-float">
                  <p className="font-display text-xl text-foreground">TheLifeHolics</p>
                  <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
                    Spiritual Psychologist &amp; Therapist
                  </p>
                </div>
              </div>
            </div>

            {/* Floating quote card */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-6 top-12 w-56 rounded-2xl glass-strong p-5 shadow-float"
            >
              <p className="font-display text-base leading-relaxed text-foreground">
                "Healing is remembering who you were before the world told you who to be."
              </p>
              <p className="mt-2 text-xs text-muted-foreground">— a guiding belief</p>
            </motion.div>

            {/* Decorative dot grid */}
            <div className="absolute -right-4 -top-4 grid grid-cols-5 gap-2 opacity-30">
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold" />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

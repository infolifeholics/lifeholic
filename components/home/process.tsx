'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SectionHeading } from '@/components/site/section-heading';

const STEPS = [
  {
    n: '01',
    title: 'Arrive',
    desc: 'You book a session and arrive exactly as you are. Nothing to prepare, nothing to perform.',
  },
  {
    n: '02',
    title: 'Listen',
    desc: 'We slow down and listen — to your story, your body, and the quieter voice beneath both.',
  },
  {
    n: '03',
    title: 'Uncover',
    desc: 'Together we trace the roots of what you are feeling. Patterns become visible. Meaning emerges.',
  },
  {
    n: '04',
    title: 'Heal',
    desc: 'With gentleness and tools that fit your life, we release what no longer serves you.',
  },
  {
    n: '05',
    title: 'Integrate',
    desc: 'You leave with practices, clarity and a steadier relationship with yourself — and we keep going.',
  },
];

export function HomeProcess() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll inside the pinned container (desktop only)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  const smoothProgress = useSpring(scrollYProgress, { damping: 25, stiffness: 120 });

  return (
    <div ref={containerRef} className="relative w-full lg:h-[220vh] h-auto py-24 sm:py-32">
      {/* Sticky container for Desktop, normal block for Mobile */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <SectionHeading
            eyebrow="The journey"
            title="A gentle, unhurried path"
            description="Healing is not a sprint. Here is what it looks like to walk it together."
          />

          {/* Desktop Pinned Process Cards */}
          <div className="hidden lg:grid mt-16 grid-cols-5 gap-4">
            {STEPS.map((s, i) => (
              <ProcessStepCard
                key={s.n}
                s={s}
                i={i}
                total={STEPS.length}
                smoothProgress={smoothProgress}
              />
            ))}
          </div>

          {/* Mobile Fallback: Normal Grid */}
          <div className="lg:hidden mt-16 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="group relative rounded-3xl glass-card glow-border reflection-sweep p-6 backdrop-blur-md border border-white/5 bg-black/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-medium text-gold/80">{s.n}</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessStepCard({
  s,
  i,
  total,
  smoothProgress,
}: {
  s: typeof STEPS[0];
  i: number;
  total: number;
  smoothProgress: any;
}) {
  const targetProgress = i / (total - 1);

  // Smoothly transition between states as user scrolls
  const opacity = useTransform(
    smoothProgress,
    [targetProgress - 0.25, targetProgress, targetProgress + 0.25],
    [0.35, 1, 0.35]
  );

  const scale = useTransform(
    smoothProgress,
    [targetProgress - 0.25, targetProgress, targetProgress + 0.25],
    [0.96, 1.04, 0.96]
  );

  return (
    <motion.div
      style={{ opacity, scale }}
      className="group relative h-full rounded-3xl glass-card glow-border reflection-sweep p-6 backdrop-blur-md border border-white/5 bg-black/10"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl font-medium text-gold/80">{s.n}</span>
        {i < total - 1 && (
          <span className="hidden h-px w-12 bg-gradient-to-r from-gold/40 to-transparent md:block" />
        )}
      </div>
      <h3 className="mt-5 font-display text-xl font-medium text-foreground">{s.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
    </motion.div>
  );
}

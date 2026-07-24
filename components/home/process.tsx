'use client';

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
  return (
    <div className="relative w-full py-16 sm:py-24 border-t border-border/10 bg-secondary/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <SectionHeading
          eyebrow="The journey"
          title="A gentle, unhurried path"
          description="Healing is not a sprint. Here is what it looks like to walk it together."
        />

        {/* Process Cards Grid - Standard fluid grid layout (no sticky stops) */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 text-left">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="group relative rounded-3xl border border-border/60 bg-card p-6 shadow-soft hover:border-gold/30 hover:shadow-hover transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <span className="font-display text-3xl font-medium text-gold/80 block pb-4 border-b border-border/10">{s.n}</span>
                <h3 className="mt-5 font-display text-lg font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

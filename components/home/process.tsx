import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';

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
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The journey"
          title="A gentle, unhurried path"
          description="Healing is not a sprint. Here is what it looks like to walk it together."
        />

        <Stagger className="mt-16 grid gap-4 md:grid-cols-5" gap={0.08}>
          {STEPS.map((s, i) => (
            <StaggerItem key={s.n}>
              <div className="group relative h-full rounded-3xl border border-border/60 bg-card/50 p-6 transition-all duration-500 ease-soft hover:-translate-y-1 hover:border-gold/50 hover:bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-medium text-gold/80">{s.n}</span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden h-px w-12 bg-gradient-to-r from-gold/40 to-transparent md:block" />
                  )}
                </div>
                <h3 className="mt-5 font-display text-xl font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

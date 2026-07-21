import { Reveal, RevealText, ScrollStory } from '@/components/site/reveal';
import { StatCounter } from '@/components/site/stat-counter';

const STATS = [
  { value: 1200, suffix: '+', label: 'Sessions held' },
  { value: 14, suffix: '', label: 'Countries served' },
  { value: 9, suffix: '+ yrs', label: 'Of practice' },
  { value: 98, suffix: '%', label: 'Would recommend' },
];

export function HomeStats() {
  return (
    <section className="relative py-20">
      <ScrollStory className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] glass-card glow-border p-10 shadow-glow sm:p-14 backdrop-blur-lg border border-white/10">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <RevealText
                as="h2"
                text="Healing, measured in lives, not numbers"
                className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl text-balance"
              />
              <Reveal delay={0.2}>
                <p className="mt-5 max-w-md text-pretty text-muted-foreground">
                  Each number is a person who trusted the process. I am grateful for every one.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.25}>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="bg-white/5 p-6 text-center backdrop-blur-md">
                    <p className="font-display text-3xl font-medium text-foreground sm:text-4xl">
                      <StatCounter value={s.value} suffix={s.suffix} />
                    </p>
                    <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </ScrollStory>
    </section>
  );
}

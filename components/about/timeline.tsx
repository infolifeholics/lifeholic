import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/site/reveal';

const TIMELINE = [
  { year: '2015', title: 'Began formal training in psychology', desc: 'A first degree, and the recognition that the mind alone was not enough.' },
  { year: '2017', title: 'First private clients', desc: 'Holding space for grief, anxiety and the search for meaning.' },
  { year: '2019', title: 'Certified in Spiritual Psychology', desc: 'Deepening into a soul-centred approach to healing.' },
  { year: '2021', title: 'Inner child & healing modalities', desc: 'Adding the body and the younger self to the work.' },
  { year: '2023', title: 'Practice goes global', desc: 'Serving clients across 14 countries online.' },
  { year: 'Today', title: 'TheLifeHolics', desc: 'A home for therapy, healing and the practice of becoming whole.' },
];

export function AboutTimeline() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The journey" title="A timeline of becoming" />
        <div className="relative mt-16">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-gold/40 via-border to-transparent sm:left-1/2" />
          <div className="space-y-10">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.05}>
                <div className={`relative flex items-start gap-6 sm:gap-0 ${i % 2 === 0 ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="hidden sm:block sm:w-1/2" />
                  <div className="absolute left-4 z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-gold ring-4 ring-background sm:left-1/2" />
                  <div className="ml-10 w-full sm:ml-0 sm:w-1/2 sm:px-8">
                    <div className="rounded-3xl border border-border/60 bg-card/50 p-6 shadow-soft">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gold">{t.year}</span>
                      <h3 className="mt-2 font-display text-xl font-medium text-foreground">{t.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

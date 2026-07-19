import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';

const VALUES = [
  { t: 'Presence', d: 'Being fully here with you, not performing a technique.' },
  { t: 'Gentleness', d: 'Healing is hard enough. The way there should be kind.' },
  { t: 'Wholeness', d: 'You are not broken. You are becoming whole.' },
  { t: 'Confidentiality', d: 'What is shared here is held in complete trust.' },
  { t: 'Depth', d: 'Willing to go beneath the symptom to the source.' },
  { t: 'Respect', d: 'Your pace, your story, your meaning — always yours.' },
];

export function AboutValues() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="What I stand for" title="The values that hold the work" />
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
          {VALUES.map((v) => (
            <StaggerItem key={v.t}>
              <div className="group h-full rounded-3xl border border-border/60 bg-card/50 p-7 transition-all duration-500 ease-soft hover:-translate-y-1 hover:border-gold/50 hover:bg-card">
                <h3 className="font-display text-2xl font-medium text-foreground">{v.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.d}</p>
                <span className="mt-5 block h-px w-10 bg-gradient-to-r from-gold to-transparent transition-all duration-500 group-hover:w-20" />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

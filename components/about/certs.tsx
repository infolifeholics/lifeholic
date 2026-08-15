import { Award, BadgeCheck, GraduationCap, HeartHandshake } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';

const CERTS = [
  { icon: GraduationCap, t: 'M.A. Psychology', d: 'Formal clinical training' },
  { icon: BadgeCheck, t: 'Certified Spiritual Psychology', d: 'Soul-centred therapeutic practice' },
  { icon: HeartHandshake, t: 'Inner Child & Parts Work', d: 'Reparenting & developmental healing' },
  { icon: Award, t: 'Trauma-Informed', d: 'Nervous-system regulation' },
];

export function AboutCerts() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Credentials" title="Training & qualifications" />
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
          {CERTS.map((c) => (
            <StaggerItem key={c.t}>
              <div className="flex h-full flex-col items-start rounded-3xl border border-border/60 bg-card/50 p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium text-foreground">{c.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

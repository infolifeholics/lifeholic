import Link from 'next/link';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import type { Workshop } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem, Reveal } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';

export function HomeWorkshops({ items }: { items: Workshop[] }) {
  if (!items.length) return null;
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Gather together"
          title="Upcoming workshops"
          description="Group experiences to deepen your practice in community."
        />

        <Stagger className="mt-14 grid gap-6 md:grid-cols-3" gap={0.08}>
          {items.map((w) => {
            const date = new Date(w.date);
            const left = Math.max(0, w.seats_total - w.seats_booked);
            const pct = Math.round((w.seats_booked / w.seats_total) * 100);
            return (
              <StaggerItem key={w.id}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.image ?? ''}
                      alt={w.title}
                      className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-xs font-medium text-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-medium text-foreground">{w.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{w.description}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {w.location}
                      </span>
                    </div>
                    <div className="mt-5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{left} seats left</span>
                        <span className="font-medium text-foreground">from {formatPrice(w.price_inr, 'INR')}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Want a workshop for your team or community?{' '}
            <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
              Let&apos;s talk
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

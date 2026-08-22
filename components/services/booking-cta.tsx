import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Service } from '@/lib/types';
import { Reveal } from '@/components/site/reveal';
import { ServicePriceBlock } from '@/components/services/service-price-block';

export function ServiceBookingCta({ service }: { service: Service }) {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-gradient-to-br from-secondary/70 via-card to-background-2/60 p-10 shadow-soft sm:p-14">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  Ready to begin?
                </h2>
                <p className="mt-3 max-w-md text-pretty text-muted-foreground">
                  One session is enough to feel the difference presence makes. <ServicePriceBlock priceInr={service.price_inr} variant="cta" /> · {service.duration_minutes} minutes.
                </p>
              </div>
              <Link
                href={`/booking?service=${service.slug}`}
                className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Book now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import type { Service } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';
import { getServiceRoute } from '@/lib/routes';

export function HomeServices({ services }: { services: Service[] }) {
  const featured = services.filter((s) => s.featured).slice(0, 6);
  const list = featured.length ? featured : services.slice(0, 6);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How I can help"
          title="Services for every chapter of your inner life"
          description="From spiritual psychology and therapy to inner child work and meditation — each offering is a doorway, not a package."
        />

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
          {list.map((s) => (
            <StaggerItem key={s.id}>
              <Link href={getServiceRoute(s.slug)} className="group block h-full">
                <article className="group relative h-full overflow-hidden rounded-3xl glass-card glow-border reflection-sweep shadow-soft hover:-translate-y-1.5 hover:shadow-glow backdrop-blur-md border border-white/5">
                  <div className="relative aspect-[16/11] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image}
                      alt={s.title}
                      className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/5 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full glass px-3 py-1 text-xs font-medium text-foreground">
                      {s.category}
                    </span>
                    {s.mode === 'online' && (
                      <span className="absolute right-4 top-4 rounded-full glass px-3 py-1 text-xs font-medium text-foreground">
                        Online
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-2xl font-medium text-foreground">{s.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{s.short}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration_minutes} min · from {formatPrice(s.price_inr, 'INR')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                        Explore <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-12 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full glass glow-border reflection-sweep px-6 py-3 text-sm font-medium text-foreground hover:bg-white/10 hover:scale-105 transition-all duration-300"
          >
            View all services <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

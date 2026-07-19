import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clock, Globe, Video } from 'lucide-react';
import { getServices } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';
import { formatPrice } from '@/lib/format';
import { getServiceRoute } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Spiritual psychology, therapy, relationship guidance, emotional & inner child healing, meditation and personal growth coaching — online and in person.',
  alternates: { canonical: 'https://thelifeholics.com/services' },
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="pt-32 sm:pt-40">
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How I can help"
            title="Services for your inner life"
            description="Each offering is a doorway, not a package. Begin wherever you are — and we will find the path together."
          />
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-6 md:grid-cols-2" gap={0.07}>
            {services.map((s) => (
              <StaggerItem key={s.id}>
                <Link href={getServiceRoute(s.slug)} className="group block h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float sm:flex-row">
                    <div className="relative aspect-[16/11] overflow-hidden sm:aspect-auto sm:w-2/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.image}
                        alt={s.title}
                        className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent sm:bg-gradient-to-r" />
                    </div>
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {s.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.duration_minutes} min
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-2xl font-medium text-foreground">{s.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{s.short}</p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {s.mode !== 'offline' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1 text-[10px] text-muted-foreground">
                            <Video className="h-3 w-3" /> Online
                          </span>
                        )}
                        {s.mode !== 'online' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1 text-[10px] text-muted-foreground">
                            <Globe className="h-3 w-3" /> In person
                          </span>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                        <span className="text-sm text-muted-foreground">
                          from <span className="font-medium text-foreground">{formatPrice(s.price_inr, 'INR')}</span>
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
        </div>
      </section>
    </div>
  );
}

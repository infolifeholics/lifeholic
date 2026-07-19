import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Globe, Sparkles, Users, Video } from 'lucide-react';
import { getServices, getServiceBySlug } from '@/lib/data';
import { ServiceFaq } from '@/components/services/faq';
import { ServiceHero } from '@/components/services/hero';
import { ServiceBookingCta } from '@/components/services/booking-cta';
import { getServiceRoute } from '@/lib/routes';
import { formatPrice } from '@/lib/format';

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await getServiceBySlug(params.slug);
  if (!service) return { title: 'Service not found' };
  return {
    title: service.title,
    description: service.short,
    alternates: { canonical: `https://thelifeholics.com/services/${service.slug}` },
    openGraph: {
      title: service.title,
      description: service.short,
      images: [{ url: service.image, width: 1200, height: 630, alt: service.title }],
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await getServiceBySlug(params.slug);
  if (!service) notFound();

  const all = await getServices();
  const related = all.filter((s) => s.slug !== service.slug && s.category === service.category).slice(0, 3);
  const fallback = all.filter((s) => s.slug !== service.slug).slice(0, 3);
  const relatedFinal = related.length ? related : fallback;

  return (
    <div className="pt-28">
      <ServiceHero service={service} />

      <section className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <div className="space-y-16">
              {/* About */}
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">About this work</h2>
                <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {service.description}
                </p>
              </div>

              {/* Who is it for */}
              {service.who_for && (
                <div className="rounded-3xl border border-border/60 bg-secondary/40 p-7">
                  <h3 className="flex items-center gap-2 font-display text-xl font-medium text-foreground">
                    <Users className="h-5 w-5 text-gold" /> Who is this for?
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">{service.who_for}</p>
                </div>
              )}

              {/* Benefits */}
              <div>
                <h3 className="font-display text-2xl font-medium tracking-tight text-foreground">What you may gain</h3>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {service.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Process */}
              <div>
                <h3 className="font-display text-2xl font-medium tracking-tight text-foreground">How a session flows</h3>
                <ol className="mt-5 space-y-3">
                  {service.process.map((p, i) => (
                    <li key={p} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/50 p-4">
                      <span className="font-display text-lg font-medium text-gold">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm leading-relaxed text-foreground">{p}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Sticky summary */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl border border-border/60 bg-card/60 p-7 shadow-soft">
                <h3 className="font-display text-2xl font-medium text-foreground">Session details</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <dt className="inline-flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Duration</dt>
                    <dd className="font-medium text-foreground">{service.duration_minutes} minutes</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <dt className="inline-flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /> Format</dt>
                    <dd className="font-medium text-foreground capitalize">{service.mode}</dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {service.mode !== 'offline' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                        <Video className="h-3 w-3" /> Online
                      </span>
                    )}
                    {service.mode !== 'online' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" /> In person
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between border-t border-border/50 pt-4">
                    <dt className="text-muted-foreground">Starting from</dt>
                    <dd className="text-right">
                      <p className="font-display text-2xl font-medium text-foreground">{formatPrice(service.price_inr, 'INR')}</p>
                      <p className="text-xs text-muted-foreground">≈ {formatPrice(service.price_usd, 'USD')}</p>
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/booking?service=${service.slug}`}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Book this session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Confident &amp; confidential · Cancel free up to 24h before
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <ServiceFaq slug={service.slug} />
      <ServiceBookingCta service={service} />

      {/* Related */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">You may also be drawn to</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {relatedFinal.map((s) => (
              <Link key={s.id} href={getServiceRoute(s.slug)} className="group block h-full">
                <article className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                  <div className="relative aspect-[16/11] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt={s.title} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-medium text-foreground">{s.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.short}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

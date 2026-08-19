import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Clock, Sparkles, Video } from 'lucide-react';
import { getServices, getServiceBySlug } from '@/lib/data';
import { ServiceFaq } from '@/components/services/faq';
import { ServiceHero } from '@/components/services/hero';
import { ServiceBookingCta } from '@/components/services/booking-cta';
import { getServiceRoute } from '@/lib/routes';
import { formatPrice } from '@/lib/format';
import { DiscoveryCallModal } from '@/components/services/free-consultation-modal';

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
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

export const revalidate = 60;

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const all = (await getServices()).filter((s) => s.active !== false);
  const related = all.filter((s) => s.slug !== service.slug && s.category === service.category).slice(0, 3);
  const fallback = all.filter((s) => s.slug !== service.slug).slice(0, 3);
  const relatedFinal = related.length ? related : fallback;

  return (
    <div className="relative bg-background/30 backdrop-blur-[2px] z-10 min-h-screen pt-28">
      <ServiceHero service={service} />

      <section className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">

            {/* Left Column: Full Description & other details */}
            <div className="space-y-8 text-left">
              {service.description && (
                <div className="rounded-3xl border border-white/10 bg-black/90 p-7 sm:p-8 shadow-soft text-white">
                  <h2 className="font-display text-2xl font-semibold text-white">About this session</h2>
                  <p className="mt-4 text-base leading-relaxed text-white/80 font-medium whitespace-pre-line">
                    {service.description}
                  </p>
                </div>
              )}

              {service.who_for && (
                <div className="rounded-3xl border border-white/10 bg-black/90 p-7 sm:p-8 shadow-soft text-white">
                  <h2 className="font-display text-2xl font-semibold text-white">Who is this for?</h2>
                  <p className="mt-4 text-base leading-relaxed text-white/80 font-medium whitespace-pre-line">
                    {service.who_for}
                  </p>
                </div>
              )}

              {service.benefits && service.benefits.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/90 p-7 sm:p-8 shadow-soft text-white">
                  <h2 className="font-display text-2xl font-semibold text-white">What you will experience</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {service.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80 font-semibold">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {service.process && service.process.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/90 p-7 sm:p-8 shadow-soft text-white">
                  <h2 className="font-display text-2xl font-semibold text-white">The Journey</h2>
                  <ol className="mt-4 space-y-4">
                    {service.process.map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-black">
                          {i + 1}
                        </span>
                        <p className="text-sm text-white/80 font-semibold">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Right Column: Session Details card (Sticky on Desktop) */}
            <aside className="lg:sticky lg:top-28 w-full text-left">
              <div className="rounded-3xl border border-white/10 bg-black/90 p-7 shadow-soft text-white">
                <h3 className="font-display text-2xl font-semibold text-white">Session details</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <dt className="inline-flex items-center gap-2 text-white/80 font-semibold"><Clock className="h-4 w-4 text-gold" /> Duration</dt>
                    <dd className="font-bold text-white">{service.duration_minutes} minutes</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <dt className="inline-flex items-center gap-2 text-white/80 font-semibold"><Sparkles className="h-4 w-4 text-gold" /> Format</dt>
                    <dd className="font-bold text-white capitalize">online</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <dt className="inline-flex items-center gap-2 text-white/80 font-semibold"><Sparkles className="h-4 w-4 text-gold" /> Sessions</dt>
                    <dd className="font-bold text-white">{service.duration_minutes} Mins × {service.included_sessions || 1} {(service.included_sessions || 1) === 1 ? 'Session' : 'Sessions'}</dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 font-semibold">
                      <Video className="h-3 w-3 text-gold" /> Online
                    </span>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/10 pt-4">
                    <dt className="text-white/80 font-semibold">Starting from</dt>
                    <dd className="text-right">
                      <p className="font-display text-2xl font-bold text-gold">{formatPrice(service.price_inr, 'INR')}</p>
                      <p className="text-xs text-white/70 font-semibold">≈ {formatPrice(service.price_usd, 'USD')}</p>
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/booking?service=${service.slug}`}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-gold/90"
                >
                  Book this session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
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
                  <div className="relative aspect-[4/3] overflow-hidden">
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
      <DiscoveryCallModal showPopupOnly={true} serviceId={service.id} serviceName={service.title} />
    </div>
  );
}

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
import { FreeConsultationModal } from '@/components/services/free-consultation-modal';

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
          <div className="max-w-2xl mx-auto">
            {/* Summary details */}
            <aside className="w-full">
              <div className="rounded-3xl border border-border/60 bg-card/60 p-7 shadow-soft">
                <h3 className="font-display text-2xl font-semibold text-black">Session details</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <dt className="inline-flex items-center gap-2 text-black/80 font-semibold"><Clock className="h-4 w-4" /> Duration</dt>
                    <dd className="font-bold text-black">{service.duration_minutes} minutes</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <dt className="inline-flex items-center gap-2 text-black/80 font-semibold"><Sparkles className="h-4 w-4" /> Format</dt>
                    <dd className="font-bold text-black capitalize">online</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <dt className="inline-flex items-center gap-2 text-black/80 font-semibold"><Sparkles className="h-4 w-4" /> Sessions</dt>
                    <dd className="font-bold text-black">{service.duration_minutes} Mins × {service.included_sessions || 1} {(service.included_sessions || 1) === 1 ? 'Session' : 'Sessions'}</dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs text-black/80 font-semibold">
                      <Video className="h-3 w-3" /> Online
                    </span>
                  </div>
                  <div className="flex items-end justify-between border-t border-border/50 pt-4">
                    <dt className="text-black/80 font-semibold">Starting from</dt>
                    <dd className="text-right">
                      <p className="font-display text-2xl font-bold text-black">{formatPrice(service.price_inr, 'INR')}</p>
                      <p className="text-xs text-black/70 font-semibold">≈ {formatPrice(service.price_usd, 'USD')}</p>
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/booking?service=${service.slug}`}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Book this session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="mt-3 text-center text-xs text-black/70 font-semibold">
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
      <FreeConsultationModal showPopupOnly={true} serviceId={service.id} serviceName={service.title} />
    </div>
  );
}

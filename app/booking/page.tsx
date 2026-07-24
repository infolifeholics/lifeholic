import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getServices } from '@/lib/data';
import { BookingFlow } from '@/components/booking/booking-flow';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/site/reveal';

export const metadata: Metadata = {
  title: 'Book a Session',
  description:
    'Book a one-on-one therapy or healing session. Choose your service, date, time and timezone. Slots are reserved instantly — no double bookings.',
  alternates: { canonical: 'https://thelifeholics.com/booking' },
};

export default async function BookingPage() {
  const services = (await getServices()).filter((s) => s.active !== false);
  const slim = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    duration_minutes: s.duration_minutes,
    price_inr: s.price_inr,
    price_usd: s.price_usd,
    mode: s.mode,
    image: s.image,
  }));

  return (
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <SectionHeading
          eyebrow="Begin here"
          title="Book your session"
          description="A few quiet steps. Your slot is reserved the instant you confirm — no one else can take it."
        />
      </section>

      <section className="py-8">
        <Reveal>
          <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
            <BookingFlow services={slim} />
          </Suspense>
        </Reveal>
      </section>
    </div>
  );
}

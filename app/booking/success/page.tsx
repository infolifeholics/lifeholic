import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Clock, Mail } from 'lucide-react';
import { formatInTz } from '@/lib/format';
import { getServiceBySlug } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Booking confirmed',
  description: 'Your session is booked.',
  robots: { index: false, follow: false },
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; date?: string; tz?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const service = resolvedSearchParams.service ? await getServiceBySlug(resolvedSearchParams.service) : null;
  const tz = resolvedSearchParams.tz || 'Asia/Kolkata';
  const date = resolvedSearchParams.date;

  return (
    <div className="flex min-h-[80vh] items-center pt-32">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CalendarCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-foreground text-balance">
            Your session is booked
          </h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            A confirmation is on its way to your inbox, with the session link and a gentle reminder
            before we meet. Take a breath — you did the brave part.
          </p>

          {service && date && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-secondary/40 p-6 text-left">
              <p className="font-display text-xl font-medium text-foreground">{service.title}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {formatInTz(date, tz, { dateStyle: 'full', timeStyle: 'short' })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Timezone: {tz}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back home <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Explore the shop
            </Link>
          </div>

          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Didn&apos;t get an email? Check spam, or write to hello@thelifeholics.com
          </p>
        </div>
      </div>
    </div>
  );
}

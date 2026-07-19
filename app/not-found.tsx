import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center pt-32">
      <div className="mx-auto max-w-md px-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-foreground">
          <Compass className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-5xl font-medium tracking-tight text-foreground">Lost the path?</h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          The page you were looking for has wandered off. Let&apos;s find your way back.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <Link href="/services" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            Explore services
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  const [imageError, setImageError] = useState(false);

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {showWordmark && (
        imageError ? (
          <span className="font-display text-xl font-medium tracking-wide text-foreground">
            TheLife<span className="text-gradient-gold">Holics</span>
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logo-wordmark.png"
            alt="TheLifeHolics"
            onError={() => setImageError(true)}
            className="h-5 w-auto object-contain brightness-95 contrast-105"
          />
        )
      )}
    </span>
  );
}

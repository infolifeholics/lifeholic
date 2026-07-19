import { cn } from '@/lib/utils';

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="22" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.35" />
          <path
            d="M24 6 C 16 14, 16 24, 24 42 C 32 24, 32 14, 24 6 Z"
            stroke="hsl(var(--primary))"
            strokeWidth="1.3"
            opacity="0.85"
          />
          <path d="M24 10 C 19 16, 19 24, 24 38" stroke="hsl(var(--gold))" strokeWidth="1.1" />
          <circle cx="24" cy="24" r="2.4" fill="hsl(var(--gold))" />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-xl font-medium tracking-wide text-foreground">
          TheLife<span className="text-gradient-gold">Holics</span>
        </span>
      )}
    </span>
  );
}

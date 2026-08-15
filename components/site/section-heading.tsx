import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl bg-black/80 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-lg text-white backdrop-blur-md',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
          <span className="h-px w-6 bg-gold/70" />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 font-display text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

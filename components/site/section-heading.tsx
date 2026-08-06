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
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <span 
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white"
          style={{ textShadow: '0 0 2px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1)' }}
        >
          <span className="h-px w-6 bg-white/80" />
          {eyebrow}
        </span>
      )}
      <h2 
        className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl text-balance"
        style={{ textShadow: '0 0 3px rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,1)' }}
      >
        {title}
      </h2>
      {description && (
        <p 
          className="mt-5 text-pretty text-base font-semibold leading-relaxed text-white/90 sm:text-lg"
          style={{ textShadow: '0 0 2px rgba(0,0,0,1), 0 2px 5px rgba(0,0,0,1)' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

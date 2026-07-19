'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

// A <Link> with a magnetic hover + soft glow. Pointer-aware micro-interaction.
export function MagneticLink({
  href,
  children,
  className,
  strength = 14,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  return (
    <MagneticWrap strength={strength} className={className} renderAsLink href={href}>
      {children}
    </MagneticWrap>
  );
}

export function MagneticButton({
  children,
  className,
  strength = 14,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number }) {
  return (
    <MagneticWrap strength={strength} className={className} asButton {...props}>
      {children}
    </MagneticWrap>
  );
}

function MagneticWrap({
  children,
  className,
  strength = 14,
  renderAsLink,
  asButton,
  href,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  renderAsLink?: boolean;
  asButton?: boolean;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${(x / rect.width) * strength}px, ${(y / rect.height) * strength}px)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translate(0,0)';
  };

  if (renderAsLink && href) {
    return (
      <Link
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={cn('inline-flex transition-transform duration-300 ease-soft will-change-transform', className)}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn('inline-flex transition-transform duration-300 ease-soft will-change-transform', className)}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

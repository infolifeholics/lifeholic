'use client';

import { Heart } from 'lucide-react';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { cn } from '@/lib/utils';

export function ProductWishlistButton({ productId, className }: { productId: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const active = has(productId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full glass-strong text-foreground transition-all hover:scale-110',
        active && 'text-rose-500',
        className
      )}
    >
      <Heart className={cn('h-[18px] w-[18px]', active && 'fill-current')} />
    </button>
  );
}

'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';
import { formatPrice } from '@/lib/format';
import { getProductRoute } from '@/lib/routes';
import type { Product } from '@/lib/types';

export function WishlistView({ products }: { products: Product[] }) {
  const { ids } = useWishlist();
  const list = products.filter((p) => ids.includes(p.id));

  if (list.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div
          className="flex flex-col items-center rounded-3xl border border-white/10 p-10 sm:p-14 backdrop-blur-md shadow-2xl"
          style={{ backgroundColor: 'rgba(10, 8, 6, 0.85)' }}
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
            <Heart className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-medium" style={{ color: '#D4AF37' }}>Your wishlist is empty</h1>
          <p className="mt-3 max-w-sm text-pretty text-white/75">
            Tap the heart on any product to save it here for later.
          </p>
          <Link href="/shop" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Browse the shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">Your wishlist</h1>
      <p className="mt-2 text-sm text-muted-foreground">{list.length} saved {list.length === 1 ? 'item' : 'items'}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <Link key={p.id} href={getProductRoute(p.slug)} className="group block h-full">
            <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
              <div className="relative aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                <div className="absolute right-3 top-3"><ProductWishlistButton productId={p.id} /></div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-medium text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm font-medium text-foreground">{formatPrice(p.price_inr, 'INR')}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

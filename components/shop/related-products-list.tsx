'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { getProductRoute } from '@/lib/routes';
import { formatPrice } from '@/lib/format';
import { useCurrency } from '@/components/providers/currency-provider';
import { convertInrToCurrency } from '@/lib/currency';

export function RelatedProductsList({ products }: { products: Product[] }) {
  const { currentCurrency, exchangeRate } = useCurrency();
  const isInternational = currentCurrency !== 'INR';

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => {
        const displayPrice = isInternational
          ? convertInrToCurrency(p.price_inr, exchangeRate || 0, currentCurrency)
          : p.price_inr;

        return (
          <Link key={p.id} href={getProductRoute(p.slug)} className="group block h-full">
            <article className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
              <div className="p-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/40 bg-secondary/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="h-full w-full object-contain transition-transform duration-1000 ease-soft group-hover:scale-105" />
                </div>
              </div>
              <div className="p-4 pt-1">
                <h3 className="font-display text-base font-medium text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm font-medium text-foreground">{formatPrice(displayPrice, currentCurrency)}</p>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}


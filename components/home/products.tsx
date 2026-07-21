import Link from 'next/link';
import { ArrowUpRight, Heart } from 'lucide-react';
import type { Product } from '@/lib/types';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';
import { StarRating } from '@/components/site/star-rating';
import { formatPrice } from '@/lib/format';
import { getProductRoute } from '@/lib/routes';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';

export function HomeProducts({ products }: { products: Product[] }) {
  const list = products.slice(0, 4);
  if (!list.length) return null;

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow="The shop"
            title="Tools for your practice"
            description="Meditations, journals and ritual objects to support the work between sessions."
          />
          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-2 rounded-full glass glow-border reflection-sweep px-5 py-2.5 text-sm font-medium text-foreground hover:bg-white/10 hover:scale-105 transition-all duration-300"
          >
            Visit the shop <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
          {list.map((p) => {
            const onSale = p.compare_at_inr && p.compare_at_inr > p.price_inr;
            return (
              <StaggerItem key={p.id}>
                <Link href={getProductRoute(p.slug)} className="group block h-full">
                  <article className="group relative h-full overflow-hidden rounded-3xl glass-card glow-border reflection-sweep shadow-soft hover:-translate-y-1.5 hover:shadow-glow backdrop-blur-md border border-white/5">
                    <div className="relative aspect-square overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105"
                      />
                      <div className="absolute right-3 top-3">
                        <ProductWishlistButton productId={p.id} />
                      </div>
                      {onSale && (
                        <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                          Sale
                        </span>
                      )}
                      <span className="absolute bottom-3 left-3 rounded-full glass px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground">
                        {p.type === 'digital' ? 'Digital' : 'Physical'}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <StarRating rating={p.rating} size={12} />
                        <span className="text-xs text-muted-foreground">{p.reviews_count}</span>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-medium leading-snug text-foreground">
                        {p.name}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="font-medium text-foreground">{formatPrice(p.price_inr, 'INR')}</span>
                        {onSale && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(p.compare_at_inr as number, 'INR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

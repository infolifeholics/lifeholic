import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check, Truck, Download, ShieldCheck, Star } from 'lucide-react';
import { getProducts, getProductBySlug } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { AddToCart } from '@/components/shop/add-to-cart';
import { ProductReviews } from '@/components/shop/product-reviews';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';
import { StarRating } from '@/components/site/star-rating';
import { formatPrice } from '@/lib/format';
import { getProductRoute } from '@/lib/routes';
import { SectionHeading } from '@/components/site/section-heading';

import { ProductGallery } from '@/components/shop/product-gallery';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.tagline || product.description.slice(0, 160),
    alternates: { canonical: `https://thelifeholics.com/shop/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.tagline || '',
      images: [{ url: product.image, width: 1200, height: 1200, alt: product.name }],
    },
  };
}
export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  let reviewRows: any[] = [];
  try {
    const qReviews = query(
      collection(db, 'product_reviews'),
      where('product_id', '==', product.id),
      limit(100)
    );
    const snap = await getDocs(qReviews);
    reviewRows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  } catch (err) {
    console.warn('Could not fetch reviews from Firestore:', err);
  }

  const all = await getProducts();
  const related = all.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 4);
  const fallback = all.filter((p) => p.slug !== product.slug).slice(0, 4);
  const relatedFinal = related.length ? related : fallback;

  const onSale = product.compare_at_inr && product.compare_at_inr > product.price_inr;
  const gallery = product.gallery && product.gallery.length ? product.gallery : [product.image];

  return (
    <div className="pt-28 relative min-h-screen">
      {/* White glassmorphism backdrop blur on top of background video */}
      <div className="fixed inset-0 -z-10 bg-white/20 backdrop-blur-[4px] dark:bg-black/40 dark:backdrop-blur-[4px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <ProductGallery gallery={gallery} productName={product.name} productId={product.id} />

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {product.category}
              </span>
              {onSale && (
                <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                  Sale
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 text-pretty text-lg text-muted-foreground">{product.tagline}</p>

            <div className="mt-4 flex items-center gap-3">
              <StarRating rating={product.rating} size={16} />
              <span className="text-sm text-muted-foreground">
                {product.rating.toFixed(1)} · {product.reviews_count} reviews
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="font-display text-3xl font-medium text-foreground">{formatPrice(product.price_inr, 'INR')}</span>
              {onSale && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compare_at_inr as number, 'INR')}</span>
              )}
              <span className="text-sm text-muted-foreground">≈ {formatPrice(product.price_usd, 'USD')}</span>
            </div>

            <p className="mt-6 text-pretty text-base leading-relaxed text-black dark:text-neutral-200 font-medium">{product.description}</p>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {product.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {h}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {product.amazonUrl ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href={product.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      "flex-1 rounded-full bg-gold hover:bg-gold-hover text-black font-semibold text-center transition-all duration-300"
                    )}
                  >
                    Buy on Amazon
                  </a>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider bg-secondary/50 px-3.5 py-2 rounded-full whitespace-nowrap self-start sm:self-center">
                    From Amazon
                  </span>
                </div>
              ) : (
                <AddToCart
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    price_inr: product.price_inr,
                    price_usd: product.price_usd,
                    image: product.image,
                    type: product.type,
                    stock: product.stock,
                  }}
                />
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 p-3 text-center">
                {product.type === 'digital' ? <Download className="h-4 w-4 text-gold" /> : <Truck className="h-4 w-4 text-gold" />}
                <span className="text-muted-foreground">{product.type === 'digital' ? 'Instant access' : 'Ships in 2–4 days'}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 p-3 text-center">
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span className="text-muted-foreground">Secure checkout</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 p-3 text-center">
                <Star className="h-4 w-4 text-gold" />
                <span className="text-muted-foreground">{product.rating.toFixed(1)} avg rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-20">
          <ProductReviews productId={product.id} initial={reviewRows} />
        </section>

        {/* Related */}
        <section className="mt-20 pb-10">
          <SectionHeading align="left" eyebrow="You may also love" title="Related products" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedFinal.map((p) => (
              <Link key={p.id} href={getProductRoute(p.slug)} className="group block h-full">
                <article className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                  <div className="relative aspect-square overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base font-medium text-foreground">{p.name}</h3>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatPrice(p.price_inr, 'INR')}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

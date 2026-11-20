import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check, Truck, Download, ShieldCheck, Star } from 'lucide-react';
import { getProducts, getProductBySlug } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { AddToCart } from '@/components/shop/add-to-cart';
import { ProductFaq } from '@/components/shop/product-faq';
import { RelatedProductsList } from '@/components/shop/related-products-list';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';
import { formatPrice } from '@/lib/format';
// Server component, related products rendered in list
import { getProductRoute } from '@/lib/routes';
import { SectionHeading } from '@/components/site/section-heading';
import { getEffectivePriceInr } from '@/lib/currency';

import { ProductGallery } from '@/components/shop/product-gallery';
import { ProductViewTracker } from '@/components/shop/product-view-tracker';
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
export const revalidate = 60;

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getProducts();
  const related = all.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 4);
  const fallback = all.filter((p) => p.slug !== product.slug).slice(0, 4);
  const relatedFinal = related.length ? related : fallback;

  const { isOnSale } = getEffectivePriceInr(product);
  const gallery = product.gallery && product.gallery.length ? product.gallery : [product.image];

  return (
    <div className="relative bg-background/30 backdrop-blur-[2px] z-10 min-h-screen pt-28">
      <ProductViewTracker product={{
        id: product.id,
        name: product.name,
        price_inr: product.price_inr,
        compare_at_inr: product.compare_at_inr,
      }} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-white/60" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-white">Shop</Link>
          <span>/</span>
          <span className="text-white/90">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <ProductGallery gallery={gallery} productName={product.name} productId={product.id} />

          {/* Info */}
          <div
            className="backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-[2rem] text-white/95 h-fit"
            style={{ backgroundColor: 'rgba(18, 15, 14, 0.8)' }}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90">
                {product.category}
              </span>
              {isOnSale && (
                <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                  Discounted
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 text-pretty text-lg text-white/80">{product.tagline}</p>

            {/* Pricing is handled dynamically by the AddToCart client component */}

            <p className="mt-6 text-pretty text-base leading-relaxed text-white/90 font-medium">{product.description}</p>

            {product.highlights && product.highlights.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {(product.highlights || []).map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-white/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {h}
                  </li>
                ))}
              </ul>
            )}

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
                  <span className="text-xs text-white/70 font-semibold uppercase tracking-wider bg-white/10 px-3.5 py-2 rounded-full whitespace-nowrap self-start sm:self-center">
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
                    compare_at_inr: product.compare_at_inr,
                    image: product.image,
                    type: product.type,
                    stock: product.stock,
                  }}
                />
              )}
            </div>

            {/* <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                {product.type === 'digital' ? <Download className="h-4 w-4 text-gold" /> : <Truck className="h-4 w-4 text-gold" />}
                <span className="text-white/80">{product.type === 'digital' ? 'Instant access' : 'Ships in 2–4 days'}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span className="text-white/80">Secure checkout</span>
              </div>
            </div> */}
          </div>
        </div>



        {/* Product FAQ */}
        <ProductFaq />

        {/* Related */}
        <section className="mt-20 pb-10">
          <SectionHeading align="left" eyebrow="You may also love" title="Related products" />
          <div className="mt-8">
            <RelatedProductsList products={relatedFinal} />
          </div>
        </section>
      </div>
    </div>
  );
}

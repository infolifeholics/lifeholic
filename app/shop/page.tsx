import type { Metadata } from 'next';
import { getProducts } from '@/lib/data';
import { ShopGrid } from '@/components/shop/shop-grid';
import { SectionHeading } from '@/components/site/section-heading';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Meditations, journals, courses and ritual objects to support your healing practice — between sessions and beyond.',
  alternates: { canonical: 'https://thelifeholics.com/shop' },
};

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <div className="pt-32 sm:pt-40 relative min-h-screen">
      {/* White glassmorphism backdrop blur on top of background video */}
      <div className="fixed inset-0 -z-10 bg-white/20 backdrop-blur-[4px] dark:bg-black/40 dark:backdrop-blur-[4px]" />

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The shop"
            title="Tools for your practice"
            description="Meditations, journals, courses and ritual objects — made to support the work between sessions."
          />
          <div className="mt-12">
            <ShopGrid products={products} />
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import { getProducts } from '@/lib/data';
import { WishlistView } from '@/components/shop/wishlist-view';

export const metadata: Metadata = {
  title: 'Wishlist',
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const products = await getProducts();
  return (
    <div className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <WishlistView products={products} />
      </div>
    </div>
  );
}

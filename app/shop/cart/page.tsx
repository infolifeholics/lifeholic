import type { Metadata } from 'next';
import { CartView } from '@/components/shop/cart-view';

export const metadata: Metadata = {
  title: 'Your bag',
  description: 'Review the items in your bag.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <CartView />
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { CheckoutView } from '@/components/shop/checkout-view';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <CheckoutView />
      </div>
    </div>
  );
}

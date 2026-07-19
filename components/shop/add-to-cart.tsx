'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/providers/cart-provider';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

export function AddToCart({
  product,
  currency = 'INR',
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    price_inr: number;
    price_usd: number;
    image: string;
    type: 'digital' | 'physical';
    stock: number | null;
  };
  currency?: 'INR' | 'USD';
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const price = currency === 'INR' ? product.price_inr : product.price_usd;
  const outOfStock = product.stock !== null && product.stock <= 0;

  const handleAdd = () => {
    add(
      {
        id: product.id,
        name: product.name,
        price,
        image: product.image,
        type: product.type,
      },
      qty
    );
    toast.success(`${qty} × ${product.name} added to your bag.`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {product.type === 'physical' && (
        <div className="inline-flex items-center rounded-full border border-border bg-card">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-l-full text-foreground hover:bg-secondary"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-r-full text-foreground hover:bg-secondary"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button
        onClick={handleAdd}
        disabled={outOfStock}
        size="lg"
        className={cn('flex-1 rounded-full', outOfStock && 'cursor-not-allowed opacity-60')}
      >
        {outOfStock ? 'Sold out' : `Add to bag · ${formatPrice(price, currency)}`}
      </Button>
    </div>
  );
}

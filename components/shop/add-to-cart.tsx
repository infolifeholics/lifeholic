'use client';

import { useState } from 'react';
import { Minus, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
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
  const { items, add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const price = currency === 'INR' ? product.price_inr : product.price_usd;
  const outOfStock = product.stock !== null && product.stock <= 0;
  const isInCart = items.some((item) => item.id === product.id);

  const handleAdd = () => {
    if (!user) {
      toast.error('Please sign in to add items to your cart.', {
        description: 'You will be redirected to the sign in page.',
      });
      router.push(`/auth/login?redirect=/shop/${product.slug}`);
      return;
    }

    if (isInCart) {
      router.push('/shop/cart');
      return;
    }

    setAdding(true);
    // Simulate a fast premium addition transition
    setTimeout(() => {
      add(
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price,
          image: product.image,
          type: product.type,
        },
        qty
      );
      setAdding(false);
      setSuccess(true);
      toast.success(`${qty} × ${product.name} added to your bag successfully.`);
      setTimeout(() => setSuccess(false), 2000);
    }, 450);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {product.type === 'physical' && !isInCart && (
        <div className="inline-flex items-center rounded-full border border-border bg-card">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-l-full text-foreground hover:bg-secondary"
            aria-label="Decrease quantity"
            disabled={adding || success}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-r-full text-foreground hover:bg-secondary"
            aria-label="Increase quantity"
            disabled={adding || success}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button
        onClick={handleAdd}
        disabled={outOfStock || adding}
        size="lg"
        className={cn(
          'flex-1 rounded-full transition-all duration-300',
          (success || isInCart) && 'bg-emerald-600 hover:bg-emerald-700 text-white scale-[1.02] shadow-emerald-500/20',
          outOfStock && 'cursor-not-allowed opacity-60'
        )}
      >
        {adding ? (
          <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Adding...</span>
        ) : isInCart ? (
          <span className="flex items-center gap-1.5 justify-center">Already added</span>
        ) : success ? (
          <span className="flex items-center gap-1.5 justify-center"><Check className="h-5 w-5 animate-scaleUp" /> Added successfully!</span>
        ) : outOfStock ? (
          'Sold out'
        ) : (
          `Add to bag · ${formatPrice(price, currency)}`
        )}
      </Button>
    </div>
  );
}

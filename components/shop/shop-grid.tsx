'use client';

import { useMemo, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query as firestoreQuery, where } from 'firebase/firestore';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Plus, Minus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductWishlistButton } from '@/components/shop/product-wishlist-button';
import { formatPrice } from '@/lib/format';
import { getProductRoute } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { showAppleCartNotification } from '@/components/shop/cart-notification';

export function ShopGrid({ products: initialProducts }: { products: Product[] }) {
  const { items, add, setQuantity, remove } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [type, setType] = useState<'All' | 'digital' | 'physical'>('All');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  useEffect(() => {
    const q = firestoreQuery(collection(db, 'products'), where('is_active', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
      list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      setProducts(list);
    });
    return () => unsub();
  }, []);

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('Please sign in to add items to your cart.', {
        description: 'You will be redirected to the sign in page.',
      });
      router.push(`/auth/login?redirect=/shop`);
      return;
    }
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price_inr,
      image: product.image,
      type: product.type,
    }, 1);
    showAppleCartNotification(product.name, product.image, 1);
  };

  const handleIncrement = (id: string, currentQty: number) => {
    setQuantity(id, currentQty + 1);
  };

  const handleDecrement = (id: string, currentQty: number) => {
    if (currentQty <= 1) {
      remove(id);
      toast.success('Item removed from cart.');
    } else {
      setQuantity(id, currentQty - 1);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(query.toLowerCase());
      const matchesCat = category === 'All' || p.category === category;
      const matchesType = type === 'All' || p.type === type;
      return matchesQuery && matchesCat && matchesType;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price_inr - b.price_inr);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price_inr - a.price_inr);
    return list;
  }, [products, query, category, type, sort]);

  const reset = () => {
    setQuery('');
    setCategory('All');
    setType('All');
    setSort('featured');
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-4 shadow-soft sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search the shop…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-full pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'All' | 'digital' | 'physical')}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            <option value="All">All types</option>
            <option value="digital">Digital</option>
            <option value="physical">Physical</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          {(query || category !== 'All' || type !== 'All' || sort !== 'featured') && (
            <Button variant="ghost" size="sm" onClick={reset} className="rounded-full">
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-secondary/40 p-16 text-center">
          <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-display text-xl text-foreground">Nothing matches that yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Try clearing a filter or searching differently.</p>
          <Button onClick={reset} variant="outline" className="mt-4 rounded-full">Clear filters</Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const onSale = p.compare_at_inr && p.compare_at_inr > p.price_inr;
            return (
              <Link key={p.id} href={getProductRoute(p.slug)} className="group block h-full">
                <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                  <div className="p-3">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/40 bg-secondary/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-contain transition-transform duration-1000 ease-soft group-hover:scale-105"
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
                  </div>
                  <div className="p-5 pt-2">
                    <h3 className="mt-1 font-display text-lg font-medium leading-snug text-foreground">{p.name}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">{formatPrice(p.price_inr, 'INR')}</span>
                        {onSale && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(p.compare_at_inr as number, 'INR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                      {p.amazonUrl ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(p.amazonUrl, '_blank');
                            }}
                            className="inline-flex items-center justify-center h-8 rounded-full px-4 text-xs font-semibold bg-gold text-black border border-gold transition-all hover:bg-gold/90"
                          >
                            Buy on Amazon
                          </button>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider bg-secondary/50 px-2.5 py-1 rounded-full">
                            From Amazon
                          </span>
                        </div>
                      ) : (
                        <>
                          <button className="inline-flex items-center justify-center h-8 rounded-full px-4 text-xs font-semibold bg-gold text-black border border-gold transition-all hover:bg-gold/90">
                            Details
                          </button>
                          {(() => {
                            const cartItem = items.find((item) => item.id === p.id);
                            if (cartItem) {
                              return (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <div className="flex items-center rounded-full border border-border bg-card h-8">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDecrement(p.id, cartItem.quantity);
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-l-full text-foreground hover:bg-secondary"
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-5 text-center text-xs font-semibold text-neutral-900">{cartItem.quantity}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleIncrement(p.id, cartItem.quantity);
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-r-full text-foreground hover:bg-secondary"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAddToCart(p);
                                }}
                              >
                                Add to Cart
                              </Button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

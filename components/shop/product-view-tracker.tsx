'use client';

import { useEffect, useRef } from 'react';
import { useMetaTracking } from '@/components/providers/meta-tracking-provider';
import { useCurrency } from '@/components/providers/currency-provider';
import { convertInrToCurrency, getEffectivePriceInr } from '@/lib/currency';

export function ProductViewTracker({
  product,
}: {
  product: { id: string; name: string; price_inr: number; compare_at_inr?: number | null };
}) {
  const { track } = useMetaTracking();
  const { currentCurrency, exchangeRate, isLoading } = useCurrency();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || isLoading || (currentCurrency !== 'INR' && !exchangeRate)) return;
    const { effectivePrice } = getEffectivePriceInr(product);
    const value = currentCurrency === 'INR'
      ? effectivePrice
      : convertInrToCurrency(effectivePrice, exchangeRate || 0, currentCurrency);
    const eventId = track('ViewContent', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value,
      currency: currentCurrency,
    });
    if (eventId) tracked.current = true;
  }, [currentCurrency, exchangeRate, isLoading, product, track]);

  return null;
}
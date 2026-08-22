'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import { useCurrency } from '@/components/providers/currency-provider';
import { formatPrice } from '@/lib/format';
import { convertInrToCurrency } from '@/lib/currency';

export function ServicePriceBlock({
  priceInr,
  variant = 'details', // 'details' or 'cta'
}: {
  priceInr: number;
  variant?: 'details' | 'cta';
}) {
  const { currentCurrency, exchangeRate, isLoading, rates } = useCurrency();
  const [gstPercentage, setGstPercentage] = useState<number>(18);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.gst_percentage === 'number') {
          setGstPercentage(data.gst_percentage);
        }
      }
    }).catch((err) => console.error(err));
  }, []);

  const isInternational = currentCurrency !== 'INR';
  const hasError = isInternational && Object.keys(rates).length === 0;

  if (hasError) {
    return (
      <div className="w-full text-xs text-rose-400 border border-rose-500/20 bg-rose-500/5 p-3 rounded-lg mt-3">
        Pricing is temporarily unavailable for your region. Please try again later.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full text-xs text-white/50 animate-pulse p-3 rounded-lg mt-3">
        Loading regional pricing...
      </div>
    );
  }

  // GST INR
  const gstInr = Math.round((priceInr * gstPercentage) / 100);
  const totalInr = priceInr + gstInr;

  // Convert
  const displayTotal = isInternational
    ? convertInrToCurrency(totalInr, exchangeRate || 0, currentCurrency)
    : totalInr;

  const displayBase = isInternational
    ? convertInrToCurrency(priceInr, exchangeRate || 0, currentCurrency)
    : priceInr;

  // Ensure Base + GST = Total mathematically
  const displayGst = isInternational
    ? Math.round((displayTotal - displayBase) * 100) / 100
    : gstInr;

  if (variant === 'cta') {
    return (
      <span>from {formatPrice(displayTotal, currentCurrency)}</span>
    );
  }

  return (
    <div className="w-full space-y-3 pt-3 border-t border-white/10 mt-3 text-sm">
      <div className="flex justify-between">
        <span className="text-white/80 font-semibold">Starting from</span>
        <span className="font-bold text-white">{formatPrice(displayBase, currentCurrency)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/80 font-semibold">GST ({gstPercentage}%)</span>
        <span className="font-bold text-white">{formatPrice(displayGst, currentCurrency)}</span>
      </div>
      <div className="flex justify-between pt-3 border-t border-white/10 items-end">
        <span className="text-white/90 font-semibold text-base">Total</span>
        <span className="font-display text-2xl font-bold text-gold">{formatPrice(displayTotal, currentCurrency)}</span>
      </div>
    </div>
  );
}


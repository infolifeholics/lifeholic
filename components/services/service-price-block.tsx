'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import { formatPrice } from '@/lib/format';
import { convertInrToUsd, getUserCurrency } from '@/lib/currency';

export function ServicePriceBlock({
  priceInr,
  variant = 'details', // 'details' or 'cta'
}: {
  priceInr: number;
  variant?: 'details' | 'cta';
}) {
  const { profile } = useAuth();
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [gstPercentage, setGstPercentage] = useState<number>(18);
  const [detectedCurrency, setDetectedCurrency] = useState<'INR' | 'USD'>('INR');

  useEffect(() => {
    const currency = getUserCurrency(profile);
    setDetectedCurrency(currency);
  }, [profile]);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.usd_to_inr_rate === 'number' && data.usd_to_inr_rate > 0) {
          setExchangeRate(data.usd_to_inr_rate);
        }
        if (typeof data.gst_percentage === 'number') {
          setGstPercentage(data.gst_percentage);
        }
      }
    }).catch((err) => console.error(err));
  }, []);

  // GST INR
  const gstInr = Math.round((priceInr * gstPercentage) / 100);
  const totalInr = priceInr + gstInr;

  // Convert total to USD
  const displayTotal = detectedCurrency === 'USD'
    ? convertInrToUsd(totalInr, exchangeRate || 1)
    : totalInr;

  const displayBase = detectedCurrency === 'USD'
    ? convertInrToUsd(priceInr, exchangeRate || 1)
    : priceInr;

  // Ensure Base + GST = Total mathematically
  const displayGst = detectedCurrency === 'USD'
    ? Math.round((displayTotal - displayBase) * 100) / 100
    : gstInr;

  if (variant === 'cta') {
    return (
      <span>from {formatPrice(displayTotal, detectedCurrency)}</span>
    );
  }

  return (
    <div className="w-full space-y-3 pt-3 border-t border-white/10 mt-3 text-sm">
      <div className="flex justify-between">
        <span className="text-white/80 font-semibold">Starting from</span>
        <span className="font-bold text-white">{formatPrice(displayBase, detectedCurrency)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/80 font-semibold">GST ({gstPercentage}%)</span>
        <span className="font-bold text-white">{formatPrice(displayGst, detectedCurrency)}</span>
      </div>
      <div className="flex justify-between pt-3 border-t border-white/10 items-end">
        <span className="text-white/90 font-semibold text-base">Total</span>
        <span className="font-display text-2xl font-bold text-gold">{formatPrice(displayTotal, detectedCurrency)}</span>
      </div>
    </div>
  );
}

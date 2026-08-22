'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import { formatPrice } from '@/lib/format';
import { convertInrToCurrency, getUserCurrency } from '@/lib/currency';

export function ServicePriceBlock({
  priceInr,
  variant = 'details', // 'details' or 'cta'
}: {
  priceInr: number;
  variant?: 'details' | 'cta';
}) {
  const { profile } = useAuth();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesError, setRatesError] = useState(false);
  const [gstPercentage, setGstPercentage] = useState<number>(18);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('INR');

  useEffect(() => {
    const currency = getUserCurrency(profile);
    setDetectedCurrency(currency);
  }, [profile]);

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data && data.rates) {
          setRates(data.rates);
        } else {
          setRatesError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load exchange rates in ServicePriceBlock:', err);
        setRatesError(true);
      });

    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.gst_percentage === 'number') {
          setGstPercentage(data.gst_percentage);
        }
      }
    }).catch((err) => console.error(err));
  }, []);

  const isInternational = detectedCurrency !== 'INR';
  const rate = isInternational ? rates[detectedCurrency] : 1;
  const isLoadingRates = isInternational && Object.keys(rates).length === 0 && !ratesError;
  const hasError = isInternational && ratesError && Object.keys(rates).length === 0;

  if (hasError) {
    return (
      <div className="w-full text-xs text-rose-400 border border-rose-500/20 bg-rose-500/5 p-3 rounded-lg mt-3">
        Pricing is temporarily unavailable for your region. Please try again later.
      </div>
    );
  }

  if (isLoadingRates) {
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
    ? convertInrToCurrency(totalInr, rate || 0)
    : totalInr;

  const displayBase = isInternational
    ? convertInrToCurrency(priceInr, rate || 0)
    : priceInr;

  // Ensure Base + GST = Total mathematically
  const displayGst = isInternational
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


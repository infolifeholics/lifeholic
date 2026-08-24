'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { getCountryByName } from '@/lib/countries';
import { getCurrencyForCountryCode } from '@/lib/currency';

type OverrideData = {
  country: string;
  source: string;
  expiresAt: number;
};

type CurrencyContextType = {
  currentCountry: string;
  currentCurrency: string;
  exchangeRate: number;
  locationSource: 'profile' | 'manual' | 'automatic' | 'fallback';
  isLoading: boolean;
  rates: Record<string, number>;
  setOverrideCountry: (countryCode: string) => void;
  clearOverrideCountry: () => void;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [autoCountry, setAutoCountry] = useState('IN');
  const [autoCurrency, setAutoCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(true);
  const [override, setOverride] = useState<OverrideData | null>(null);

  // Read override from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currency_override');
      if (stored) {
        const parsed = JSON.parse(stored) as OverrideData;
        if (parsed.expiresAt > Date.now()) {
          setOverride(parsed);
        } else {
          localStorage.removeItem('currency_override');
        }
      }
    } catch (e) {
      console.error('Failed to parse currency override:', e);
    }
  }, []);

  // Fetch exchange rates and automatic IP-based country/currency
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/exchange-rates');
        if (!res.ok) throw new Error('Failed to fetch rates');
        const data = await res.json();
        if (data.rates) {
          setRates(data.rates);
        }
        if (data.country) {
          setAutoCountry(data.country);
        }
        if (data.currency) {
          setAutoCurrency(data.currency);
        }
      } catch (err) {
        console.error('Error loading currency data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRates();
  }, []);

  const setOverrideCountry = (countryCode: string) => {
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    const data: OverrideData = {
      country: countryCode.toUpperCase(),
      source: 'manual',
      expiresAt,
    };
    try {
      localStorage.setItem('currency_override', JSON.stringify(data));
    } catch (e) {}
    setOverride(data);
  };

  const clearOverrideCountry = () => {
    try {
      localStorage.removeItem('currency_override');
    } catch (e) {}
    setOverride(null);
  };

  // Determine current country and currency based on priorities
  let currentCountry = 'IN';
  let currentCurrency = 'INR';
  let locationSource: 'profile' | 'manual' | 'automatic' | 'fallback' = 'fallback';

  if (!authLoading && profile?.country) {
    // Priority 1: Logged-in user's profile country
    const cleanCountry = profile.country.trim();
    if (cleanCountry.length === 2) {
      currentCountry = cleanCountry.toUpperCase();
    } else {
      const countryObj = getCountryByName(cleanCountry);
      currentCountry = countryObj ? countryObj.code.toUpperCase() : 'IN';
    }
    currentCurrency = getCurrencyForCountryCode(currentCountry);
    locationSource = 'profile';
  } else if (override && override.expiresAt > Date.now()) {
    // Priority 2: Active manual override
    currentCountry = override.country;
    currentCurrency = getCurrencyForCountryCode(currentCountry);
    locationSource = 'manual';
  } else {
    // Priority 3: Automatic detection
    currentCountry = autoCountry;
    currentCurrency = autoCurrency;
    locationSource = 'automatic';
  }

  // Fallback to INR if rates are not yet loaded
  const exchangeRate = currentCurrency === 'INR' ? 1 : (rates[currentCurrency] || 1);

  const value: CurrencyContextType = {
    currentCountry,
    currentCurrency,
    exchangeRate,
    locationSource,
    isLoading: isLoading || authLoading,
    rates,
    setOverrideCountry,
    clearOverrideCountry,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

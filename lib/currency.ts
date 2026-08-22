/**
 * Centralized currency calculation and region utilities.
 */

import { getCountryByName } from './countries';

export const CURRENCY_MAPPINGS: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  JP: 'JPY',
  GB: 'GBP',
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  SG: 'SGD',
  HK: 'HKD',
  NZ: 'NZD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  BR: 'BRL',
  MX: 'MXN',
  KR: 'KRW',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  CN: 'CNY',
  VN: 'VND',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  ZA: 'ZAR',
  TR: 'TRY',
  IL: 'ILS',
  EG: 'EGP',
  // Eurozone
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR', GR: 'EUR', 
  HR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR', 
  PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR'
};

export const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  // Default to 2 for other currencies
};

export function getCurrencyDecimals(currency: string): number {
  const code = currency.toUpperCase();
  return CURRENCY_DECIMALS[code] !== undefined ? CURRENCY_DECIMALS[code] : 2;
}

/**
 * Converts currency amount to Razorpay smallest unit (paise/cents/etc.)
 */
export function toRazorpayAmount(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier);
}

/**
 * Converts Razorpay smallest unit amount back to full currency amount
 */
export function fromRazorpayAmount(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const multiplier = Math.pow(10, decimals);
  return amount / multiplier;
}

export function getCurrencyForCountryCode(code: string): string {
  const cleanCode = code.trim().toUpperCase();
  return CURRENCY_MAPPINGS[cleanCode] || 'USD';
}

/**
 * Detects user country server-side using Vercel/Cloudflare headers, with query param testing fallback.
 */
export function getUserCountryCode(reqHeaders: Headers | Record<string, string>, urlString?: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // Try to parse query param from urlString
    if (urlString) {
      try {
        const url = new URL(urlString);
        const testCountry = url.searchParams.get('country');
        if (testCountry) return testCountry.toUpperCase();
      } catch (e) {}
    }
    
    const getHeader = (name: string): string | null => {
      if (typeof (reqHeaders as any).get === 'function') {
        return (reqHeaders as any).get(name);
      }
      return (reqHeaders as Record<string, string>)[name] || null;
    };
    
    const testCountry = getHeader('x-test-country') || getHeader('x-country');
    if (testCountry) return testCountry.toUpperCase();
  }

  const getHeader = (name: string): string | null => {
    if (typeof (reqHeaders as any).get === 'function') {
      return (reqHeaders as any).get(name);
    }
    return (reqHeaders as Record<string, string>)[name] || null;
  };

  const vercelCountry = getHeader('x-vercel-ip-country');
  if (vercelCountry) return vercelCountry.toUpperCase();

  const cfCountry = getHeader('cf-ipcountry');
  if (cfCountry) return cfCountry.toUpperCase();

  return 'IN';
}

/**
 * Maps the user's saved country or timezone to their corresponding currency code.
 */
export function getUserCurrency(profile: { country?: string | null } | null, fallbackTz?: string): string {
  if (profile && profile.country) {
    const countryName = profile.country.trim();
    if (countryName.length === 2) {
      return getCurrencyForCountryCode(countryName);
    }
    const countryObj = getCountryByName(countryName);
    if (countryObj) {
      return getCurrencyForCountryCode(countryObj.code);
    }
    
    // Fallback if country name is not in standard list but matches common names
    const norm = countryName.toLowerCase();
    if (norm === 'india') return 'INR';
    if (norm === 'united kingdom' || norm === 'uk') return 'GBP';
    if (norm === 'united states' || norm === 'usa' || norm === 'us') return 'USD';
    if (norm === 'united arab emirates' || norm === 'uae') return 'AED';
    if (norm === 'canada') return 'CAD';
    if (norm === 'australia') return 'AUD';
    if (norm === 'singapore') return 'SGD';
    if (norm === 'japan') return 'JPY';
  }

  // Fallback to timezone check if profile country is not set
  if (fallbackTz) {
    const t = fallbackTz.toLowerCase();
    if (t.includes('kolkata') || t.includes('calcutta') || t.includes('india')) {
      return 'INR';
    }
    if (t.includes('london') || t.includes('europe/london')) {
      return 'GBP';
    }
    if (t.includes('dubai') || t.includes('asia/dubai')) {
      return 'AED';
    }
    if (t.includes('singapore') || t.includes('asia/singapore')) {
      return 'SGD';
    }
    if (t.includes('tokyo') || t.includes('asia/tokyo')) {
      return 'JPY';
    }
    if (t.includes('sydney') || t.includes('australia/sydney')) {
      return 'AUD';
    }
    // Eurozone timezones
    if (t.includes('paris') || t.includes('berlin') || t.includes('rome') || t.includes('madrid') || t.includes('amsterdam') || t.includes('brussels')) {
      return 'EUR';
    }
  }
  
  return 'USD';
}

/**
 * Converts INR base price to target currency using exchange rate (targetCurrency / INR)
 */
export function convertInrToCurrency(priceInr: number, targetRate: number, currency: string = 'USD'): number {
  if (!targetRate || targetRate <= 0) return priceInr;
  const converted = priceInr * targetRate;
  const decimals = getCurrencyDecimals(currency);
  const multiplier = Math.pow(10, decimals);
  return Math.round(converted * multiplier) / multiplier;
}

import { adminDb } from './firebase-admin';

export interface ExchangeRatesData {
  base: string;
  rates: Record<string, number>;
  fetched_at: string;
}

/**
 * Fetches the current exchange rates from the API or reads them from the Firestore cache.
 * Caches rates in Firestore for 24 hours. Falls back to expired cached rates if API fails.
 */
export async function getExchangeRates(): Promise<ExchangeRatesData> {
  const cacheRef = adminDb.collection('settings').doc('exchange_rates');
  
  // 1. Try to read from Firestore cache
  let cachedDoc: ExchangeRatesData | null = null;
  try {
    const snap = await cacheRef.get();
    if (snap.exists) {
      cachedDoc = snap.data() as ExchangeRatesData;
      
      if (cachedDoc.rates && cachedDoc.fetched_at) {
        const fetchedAt = new Date(cachedDoc.fetched_at).getTime();
        const now = Date.now();
        const diffMs = now - fetchedAt;
        const cacheDurationMs = 24 * 60 * 60 * 1000; // 24 hours
        
        if (diffMs < cacheDurationMs) {
          return cachedDoc;
        }
      }
    }
  } catch (err) {
    console.error('[ExchangeRates] Error reading cache from Firestore:', err);
  }

  // 2. Fetch new rates from API
  const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/INR';
  
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`Exchange rate API responded with status: ${res.status}`);
    }
    const data = await res.json();
    
    if (data && data.result === 'success' && data.rates) {
      const rates = data.rates;
      const ratesData: ExchangeRatesData = {
        base: 'INR',
        rates: rates,
        fetched_at: new Date().toISOString(),
      };
      
      // Update Firestore cache
      await cacheRef.set(ratesData);
      return ratesData;
    } else {
      throw new Error('Invalid response structure from exchange rate API');
    }
  } catch (err) {
    console.error('[ExchangeRates] Error fetching from API, falling back to cache:', err);
    // 3. Fallback: If API fetch failed, return the expired cache document if available
    if (cachedDoc && cachedDoc.rates) {
      console.warn('[ExchangeRates] Using expired cached rates as fallback.');
      return cachedDoc;
    }
    throw new Error('Exchange rate service unavailable and no cached rates found.');
  }
}

/**
 * Retrieves the exchange rate from one currency to another (usually base is INR).
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  
  const { rates } = await getExchangeRates();
  
  if (fromCurrency === 'INR') {
    const rate = rates[toCurrency];
    if (typeof rate !== 'number') {
      throw new Error(`Rate not found for currency: ${toCurrency}`);
    }
    return rate;
  }
  
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (typeof fromRate !== 'number' || typeof toRate !== 'number') {
    throw new Error(`Rate not found for converting ${fromCurrency} to ${toCurrency}`);
  }
  return toRate / fromRate;
}

/**
 * Converts an amount from one currency to another using current exchange rates.
 */
export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency || amount === 0) return amount;
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

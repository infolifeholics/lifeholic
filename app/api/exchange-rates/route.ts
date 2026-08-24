import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/exchange-rates';
import { getCurrencyForCountryCode, getUserCountryCode } from '@/lib/currency';

export async function GET(req: Request) {
  try {
    const country = getUserCountryCode(req.headers, req.url);
    const currency = getCurrencyForCountryCode(country);
    
    // Fetch rates from cache/API
    const ratesData = await getExchangeRates();
    
    // Validate target rate availability
    const targetRate = currency === 'INR' ? 1 : (ratesData.rates?.[currency] || null);
    
    return NextResponse.json({
      ...ratesData,
      country,
      currency,
      active_rate: targetRate,
    });
  } catch (err: any) {
    console.error('[ExchangeRates API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

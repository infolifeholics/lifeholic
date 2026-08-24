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
    
    // Fetch global settings for dynamic GST percentage
    let gstPercentage = 18;
    try {
      const { adminDb } = await import('@/lib/firebase-admin');
      const globalSnap = await adminDb.collection('settings').doc('global').get();
      if (globalSnap.exists) {
        const gData = globalSnap.data();
        if (gData && typeof gData.gst_percentage === 'number') {
          gstPercentage = gData.gst_percentage;
        }
      }
    } catch (e) {
      console.error('Error fetching global settings in exchange-rates API:', e);
    }

    return NextResponse.json({
      ...ratesData,
      country,
      currency,
      active_rate: targetRate,
      gst_percentage: gstPercentage,
    });
  } catch (err: any) {
    console.error('[ExchangeRates API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

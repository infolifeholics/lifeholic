/**
 * Centralized currency calculation and region utilities.
 */

export function convertInrToUsd(priceInr: number, rate: number): number {
  if (!rate || rate <= 0) return Math.round(priceInr / 85 * 100) / 100;
  // Rounds to 2 decimal places for sensible display / payment
  return Math.round((priceInr / rate) * 100) / 100;
}

export function getUserCurrency(profile: { country?: string | null } | null, fallbackTz?: string): 'INR' | 'USD' {
  if (profile) {
    if (profile.country) {
      const countryStr = profile.country.trim().toLowerCase();
      if (countryStr === 'india' || countryStr === 'in') {
        return 'INR';
      }
      return 'USD';
    }
  }

  // Fallback to timezone check if profile country is not set or not logged in
  if (fallbackTz) {
    const t = fallbackTz.toLowerCase();
    if (t.includes('kolkata') || t.includes('calcutta') || t.includes('india')) {
      return 'INR';
    }
  }
  
  return 'USD';
}

type CouponDiscountFields = {
  value?: unknown;
};

export function calculateCouponDiscount(subtotal: number, coupon: CouponDiscountFields): number {
  const eligibleSubtotal = Math.max(0, Number(subtotal) || 0);
  const value = Math.max(0, Number(coupon.value) || 0);
  return Math.min(eligibleSubtotal, value);
}

export function isCouponExpired(expiry: unknown, now = new Date()): boolean {
  if (!expiry) return false;
  const expiryDate = expiry instanceof Date
    ? expiry
    : typeof expiry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiry)
      ? new Date(`${expiry}T23:59:59.999Z`)
      : new Date(String(expiry));

  return !Number.isNaN(expiryDate.getTime()) && now > expiryDate;
}
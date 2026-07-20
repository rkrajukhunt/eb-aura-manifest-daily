import type { PlanId } from '@aura/shared';

/**
 * Price presentation (product 15, checklist #2).
 *
 * "Weekly price always shows monthly equivalent" is a release-blocking rule, and
 * it exists because of a specific competitor failure: Stella's reviews are full
 * of "$10/week!!! Greedy & misleading" from users who only did the multiplication
 * after being charged. Printing the monthly figure ourselves is the trust
 * signature — we do the arithmetic the user would otherwise do angrily.
 *
 * Pure and currency-aware so it can be tested exhaustively without RevenueCat.
 */

/** Weeks per year, per the store's own billing cadence. */
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/** Converts a plan's headline price into a per-month figure. */
export function monthlyAmount(planId: PlanId, price: number): number {
  return planId === 'annual' ? price / MONTHS_PER_YEAR : (price * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
}

/**
 * The localized monthly-equivalent string, or null when it cannot be formed
 * honestly.
 *
 * Null on a missing currency code is deliberate: a bare number sitting next to a
 * real price reads as a second price, and being ambiguous about money is the one
 * thing this whole surface is built to avoid.
 */
export function monthlyEquivalent(
  planId: PlanId,
  price: number | null | undefined,
  currencyCode: string | null | undefined,
): string | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (!currencyCode) return null;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(monthlyAmount(planId, price));
  } catch {
    // An invalid currency code from the store is not worth crashing a paywall.
    return null;
  }
}

/**
 * The full honest price line: "$6.99/week · about $27.29/month".
 *
 * "about" is load-bearing — the monthly figure is arithmetic, not a price she
 * will ever be charged, and implying otherwise would be its own small dishonesty.
 */
export function priceLine(planId: PlanId, priceString: string, equivalent: string | null): string {
  const cadence = planId === 'annual' ? '/year' : '/week';
  const head = `${priceString}${priceString.includes('/') ? '' : cadence}`;
  return equivalent ? `${head} · about ${equivalent}/month` : head;
}

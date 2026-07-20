import { monthlyAmount, monthlyEquivalent, priceLine } from './pricing';

/**
 * Checklist #2: "Weekly price always shows monthly equivalent" — release-blocking.
 *
 * This exists because of a specific, documented competitor failure: users who
 * discovered the true monthly cost only after being charged left one-star
 * reviews calling it misleading. The arithmetic below is the trust signature of
 * the whole paywall, so it is tested to the cent and in more than one currency.
 */
describe('pricing', () => {
  describe('monthlyAmount', () => {
    it('divides an annual price across twelve months', () => {
      expect(monthlyAmount('annual', 39.99)).toBeCloseTo(3.3325, 3);
    });

    it('projects a weekly price across a real year, not four weeks', () => {
      // 52 weeks / 12 months. Using "4 weeks = a month" would understate the
      // true cost by about 8% — flattering, and exactly the dishonesty the
      // checklist exists to prevent.
      expect(monthlyAmount('weekly', 6.99)).toBeCloseTo(30.29, 2);
    });

    it('never flatters the weekly plan', () => {
      expect(monthlyAmount('weekly', 6.99)).toBeGreaterThan(6.99 * 4);
    });
  });

  describe('monthlyEquivalent', () => {
    it('formats the annual equivalent in the product currency', () => {
      const result = monthlyEquivalent('annual', 39.99, 'USD');

      expect(result).toContain('3.33');
    });

    it('formats the weekly equivalent', () => {
      const result = monthlyEquivalent('weekly', 6.99, 'USD');

      expect(result).toContain('30.29');
    });

    it('respects a non-USD storefront', () => {
      const result = monthlyEquivalent('annual', 49.99, 'EUR');

      expect(result).toBeTruthy();
      expect(result).not.toContain('$');
    });

    it('returns null rather than an unlabelled number when the currency is unknown', () => {
      // A bare figure beside a real price reads as a second price. Silence is
      // better than ambiguity about money.
      expect(monthlyEquivalent('annual', 39.99, null)).toBeNull();
      expect(monthlyEquivalent('annual', 39.99, undefined)).toBeNull();
    });

    it('returns null for a missing or nonsensical price', () => {
      expect(monthlyEquivalent('annual', null, 'USD')).toBeNull();
      expect(monthlyEquivalent('annual', 0, 'USD')).toBeNull();
      expect(monthlyEquivalent('annual', -5, 'USD')).toBeNull();
      expect(monthlyEquivalent('annual', Number.NaN, 'USD')).toBeNull();
    });

    it('survives an invalid currency code from the store', () => {
      expect(monthlyEquivalent('annual', 39.99, 'NOT_A_CURRENCY')).toBeNull();
    });
  });

  describe('priceLine', () => {
    it('prints the monthly equivalent beside the weekly price', () => {
      const line = priceLine('weekly', '$6.99', '$30.29');

      expect(line).toBe('$6.99/week · about $30.29/month');
    });

    it('prints it beside the annual price too', () => {
      const line = priceLine('annual', '$39.99', '$3.33');

      expect(line).toBe('$39.99/year · about $3.33/month');
    });

    it('says "about" — the monthly figure is arithmetic, not a charge', () => {
      expect(priceLine('weekly', '$6.99', '$30.29')).toContain('about');
    });

    it('falls back to the bare price when no equivalent could be formed', () => {
      expect(priceLine('weekly', '$6.99', null)).toBe('$6.99/week');
    });

    it('does not double the cadence when the store string already carries one', () => {
      expect(priceLine('weekly', '$6.99/wk', null)).toBe('$6.99/wk');
    });
  });
});

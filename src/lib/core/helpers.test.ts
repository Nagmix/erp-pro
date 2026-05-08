import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber } from './helpers';

describe('formatCurrency', () => {
  it('returns non-empty localized currency string', () => {
    const s = formatCurrency(1234.5, 'YER');
    expect(s.length).toBeGreaterThan(4);
    expect(s).toMatch(/ر\.س|SAR|﷼/);
  });
});

describe('formatDate', () => {
  it('returns empty for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats integers with grouping', () => {
    const s = formatNumber(1000);
    expect(s.length).toBeGreaterThanOrEqual(4);
    expect(/\d|[٠-٩]/.test(s)).toBe(true);
  });
});

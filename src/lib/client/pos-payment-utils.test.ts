import { describe, expect, it } from 'vitest';
import { computePosPaymentTotals, isLikelyCashMode } from './pos-payment-utils';

describe('isLikelyCashMode', () => {
  it('detects cash-like labels', () => {
    expect(isLikelyCashMode('Cash')).toBe(true);
    expect(isLikelyCashMode('نقدي')).toBe(true);
    expect(isLikelyCashMode('Card')).toBe(false);
  });
});

describe('computePosPaymentTotals', () => {
  const modes = ['Cash', 'Card'];

  it('computes remaining due when underpaid', () => {
    const t = computePosPaymentTotals(100, modes, { Cash: '30', Card: '0' });
    expect(t.paymentSum).toBe(30);
    expect(t.remainingDue).toBeCloseTo(70, 5);
    expect(t.changeCash).toBe(0);
  });

  it('computes cash change when cash covers over non-cash portion', () => {
    const t = computePosPaymentTotals(100, modes, { Cash: '80', Card: '50' });
    expect(t.paymentSum).toBe(130);
    expect(t.changeCash).toBeGreaterThan(0);
    expect(t.rawOverpay).toBeGreaterThan(0);
  });

  it('flags non-cash overpay separately from cash change', () => {
    const t = computePosPaymentTotals(100, ['Card'], { Card: '120' });
    expect(t.changeCash).toBe(0);
    expect(t.nonCashOverpay).toBeGreaterThan(0);
  });
});

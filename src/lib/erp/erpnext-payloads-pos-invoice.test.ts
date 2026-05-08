import { describe, expect, it } from 'vitest';
import { buildPosInvoice } from './erpnext-payloads';

describe('buildPosInvoice', () => {
  it('builds POS Invoice doc with items and payments', () => {
    const doc = buildPosInvoice({
      company: 'Co',
      customer: 'CUST',
      posting_date: '2026-05-03',
      due_date: '2026-05-03',
      pos_profile: 'POS-1',
      cost_center: 'CC',
      currency: 'YER',
      selling_price_list: 'Standard',
      price_list_currency: 'YER',
      items: [
        {
          item_code: 'X',
          qty: 1,
          rate: 50,
          amount: 50,
          warehouse: 'W',
        },
      ],
      payments: [{ mode_of_payment: 'Cash', amount: 50 }],
    });
    expect(doc.doctype).toBe('POS Invoice');
    expect(doc.is_pos).toBe(1);
    expect((doc.items as unknown[]).length).toBe(1);
    expect((doc.payments as { amount: number }[])[0]!.amount).toBe(50);
  });

  it('applies discount_amount when positive', () => {
    const doc = buildPosInvoice({
      company: 'Co',
      customer: 'CUST',
      posting_date: '2026-05-03',
      due_date: '2026-05-03',
      pos_profile: 'POS-1',
      cost_center: 'CC',
      currency: 'YER',
      selling_price_list: 'Standard',
      price_list_currency: 'YER',
      items: [{ item_code: 'X', qty: 1, rate: 100, amount: 100, warehouse: 'W' }],
      payments: [{ mode_of_payment: 'Cash', amount: 90 }],
      discount_amount: 10,
    });
    expect(doc.apply_discount_on).toBe('Grand Total');
  });
});

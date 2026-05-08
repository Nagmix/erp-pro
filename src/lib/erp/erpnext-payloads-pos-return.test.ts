import { describe, expect, it } from 'vitest';
import { buildPosInvoiceReturn } from './erpnext-payloads';

const baseSource = (): Record<string, unknown> => ({
  name: 'POSINV-00001',
  naming_series: 'ACC-PSINV-.YYYY.-',
  company: 'Test Co',
  customer: 'Walk-in',
  grand_total: 100,
  pos_profile: 'Store-POS',
  currency: 'YER',
  conversion_rate: 1,
  selling_price_list: 'Standard',
  price_list_currency: 'YER',
  plc_conversion_rate: 1,
  items: [
    {
      item_code: 'SKU-1',
      qty: 2,
      rate: 50,
      amount: 100,
      uom: 'Nos',
      warehouse: 'Stores - TC',
    },
  ],
  payments: [{ mode_of_payment: 'Cash', amount: 100 }],
});

describe('buildPosInvoiceReturn', () => {
  it('builds full return with negative quantities and payments', () => {
    const doc = buildPosInvoiceReturn(baseSource(), '2026-05-03');
    expect(doc.doctype).toBe('POS Invoice');
    expect(doc.is_return).toBe(1);
    expect(doc.return_against).toBe('POSINV-00001');
    expect(doc.update_stock).toBe(1);
    const items = doc.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]!.qty).toBe(-2);
    const pays = doc.payments as { amount: number }[];
    expect(pays[0]!.amount).toBeLessThan(0);
  });

  it('scales partial return quantities and payment ratio', () => {
    const doc = buildPosInvoiceReturn(baseSource(), '2026-05-03', {
      returnQtyByIndex: { 0: 1 },
    });
    const items = doc.items as Record<string, unknown>[];
    expect(items[0]!.qty).toBe(-1);
    const pays = doc.payments as { amount: number }[];
    expect(Math.abs(pays[0]!.amount)).toBeCloseTo(50, 5);
  });

  it('with explicitPartial omits lines not listed in returnQtyByIndex', () => {
    const src = {
      ...baseSource(),
      grand_total: 100,
      items: [
        {
          item_code: 'A',
          qty: 1,
          rate: 60,
          amount: 60,
          uom: 'Nos',
          warehouse: 'W',
        },
        {
          item_code: 'B',
          qty: 1,
          rate: 40,
          amount: 40,
          uom: 'Nos',
          warehouse: 'W',
        },
      ],
      payments: [
        { mode_of_payment: 'Cash', amount: 60 },
        { mode_of_payment: 'Card', amount: 40 },
      ],
    };
    const doc = buildPosInvoiceReturn(src, '2026-05-03', {
      explicitPartial: true,
      returnQtyByIndex: { 0: 1 },
    });
    const items = doc.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]!.item_code).toBe('A');
  });

  it('single_mode refund puts amount on one mode_of_payment', () => {
    const doc = buildPosInvoiceReturn(baseSource(), '2026-05-03', {
      refundSplit: 'single_mode',
      singleRefundMode: 'Cash',
    });
    const pays = doc.payments as { mode_of_payment: unknown; amount: number }[];
    expect(pays).toHaveLength(1);
    expect(pays[0]!.mode_of_payment).toBe('Cash');
    expect(pays[0]!.amount).toBeLessThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  ERP_POS_DISCOUNT_AMOUNT,
  ERP_PURCHASE_INVOICE_ADDITIONAL_DISCOUNT,
  ERP_SALES_INVOICE_ADDITIONAL_DISCOUNT,
} from './field-name-conventions';

describe('field-name-conventions', () => {
  it('matches ERPNext document keys for discounts', () => {
    expect(ERP_SALES_INVOICE_ADDITIONAL_DISCOUNT).toBe('additional_discount_amount');
    expect(ERP_PURCHASE_INVOICE_ADDITIONAL_DISCOUNT).toBe('additional_discount_amount');
    expect(ERP_POS_DISCOUNT_AMOUNT).toBe('discount_amount');
  });
});

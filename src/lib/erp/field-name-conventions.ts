/**
 * مرجع أسماء حقول ERPNext مقابل أسماء مألوفة في الواجهة (T-FLD).
 * لا تغيّر القيم دون مراجعة مخطط DocType على الخادم.
 */

/** خصم إضافي على مستند المبيعات — الحقل القياسي في ERPNext لمعظم فواتير البيع غير POS. */
export const ERP_SALES_INVOICE_ADDITIONAL_DISCOUNT = 'additional_discount_amount' as const;

/** خصم على مستند شراء — مطابق لـ `additional_discount_amount` في Purchase Invoice. */
export const ERP_PURCHASE_INVOICE_ADDITIONAL_DISCOUNT = 'additional_discount_amount' as const;

/** خصم مستوى مستند في نقاط البيع / بعض القوالب — يختلف عن الخصم الإضافي أعلاه. */
export const ERP_POS_DISCOUNT_AMOUNT = 'discount_amount' as const;

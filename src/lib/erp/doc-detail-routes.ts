/** مسارات عرض تفصيلي لأهم المستندات (مرحلة 4.8) */

export const ERP_DOC_SLUG_TO_TYPE: Record<string, string> = {
  'sales-invoice': 'Sales Invoice',
  'purchase-invoice': 'Purchase Invoice',
  'journal-entry': 'Journal Entry',
  'payment-entry': 'Payment Entry',
  'sales-order': 'Sales Order',
  'purchase-order': 'Purchase Order',
  'expense-claim': 'Expense Claim',
  /** عقود CRM — صفحة الإيجارات/العقود */
  contract: 'Contract',
};

export const ERP_DOC_TYPE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ERP_DOC_SLUG_TO_TYPE).map(([slug, dt]) => [dt, slug])
);

export function docDetailPath(doctype: string, name: string): string | null {
  const slug = ERP_DOC_TYPE_TO_SLUG[doctype];
  if (!slug || !name) return null;
  return `/doc/${slug}/${encodeURIComponent(name)}`;
}

export function docTypeFromSlug(slug: string): string | null {
  return ERP_DOC_SLUG_TO_TYPE[slug] ?? null;
}

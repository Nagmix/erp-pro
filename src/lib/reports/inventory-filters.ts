/** فلاتر تقارير المخزون والتصنيع في ERPNext */

export function buildStockBalanceFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    valuation_field_type: 'Currency',
    include_zero_stock_items: 0,
  };
}

export function buildStockLedgerFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    valuation_field_type: 'Currency',
  };
}

export function buildItemShortageFilters(params: { company: string }): Record<string, unknown> {
  return { company: params.company };
}

export function buildStockAccountValueComparisonFilters(params: {
  company: string;
  asOnDate: string;
  /** حساب مخزون — اختياري؛ التقرير يعمل غالباً مع الشركة والتاريخ */
  account?: string;
}): Record<string, unknown> {
  const f: Record<string, unknown> = {
    company: params.company,
    as_on_date: params.asOnDate,
  };
  if (params.account) f.account = params.account;
  return f;
}

export function buildWorkOrderSummaryFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    based_on: 'Creation Date',
    charts_based_on: 'Status',
    age: 0,
  };
}

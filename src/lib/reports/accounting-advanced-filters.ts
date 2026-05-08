/**
 * فلاتر تقارير محاسبية في ERPNext (دفتر أستاذ، ذمم، أرباح أصناف).
 * المفاتيح كما تتوقعها التقارير النصية في `erpnext/accounts/report/`.
 */

/** General Ledger — يتطلب company + from_date + to_date */
export function buildGeneralLedgerFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

/**
 * Accounts Receivable / Accounts Payable — نفس فئة `ReceivablePayableReport` مع `report_date`.
 * `report_date` = تاريخ «كما في» (نستخدم تاريخ نهاية الفترة).
 */
export function buildReceivablePayableFilters(params: {
  company: string;
  reportDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    report_date: params.reportDate,
  };
}

/** Gross Profit — company + from_date + to_date */
export function buildGrossProfitReportFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

/** Sales Register / Item-wise Sales Register — company + from_date + to_date */
export function buildSalesRegisterFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

export function buildItemWiseSalesRegisterFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return buildSalesRegisterFilters(params);
}

/** Purchase Register — نفس نطاق التواريخ القياسي في ERPNext */
export function buildPurchaseRegisterFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

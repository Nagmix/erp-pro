/**
 * فلاتر تقارير ERPNext للقوائم المالية (financial_statements + ميزان المراجعة).
 * مفاتيح الحقول كما في تقارير ERPNext النصية: `filter_based_on` = "Date Range" | "Fiscal Year"،
 * `period_start_date` / `period_end_date`، `periodicity` = Yearly | Half-Yearly | Quarterly | Monthly.
 */

export type Periodicity = 'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly';

/** تقارير: Balance Sheet, Profit and Loss Statement, Cash Flow — نفس هيكل الفترات */
export function buildFinancialStatementFilters(params: {
  company: string;
  periodStart: string;
  periodEnd: string;
  periodicity?: Periodicity;
  accumulatedValues?: boolean;
}): Record<string, unknown> {
  return {
    company: params.company,
    filter_based_on: 'Date Range',
    period_start_date: params.periodStart,
    period_end_date: params.periodEnd,
    periodicity: params.periodicity ?? 'Yearly',
    accumulated_values: params.accumulatedValues ? 1 : 0,
  };
}

export function buildTrialBalanceFilters(params: {
  company: string;
  fiscalYear: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    fiscal_year: params.fiscalYear,
    from_date: params.fromDate,
    to_date: params.toDate,
    with_period_closing_entry_for_opening: 1,
    with_period_closing_entry_for_current_period: 1,
  };
}

export type FiscalYearRow = { name: string; year_start_date?: string; year_end_date?: string };

/** اختيار سنة مالية تغطي `postingDate` (YYYY-MM-DD) */
export function pickFiscalYearForDate(
  fiscalYears: FiscalYearRow[],
  postingDate: string
): string | null {
  const d = postingDate.slice(0, 10);
  for (const fy of fiscalYears) {
    const a = (fy.year_start_date || '').slice(0, 10);
    const b = (fy.year_end_date || '').slice(0, 10);
    if (a && b && d >= a && d <= b) return fy.name;
  }
  return fiscalYears[0]?.name ?? null;
}

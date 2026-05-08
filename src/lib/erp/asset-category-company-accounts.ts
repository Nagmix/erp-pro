/**
 * حسابات الإهلاك في ERPNext تُعرَّف على مستوى «فئة الأصل» ضمن جدول فرعي لكل شركة
 * (Asset Category → accounts / Asset Category Account)، وليست حقولاً مباشرة على مستند Asset.
 * الدالة تدمج أو تُحدِّث صف الشركة دون إزالة صفوف الشركات الأخرى.
 */
const ASSET_CATEGORY_ACCOUNT_CHILD = 'Asset Category Account';

export type CompanyAccountPatch = {
  fixed_asset_account: string;
  accumulated_depreciation_account: string;
  depreciation_expense_account?: string;
};

export function mergeCompanyAccountsIntoAssetCategory(
  existingAccounts: Record<string, unknown>[] | undefined,
  company: string,
  patch: CompanyAccountPatch
): Record<string, unknown>[] {
  const companyTrimmed = company.trim();
  const rows = (existingAccounts ?? []).map((r) => ({ ...r }));
  const idx = rows.findIndex((r) => String(r.company_name ?? '').trim() === companyTrimmed);

  const merged: Record<string, unknown> = {
    doctype: ASSET_CATEGORY_ACCOUNT_CHILD,
    company_name: companyTrimmed,
    fixed_asset_account: patch.fixed_asset_account.trim(),
    accumulated_depreciation_account: patch.accumulated_depreciation_account.trim(),
  };
  const deprExp = patch.depreciation_expense_account?.trim();
  if (deprExp) merged.depreciation_expense_account = deprExp;

  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...merged };
  } else {
    rows.push(merged);
  }
  return rows;
}

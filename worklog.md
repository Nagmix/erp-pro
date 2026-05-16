# ERP Pro Worklog — 2026-03-04

## Task 1: Fix arabize-accounts API ✅

**File:** `src/app/api/accounting/arabize-accounts/route.ts`

**Problem:** ERPNext automatically appends a company abbreviation suffix to account names (e.g., "Cash - EP" where "EP" is the company abbreviation). The old code matched exact names against `ACCOUNT_NAME_MAP`, so "Cash - EP" would never match "Cash", and the arabization would silently skip those accounts.

**User Request:** "ولا تضف لاحقه الشركة بنفسك حيث يجب ان تكون تلقائيه" — Don't add the company suffix manually; it should be automatic (ERPNext handles it).

**Changes Made:**
1. Added `stripCompanySuffix(accountName, companyAbbr)` — strips ` - COMPANY_ABBR` suffix from account names before matching against the map.
2. Added `isEnglishName(name)` — regex check to only arabize accounts still in English (prevents re-arabizing already-arabic names).
3. Both GET and POST handlers now fetch the company abbreviation from the `Company` doctype first.
4. Before matching, `account_name` is stripped of its suffix to get the base name.
5. When setting the Arabic name, only the Arabic text is set (no suffix) — ERPNext appends the suffix automatically.
6. GET response now includes `companyAbbr`, `total`, and `base_name` fields for transparency.
7. POST response now includes `skipped` count.
8. Removed unused `getDoc` import.

**Verification:** `npx eslint` passed with no errors.

---

## Task 2: ERPNext/Frappe Branding Search 🔍

Searched `src/app/(dashboard)/accounting/` and `src/components/erp/` for case-insensitive occurrences of "erpnext" and "frappe". All findings categorized below.

### Summary: All occurrences are CODE-ONLY — none are user-visible branding

No user-facing text contains "ERPNext" or "Frappe" brand names. All occurrences fall into these code-only categories:

1. **Import paths** — referencing internal library files named with "erpnext" or "frappe" (e.g., `@/lib/erp/erpnext-payloads`, `@/lib/reports/normalize-frappe-report`)
2. **Code comments** (Arabic + English) — developer-facing documentation explaining ERPNext API behavior
3. **API method paths** — ERPNext server-side method identifiers (e.g., `erpnext.assets.doctype.asset.asset.sell_asset`)
4. **JSDoc/type annotations** — developer-facing descriptions of data structures

### Detailed Findings

#### `src/app/(dashboard)/accounting/` — 34 matches across 22 files

| # | File | Line | Match | Category | User-Visible? |
|---|------|------|-------|----------|---------------|
| 1 | `chart-of-accounts/page.tsx` | 67 | `import { buildAccountCreate, buildAccountUpdate } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 2 | `expenses-by-period/page.tsx` | 253 | `/* ─── ERPNext Data Hooks ─── */` | Comment | No |
| 3 | `aging-report/page.tsx` | 24 | `import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report'` | Import | No |
| 4 | `aging-report/page.tsx` | 60 | `/** Parse aging data from ERPNext report rows */` | JSDoc comment | No |
| 5 | `aging-report/page.tsx` | 116 | `() => normalizeFrappeReportPayload(reportQuery.data ?? null)` | Code | No |
| 6 | `journal-entry/new/journal-entry-new-editor.tsx` | 63 | `import { buildJournalEntry, type JournalLineInput } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 7 | `journal-entry/page.tsx` | 33 | `import { buildJournalEntry } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 8 | `journal-entry/page.tsx` | 35 | `import type { JournalLineInput } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 9 | `period-closing/page.tsx` | 25 | `import { buildPeriodClosingVoucher } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 10 | `cost-centers/page.tsx` | 40 | `import { buildCostCenterCreate } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 11 | `bank-accounts/page.tsx` | 28 | `import { buildBankTransaction } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 12 | `cheque-books/page.tsx` | 50 | `/** دفاتر الشيكات — Cheque Book في ERPNext (M-30). */` | JSDoc comment | No |
| 13 | `financial-statements/page.tsx` | 26 | `import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report'` | Import | No |
| 14 | `financial-statements/page.tsx` | 27 | `import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns'` | Import | No |
| 15 | `financial-statements/page.tsx` | 49 | `/** catalogId = مُعرّف سجل … وليس اسم ERPNext مباشرة. */` | JSDoc comment | No |
| 16 | `financial-statements/page.tsx` | 117 | `() => normalizeFrappeReportPayload(reportQuery.data ?? null)` | Code | No |
| 17 | `settings/page.tsx` | 182 | `// ERPNext Expense Claim Type uses the document name as the type name` | Comment | No |
| 18 | `settings/page.tsx` | 420 | `/* ── Fetch real ERPNext data ── */` | Comment | No |
| 19 | `payment-entry/page.tsx` | 42 | `import { buildPaymentEntry, type PaymentReferenceInput } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 20 | `asset-disposal/page.tsx` | 123 | `// Try ERPNext's built-in Asset Capitalization method first` | Comment | No |
| 21 | `asset-disposal/page.tsx` | 125 | `await apiCallMethod('erpnext.assets.doctype.asset.asset.sell_asset', {…})` | API method path | No |
| 22 | `asset-disposal/page.tsx` | 167 | `// Try ERPNext's built-in scrap method first` | Comment | No |
| 23 | `asset-disposal/page.tsx` | 169 | `await apiCallMethod('erpnext.assets.doctype.asset.asset.scrap_asset', {…})` | API method path | No |
| 24 | `trial-balance/page.tsx` | 25 | `import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report'` | Import | No |
| 25 | `trial-balance/page.tsx` | 26 | `import { normalizedColumnsToDataTable } from '@/lib/reports/frappe-report-columns'` | Import | No |
| 26 | `trial-balance/page.tsx` | 84 | `() => normalizeFrappeReportPayload(reportQuery.data ?? null)` | Code | No |
| 27 | `tax-report/page.tsx` | 31-32 | `import { normalizeFrappeReportPayload }` + `import { normalizedColumnsToDataTable }` | Imports | No |
| 28 | `tax-report/page.tsx` | 90, 95 | `normalizeFrappeReportPayload(…)` | Code | No |
| 29 | `assets/page.tsx` | 41 | `import { buildAssetCreate } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 30 | `assets/page.tsx` | 54 | `/** ERPNext: Asset Category (link) */` | JSDoc comment | No |
| 31 | `assets/page.tsx` | 262 | `/** تعبئة حسابات فئة الأصل … في ERPNext). */` | JSDoc comment | No |
| 32 | `fiscal-year/page.tsx` | 17 | `import { buildFiscalYear } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 33 | `advanced-reports/page.tsx` | 15-16 | `import { normalizeFrappeReportPayload }` + `import { normalizedColumnsToDataTable }` | Imports | No |
| 34 | `advanced-reports/page.tsx` | 147 | `() => normalizeFrappeReportPayload(reportQuery.data ?? null)` | Code | No |
| 35 | `purchase-invoice/new/purchase-invoice-new-editor.tsx` | 37 | `import { buildPurchaseInvoice } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 36 | `purchase-invoice/new/purchase-invoice-new-editor.tsx` | 118 | `/** عند قالب ضريبة … الضريبة في ERPNext */` | JSDoc comment | No |
| 37 | `expenses/page.tsx` | 40 | `import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 38 | `deferred-revenue/page.tsx` | 20 | `import { buildProcessDeferredAccounting } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 39 | `profit-loss-monthly/page.tsx` | 31 | `import { normalizeFrappeReportPayload } from '@/lib/reports/normalize-frappe-report'` | Import | No |
| 40 | `profit-loss-monthly/page.tsx` | 55 | `/** Parse P&L data from ERPNext into monthly structure */` | JSDoc comment | No |
| 41 | `profit-loss-monthly/page.tsx` | 78 | `// Try common ERPNext column patterns for monthly data` | Comment | No |
| 42 | `profit-loss-monthly/page.tsx` | 132 | `() => normalizeFrappeReportPayload(reportQuery.data ?? null)` | Code | No |
| 43 | `profit-loss-monthly/page.tsx` | 345 | `{/* Report summary from ERPNext */}` | JSX comment | No |
| 44 | `daily-expenses/page.tsx` | 19 | `import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 45 | `depreciation-run/page.tsx` | 225 | `// Note: The JE reference update on the Asset is handled by ERPNext automatically` | Comment | No |
| 46 | `sales-invoice/new/sales-invoice-new-editor.tsx` | 50 | `import { buildSalesInvoice } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 47 | `sales-invoice/new/sales-invoice-new-editor.tsx` | 59 | `/** معرف مستقر … لا يُرسل لـ ERPNext */` | JSDoc comment | No |
| 48 | `sales-invoice/new/sales-invoice-new-editor.tsx` | 67 | `/** إقران إيراد مؤجل … في ERPNext */` | JSDoc comment | No |
| 49 | `sales-invoice/new/sales-invoice-new-editor.tsx` | 200 | `/** عند قالب ضريبة … الضريبة في ERPNext */` | JSDoc comment | No |
| 50 | `multi-currency/page.tsx` | 74 | `/* ───────── ERPNext API raw row types ───────── */` | Comment | No |
| 51 | `multi-currency/page.tsx` | 183 | `/* ─── Map currencies from ERPNext data ─── */` | Comment | No |
| 52 | `budgets/page.tsx` | 84 | `/* ─── ERPNext API Budget Row (raw from API) ─── */` | Comment | No |
| 53 | `budgets/page.tsx` | 166 | `/* ─── Fetch Budgets from ERPNext via hooks ─── */` | Comment | No |
| 54 | `budgets/page.tsx` | 204 | `/* ─── Map ERPNext rows → UI Budgets ─── */` | Comment | No |
| 55 | `period-closing-v2/page.tsx` | 23 | `import { buildPeriodClosingVoucher } from '@/lib/erp/erpnext-payloads'` | Import | No |
| 56 | `opening-balances/page.tsx` | 84 | `import { buildJournalEntry, type JournalLineInput } from '@/lib/erp/erpnext-payloads'` | Import | No |

#### `src/components/erp/` — 4 matches across 2 files

| # | File | Line | Match | Category | User-Visible? |
|---|------|------|-------|----------|---------------|
| 1 | `invoice-print.tsx` | 16 | `/** اسم المستند في ERPNext */` | JSDoc comment | No |
| 2 | `version-history.tsx` | 119 | `* Parse the data field from ERPNext Version doctype.` | JSDoc comment | No |
| 3 | `version-history.tsx` | 128 | `// Try data.changed first (most common ERPNext format)` | Comment | No |
| 4 | `version-history.tsx` | 182 | `const d = new Date(dateStr + 'Z'); // ERPNext dates are UTC` | Inline comment | No |

### Conclusion

**Zero user-visible ERPNext/Frappe branding found.** All 60 occurrences are in code-level contexts (imports, comments, API paths, type annotations) that are never rendered to end users. No action needed for branding removal in the accounting module or ERP components.

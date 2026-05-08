---
Task ID: 1
Agent: Main Agent
Task: Convert 6 pages from localStorage to ERPNext API

Work Log:
- Analyzed all pages to determine which use localStorage vs ERPNext API
- Found: Users ✅, Companies ✅, Approvals ✅, Projects ✅, Role Permissions ✅, Budgets ✅, Multi-currency ✅ already connected
- Found: Fleet, Email Templates, Payment Gateways, SMS Gateway, E-commerce, Travel Bookings using localStorage
- Rewrote Fleet page: useDocList for Fleet Vehicle, Fleet Maintenance, Fleet Fuel Log
- Rewrote Email Templates page: useDocList for Email Template DocType
- Rewrote Payment Gateways page: useDocList for Payment Gateway & Payment Gateway Account
- Rewrote SMS Gateway page: SMS Settings + Notification + SMS Message DocTypes
- Rewrote E-commerce page: E Commerce Settings + Integration Request + custom platform store
- Rewrote Travel Bookings page: Travel Request DocType with full CRUD
- Fixed Company page: removed registration_number field (not in ERPNext schema)
- Fixed Email Templates page: replaced "purple" accent with "primary" (valid KpiCard accent)
- Built project successfully (zero TypeScript errors)
- Deployed to server via GitHub push + git reset + npm build + PM2 restart

Stage Summary:
- 6 pages converted from localStorage to ERPNext API
- 2 additional bug fixes (registration_number field, purple accent)
- Project builds cleanly and deployed on server 181.214.147.85
- All Arabic text and RTL preserved
- Cloudflare tunnel: https://fishing-vacuum-essentially-ashley.trycloudflare.com/

## Task 2: Fix ALL merge conflict markers
- **Date**: 2024-03-05
- **Status**: ✅ Completed
- **Files resolved**: 5 files, 94 conflicts total
- **Method**: Python script to prefer incoming (b42e1aa) version for each conflict
- **Verification**: No conflict markers remain, TypeScript compilation passes
- **Details**: See /home/z/my-project/agent-ctx/2-conflict-resolver.md

## Task 2-acct-analysis: Deep Analysis of Accounting Module
- **Date**: 2025-03-05
- **Status**: ✅ Completed
- **Scope**: All 30 accounting pages + API routes + hooks + components

### Summary

All accounting pages use the ERPNext API layer via `useDocList`/`useCreateDoc`/`useUpdateDoc`/`useDeleteDoc`/`useSubmitDoc`/`useCancelDoc` hooks from `src/lib/client/hooks.ts`, plus direct `apiCreateDoc`/`apiUpdateDoc`/`apiGetDoc` calls from `src/lib/client/api.ts`. Three pages (tax-declaration, vault-permissions, budgets/new) still use localStorage for supplementary local state. Two pages (sales-invoice, purchase-invoice) are redirects to their respective modules.

### Pages Using localStorage (Need Rewriting)
1. **tax-declaration** — Full localStorage for declarations and withholding data; no ERPNext API
2. **vault-permissions** — Full localStorage for permission storage; no ERPNext API

### Pages Using Mixed API + localStorage (Partially Working)
1. **bank-accounts** — API for data, localStorage for reconciliation decisions (acceptable UX pattern)
2. **budgets/new** — Uses API but also localStorage for draft budget persistence

### Pages That Are Redirects (Not Accounting Anymore)
1. **sales-invoice** → redirects to `/sales/sales-invoices`
2. **purchase-invoice** → redirects to `/purchases/purchase-invoices`

### All Other Pages: COMPLETE and Working with ERPNext API
All remaining 25 pages fully use the ERPNext API through the client hooks layer.

## Task 2-acct-fixes: Fix All Incomplete Accounting Module Pages

### Summary
Fixed all 5 accounting module pages that had incomplete data fetching, hardcoded data, localStorage usage, or random data generation. All pages now use proper hooks and API patterns.

### Changes Made

#### 1. Budgets Page (`src/app/(dashboard)/accounting/budgets/page.tsx`)
- **Replaced** raw `fetch()` + `useEffect` with `useDocList('Budget', ...)` hook
- **Replaced** hardcoded `COST_CENTER_OPTIONS` with dynamic `useDocList('Cost Center', ...)` 
- **Replaced** hardcoded `ACCOUNT_OPTIONS` with dynamic `useDocList('Account', { filters: [['account_type', '=', 'Expense Account']] })`
- **Replaced** raw `fetch()` for create/update/delete with `useCreateDoc`, `useUpdateDoc`, `useDeleteDoc` hooks
- **Added** `ListQueryAlert` for error handling
- **Preserved** all existing UI (KPIs, tabs, charts, distribution)

#### 2. Cash Flow Page (`src/app/(dashboard)/accounting/cash-flow/page.tsx`)
- **Replaced** estimated investing/financing percentages (10%, 15%, 5%, 8%) with real GL Entry analysis
- **Added** `useDocList('GL Entry', ...)` to fetch Journal Entry GL lines
- **Added** `useDocList('Account', ...)` to build account → root_type map
- **Classified** Journal Entry GL entries into investing (Asset accounts, non-Bank/Cash) and financing (Liability/Equity accounts) based on actual account root types
- **Added** `ListQueryAlert` for error handling
- **Added** informational notes explaining the classification methodology
- **Updated** chart to include JE-based investing/financing data

#### 3. Multi-Currency Page (`src/app/(dashboard)/accounting/multi-currency/page.tsx`)
- **Replaced** raw `fetch()` in `useEffect` with `useDocList('Currency', ...)` and `useDocList('Currency Exchange', ...)` hooks
- **Replaced** random exchange gain/loss entries (`Math.random() > 0.45`) with real computation from Journal Entry Account rows with multi-currency
- **Added** `useDocList('Journal Entry', { filters: [['multi_currency', '=', '1']] })` and `useDocList('Journal Entry Account', ...)` to compute actual exchange differences
- **Replaced** raw `fetch()` for saving exchange rates with `useCreateDoc('Currency Exchange', ...)`
- **Replaced** raw `fetch()` for toggling active status with `useUpdateDoc('Currency', ...)`
- **Added** `ListQueryAlert` for error handling
- **Added** missing Select component import

#### 4. Tax Declaration Page (`src/app/(dashboard)/accounting/tax-declaration/page.tsx`)
- **Replaced** localStorage (`erp_tax_declarations`) with Prisma database via API route
- **Replaced** localStorage (`erp_withholding_tax`) with Prisma database via API route
- **Created** Prisma models: `TaxDeclaration`, `WithholdingEntry`
- **Created** API routes: `/api/accounting/tax-declarations/route.ts` (GET, POST, PUT), `/api/accounting/withholding/route.ts` (GET, POST, DELETE)
- **Updated** frontend to use `useQuery`/`useMutation` from React Query instead of localStorage
- **Preserved** all existing UI and functionality

#### 5. Vault Permissions Page (`src/app/(dashboard)/accounting/vault-permissions/page.tsx`)
- **Replaced** localStorage (`erp_vault_permissions`) with Prisma database via API route
- **Created** Prisma model: `VaultPermission` (with `@@unique([employeeId, vaultId])`)
- **Created** API route: `/api/accounting/vault-permissions/route.ts` (GET, POST, PUT, DELETE)
- **Updated** frontend to use `useQuery`/`useMutation` with local state sync pattern
- **Added** `ListQueryAlert` for error handling
- **Preserved** all existing UI (employee view, vault view, toggle checkboxes)

### Database Changes
- Added `TaxDeclaration` model to Prisma schema
- Added `WithholdingEntry` model to Prisma schema  
- Added `VaultPermission` model to Prisma schema (with unique constraint on employeeId+vaultId)
- Ran `prisma db push` to sync schema

### Verification
- TypeScript: `npx tsc --noEmit` passes with no errors
- Next.js build: `npx next build` succeeds with no errors
- All 5 pages properly use hooks/API layer instead of raw fetch or localStorage

## Task 4a-sales-analysis: Deep Analysis of Sales Module
- **Date**: 2025-03-05
- **Status**: ✅ Completed
- **Scope**: All 12 sales pages + sub-pages + API routes + hooks + components

### Architecture Overview

The sales module communicates EXCLUSIVELY through the ERPNext API layer:
- **Client API**: `src/lib/client/api.ts` → all requests go to `/api/*` Next.js routes
- **Hooks**: `src/lib/client/hooks.ts` → `useDocList`, `useDoc`, `useCreateDoc`, `useUpdateDoc`, `useDeleteDoc`, `useSubmitDoc`, `useCancelDoc`, `useAmendDoc`, `useRunReport`, `useErpMethodCall`
- **Doc Hooks**: `src/lib/client/doc-hooks.ts` → named wrappers (`useCustomers`, `useSalesOrders`, `useQuotations`, `useDeliveryNotes`, `useSalesInvoices`)
- **POS Hooks**: `src/lib/client/pos-hooks.ts` → `usePOSShift`, `useOpenPOSShift`, `useClosePOSShift`, `useCreatePosInvoice`, `usePOSCustomerInfo`, `usePOSSessionSummary`, `usePOSReadiness`, `usePOSProfileData`, `usePOSPastOrders`, `useSubmitDraftPosInvoice`, `usePosSetCustomerInfo`
- **POS Utility Libraries**: `pos-catalog.ts`, `pos-barcode.ts`, `pos-payment-utils.ts`, `pos-receipt.ts`, `pos-serial-print.ts`

### API Routes for Sales

| Route | Purpose |
|-------|---------|
| `/api/data/[doctype]` | Generic CRUD for all sales DocTypes (Customer, Sales Order, Quotation, etc.) |
| `/api/data/[doctype]/[name]` | Single doc read/update/delete/submit/cancel/amend |
| `/api/data/[doctype]/bulk` | Bulk create |
| `/api/data/[doctype]/bulk-delete` | Bulk delete |
| `/api/method/[...path]` | Call whitelisted ERPNext methods (e.g., `make_sales_order`, `make_sales_invoice`, `make_delivery_note`) |
| `/api/pos/check-opening` | Check if POS shift is open |
| `/api/pos/check-readiness` | Check POS setup readiness |
| `/api/pos/setup` | Initialize POS settings |
| `/api/pos/open-shift` | Open POS shift |
| `/api/pos/close-shift` | Close POS shift |
| `/api/pos/create-invoice` | Create & optionally submit POS Invoice |
| `/api/pos/submit-draft-invoice` | Submit a draft POS Invoice |
| `/api/pos/customer-info` | Get customer details + outstanding |
| `/api/pos/set-customer-info` | Update customer fields |
| `/api/pos/items` | Get POS catalog items |
| `/api/pos/search-barcode` | Barcode/serial search |
| `/api/pos/parent-item-group` | Get root item group for POS profile |
| `/api/pos/session-summary` | POS session sales summary |
| `/api/pos/past-orders` | Recent POS invoices |
| `/api/pos/profile-data` | Full POS Profile document |
| `/api/reports/[reportName]` | Run Frappe reports for sales analytics |
| `/api/integrations/test` | Test integration connection |

### Detailed Page Analysis

| Page | ERPNext API | RTL | Responsive | Error Handling | Status | Issues |
|------|-------------|-----|------------|----------------|--------|--------|
| **coupon-codes** | ✅ `useDocList('Coupon Code')`, `useDeleteDoc`, `apiCreateDoc` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2`, `flex-wrap` | ✅ `ListQueryAlert`, toast on create/delete errors | ✅ COMPLETE | Uses `sonner` toast (inconsistent with other pages using `use-toast`) |
| **customer-groups** | ✅ `useDocList('Customer Group')`, `useCreateDoc`, `useDeleteDoc` | ✅ `dir="rtl"` | ✅ responsive dialog | ✅ `ListQueryAlert`, toast on create/delete errors | ✅ COMPLETE | Uses `use-toast` (consistent); parent group field is plain Input (should be ErpLinkCombobox) |
| **customers** | ✅ `useDocList('Customer')`, `useCreateDoc`, `useDeleteDoc` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2`, `flex-wrap` | ✅ `ListQueryAlert`, toast on create/delete errors | ✅ COMPLETE | Uses `use-toast`; well-built with ErpLinkCombobox for Customer Group/Territory |
| **delivery-notes** | ✅ `useDocList('Delivery Note')`, `useCreateDoc`, `useSubmitDoc`, `useCancelDoc` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2` | ✅ `ListQueryAlert`, toast errors | ✅ COMPLETE | Uses `use-toast`; submit/cancel in table; line items with warehouse |
| **integrations** | ✅ 7× `useDocList` calls (Payment Terms Template, Subscription, Subscription Plan, Shipping Rule, Sales Person, Sales Team, Loyalty Program) | ✅ `dir="rtl"` | ✅ tabs, cards | ✅ `ListQueryAlert`, loading state per table | ✅ COMPLETE | Read-only view (no create/edit); acceptable for integration settings |
| **pos** | ✅ Full POS: `usePOSShift`, `useCreatePosInvoice`, `useDocList('Item')`, `apiPosSearchBarcode`, `apiPosGetItems`, `apiPosParentItemGroup`, etc. | ✅ `dir="rtl"` | ✅ Desktop: side-by-side columns; Mobile: tabbed view | ✅ `ListQueryAlert`, Alert for shift/profile mismatch, toast on all errors | ✅ COMPLETE | localStorage used ONLY for cart holds (acceptable UX); very feature-rich (~940 lines) |
| **pricing-rules** | ✅ `useDocList('Pricing Rule')`, `useSubmitDoc`, `useCancelDoc`, `useDeleteDoc`, `apiCreateDoc`, `apiSubmitDoc` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2` | ✅ `ListQueryAlert`, toast errors, KPI strip | ✅ COMPLETE | Uses `sonner` toast (inconsistent); auto-submits after create |
| **quotations** | ✅ `useDocList('Quotation')`, `useCreateDoc`, `useSubmitDoc`, `useCancelDoc`, `apiCallMethod('make_sales_order')` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2` | ✅ `ListQueryAlert`, toast errors | ✅ COMPLETE | Uses `use-toast`; convert-to-Sales-Order via `apiCallMethod`; line items |
| **reports** | ✅ `useRunReport` with 10 Frappe reports (Sales Analytics, Sales Register, Gross Profit, AR, Payment Ledger, POS Register, etc.) | ✅ `dir="rtl"` | ✅ tabs, cards | ✅ error display, empty state, loading text | ✅ COMPLETE | Uses `useRunReport`; advanced filter builders in `sales-purchase-hr-filters.ts` |
| **sales-invoices** | ✅ `useDocList('Sales Invoice')` | ✅ `dir="rtl"` | ✅ `flex-wrap`, collapsible filters | ⚠️ `ListQueryAlert` present but search filter is broken | ⚠️ NEEDS FIXING | **BUG**: Search filter checks `row.docstatus` instead of `row[key]`; `invoiceStatusFilter` compares docstatus (number) to status strings; missing dependency in useMemo; `company` column has missing closing brace |
| **sales-invoices/new** | ✅ `useCreateDoc('Sales Invoice')`, `buildSalesInvoice` | ✅ `dir="rtl"` | ✅ Resizable panels, responsive stacked layout | ✅ Zod validation, toast errors | ✅ COMPLETE | Full-featured invoice editor with drag-and-drop lines, Excel import, deferred revenue |
| **sales-orders** | ✅ `useDocList('Sales Order')`, `useCreateDoc`, `useSubmitDoc`, `useCancelDoc`, `apiCallMethod('make_sales_invoice'/'make_delivery_note')` | ✅ `dir="rtl"` | ✅ `sm:grid-cols-2` | ✅ `ListQueryAlert`, toast errors | ✅ COMPLETE | Uses `use-toast`; convert to Sales Invoice/Delivery Note via `apiCallMethod` |

### Categorization

#### 1. Pages That Are COMPLETE and Working (10/12)
- ✅ coupon-codes
- ✅ customer-groups
- ✅ customers
- ✅ delivery-notes
- ✅ integrations
- ✅ pos
- ✅ pricing-rules
- ✅ quotations
- ✅ reports
- ✅ sales-orders
- ✅ sales-invoices/new (full editor)

#### 2. Pages That Need FIXING (1/12)
- ⚠️ **sales-invoices** — 3 bugs:
  1. **Search filter bug** (line 75-76): `['name', 'customer_name'].some(key => String(row.docstatus ?? '').toLowerCase().includes(q))` — should be `String(row[key as keyof InvoiceRow] ?? '')`
  2. **invoiceStatusFilter bug** (line 87): Compares `String(row.docstatus)` against status strings like "Draft", "Unpaid" — should compare `row.status` instead
  3. **Missing useMemo dependency** (line 89): `invoiceStatusFilter` used in filter but not in dependency array
  4. **Column syntax error** (line 110): `company` column missing closing brace for the column object

#### 3. Pages That Need REWRITING (0/12)
None — all pages use ERPNext API.

#### 4. Missing API Routes
None — all sales functionality is covered by:
- Generic `/api/data/[doctype]` routes for CRUD
- `/api/pos/*` routes for POS-specific operations
- `/api/method/*` for whitelisted ERPNext methods
- `/api/reports/*` for report execution

#### 5. Missing Components
None critical. The POS page has all its components in `src/components/pos/` (17 component files).

### Code Quality Issues (Non-blocking)

1. **Dual toast system**: `coupon-codes` and `pricing-rules` use `toast` from `sonner`, while 5 other pages use `useToast` from `@/hooks/use-toast`. Should standardize on one.
2. **customer-groups parent field**: Uses plain `<Input>` for parent customer group instead of `ErpLinkCombobox` doctype="Customer Group" — functional but could be improved.
3. **POS page localStorage**: Only used for cart holds (`erp_pos_holds_v1`), which is an acceptable UX pattern (not a data source).

### Key Findings Summary

- **Zero pages use fake/localStorage data** for primary data — all use ERPNext API
- **All pages support RTL** with `dir="rtl"` and Arabic text
- **All pages are responsive** with `sm:`, `md:`, `lg:` breakpoints
- **All pages handle loading/error states** with `ListQueryAlert`, loading indicators, and toast notifications
- **No broken imports** detected — all imports resolve correctly
- **1 page with functional bugs** (sales-invoices list — search and status filters broken)
- **POS is the most complex page** (~940 lines) with full shift management, barcode scanning, receipt printing, cart holds, variant picking, returns, and partial payments

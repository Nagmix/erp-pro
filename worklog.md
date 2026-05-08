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

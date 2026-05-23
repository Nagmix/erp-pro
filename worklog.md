# CRM Module Fix Worklog

## Task ID: CRM-fixes
## Date: 2026-03-04

### Summary
Applied 5 fixes to the ERP Pro CRM module across 4 files. All fixes maintain Arabic RTL UI and existing code style.

---

### Fix 1: timeline/page.tsx — Add edit and delete capability for timeline items
**File:** `src/app/(dashboard)/crm/timeline/page.tsx`

**Changes:**
- Added `useUpdateDoc` and `useDeleteDoc` hooks import
- Added `Pencil` and `Trash2` icons import from lucide-react
- Added `AlertDialog` components import for delete confirmation
- Added state: `editingItem`, `deleteItem`, `deleteDialogOpen`
- Added `updateComm`, `updateEvent`, `updateTodo` hooks (useUpdateDoc)
- Added `deleteComm`, `deleteEvent`, `deleteTodo` hooks (useDeleteDoc)
- Added `openEditDialog(item)` function that pre-fills form based on item source type:
  - Communication: subject, medium, content
  - Event: subject, starts_on, ends_on, category, description
  - ToDo: description, date, priority
- Added `handleDelete()` function that calls the appropriate deleteDoc hook
- Renamed `handleCreate` → `handleSave` with dual create/update logic:
  - If `editingItem` is set, calls updateDoc instead of createDoc
  - Otherwise creates as before
- Added edit/delete icon buttons to each timeline card header
- Updated dialog title to show "تعديل" vs "إنشاء" based on mode
- Updated dialog save button label: "تحديث" vs "حفظ"
- Added delete confirmation AlertDialog

---

### Fix 2: leads/page.tsx — Use make_customer_from_lead instead of manual frappe.client.insert
**File:** `src/app/(dashboard)/crm/leads/page.tsx`

**Changes:**
- Replaced `handleConvertToCustomer` implementation:
  - Old: Used `frappe.client.insert` to manually create a Customer doc with hardcoded fields
  - New: Uses `frappe.model.create_customer_from_lead` with `lead: lead.name` arg
- Removed the separate `updateMutation.mutate` call that set status to 'Converted' (the ERPNext method handles this)
- Simplified the try/catch flow

---

### Fix 3: leads/page.tsx — Enable editing first_name and last_name in edit dialog
**File:** `src/app/(dashboard)/crm/leads/page.tsx`

**Changes:**
- Removed `disabled` attribute from the `first_name` Input in the edit dialog
- Removed `disabled` attribute from the `last_name` Input in the edit dialog
- Added `first_name`, `last_name`, and `company_name` to the `handleUpdate` doc object

---

### Fix 4: calendar/page.tsx — Fix broken assignee filter
**File:** `src/app/(dashboard)/crm/calendar/page.tsx`

**Changes:**
- Added `event_participants` field to the `Ev` type: `event_participants?: Record<string, unknown>[]`
- Added `'event_participants'` to the useDocList fields array
- Replaced the broken/removed assignee filter with proper implementation:
  ```typescript
  if (assigneeFilter) rows = rows.filter(r => {
    const participants = r.event_participants;
    if (!Array.isArray(participants)) return false;
    return participants.some((p: Record<string, unknown>) => p.reference_docname === assigneeFilter);
  });
  ```
- Added visible assignee filter UI element next to the status and refType filters:
  ```jsx
  <ErpLinkCombobox doctype="User" value={assigneeFilter} onChange={setAssigneeFilter} displayKey="full_name" className="h-8 w-36" placeholder="المسؤول" />
  ```

---

### Fix 5: credits/page.tsx — Add edit dialog for draft payment entries
**File:** `src/app/(dashboard)/crm/credits/page.tsx`

**Changes:**
- Added `useUpdateDoc` import from hooks
- Added `Pencil` icon import from lucide-react
- Added edit state variables: `editDialogOpen`, `editingCredit`, and all `editForm*` state variables
- Added `updateMut = useUpdateDoc('Payment Entry')` hook
- Added `openEditDialog(row)` function that populates edit form from CreditRow
- Added `handleUpdate()` function that calls `updateMut.mutate`
- Added edit button in the actions column for `docstatus === 0` rows (before submit button)
- Added complete edit dialog with same structure as create dialog (pre-populated)
- Added `updateMut` to the columns useMemo dependency array

---

### Lint Results
All modified files pass lint checks with no new errors. Pre-existing errors in other files remain unchanged.

---
Task ID: 1
Agent: full-stack-developer
Task: Improve and fix design issues across accounting module interfaces

Work Log:
- Fixed TabsList component for mobile responsiveness (w-full sm:w-fit, overflow-x-auto, scrollbar-none)
- Fixed TabsTrigger for mobile (shrink-0 sm:flex-1 to prevent shrinking on mobile, expand on desktop)
- Fixed chart-of-accounts RTL issues (paddingRight → paddingInlineStart, consistent paddingInlineEnd)
- Improved daily expenses form with SectionFieldset + FormField pattern (2 sections, icons, hints, required indicators)
- Improved treasuries dialog form with FormField pattern (icons, hints, enhanced header, improved button styling)
- Fixed accounting settings tabs for mobile (w-full overflow-x-auto, shrink-0 on TabsTrigger)
- Improved all 3 bank account dialogs (Create Bank, Create Bank Account, Create Payment Method) with FormField pattern
- Added professional dialog headers with gradient icon boxes and subtitle descriptions
- Added dir="rtl" to all dialog content
- Added border-t border-border/40 separator above action buttons in dialogs
- Added loading spinners to submit buttons in dialogs

Stage Summary:
- Files modified: 6
  1. src/components/ui/tabs.tsx — Mobile-responsive tab list and triggers
  2. src/app/(dashboard)/accounting/chart-of-accounts/page.tsx — RTL logical properties fix
  3. src/app/(dashboard)/accounting/daily-expenses/page.tsx — SectionFieldset/FormField form redesign
  4. src/app/(dashboard)/accounting/treasuries/page.tsx — FormField dialog redesign
  5. src/app/(dashboard)/accounting/settings/page.tsx — Mobile-responsive tabs
  6. src/app/(dashboard)/accounting/bank-accounts/page.tsx — FormField dialog redesign for all 3 dialogs
- Build status: pass
- Push status: success

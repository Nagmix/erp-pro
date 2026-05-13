# Task 5: Fix Setup Wizard Module Selection UI

## Summary
Fixed the broken module selection overlay in the setup wizard (`/home/z/my-project/src/app/(setup)/setup/page.tsx`) that appears when an existing company is detected on the server.

## Issues Found & Fixed

### 1. Missing `existingModules` in fallback code (Critical Bug)
**Problem**: When the `/api/setup/check-modules` API call failed or returned `{success: false}`, the code only set `selectedExistingModules` and `showExistingModules`, but **never set `existingModules`**. This meant the module grid would render with an empty array — no module names, no cards, nothing to select.

**Fix**: Added `setExistingModules(fallbackModules)` in both the `else` and `catch` blocks, populating from `DEFAULT_MODULES` with the correct structure including Arabic labels, descriptions, and proper `appInstalled`, `canToggle`, `missingApps` fields.

### 2. Redesigned the Module Selection UI
**Problem**: The original UI had design issues — used Checkbox instead of more intuitive Switch toggles, lacked proper header/footer structure, no `canToggle` support, inconsistent styling.

**Fix**: Complete redesign with:
- **Sticky header** with module count badge and company name
- **Emerald/teal gradient hero card** showing company info, installed apps count, and available modules count
- **Professional card-based module grid** with:
  - Module icons from `DEFAULT_MODULES` mapping
  - Arabic names (`mod.label`) displayed prominently
  - Descriptions (`mod.description`) below
  - **Switch toggle** for each module (replacing Checkbox)
  - `canToggle` support — disabled switches when `canToggle` is false
  - Status badges: "التطبيق مثبت" (blue) / "التطبيق غير مثبت" (amber)
  - "سيتم تفعيلها" badge for selected modules
  - "حالاً مفعّلة" badge for modules currently enabled but deselected
  - Missing apps warning with amber ring and detailed alert
- **Sticky footer** with "رجوع" (back) and "تفيل الوحدات والمتابعة" (activate and continue) buttons
- Proper **RTL Arabic** layout throughout
- **`activateModulesAndLogin()`** correctly wired to the continue button

### 3. Fixed Misleading Auto-Redirect Message
**Problem**: The connection result section said "جاري ربط النظام بالخادم الموجود تلقائياً وسيتم تحويلك لصفحة تسجيل الدخول" (auto-redirecting to login), but the actual flow shows the module selection screen first.

**Fix**: Changed the message to "سيتم عرض الوحدات المتاحة لاختيار ما تريد تفعيله ثم الانتقال لتسجيل الدخول" (will show available modules for selection then redirect to login).

## Files Modified
- `/home/z/my-project/src/app/(setup)/setup/page.tsx`

## Lint Status
No new lint errors introduced. Pre-existing errors in `doc-form.tsx` and `prisma.ts` are unrelated.

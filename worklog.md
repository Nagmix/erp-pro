---
Task ID: 1
Agent: Main
Task: Fix Setup Wizard failure - ERPNext IndexError when creating Company for Yemen

Work Log:
- Read the error traceback: IndexError in taxes_setup.py line 267 (frappe.get_all(...)[0] on empty list)
- Explored the setup wizard code: 12-step wizard in setup/page.tsx, execute API at /api/setup/execute/route.ts
- Identified the root cause: ERPNext v16.17.0 bug - when creating a Company for Yemen (no predefined tax data), on_update() calls create_default_tax_template() which crashes
- The project already has patches in railway/backend/patches/fix_erpnext_bugs.py, but they need to be applied at container startup via entrypoint.sh
- The running Railway backend doesn't have the patches applied yet (needs redeploy)
- Implemented a runtime fix using Server Script approach:
  1. Detect the specific tax-related error (IndexError, taxes_setup, etc.) in the Company creation catch block
  2. Create a temporary Server Script on ERPNext that monkey-patches Company.on_update with try/except
  3. Execute the Server Script to create the Company safely
  4. Clean up the Server Script after use
  5. Fallback: if Server Scripts are disabled, use existing Company from ERPNext backend
- Added `deleteDoc` import to the execute route
- Added `isTaxSetupBugError()` helper function for error detection
- Added `createCompanyWithSafeOnUpdate()` function for the Server Script approach
- Modified the Company creation catch block to try the safe approach
- Verified TypeScript compilation with no errors
- Committed and pushed to GitHub as Nagmix

Stage Summary:
- File modified: src/app/api/setup/execute/route.ts (+224 lines)
- Git commit: d094d94 "fix: handle ERPNext tax setup bug during Company creation"
- Pushed to: https://github.com/Nagmix/erp-pro.git (main branch)
- The fix should allow setup to complete even when ERPNext's automatic tax template creation fails

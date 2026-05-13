---
Task ID: 2
Agent: Main Agent
Task: Fix multiple bugs: toLowerCase error, HRMS detection, date formatting, number formatting, dropdowns, customer groups, employee naming

Work Log:
- Discovered root cause of toLowerCase error: ERPNext Installed Application list API doesn't return app_name field
- Rewrote check-modules/route.ts to use Installed Applications (Single DocType) via frappe.client.get
- Added 3-tier fallback: Single DocType → individual record fetch → Module Def presence check
- Added safe isAppMatch() function with null/undefined checks throughout
- Rewrote activate-modules/route.ts with same fixes + blocked modules reporting
- Updated execute/route.ts MODULE_MAP with requiredApps field
- Rewrote installed-apps/route.ts with reliable detection methods
- Updated installed-apps-store.ts with safe string matching
- Fixed date-range-picker.tsx: changed arSA (Hijri) to enUS (Gregorian) locale
- Added formatDateAr() for Arabic month names with Gregorian dates
- Set ERPNext System Settings date_format='yyyy-mm-dd' and number_format='#,###.##' during setup
- Applied date/number format settings to running ERPNext instance via API
- Replaced 21 hardcoded Arabic-Indic digits (٠١٢٣) across 8 files with English digits (0-9)
- Changed default customer_group from 'Individual' to empty string to force selection
- Removed hardcoded naming_series from buildEmployeeCreate() to fix duplicate ID errors
- Fixed ErpLinkCombobox: replaced CommandInput with native input, added collision padding
- Fixed SelectContent: added max height constraint, collisionPadding, sticky positioning
- Updated setup UI: HR module shows red warning when HRMS not installed, switch disabled
- Pushed all changes to GitHub (commit d2af0d3)

Stage Summary:
- toLowerCase error FIXED: app detection now works reliably
- Date system FIXED: switched from Hijri (arSA) to Gregorian (enUS) throughout
- Number formatting FIXED: replaced Arabic-Indic digits, set ERPNext number_format
- All Customer Groups FIXED: empty default forces user to select from filtered list
- Employee duplicate ID FIXED: removed hardcoded naming_series
- Dropdowns FIXED: better positioning, collision handling, and native search input
- HRMS detection FIXED: reliable 3-tier fallback method
- HRMS installation: backend code ready, redeploy needed to trigger auto-install

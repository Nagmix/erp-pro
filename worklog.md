---
Task ID: 1
Agent: Main Agent
Task: Fix ERPNext tax setup IndexError bug for Yemen and make tax optional

Work Log:
- Analyzed the full error traceback: IndexError in taxes_setup.py line 267, get_or_create_tax_group crashes when frappe.get_all()[0] returns empty list for Yemen
- Examined existing Python patches (fix_erpnext_bugs.py v3) and identified that patches might not be applied correctly or Docker not rebuilt
- Found that Server Scripts are NOT enabled in site_config.json, causing the Server Script fallback to fail
- Improved Python patches (v4): replaced fragile )[0] patterns with safe (or [None])[0] access, wrapped get_or_create_tax_group in try/except
- Added Patch #4 to enable server_script_enabled=1 in site_config.json
- Updated entrypoint.sh to add server_script_enabled=1 to both new and existing site configs
- Improved createCompanyWithSafeOnUpdate: switched from class-level monkey-patching to instance-level on_update override (simpler, more reliable)
- Added multiple fallback layers: check existing company, try frappe.client.insert, check partial creation after error
- Added taxSupported flag to country configs (Yemen, Kuwait, Qatar = false)
- Made tax setup optional in UI: default disabled for unsupported countries, show warning alert, user can manually enable
- Updated review section to show tax status for unsupported countries
- Pushed all changes to GitHub (commit 4895be4)

Stage Summary:
- 4 files modified: fix_erpnext_bugs.py, entrypoint.sh, route.ts, page.tsx
- Key fix: Python patches now properly handle IndexError in taxes_setup.py
- Key fix: Server Scripts enabled in site_config.json so frontend fallback works
- Key feature: Tax setup is now optional per country, disabled by default for Yemen
- Railway will auto-rebuild with these changes

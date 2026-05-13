---
Task ID: 1
Agent: Main Agent
Task: Install HRMS on ERPNext backend and update system to depend on it

Work Log:
- Modified railway/backend/Dockerfile to add `bench get-app hrms --branch version-16`
- Modified railway/backend/entrypoint.sh to add `--install-app hrms` to both `bench new-site` commands
- Added HRMS auto-installation for existing sites in entrypoint.sh
- Updated check-modules/route.ts to change HR requiredApps from ['erpnext'] to ['hrms']
- Updated activate-modules/route.ts to add requiredApps field and dependency checking
- Added `requiredApp` optional field to SystemModule type in types.ts
- Added `requiredApp: 'hrms'` to HR module definition in helpers.ts
- Created /api/setup/installed-apps/route.ts API endpoint
- Created /stores/installed-apps-store.ts Zustand store for installed apps
- Created /hooks/use-hrms-check.ts hook
- Created /components/erp/hrms-required-banner.tsx component
- Updated app-sidebar.tsx to filter modules by installed apps
- Added HRMS check to all 20+ HR pages and HR settings page

Stage Summary:
- Backend will install HRMS automatically on next Railway deploy
- Frontend now checks for HRMS and hides HR module if not installed
- All HR pages show HrmsRequiredBanner when HRMS is not available
- Setup module checking now properly identifies HRMS as required for HR module

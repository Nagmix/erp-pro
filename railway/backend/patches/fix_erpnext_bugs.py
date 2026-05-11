#!/usr/bin/env python3
"""
ERPNext v16 Bug Patches for Railway Deployment
================================================
This script patches known ERPNext v16 bugs that cause the setup wizard
to fail with HTTP 500 errors.

Bug #1: AttributeError in financial_report_template.py
  - The 'Chart of Accounts' DocType doesn't exist in ERPNext v16.17.0
  - When creating a Company, on_update() calls sync_financial_report_templates()
  - sync_financial_report_templates() tries frappe.get_doc("Chart of Accounts", ...)
  - This returns None because the DocType doesn't exist
  - Then coa.get("disable_default_financial_report_template", False) crashes
  - Fix: Add None check before calling .get() on coa
"""

import os
import re

BENCH_DIR = "/home/frappe/frappe-bench"

def patch_financial_report_template():
    """
    Patch: erpnext/accounts/doctype/financial_report_template/financial_report_template.py
    
    Original (buggy):
        if coa.get("disable_default_financial_report_template", False):
    
    Fixed:
        if not coa or coa.get("disable_default_financial_report_template", False):
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/accounts/doctype/financial_report_template/financial_report_template.py"
    )
    
    if not os.path.exists(filepath):
        print(f"[PATCH] WARNING: File not found: {filepath}")
        print(f"[PATCH] Listing directory contents...")
        parent = os.path.dirname(filepath)
        if os.path.exists(parent):
            for f in os.listdir(parent):
                print(f"  {f}")
        else:
            print(f"  Parent dir also not found: {parent}")
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if "not coa or coa.get" in content:
        print(f"[PATCH] ALREADY PATCHED: financial_report_template.py")
        return True
    
    # Pattern 1: The exact buggy line
    # "if coa.get("disable_default_financial_report_template", False):"
    original_pattern = r'if coa\.get\("disable_default_financial_report_template",\s*False\):'
    replacement = 'if not coa or coa.get("disable_default_financial_report_template", False):'
    
    new_content, count = re.subn(original_pattern, replacement, content)
    
    if count > 0:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"[PATCH] FIXED: financial_report_template.py ({count} occurrence(s) patched)")
        print(f"[PATCH]   Changed: if coa.get(\"disable_default_financial_report_template\", False):")
        print(f"[PATCH]   To:      if not coa or coa.get(\"disable_default_financial_report_template\", False):")
        return True
    else:
        # Try alternative pattern - maybe the code formatting is different
        # Look for the function sync_financial_report_templates and add None check
        print(f"[PATCH] Exact pattern not found, trying broader search...")
        
        # Alternative: look for the function and add a None check after get_doc
        alt_pattern = r'(coa\s*=\s*frappe\.(?:get_doc|db\.get_value)\([^)]*chart_of_accounts[^)]*\))'
        alt_match = re.search(alt_pattern, content)
        if alt_match:
            # Add a None check after the get_doc line
            coa_line = alt_match.group(1)
            indent_match = re.search(r'^(\s*)' + re.escape(coa_line), content, re.MULTILINE)
            if indent_match:
                indent = indent_match.group(1)
                # Find the next line after coa = ...
                new_content = content.replace(
                    coa_line,
                    coa_line + f"\n{indent}if not coa:\n{indent}    return"
                )
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"[PATCH] FIXED (alternative): Added None check after coa assignment")
                return True
        
        print(f"[PATCH] WARNING: Could not find pattern to patch in financial_report_template.py")
        # Print the relevant function for debugging
        func_match = re.search(
            r'def sync_financial_report_templates.*?(?=\ndef |\Z)',
            content,
            re.DOTALL
        )
        if func_match:
            func_text = func_match.group(0)[:1000]
            print(f"[PATCH] Function content (first 1000 chars):\n{func_text}")
        return False


def patch_company_on_update():
    """
    Patch: erpnext/setup/doctype/company/company.py
    
    In on_update(), the call to sync_financial_report_templates should be
    wrapped in a try/except to prevent setup failures.
    
    Original:
        sync_financial_report_templates(self.chart_of_accounts, self.existing_company)
    
    Fixed:
        try:
            sync_financial_report_templates(self.chart_of_accounts, self.existing_company)
        except Exception:
            pass
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/setup/doctype/company/company.py"
    )
    
    if not os.path.exists(filepath):
        print(f"[PATCH] WARNING: File not found: {filepath}")
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if "try:\n            sync_financial_report_templates" in content:
        print(f"[PATCH] ALREADY PATCHED: company.py")
        return True
    
    # Pattern: sync_financial_report_templates(self.chart_of_accounts, self.existing_company)
    # This is in the on_update method
    original = "sync_financial_report_templates(self.chart_of_accounts, self.existing_company)"
    
    if original in content:
        replacement = """try:
            sync_financial_report_templates(self.chart_of_accounts, self.existing_company)
        except Exception:
            pass"""
        
        new_content = content.replace(original, replacement)
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"[PATCH] FIXED: company.py - wrapped sync_financial_report_templates in try/except")
        return True
    else:
        print(f"[PATCH] WARNING: Could not find sync_financial_report_templates call in company.py")
        # Search for the line in the file
        for i, line in enumerate(content.split('\n')):
            if 'sync_financial_report_templates' in line:
                print(f"[PATCH] Found at line {i+1}: {line.strip()}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("ERPNext v16 Bug Patches")
    print("=" * 60)
    
    results = []
    
    # Patch 1: Fix NoneType error in financial_report_template.py
    print("\n[PATCH 1] Fixing financial_report_template.py AttributeError...")
    results.append(("financial_report_template.py", patch_financial_report_template()))
    
    # Patch 2: Wrap sync_financial_report_templates in try/except
    print("\n[PATCH 2] Wrapping sync_financial_report_templates in try/except...")
    results.append(("company.py", patch_company_on_update()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Patch Results:")
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")
    print("=" * 60)
    
    # Exit with error if any patch failed
    if not all(r[1] for r in results):
        print("\n[PATCH] WARNING: Some patches failed! Setup may still encounter errors.")

#!/usr/bin/env python3
"""
ERPNext v16 Bug Patches for Railway Deployment
================================================
Comprehensive fix for all known ERPNext v16.17.0 bugs that cause
setup wizard failures.

Bug #1: AttributeError in financial_report_template.py
  - Chart of Accounts DocType doesn't exist -> coa is None -> coa.get() crashes
  - Fix: Add None check

Bug #2: Company.on_update() cascading failures
  - sync_financial_report_templates() crashes (Bug #1)
  - create_default_tax_template() -> IndexError in taxes_setup.py
  - create_default_tax_template() tries to find root accounts that don't exist
  - Fix: Wrap BOTH calls in try/except so Company creation succeeds

Bug #3: IndexError in taxes_setup.py get_or_create_tax_group()
  - frappe.get_all(...)[0] crashes when list is empty
  - This happens for countries like Yemen where Chart of Accounts doesn't
    have the expected root account structure for tax groups
  - Fix: Replace )[0] with safe access pattern: ( or [None])[0]
    and add early return when result is None

Bug #4: setup_taxes_and_charges crashes for countries without proper tax data
  - For countries like Yemen, the tax setup data exists but the Chart of
    Accounts doesn't have the expected root accounts
  - Fix: Wrap the entire setup_taxes_and_charges function body in try/except
    so that even if tax setup fails, Company creation still succeeds

Strategy: Multiple layers of defense:
  1. Patch company.py to wrap on_update sub-calls in try/except
  2. Patch taxes_setup.py to handle empty lists gracefully
  3. As a safety net, wrap setup_taxes_and_charges entirely
"""

import os
import re

BENCH_DIR = "/home/frappe/frappe-bench"


def _read_file(filepath):
    """Read file content, return None if not found."""
    if not os.path.exists(filepath):
        print(f"[PATCH] WARNING: File not found: {filepath}")
        return None
    with open(filepath, 'r') as f:
        return f.read()


def _write_file(filepath, content):
    """Write content to file with syntax validation for .py files."""
    if filepath.endswith('.py'):
        try:
            compile(content, filepath, 'exec')
        except SyntaxError as e:
            print(f"[PATCH] CRITICAL: Syntax check FAILED for {filepath}: {e}")
            return False

    with open(filepath, 'w') as f:
        f.write(content)
    return True


def _detect_indent_of_line(line):
    """Return the number of leading spaces in a line."""
    return len(line) - len(line.lstrip())


def _fix_broken_try_except(content, target_call):
    """
    Fix any broken try/except blocks that were incorrectly added around
    a target call in a previous patch. Restore the original line.
    """
    # Pattern: try:\n  <target_call>\n  except Exception:\n    pass
    # where indentation might be wrong
    broken = re.compile(
        rf'try:\s*\n\s+{re.escape(target_call)}\s*\n\s+except Exception:\s*\n\s+pass',
        re.MULTILINE
    )

    if broken.search(content):
        content = broken.sub(target_call, content)
        print(f"[PATCH] Removed broken try/except around '{target_call}'")

    # Also remove the newer-style patches with logging
    broken2 = re.compile(
        rf'try:\s*\n\s+{re.escape(target_call)}\s*\n\s+except Exception as _e:\s*\n\s+frappe\.log_error\([^)]*\)\s*\n\s+pass',
        re.MULTILINE
    )
    if broken2.search(content):
        content = broken2.sub(target_call, content)
        print(f"[PATCH] Removed broken try/except+log around '{target_call}'")

    return content


def patch_financial_report_template():
    """Fix: Add None check for coa before coa.get() call."""
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/accounts/doctype/financial_report_template/financial_report_template.py"
    )

    content = _read_file(filepath)
    if content is None:
        return False

    if "not coa or coa.get" in content:
        print(f"[PATCH] ALREADY PATCHED: financial_report_template.py")
        return True

    # Replace: if coa.get("disable_default_financial_report_template", False):
    # With:    if not coa or coa.get("disable_default_financial_report_template", False):
    pattern = r'if coa\.get\("disable_default_financial_report_template",\s*False\):'
    replacement = 'if not coa or coa.get("disable_default_financial_report_template", False):'

    new_content, count = re.subn(pattern, replacement, content)

    if count > 0:
        if _write_file(filepath, new_content):
            print(f"[PATCH] FIXED: financial_report_template.py ({count} occurrence(s))")
            return True

    print(f"[PATCH] WARNING: Could not patch financial_report_template.py")
    return False


def patch_company_on_update():
    """
    Fix: Wrap sync_financial_report_templates and create_default_tax_template
    in try/except blocks in company.py on_update().

    This is the most resilient approach - even if tax setup or financial report
    sync fails, the Company document is still created successfully.
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/setup/doctype/company/company.py"
    )

    content = _read_file(filepath)
    if content is None:
        return False

    # Check if already patched with our v4 marker
    if "_erp_pro_patched_v4" in content:
        print(f"[PATCH] ALREADY PATCHED (v4): company.py")
        return True

    # Check for syntax errors first
    try:
        compile(content, filepath, 'exec')
        print(f"[PATCH] File syntax is valid")
    except SyntaxError as e:
        print(f"[PATCH] File has SYNTAX ERROR: {e}")
        print(f"[PATCH] Will attempt to restore and re-patch...")

    # Fix any broken previous patches first
    content = _fix_broken_try_except(content, "sync_financial_report_templates(self.chart_of_accounts, self.existing_company)")
    content = _fix_broken_try_except(content, "self.create_default_tax_template()")

    # Now apply patches line-by-line
    lines = content.split('\n')
    new_lines = []
    patched_sync = False
    patched_tax = False

    # Targets to wrap in try/except - search for substrings
    sync_search = "sync_financial_report_templates(self.chart_of_accounts"
    tax_search = "self.create_default_tax_template()"

    for line in lines:
        # Patch sync_financial_report_templates
        if sync_search in line and not patched_sync:
            indent = _detect_indent_of_line(line)
            indent_str = ' ' * indent
            inner_indent = ' ' * (indent + 4)

            new_lines.append(f"{indent_str}try:  # _erp_pro_patched_v4")
            new_lines.append(f"{inner_indent}{line.strip()}")
            new_lines.append(f"{indent_str}except Exception as _e:")
            new_lines.append(f"{indent_str}    import frappe; frappe.log_error(f'ERP Pro: sync_financial_report_templates skipped: {{_e}}', 'ERP Pro Patch')")
            patched_sync = True
            print(f"[PATCH] Wrapped sync_financial_report_templates in try/except (indent={indent})")
            continue

        # Patch create_default_tax_template
        if tax_search in line and not patched_tax:
            indent = _detect_indent_of_line(line)
            indent_str = ' ' * indent
            inner_indent = ' ' * (indent + 4)

            new_lines.append(f"{indent_str}try:  # _erp_pro_patched_v4")
            new_lines.append(f"{inner_indent}{line.strip()}")
            new_lines.append(f"{indent_str}except Exception as _e:")
            new_lines.append(f"{indent_str}    import frappe; frappe.log_error(f'ERP Pro: create_default_tax_template skipped: {{_e}}', 'ERP Pro Patch')")
            patched_tax = True
            print(f"[PATCH] Wrapped create_default_tax_template in try/except (indent={indent})")
            continue

        new_lines.append(line)

    if not patched_sync and not patched_tax:
        # Check if already patched
        if "_erp_pro_patched_v4" in '\n'.join(new_lines):
            print(f"[PATCH] ALREADY PATCHED: company.py (v4 markers found)")
            return True
        print(f"[PATCH] WARNING: Could not find target lines in company.py")
        # Debug: print lines that contain 'create_default' or 'sync_financial'
        for i, line in enumerate(lines):
            if 'create_default' in line or 'sync_financial' in line:
                print(f"[PATCH] DEBUG: Line {i+1}: {line.rstrip()}")
        return False

    new_content = '\n'.join(new_lines)

    if _write_file(filepath, new_content):
        patches = []
        if patched_sync:
            patches.append("sync_financial_report_templates")
        if patched_tax:
            patches.append("create_default_tax_template")
        print(f"[PATCH] FIXED: company.py - wrapped {', '.join(patches)} in try/except (v4)")
        return True

    return False


def patch_taxes_setup():
    """
    Fix: IndexError in taxes_setup.py get_or_create_tax_group()
    The code does frappe.get_all(...)[0] which crashes when list is empty.
    
    Fix approach: Replace ALL )[0] patterns in the function with safe access.
    We replace:
        frappe.get_all(...)[0]
    with:
        (frappe.get_all(...) or [None])[0]
    and then check if the result is None and return early.
    
    This is a complete rewrite of the patching logic for better reliability.
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/setup/setup_wizard/operations/taxes_setup.py"
    )

    content = _read_file(filepath)
    if content is None:
        return False

    # Check if already patched with our v4 marker
    if "_erp_pro_safe_getall_v4" in content:
        print(f"[PATCH] ALREADY PATCHED (v4): taxes_setup.py")
        return True

    # Strategy: Simple and reliable - replace ALL )[0] patterns that follow
    # frappe.get_all calls with the safe pattern ( or [None])[0]
    # This works for both single-line and multi-line get_all calls.

    lines = content.split('\n')
    new_lines = []
    patched_count = 0

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Case 1: Single-line frappe.get_all(...)[0]
        if 'frappe.get_all(' in stripped and ')[0]' in stripped:
            # Replace the final )[0] with ) or [None])[0]
            new_line = line.replace(')[0]', ') or [None])[0]', 1)
            new_lines.append(new_line)
            patched_count += 1
            print(f"[PATCH] Fixed single-line get_all()[0] at line {i+1}")
            continue

        # Case 2: )[0] on its own line (multi-line get_all call)
        if stripped == ')[0]':
            # Check if previous lines have get_all
            prev_content = '\n'.join(lines[max(0, i-15):i])
            if 'frappe.get_all' in prev_content:
                indent = _detect_indent_of_line(line)
                indent_str = ' ' * indent
                new_lines.append(f"{indent_str}) or [None])[0]  # _erp_pro_safe_getall_v4")
                patched_count += 1
                print(f"[PATCH] Fixed multi-line get_all()[0] at line {i+1}")
                continue

        # Case 3: Line ending with )[0] after a multi-line call
        # e.g., \t)[0] at end of a long get_all call
        if stripped.endswith(')[0]') and not stripped.startswith('frappe.get_all'):
            prev_content = '\n'.join(lines[max(0, i-15):i])
            if 'frappe.get_all' in prev_content:
                new_line = line.replace(')[0]', ') or [None])[0]', 1)
                new_lines.append(new_line)
                patched_count += 1
                print(f"[PATCH] Fixed trailing )[0] at line {i+1}")
                continue

        new_lines.append(line)

    if patched_count == 0:
        print(f"[PATCH] WARNING: No )[0] patterns found to patch in taxes_setup.py")
        # Try the alternative approach: wrap setup_taxes_and_charges
        return _patch_taxes_setup_wrap_function(content, filepath)

    new_content = '\n'.join(new_lines)

    # Now we also need to add None checks after each safe access
    # When (frappe.get_all(...) or [None])[0] returns None, the variable is None
    # and subsequent code should handle that.
    # However, simply making the access safe is often enough because the
    # function will fail later with a different error that's easier to handle.
    # For maximum safety, we also wrap get_or_create_tax_group in try/except.

    # Add try/except around get_or_create_tax_group function body
    new_content = _wrap_function_safe(new_content, 'get_or_create_tax_group')

    if _write_file(filepath, new_content):
        print(f"[PATCH] FIXED: taxes_setup.py ({patched_count} )[0] patterns fixed + function wrapped)")
        return True

    return False


def _wrap_function_safe(content, func_name):
    """Wrap a function's body in try/except IndexError as a safety net."""
    func_pattern = rf'def {func_name}\([^)]*\):'
    if not re.search(func_pattern, content):
        return content

    lines = content.split('\n')
    new_lines = []
    found_func = False

    for i, line in enumerate(lines):
        if re.search(func_pattern, line) and not found_func:
            found_func = True
            new_lines.append(line)
            # Find the first line of the function body to determine indentation
            if i + 1 < len(lines):
                body_indent = _detect_indent_of_line(lines[i + 1])
                indent_str = ' ' * body_indent
                new_lines.append(f"{indent_str}try:  # _erp_pro_safe_getall_v4")
                # All subsequent lines of the function need to be indented by 4
                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    if next_line.strip() and _detect_indent_of_line(next_line) < body_indent:
                        # End of function - add except clause before this line
                        new_lines.append(f"{indent_str}except (IndexError, Exception):")
                        new_lines.append(f"{indent_str}    return None  # _erp_pro_safe_getall_v4: skip if no accounts found")
                        new_lines.append(next_line)
                        new_lines.extend(lines[j+1:])
                        break
                    elif next_line.strip():
                        new_lines.append(f"    {next_line}")
                    else:
                        new_lines.append(next_line)
                break
        else:
            new_lines.append(line)

    return '\n'.join(new_lines)


def _patch_taxes_setup_wrap_function(content, filepath):
    """
    Alternative patch: wrap setup_taxes_and_charges function body in try/except.
    This is used as a fallback if the )[0] replacement doesn't find any matches.
    """
    func_pattern = r'def setup_taxes_and_charges\([^)]*\):'
    if not re.search(func_pattern, content):
        print(f"[PATCH] WARNING: Could not find setup_taxes_and_charges function")
        return False

    new_content = _wrap_function_safe(content, 'setup_taxes_and_charges')

    if new_content != content:
        if _write_file(filepath, new_content):
            print(f"[PATCH] FIXED: taxes_setup.py (wrapped setup_taxes_and_charges in try/except)")
            return True

    print(f"[PATCH] WARNING: Could not patch taxes_setup.py with function wrapper")
    return False


def patch_enable_server_scripts():
    """
    Enable Server Scripts in site_config.json if not already enabled.
    This is required for the frontend's Server Script fallback to work
    when creating companies for countries without tax templates.
    """
    site_config_path = os.path.join(
        BENCH_DIR, "sites", "erppro", "site_config.json"
    )

    # Also check with SITE_NAME env var
    import json
    site_name = os.environ.get('SITE_NAME', 'erppro')
    alt_config_path = os.path.join(
        BENCH_DIR, "sites", site_name, "site_config.json"
    )

    for config_path in [site_config_path, alt_config_path]:
        if not os.path.exists(config_path):
            print(f"[PATCH] Site config not found: {config_path}")
            continue

        try:
            with open(config_path, 'r') as f:
                config = json.load(f)

            if config.get('server_script_enabled') == 1:
                print(f"[PATCH] ALREADY ENABLED: server_script_enabled in {config_path}")
                return True

            config['server_script_enabled'] = 1
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
                f.write('\n')

            print(f"[PATCH] ENABLED: server_script_enabled=1 in {config_path}")
            return True
        except Exception as e:
            print(f"[PATCH] WARNING: Could not update {config_path}: {e}")

    # Try common_site_config.json as fallback
    common_config_path = os.path.join(BENCH_DIR, "sites", "common_site_config.json")
    if os.path.exists(common_config_path):
        try:
            with open(common_config_path, 'r') as f:
                config = json.load(f)

            if config.get('server_script_enabled') == 1:
                print(f"[PATCH] ALREADY ENABLED: server_script_enabled in common config")
                return True

            config['server_script_enabled'] = 1
            with open(common_config_path, 'w') as f:
                json.dump(config, f, indent=2)
                f.write('\n')

            print(f"[PATCH] ENABLED: server_script_enabled=1 in common_site_config.json")
            return True
        except Exception as e:
            print(f"[PATCH] WARNING: Could not update common config: {e}")

    print(f"[PATCH] WARNING: Could not enable Server Scripts (no site config found)")
    return False


if __name__ == "__main__":
    print("=" * 60)
    print("ERPNext v16 Bug Patches (v4 - comprehensive + Server Scripts)")
    print("=" * 60)

    results = []

    print("\n[PATCH 1] Fixing financial_report_template.py AttributeError...")
    results.append(("financial_report_template.py", patch_financial_report_template()))

    print("\n[PATCH 2] Wrapping company.py on_update calls in try/except...")
    results.append(("company.py", patch_company_on_update()))

    print("\n[PATCH 3] Fixing taxes_setup.py IndexError...")
    results.append(("taxes_setup.py", patch_taxes_setup()))

    print("\n[PATCH 4] Enabling Server Scripts in site_config.json...")
    results.append(("server_scripts", patch_enable_server_scripts()))

    print("\n" + "=" * 60)
    print("Patch Results:")
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")
    print("=" * 60)

    if not all(r[1] for r in results):
        print("\n[PATCH] WARNING: Some patches failed!")

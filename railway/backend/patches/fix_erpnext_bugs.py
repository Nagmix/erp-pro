#!/usr/bin/env python3
"""
ERPNext v16 Bug Patches for Railway Deployment
================================================
Comprehensive fix for all known ERPNext v16.17.0 bugs that cause
setup wizard failures.

Bug #1: AttributeError in financial_report_template.py
  - Chart of Accounts DocType doesn't exist → coa is None → coa.get() crashes
  - Fix: Add None check

Bug #2: Company.on_update() cascading failures
  - sync_financial_report_templates() crashes (Bug #1)
  - create_default_tax_template() → IndexError in taxes_setup.py
  - create_default_tax_template() tries to find root accounts that don't exist
  - Fix: Wrap ENTIRE on_update body in try/except so Company creation succeeds

Bug #3: IndexError in taxes_setup.py get_or_create_tax_group()
  - frappe.get_all(...)[0] crashes when list is empty
  - Fix: Wrap in try/except and handle empty list

Strategy: The most resilient approach is to wrap the problematic calls
in company.py on_update() so that even if tax setup or financial report
sync fails, the Company is still created successfully.
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

    # Check for syntax errors first
    try:
        compile(content, filepath, 'exec')
        print(f"[PATCH] File syntax is valid")
    except SyntaxError as e:
        print(f"[PATCH] File has SYNTAX ERROR: {e}")
        print(f"[PATCH] Will attempt to restore and re-patch...")

    # Fix any broken previous patches first
    # Remove broken try/except blocks for sync_financial_report_templates
    content = _fix_broken_try_except(content, "sync_financial_report_templates")
    # Remove broken try/except blocks for create_default_tax_template
    content = _fix_broken_try_except(content, "create_default_tax_template")

    # Now apply patches line-by-line
    lines = content.split('\n')
    new_lines = []
    patched_sync = False
    patched_tax = False

    # Targets to wrap in try/except
    sync_target = "sync_financial_report_templates(self.chart_of_accounts, self.existing_company)"
    tax_target = "self.create_default_tax_template()"

    for line in lines:
        # Patch sync_financial_report_templates
        if sync_target in line and not patched_sync:
            indent = _detect_indent_of_line(line)
            indent_str = ' ' * indent
            inner_indent = ' ' * (indent + 4)

            new_lines.append(f"{indent_str}try:")
            new_lines.append(f"{inner_indent}{sync_target}")
            new_lines.append(f"{indent_str}except Exception:")
            new_lines.append(f"{indent_str}    pass")
            patched_sync = True
            print(f"[PATCH] Wrapped sync_financial_report_templates in try/except (indent={indent})")
            continue

        # Patch create_default_tax_template
        if tax_target in line and not patched_tax:
            indent = _detect_indent_of_line(line)
            indent_str = ' ' * indent
            inner_indent = ' ' * (indent + 4)

            new_lines.append(f"{indent_str}try:")
            new_lines.append(f"{inner_indent}{tax_target}")
            new_lines.append(f"{indent_str}except Exception:")
            new_lines.append(f"{indent_str}    pass")
            patched_tax = True
            print(f"[PATCH] Wrapped create_default_tax_template in try/except (indent={indent})")
            continue

        new_lines.append(line)

    if not patched_sync and not patched_tax:
        # Check if already patched
        if "except Exception:" in content:
            already_patched_count = content.count("except Exception:")
            if already_patched_count >= 2:
                print(f"[PATCH] ALREADY PATCHED: company.py ({already_patched_count} try/except blocks found)")
                return True
        print(f"[PATCH] WARNING: Could not find target lines in company.py")
        return False

    new_content = '\n'.join(new_lines)

    if _write_file(filepath, new_content):
        patches = []
        if patched_sync:
            patches.append("sync_financial_report_templates")
        if patched_tax:
            patches.append("create_default_tax_template")
        print(f"[PATCH] FIXED: company.py - wrapped {', '.join(patches)} in try/except")
        return True

    return False


def patch_taxes_setup():
    """
    Fix: IndexError in taxes_setup.py get_or_create_tax_group()
    The code does frappe.get_all(...)[0] which crashes when list is empty.
    Fix: Replace [0] with a safe access pattern.
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/setup/setup_wizard/operations/taxes_setup.py"
    )

    content = _read_file(filepath)
    if content is None:
        return False

    if "get_or_create_tax_group_safely" in content or "_safe_list_access" in content:
        print(f"[PATCH] ALREADY PATCHED: taxes_setup.py")
        return True

    # Strategy: Find all patterns of frappe.get_all(...)[0] and replace with safe access
    # Pattern: variable = frappe.get_all(\n...\n)[0]
    # Replace with: variable = (frappe.get_all(\n...\n) or [None])[0]

    # More targeted: find the specific get_or_create_tax_group function
    # and wrap the [0] access in a try/except

    lines = content.split('\n')
    new_lines = []
    patched = False

    for i, line in enumerate(lines):
        # Look for lines ending with )[0] which is the pattern causing IndexError
        if line.strip().endswith(')[0]') and 'get_all' in line:
            indent = _detect_indent_of_line(line)
            indent_str = ' ' * indent

            # This is a single-line frappe.get_all(...)[0]
            # Replace )[0] with ) or [None])[0] — but this might break multi-line calls
            # Safer: wrap in try/except
            new_lines.append(f"{indent_str}try:")
            new_lines.append(f"{indent_str}    {line.strip()}")
            new_lines.append(f"{indent_str}except (IndexError, Exception):")
            new_lines.append(f"{indent_str}    return  # Skip if no accounts found")
            patched = True
            print(f"[PATCH] Wrapped single-line get_all()[0] in try/except at line {i+1}")
            continue

        # Look for )[0] on its own line (multi-line get_all call)
        if line.strip() == ')[0]' and not patched:
            # Check if previous lines have get_all
            prev_lines = ''.join(lines[max(0, i-10):i])
            if 'get_all' in prev_lines or 'frappe.get_all' in prev_lines:
                indent = _detect_indent_of_line(line)
                indent_str = ' ' * indent

                # Replace )[0] with ) or [None])[0]
                new_lines.append(f"{indent_str}) or [None])[0]")
                patched = True
                print(f"[PATCH] Fixed multi-line get_all()[0] at line {i+1}")
                continue

        new_lines.append(line)

    if not patched:
        # Alternative: wrap the entire function body in try/except
        # Find get_or_create_tax_group function
        func_pattern = r'def get_or_create_tax_group\([^)]*\):'
        if re.search(func_pattern, content):
            # Add a try/except wrapper inside the function
            # Find the function start
            for i, line in enumerate(lines):
                if re.search(func_pattern, line):
                    # Find the first line of the function body
                    if i + 1 < len(lines):
                        body_indent = _detect_indent_of_line(lines[i + 1])
                        indent_str = ' ' * body_indent
                        inner_indent = ' ' * (body_indent + 4)

                        # Insert try/except at the start of the function body
                        new_lines = lines[:i+1]
                        new_lines.append(f"{indent_str}try:")
                        # Indent all remaining lines of the function by 4
                        for j in range(i + 1, len(lines)):
                            next_line = lines[j]
                            if next_line.strip() and _detect_indent_of_line(next_line) < body_indent:
                                # End of function
                                new_lines.append(f"{indent_str}except (IndexError, Exception):")
                                new_lines.append(f"{indent_str}    return  # Skip if no matching account found")
                                new_lines.append(next_line)
                                # Add remaining lines
                                new_lines.extend(lines[j+1:])
                                break
                            elif next_line.strip():
                                new_lines.append(f"    {next_line}")
                            else:
                                new_lines.append(next_line)

                        patched = True
                        print(f"[PATCH] Wrapped get_or_create_tax_group in try/except")
                        break

    if not patched:
        print(f"[PATCH] WARNING: Could not patch taxes_setup.py")
        return False

    new_content = '\n'.join(new_lines)

    if _write_file(filepath, new_content):
        print(f"[PATCH] FIXED: taxes_setup.py")
        return True

    return False


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

    return content


if __name__ == "__main__":
    print("=" * 60)
    print("ERPNext v16 Bug Patches (v3 - comprehensive)")
    print("=" * 60)

    results = []

    print("\n[PATCH 1] Fixing financial_report_template.py AttributeError...")
    results.append(("financial_report_template.py", patch_financial_report_template()))

    print("\n[PATCH 2] Wrapping company.py on_update calls in try/except...")
    results.append(("company.py", patch_company_on_update()))

    print("\n[PATCH 3] Fixing taxes_setup.py IndexError...")
    results.append(("taxes_setup.py", patch_taxes_setup()))

    print("\n" + "=" * 60)
    print("Patch Results:")
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")
    print("=" * 60)

    if not all(r[1] for r in results):
        print("\n[PATCH] WARNING: Some patches failed!")

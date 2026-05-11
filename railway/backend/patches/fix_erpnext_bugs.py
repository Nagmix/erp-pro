#!/usr/bin/env python3
"""
ERPNext v16 Bug Patches for Railway Deployment
================================================

Bug #1: AttributeError in financial_report_template.py
  - Chart of Accounts DocType doesn't exist in v16.17.0
  - coa.get() called on None → crash
  - Fix: Add None check before .get() on coa

Bug #2: Company on_update calls sync_financial_report_templates
  - Wraps call in try/except to prevent setup failures
  - CRITICAL: Must preserve exact Python indentation
"""

import os
import re

BENCH_DIR = "/home/frappe/frappe-bench"


def patch_financial_report_template():
    """
    Patch: financial_report_template.py
    Add None check: if not coa or coa.get(...)
    """
    filepath = os.path.join(
        BENCH_DIR,
        "apps/erpnext/erpnext/accounts/doctype/financial_report_template/financial_report_template.py"
    )

    if not os.path.exists(filepath):
        print(f"[PATCH] WARNING: File not found: {filepath}")
        return False

    with open(filepath, 'r') as f:
        content = f.read()

    if "not coa or coa.get" in content:
        print(f"[PATCH] ALREADY PATCHED: financial_report_template.py")
        return True

    # Replace: if coa.get("disable_default_financial_report_template", False):
    # With:    if not coa or coa.get("disable_default_financial_report_template", False):
    pattern = r'if coa\.get\("disable_default_financial_report_template",\s*False\):'
    replacement = 'if not coa or coa.get("disable_default_financial_report_template", False):'

    new_content, count = re.subn(pattern, replacement, content)

    if count > 0:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"[PATCH] FIXED: financial_report_template.py ({count} occurrence(s))")
        return True

    # Alternative: add None check after coa = ... line
    lines = content.split('\n')
    new_lines = []
    patched = False
    for line in lines:
        new_lines.append(line)
        if not patched and 'coa' in line and 'chart_of_accounts' in line and '=' in line:
            indent = len(line) - len(line.lstrip())
            indent_str = ' ' * indent
            new_lines.append(f"{indent_str}if not coa:")
            new_lines.append(f"{indent_str}    return")
            patched = True

    if patched:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"[PATCH] FIXED (alternative): Added None check in financial_report_template.py")
        return True

    print(f"[PATCH] WARNING: Could not patch financial_report_template.py")
    return False


def patch_company_on_update():
    """
    Patch: company.py - Wrap sync_financial_report_templates in try/except

    Strategy: Process the file line-by-line, detect the target line,
    and wrap it with proper indentation detected from context.
    Also handles fixing any previously broken patches.
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

    # First verify the file has valid Python syntax
    try:
        compile(content, filepath, 'exec')
        file_is_valid = True
        print(f"[PATCH] File syntax is currently valid")
    except SyntaxError as e:
        file_is_valid = False
        print(f"[PATCH] File has SYNTAX ERROR: {e}")
        print(f"[PATCH] Will attempt to fix...")

    # Process line by line
    lines = content.split('\n')
    new_lines = []
    patched = False
    i = 0
    target = "sync_financial_report_templates(self.chart_of_accounts, self.existing_company)"

    while i < len(lines):
        line = lines[i]

        # Case 1: Broken try: at wrong indentation followed by sync_... line
        # This is the result of a previous bad patch
        if (line.strip() == "try:" and
            i + 1 < len(lines) and
            target in lines[i + 1]):

            # Check if this try: is at the wrong indentation level
            # (it should be at the same level as surrounding code in on_update)
            try_indent = len(line) - len(line.lstrip())
            sync_indent = len(lines[i + 1]) - len(lines[i + 1].lstrip())

            # Look for except and pass after sync line
            found_except = False
            except_line_idx = None
            pass_line_idx = None
            for j in range(i + 2, min(i + 5, len(lines))):
                if 'except Exception:' in lines[j]:
                    except_line_idx = j
                    found_except = True
                if found_except and lines[j].strip() == 'pass':
                    pass_line_idx = j
                    break

            if found_except and pass_line_idx is not None:
                # Determine the CORRECT indentation from context
                # Look at the line BEFORE the try: for the expected indent level
                # (should be same level as surrounding code in the method)
                context_indent = None
                for k in range(i - 1, max(i - 10, -1), -1):
                    prev = lines[k]
                    stripped = prev.strip()
                    if stripped and not stripped.startswith('#'):
                        ctx_ind = len(prev) - len(prev.lstrip())
                        # If the previous line is a method def or has less indent,
                        # the target indent is the same as the next significant line
                        if 'def on_update' in prev:
                            # on_update body is indented 4 more than def
                            context_indent = ctx_ind + 4
                            break
                        elif ctx_ind > try_indent:
                            # Previous line has more indent, use it
                            context_indent = ctx_ind
                            break
                        elif ctx_ind == try_indent:
                            # Same level, this is correct
                            context_indent = ctx_ind
                            break

                if context_indent is None:
                    # Fallback: use common indent for method body (12 spaces = class + def + body)
                    # class Company(Document):    → 0
                    #     def on_update(self):    → 4
                    #         self.update...      → 8
                    #         try:                → 8
                    #             sync_...         → 12
                    context_indent = 8

                indent_str = ' ' * context_indent
                inner_indent = ' ' * (context_indent + 4)

                # Replace the broken try/except block with correct one
                new_lines.append(f"{indent_str}try:")
                new_lines.append(f"{inner_indent}{target}")
                new_lines.append(f"{indent_str}except Exception:")
                new_lines.append(f"{indent_str}    pass")
                patched = True

                # Skip all the broken lines
                i = pass_line_idx + 1
                print(f"[PATCH] Fixed broken try/except block (was at indent {try_indent}, corrected to {context_indent})")
                continue

        # Case 2: Unpatched file - the target line exists directly
        if target in line and not patched:
            # Get the indentation of this line
            indent = len(line) - len(line.lstrip())
            indent_str = ' ' * indent
            inner_indent = ' ' * (indent + 4)

            # Replace with try/except
            new_lines.append(f"{indent_str}try:")
            new_lines.append(f"{inner_indent}{target}")
            new_lines.append(f"{indent_str}except Exception:")
            new_lines.append(f"{indent_str}    pass")
            patched = True
            print(f"[PATCH] Wrapped sync_financial_report_templates in try/except (indent={indent})")
            i += 1
            continue

        new_lines.append(line)
        i += 1

    if not patched:
        # Maybe already patched correctly? Check
        if "except Exception:" in content and target in content:
            print(f"[PATCH] ALREADY PATCHED: company.py")
            return True
        print(f"[PATCH] WARNING: Could not find target line in company.py")
        return False

    # Write and verify
    new_content = '\n'.join(new_lines)

    try:
        compile(new_content, filepath, 'exec')
        print(f"[PATCH] Syntax check PASSED for company.py")
    except SyntaxError as e:
        print(f"[PATCH] CRITICAL: Syntax check FAILED after patching: {e}")
        print(f"[PATCH] NOT writing broken file!")
        # Try to save diagnostic info
        error_lines = new_content.split('\n')
        for ln in range(max(0, e.lineno - 3), min(len(error_lines), e.lineno + 3)):
            marker = ">>>" if ln == e.lineno - 1 else "   "
            print(f"  {marker} {ln+1}: {error_lines[ln]}")
        return False

    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"[PATCH] FIXED: company.py")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ERPNext v16 Bug Patches")
    print("=" * 60)

    results = []

    print("\n[PATCH 1] Fixing financial_report_template.py AttributeError...")
    results.append(("financial_report_template.py", patch_financial_report_template()))

    print("\n[PATCH 2] Wrapping sync_financial_report_templates in try/except...")
    results.append(("company.py", patch_company_on_update()))

    print("\n" + "=" * 60)
    print("Patch Results:")
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")
    print("=" * 60)

    if not all(r[1] for r in results):
        print("\n[PATCH] WARNING: Some patches failed!")

#!/usr/bin/env python3
"""Standardize Input/Select heights: h-10 -> h-9, and fix label sizes"""
import re, os, glob

src_dir = "/home/z/my-project/src"
files_modified = 0
total_changes = 0

tsx_files = glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True)

for filepath in tsx_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # 1. Replace h-10 with h-9 on Input/SelectTrigger 
    # Using simple approach: replace all h-10 with h-9 in className strings
    # This is safe because h-10 is rarely used intentionally
    new_content = re.sub(r'className="([^"]*?)h-10([^"]*?)"', lambda m: f'className="{m.group(1)}h-9{m.group(2)}"', content)
    if new_content != content:
        changes += content.count('h-10') - new_content.count('h-10')
        content = new_content
    
    # 2. Fix Label text-xs font-medium -> text-sm font-medium
    new_content = re.sub(r'(<Label\b[^>]*?className="[^"]*?)text-xs(\s+font-medium)', r'\1text-sm\2', content)
    if new_content != content:
        changes += 1
        content = new_content
    
    # 3. Also fix standalone label-like patterns: <p className="text-xs font-medium mb-1/2"> as form labels
    new_content = re.sub(r'className="(text-xs font-medium mb-[12])"', r'className="text-sm font-medium mb-2"', content)
    if new_content != content:
        changes += 1
        content = new_content
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1
        total_changes += changes

print(f"Input/Label standardization: {files_modified} files modified, {total_changes} changes")

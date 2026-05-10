#!/usr/bin/env python3
"""Replace hardcoded colors with semantic tokens where appropriate"""
import re, os, glob

src_dir = "/home/z/my-project/src"
files_modified = 0

tsx_files = glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True)

# Mapping of hardcoded colors to semantic equivalents
# Only replace colors used for semantic purposes (not decorative gradients/icons)
REPLACEMENTS = {
    # Success/positive
    'text-green-600 dark:text-green-400': 'text-primary',
    'text-green-700 dark:text-green-400': 'text-primary',
    'text-emerald-600 dark:text-emerald-400': 'text-primary',
    'bg-green-50/80 dark:bg-green-900/20 border-green-200/50': 'bg-primary/10 border-primary/30',
    
    # Warning/overdue  
    'text-orange-600 dark:text-orange-400': 'text-chart-4',
    'bg-orange-50 dark:bg-orange-950/20': 'bg-chart-4/5',
    
    # Danger/negative
    'text-red-600': 'text-destructive',
    'text-red-700 dark:text-red-300': 'text-destructive',
    
    # Info
    'text-blue-600 dark:text-blue-400': 'text-chart-1',
    'text-blue-600': 'text-chart-1',
}

for filepath in tsx_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    for old, new in REPLACEMENTS.items():
        if old in content:
            content = content.replace(old, new)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1

print(f"Hardcoded color fixes: {files_modified} files modified")

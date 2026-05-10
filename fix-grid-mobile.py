#!/usr/bin/env python3
"""Fix grid layouts without mobile breakpoints - add grid-cols-1 base"""
import re, os, glob

src_dir = "/home/z/my-project/src"
files_modified = 0
changes_made = 0

tsx_files = glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True)

for filepath in tsx_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: grid grid-cols-2 -> grid grid-cols-1 sm:grid-cols-2
    # But skip if already has grid-cols-1 on same class string
    # Also skip grid-cols-2 that's already sm:grid-cols-2 or md:grid-cols-2 etc
    
    # Fix: "grid grid-cols-2 " -> "grid grid-cols-1 sm:grid-cols-2 "
    # Only when there's NO grid-cols-1 or sm:/md:/lg: prefix on grid-cols-2
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-2(\s)',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-2' + m.group(2),
        content
    )
    
    # Fix: "grid grid-cols-3 " -> "grid grid-cols-1 sm:grid-cols-3 "
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-3(\s)',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-3' + m.group(2),
        content
    )
    
    # Fix: "grid grid-cols-4 " -> "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 "
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-4(\s)',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' + m.group(2),
        content
    )
    
    # Fix: "grid grid-cols-5 " -> "grid grid-cols-2 sm:grid-cols-5 " (for small item grids)
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-5(\s)',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-2 sm:grid-cols-5' + m.group(2),
        content
    )
    
    # Fix: "grid grid-cols-6 " -> "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 "
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-6(\s)',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' + m.group(2),
        content
    )
    
    # Handle closing quote patterns: grid-cols-2" -> grid-cols-1 sm:grid-cols-2"
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-2"',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-2"',
        content
    )
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-3"',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-3"',
        content
    )
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-4"',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"',
        content
    )
    content = re.sub(
        r'(className="[^"]*?)grid grid-cols-5"',
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-2 sm:grid-cols-5"',
        content
    )
    
    # Handle className={`...`} template literal patterns
    content = re.sub(
        r"(className=\{`[^}]*?)grid grid-cols-2\b",
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-2',
        content
    )
    content = re.sub(
        r"(className=\{`[^}]*?)grid grid-cols-3\b",
        lambda m: m.group(0) if 'grid-cols-1' in m.group(1) else m.group(1) + 'grid grid-cols-1 sm:grid-cols-3',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1
        changes_made += sum(1 for a, b in zip(original, content) if a != b)

print(f"Grid mobile breakpoints: {files_modified} files modified")

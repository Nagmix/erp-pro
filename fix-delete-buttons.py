#!/usr/bin/env python3
"""Replace inline delete button styling with variant='destructive'"""
import re, os, glob

src_dir = "/home/z/my-project/src"
files_modified = 0

tsx_files = glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True)

for filepath in tsx_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern: <Button onClick={...delete...} className="...bg-red-.../bg-destructive..."  without variant
    # We want to find Buttons that act as delete buttons but use inline red styling instead of variant="destructive"
    
    # Pattern 1: className containing bg-red-* or bg-destructive on a Button that has حذف/delete/Trash2
    # Simple approach: find Button with "حذف" text and className with bg-red or bg-destructive, add variant="destructive"
    
    # Fix: Button with destructive-style class but no variant
    # className="...bg-red-500..." or className="...bg-destructive..." on <Button that doesn't have variant=
    content = re.sub(
        r'(<Button\s+)([^>]*className="[^"]*?(?:bg-red-\d+|bg-destructive)[^"]*?"[^>]*?)(>)\s*([\u0600-\u06FF]*حذف|<Trash2|<Trash)',
        lambda m: _fix_delete_btn(m),
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1

def _fix_delete_btn(m):
    tag = m.group(1)
    attrs = m.group(2)
    close = m.group(3)
    content_after = m.group(4)
    
    # If already has variant=, don't modify
    if 'variant=' in attrs:
        return m.group(0)
    
    # Add variant="destructive" and remove the bg-red/bg-destructive from className
    new_attrs = re.sub(r'bg-red-\d+', 'bg-destructive', attrs)
    new_attrs = re.sub(r'bg-destructive/\d+', 'bg-destructive', new_attrs)
    new_attrs = re.sub(r'hover:bg-red-\d+', '', new_attrs)
    new_attrs = re.sub(r'hover:bg-destructive/\d+', '', new_attrs)
    new_attrs = re.sub(r'text-white', '', new_attrs)
    new_attrs = re.sub(r'text-red-\d+', '', new_attrs)
    
    # Add variant="destructive" after <Button 
    return f'{tag}variant="destructive" {new_attrs}{close}{content_after}'

print(f"Delete buttons fixed: {files_modified} files modified")

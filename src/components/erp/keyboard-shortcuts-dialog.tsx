'use client';

import { useEffect, useState } from 'react';

/** استدعِ `window.dispatchEvent(new Event(ERP_OPEN_SHORTCUTS_EVENT))` لفتح نافذة الاختصارات. */
export const ERP_OPEN_SHORTCUTS_EVENT = 'erp-open-shortcuts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ROWS: { keys: string; desc: string }[] = [
  { keys: 'Ctrl + K', desc: 'فتح البحث الشامل والانتقال السريع' },
  { keys: '؟', desc: 'عرض اختصارات لوحة المفاتيح (هذه النافذة)' },
  { keys: 'Escape', desc: 'إغلاق النوافذ المنبثقة عند التركيز داخلها' },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest('[role="textbox"], [contenteditable="true"]'));
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === '?' || e.key === '؟') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onExternal = () => setOpen(true);
    window.addEventListener(ERP_OPEN_SHORTCUTS_EVENT, onExternal);
    return () => window.removeEventListener(ERP_OPEN_SHORTCUTS_EVENT, onExternal);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>اختصارات لوحة المفاتيح</DialogTitle>
          <DialogDescription className="text-xs text-start">
            تعمل الاختصارات عندما لا يكون التركيز داخل حقل إدخال.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          {ROWS.map((row) => (
            <li key={row.keys} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1">
                {row.keys.split('+').map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground text-xs">+</span>}
                    <kbd
                      className={cn(
                        'pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center gap-1',
                        'rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'
                      )}
                    >
                      {part.trim()}
                    </kbd>
                  </span>
                ))}
              </div>
              <span className="text-muted-foreground text-xs">{row.desc}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

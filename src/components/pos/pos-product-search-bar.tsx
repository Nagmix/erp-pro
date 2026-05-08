'use client';

import type { RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ScanLine, Loader2 } from 'lucide-react';

export type PosProductSearchBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  barcodeValue: string;
  onBarcodeChange: (value: string) => void;
  onBarcodeEnter: () => void | Promise<void>;
  barcodeInputRef?: RefObject<HTMLInputElement | null>;
  barcodeBusy?: boolean;
  compact?: boolean;
};

export function PosProductSearchBar({
  searchQuery,
  onSearchChange,
  barcodeValue,
  onBarcodeChange,
  onBarcodeEnter,
  barcodeInputRef,
  barcodeBusy,
  compact,
}: PosProductSearchBarProps) {
  const h = compact ? 'h-9' : 'h-10';
  return (
    <div className={`space-y-2 ${compact ? '' : ''}`}>
      <div className="relative">
        {barcodeBusy ? (
          <Loader2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <ScanLine className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={barcodeInputRef}
          placeholder="باركود / سيريال / باتش — Enter"
          value={barcodeValue}
          onChange={(e) => onBarcodeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onBarcodeEnter();
            }
          }}
          className={`ps-9 ${h} text-sm font-mono`}
          dir="rtl"
          autoComplete="off"
          disabled={Boolean(barcodeBusy)}
          aria-busy={barcodeBusy || undefined}
        />
      </div>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الكود…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`ps-9 ${h} text-sm`}
        />
      </div>
    </div>
  );
}

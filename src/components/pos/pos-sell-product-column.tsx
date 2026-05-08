'use client';

import type { RefObject } from 'react';
import { PosProductSearchBar } from '@/components/pos/pos-product-search-bar';
import { PosCategoryBar } from '@/components/pos/pos-category-bar';
import { PosProductCard } from '@/components/pos/pos-product-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PosSellCatalogRow } from '@/lib/client/pos-catalog';
import { isPosTemplateItem } from '@/lib/client/pos-catalog';

export type PosSellProductColumnProps = {
  compactGrid?: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  barcodeValue: string;
  onBarcodeChange: (v: string) => void;
  onBarcodeEnter: () => void | Promise<void>;
  barcodeInputRef?: RefObject<HTMLInputElement | null>;
  barcodeBusy?: boolean;
  categoryTabs: { id: string; label: string }[];
  activeGroup: string;
  onSelectGroup: (id: string) => void;
  itemsLoading: boolean;
  displayItems: PosSellCatalogRow[];
  catalogEnabled: boolean;
  posProfile: string;
  cartQtyByCode: Map<string, number>;
  onProductClick: (row: PosSellCatalogRow) => void;
};

export function PosSellProductColumn({
  compactGrid = false,
  searchQuery,
  onSearchChange,
  barcodeValue,
  onBarcodeChange,
  onBarcodeEnter,
  barcodeInputRef,
  barcodeBusy,
  categoryTabs,
  activeGroup,
  onSelectGroup,
  itemsLoading,
  displayItems,
  catalogEnabled,
  posProfile,
  cartQtyByCode,
  onProductClick,
}: PosSellProductColumnProps) {
  const gridClass = compactGrid
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5'
    : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3';

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-muted/10 lg:flex-[3]">
      <div className="p-3 border-b bg-muted/20">
        <PosProductSearchBar
          compact={compactGrid}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          barcodeValue={barcodeValue}
          onBarcodeChange={onBarcodeChange}
          onBarcodeEnter={onBarcodeEnter}
          barcodeInputRef={barcodeInputRef}
          barcodeBusy={barcodeBusy}
        />
      </div>

      <div className="p-3 border-b bg-background/80">
        <PosCategoryBar compact={compactGrid} tabs={categoryTabs} activeId={activeGroup} onSelect={onSelectGroup} />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className={`p-3 ${gridClass}`}>
          {itemsLoading && (
            <p className="col-span-full text-center text-sm text-muted-foreground p-6">جاري التحميل…</p>
          )}
          {displayItems.map((row) => {
            const code = row.item_code || row.name;
            const inCartQty = cartQtyByCode.get(code);
            return (
              <PosProductCard
                key={`${code}-${row.item_name}-${compactGrid ? 'c' : 'n'}`}
                compact={compactGrid}
                title={row.item_name || row.name}
                subtitle={row.item_group || undefined}
                price={row.price_list_rate}
                currency={row.currency || undefined}
                stockQty={row.actual_qty}
                showStock={catalogEnabled && row.actual_qty != null && Number.isFinite(row.actual_qty)}
                imageUrl={row.item_image}
                inCartQty={inCartQty}
                isTemplate={isPosTemplateItem(row)}
                onClick={() => onProductClick(row)}
              />
            );
          })}
          {displayItems.length === 0 && !itemsLoading && (
            <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
              {catalogEnabled && !posProfile.trim()
                ? 'اختر ملف نقطة البيع لعرض الأصناف من النظام.'
                : 'لا توجد أصناف.'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

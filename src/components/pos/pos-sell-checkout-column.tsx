'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PosCart, type PosCartHoldVM } from '@/components/pos/pos-cart';
import { PosCartSummary } from '@/components/pos/pos-cart-summary';
import { PosCustomerSelector } from '@/components/pos/pos-customer-selector';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Receipt, Undo2, Printer, Eye, Usb } from 'lucide-react';
import type { PosCartLineVM } from '@/components/pos/pos-cart-item';
import type { POSCustomerInfoResponse } from '@/lib/core/types';
import type { PosReceiptSnapshot } from '@/lib/client/pos-receipt';

export type PosSellCheckoutColumnProps = {
  showReturnBar?: boolean;
  myOpenPoeListLength: number;
  onReturnClick: () => void;
  customer: string;
  onCustomerChange: (name: string) => void;
  customerInfo?: POSCustomerInfoResponse | null;
  customerInfoLoading?: boolean;
  customerInfoError?: boolean;
  profileDefaultCustomer?: string;
  posProfile: string;
  onPosProfileChange: (v: string) => void;
  defaultWarehouse: string;
  onDefaultWarehouseChange: (w: string) => void;
  costCenter: string;
  onCostCenterChange: (v: string) => void;
  lastReceipt: PosReceiptSnapshot | null;
  onPrintReceipt: (r: PosReceiptSnapshot) => void;
  onPreviewReceipt: (r: PosReceiptSnapshot) => void;
  onSerialPrint?: (r: PosReceiptSnapshot) => void;
  showSerialPrint?: boolean;
  cartLines: PosCartLineVM[];
  totalItems: number;
  holds: PosCartHoldVM[];
  onRemoveLine: (itemCode: string) => void;
  onQtyDelta: (itemCode: string, delta: number) => void;
  onRateChange: (itemCode: string, rate: number) => void;
  onWarehouseChange: (itemCode: string, warehouse: string) => void;
  onHold: () => void;
  onRestoreHold: (id: string) => void;
  onDeleteHold: (id: string) => void;
  onClearCart: () => void;
  subtotal: number;
  discount: number;
  onDiscountChange: (v: number) => void;
  lineNet: number;
  profilePaymentModes: string[];
  paymentAmounts: Record<string, string>;
  onPaymentAmountChange: (mode: string, value: string) => void;
  paymentSum: number;
  paymentSumOk: boolean;
  partialDraftOk?: boolean;
  allowPartialPayment?: boolean;
  hasChangeAccount: boolean;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmBusy: boolean;
  orderSuccess: boolean;
  allowRateEdit?: boolean;
  allowWarehouseEdit?: boolean;
  allowDiscountEdit?: boolean;
};

export function PosSellCheckoutColumn({
  showReturnBar,
  myOpenPoeListLength,
  onReturnClick,
  customer,
  onCustomerChange,
  customerInfo,
  customerInfoLoading,
  customerInfoError,
  profileDefaultCustomer,
  posProfile,
  onPosProfileChange,
  defaultWarehouse,
  onDefaultWarehouseChange,
  costCenter,
  onCostCenterChange,
  lastReceipt,
  onPrintReceipt,
  onPreviewReceipt,
  onSerialPrint,
  showSerialPrint,
  cartLines,
  totalItems,
  holds,
  onRemoveLine,
  onQtyDelta,
  onRateChange,
  onWarehouseChange,
  onHold,
  onRestoreHold,
  onDeleteHold,
  onClearCart,
  subtotal,
  discount,
  onDiscountChange,
  lineNet,
  profilePaymentModes,
  paymentAmounts,
  onPaymentAmountChange,
  paymentSum,
  paymentSumOk,
  partialDraftOk,
  allowPartialPayment,
  hasChangeAccount,
  onConfirm,
  confirmDisabled,
  confirmBusy,
  orderSuccess,
  allowRateEdit = true,
  allowWarehouseEdit = true,
  allowDiscountEdit = true,
}: PosSellCheckoutColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-muted/20 lg:flex-[2] border-t lg:border-t-0 lg:border-s border-border/60">
      {showReturnBar ? (
        <div className="p-3 border-b bg-background flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">البيع والدفع</h2>
            {myOpenPoeListLength > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                وردية مفتوحة: {myOpenPoeListLength}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] gap-1" onClick={onReturnClick}>
              <Undo2 className="h-3 w-3" />
              مرتجع
            </Button>
          </div>
        </div>
      ) : null}

      <div className="p-3 border-b bg-background space-y-2">
        <PosCustomerSelector
          customer={customer}
          onCustomerChange={onCustomerChange}
          customerInfo={customerInfo}
          customerInfoLoading={customerInfoLoading}
          customerInfoError={customerInfoError}
          profileDefaultCustomer={profileDefaultCustomer}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">ملف نقطة البيع *</Label>
            <ErpLinkCombobox doctype="POS Profile" value={posProfile} onChange={onPosProfileChange} />
          </div>
          <div>
            <Label className="text-xs">مستودع افتراضي</Label>
            <ErpLinkCombobox doctype="Warehouse" value={defaultWarehouse} onChange={onDefaultWarehouseChange} />
          </div>
        </div>
        <div>
          <Label className="text-xs">مركز تكلفة</Label>
          <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={onCostCenterChange} />
        </div>
      </div>

      {lastReceipt && (
        <div className="px-3 py-2 border-b bg-green-500/5 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-medium text-green-800 dark:text-green-200">آخر فاتورة: {lastReceipt.invoiceName}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-[10px] gap-1"
            onClick={() => onPrintReceipt(lastReceipt)}
          >
            <Printer className="h-3 w-3" />
            طباعة
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1"
            onClick={() => onPreviewReceipt(lastReceipt)}
          >
            <Eye className="h-3 w-3" />
            معاينة
          </Button>
          {showSerialPrint && onSerialPrint ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] gap-1"
              onClick={() => void onSerialPrint(lastReceipt)}
            >
              <Usb className="h-3 w-3" />
              طابعة
            </Button>
          ) : null}
        </div>
      )}

      <PosCart
        lines={cartLines}
        totalItems={totalItems}
        holds={holds}
        onRemoveLine={onRemoveLine}
        onQtyDelta={onQtyDelta}
        onRateChange={onRateChange}
        onWarehouseChange={onWarehouseChange}
        onHold={onHold}
        onRestoreHold={onRestoreHold}
        onDeleteHold={onDeleteHold}
        onClearCart={onClearCart}
        allowRateEdit={allowRateEdit}
        allowWarehouseEdit={allowWarehouseEdit}
      />

      <PosCartSummary
        subtotal={subtotal}
        discount={discount}
        onDiscountChange={onDiscountChange}
        lineNet={lineNet}
        posProfile={posProfile}
        profilePaymentModes={profilePaymentModes}
        paymentAmounts={paymentAmounts}
        onPaymentAmountChange={onPaymentAmountChange}
        paymentSum={paymentSum}
        paymentSumOk={paymentSumOk}
        partialDraftOk={partialDraftOk}
        allowPartialPayment={allowPartialPayment}
        hasChangeAccount={hasChangeAccount}
        onConfirm={onConfirm}
        confirmDisabled={confirmDisabled}
        confirmBusy={confirmBusy}
        orderSuccess={orderSuccess}
        discountDisabled={!allowDiscountEdit}
      />
    </div>
  );
}

/** تبويب إعدادات سريع للجوال — نفس حقول الملف دون السلة */
export function PosSellSettingsPane(props: {
  posProfile: string;
  onPosProfileChange: (v: string) => void;
  defaultWarehouse: string;
  onDefaultWarehouseChange: (v: string) => void;
  costCenter: string;
  onCostCenterChange: (v: string) => void;
}) {
  return (
    <div dir="rtl" className="p-4 space-y-4 max-w-lg mx-auto">
      <p className="text-sm text-muted-foreground">
        اضبط ملف نقطة البيع والمستودع ومركز التكلفة قبل البيع. للتفاصيل الكاملة راجع{' '}
        <Link href="/pos/settings/profiles" className="text-primary underline">
          إعدادات ملفات POS
        </Link>
        .
      </p>
      <div className="grid gap-3">
        <div>
          <Label className="text-xs">ملف نقطة البيع *</Label>
          <ErpLinkCombobox doctype="POS Profile" value={props.posProfile} onChange={props.onPosProfileChange} />
        </div>
        <div>
          <Label className="text-xs">مستودع افتراضي</Label>
          <ErpLinkCombobox
            doctype="Warehouse"
            value={props.defaultWarehouse}
            onChange={props.onDefaultWarehouseChange}
          />
        </div>
        <div>
          <Label className="text-xs">مركز تكلفة</Label>
          <ErpLinkCombobox doctype="Cost Center" value={props.costCenter} onChange={props.onCostCenterChange} />
        </div>
      </div>
    </div>
  );
}

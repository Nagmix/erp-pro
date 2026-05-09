'use client';

import { useDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2 } from 'lucide-react';
import { useDefaultCompanyName } from '@/lib/erp/default-company';

/* ──────────────────────────────────────────────
   أنواع
   ────────────────────────────────────────────── */

export type InvoicePrintProps = {
  /** نوع المستند: Sales Invoice | Purchase Invoice | POS Invoice */
  doctype: string;
  /** اسم المستند في ERPNext */
  docname: string;
  /** عند الإغلاق */
  onClose: () => void;
};

/** صف بند من جدول الأصناف */
type InvoiceItemRow = {
  idx?: number;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  uom?: string;
  warehouse?: string;
};

/** صف ضريبة */
type TaxRow = {
  description?: string;
  rate?: number;
  tax_amount?: number;
  total?: number;
};

/** صف دفع */
type PaymentRow = {
  mode_of_payment?: string;
  amount?: number;
  default?: boolean;
};

/* ──────────────────────────────────────────────
   مكون الطباعة
   ────────────────────────────────────────────── */

export function InvoicePrint({ doctype, docname, onClose }: InvoicePrintProps) {
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data: doc, isLoading, isError, error } = useDoc<Record<string, unknown>>(doctype, docname);

  /* ── استخراج البيانات ── */
  const items = (Array.isArray(doc?.items) ? doc.items : []) as InvoiceItemRow[];
  const taxes = (Array.isArray(doc?.taxes) ? doc.taxes : []) as TaxRow[];
  const payments = (Array.isArray(doc?.payments) ? doc.payments : []) as PaymentRow[];

  const companyName = String(doc?.company ?? defaultCompany ?? '');
  const invoiceNo = String(doc?.name ?? '');
  const postingDate = String(doc?.posting_date ?? '');
  const dueDate = String(doc?.due_date ?? '');
  const currency = String(doc?.currency ?? 'YER');

  const isPurchase = doctype === 'Purchase Invoice';
  const partyLabel = isPurchase ? 'المورد' : 'العميل';
  const partyName = String(
    isPurchase
      ? (doc?.supplier_name ?? doc?.supplier ?? '')
      : (doc?.customer_name ?? doc?.customer ?? '')
  );
  const partyId = String(
    isPurchase
      ? (doc?.supplier ?? '')
      : (doc?.customer ?? '')
  );

  const addressDisplay = String(
    isPurchase
      ? (doc?.supplier_address ?? doc?.address_display ?? '')
      : (doc?.customer_address ?? doc?.address_display ?? '')
  );

  const subtotal = Number(doc?.total ?? doc?.net_total ?? 0);
  const totalTax = Number(doc?.total_taxes_and_charges ?? 0);
  const discountAmount = Number(doc?.discount_amount ?? doc?.additional_discount_amount ?? 0);
  const grandTotal = Number(doc?.grand_total ?? 0);
  const roundedTotal = Number(doc?.rounded_total ?? 0);
  const displayTotal = roundedTotal > 0 ? roundedTotal : grandTotal;
  const changeAmount = Number(doc?.change_amount ?? 0);
  const taxId = String(doc?.tax_id ?? '');

  const isReturn = Number(doc?.is_return) === 1;
  const docstatus = Number(doc?.docstatus ?? 0);
  const statusLabel = docstatus === 1 ? 'مُقدّم' : docstatus === 2 ? 'ملغي' : 'مسودة';

  /* ── طباعة ── */
  const handlePrint = () => {
    window.print();
  };

  /* ── تحميل ── */
  if (isLoading) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ تحميل الفاتورة…</p>
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-destructive">
            {(error as Error)?.message || 'تعذر تحميل الفاتورة'}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     عرض الفاتورة
     ════════════════════════════════════════════ */
  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-background print:bg-white">
      {/* ── شريط التحكم (يختفي عند الطباعة) ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <span className="text-xs text-muted-foreground font-mono">{invoiceNo}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── محتوى الفاتورة ── */}
      <div className="max-w-[210mm] mx-auto p-6 md:p-8 print:p-4 print:max-w-none">
        {/* رأس الفاتورة */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 border-b pb-6">
          {/* بيانات الشركة */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{companyName}</h1>
            {taxId && (
              <p className="text-xs text-muted-foreground">الرقم الضريبي: {taxId}</p>
            )}
          </div>

          {/* عنوان الفاتورة */}
          <div className="text-left space-y-1">
            <h2 className="text-lg font-bold">
              {isReturn ? 'إشعار دائن' : isPurchase ? 'فاتورة مشتريات' : 'فاتورة مبيعات'}
            </h2>
            <p className="text-xs text-muted-foreground">{doctype}</p>
          </div>
        </div>

        {/* معلومات الفاتورة والطرف */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* معلومات الفاتورة */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الفاتورة:</span>
              <span className="font-mono font-medium">{invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ:</span>
              <span>{postingDate ? formatDate(postingDate) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">تاريخ الاستحقاق:</span>
              <span>{dueDate ? formatDate(dueDate) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة:</span>
              <span>{statusLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">العملة:</span>
              <span>{currency}</span>
            </div>
          </div>

          {/* بيانات الطرف */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{partyLabel}:</span>
              <span className="font-medium">{partyName}</span>
            </div>
            {partyId && partyId !== partyName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرمز:</span>
                <span className="font-mono text-xs">{partyId}</span>
              </div>
            )}
            {addressDisplay && (
              <div className="text-xs text-muted-foreground mt-1 max-w-[14rem]">{addressDisplay}</div>
            )}
          </div>
        </div>

        {/* جدول البنود */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-foreground/20">
                <th className="py-2 px-2 text-right font-semibold">#</th>
                <th className="py-2 px-2 text-right font-semibold">الصنف</th>
                <th className="py-2 px-2 text-right font-semibold">الوصف</th>
                <th className="py-2 px-2 text-center font-semibold">الكمية</th>
                <th className="py-2 px-2 text-right font-semibold">السعر</th>
                <th className="py-2 px-2 text-right font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-border/40">
                  <td className="py-2 px-2 text-muted-foreground text-xs">{item.idx ?? idx + 1}</td>
                  <td className="py-2 px-2 font-mono text-xs">{item.item_code ?? ''}</td>
                  <td className="py-2 px-2 text-xs max-w-[12rem] truncate">
                    {item.item_name || item.description || ''}
                  </td>
                  <td className="py-2 px-2 text-center tabular-nums">
                    {Number(item.qty ?? 0).toLocaleString('ar-YE')}
                    {item.uom ? <span className="text-muted-foreground text-[10px] mr-1">{item.uom}</span> : null}
                  </td>
                  <td className="py-2 px-2 text-left tabular-nums font-mono text-xs">
                    {formatCurrency(Number(item.rate ?? 0), currency)}
                  </td>
                  <td className="py-2 px-2 text-left tabular-nums font-mono text-xs font-medium">
                    {formatCurrency(Number(item.amount ?? 0), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ملخص المبالغ */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي:</span>
              <span className="tabular-nums font-mono">{formatCurrency(subtotal, currency)}</span>
            </div>

            {taxes.length > 0 && taxes.map((tax, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-muted-foreground text-xs">{tax.description || 'ضريبة'}:</span>
                <span className="tabular-nums font-mono text-xs">{formatCurrency(Number(tax.tax_amount ?? 0), currency)}</span>
              </div>
            ))}

            {totalTax > 0 && taxes.length === 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الضريبة:</span>
                <span className="tabular-nums font-mono">{formatCurrency(totalTax, currency)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>الخصم:</span>
                <span className="tabular-nums font-mono">-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>الإجمالي:</span>
              <span className="tabular-nums font-mono">{formatCurrency(displayTotal, currency)}</span>
            </div>

            {changeAmount > 0.005 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>الباقي:</span>
                <span className="tabular-nums font-mono">{formatCurrency(changeAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* وسائل الدفع */}
        {payments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-2">وسائل الدفع</h3>
            <div className="space-y-1 text-xs">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between max-w-xs">
                  <span className="text-muted-foreground">{p.mode_of_payment || '—'}:</span>
                  <span className="tabular-nums font-mono">{formatCurrency(Number(p.amount ?? 0), currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ملاحظات */}
        {String(doc?.terms ?? '').trim() && (
          <div className="mb-8 border-t pt-4">
            <h3 className="text-sm font-semibold mb-1">الشروط والأحكام</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {String(doc.terms).trim()}
            </p>
          </div>
        )}

        {/* مكان رمز QR (ZATCA مستقبلاً) */}
        <div className="mt-8 pt-4 border-t flex justify-center">
          <div className="border-2 border-dashed border-border/40 rounded-lg w-24 h-24 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground text-center">مكان رمز QR<br/>(ZATCA)</span>
          </div>
        </div>

        {/* تذييل */}
        <div className="mt-6 text-center text-[10px] text-muted-foreground">
          أُنشئت آلياً بواسطة نظام نقاط البيع — {new Date().toLocaleDateString('ar-YE')}
        </div>
      </div>

      {/* ── أنماط الطباعة ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:bg-white,
          .print\\:bg-white * {
            visibility: visible;
          }
          .print\\:bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}

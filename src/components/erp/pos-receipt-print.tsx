'use client';

import { useDoc } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/core/helpers';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2 } from 'lucide-react';
import { useDefaultCompanyName } from '@/lib/erp/default-company';

/* ──────────────────────────────────────────────
   أنواع
   ────────────────────────────────────────────── */

export type PosReceiptPrintProps = {
  /** اسم مستند POS Invoice */
  docname: string;
  /** عند الإغلاق */
  onClose: () => void;
};

/** صف بند */
type ItemRow = {
  item_code?: string;
  item_name?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  uom?: string;
};

/** صف دفع */
type PaymentRow = {
  mode_of_payment?: string;
  amount?: number;
};

/* ──────────────────────────────────────────────
   مكون إيصال نقطة البيع الحراري
   ────────────────────────────────────────────── */

export function PosReceiptPrint({ docname, onClose }: PosReceiptPrintProps) {
  const { company: defaultCompany } = useDefaultCompanyName();
  const { data: doc, isLoading, isError, error } = useDoc<Record<string, unknown>>('POS Invoice', docname);

  /* ── استخراج البيانات ── */
  const items = (Array.isArray(doc?.items) ? doc.items : []) as ItemRow[];
  const payments = (Array.isArray(doc?.payments) ? doc.payments : []) as PaymentRow[];

  const companyName = String(doc?.company ?? defaultCompany ?? '');
  const invoiceNo = String(doc?.name ?? '');
  const postingDate = String(doc?.posting_date ?? '');
  const postingTime = String(doc?.posting_time ?? '');
  const currency = String(doc?.currency ?? 'YER');

  const customerName = String(doc?.customer_name ?? doc?.customer ?? '');
  const cashierName = String(doc?.owner ?? '');

  const subtotal = Number(doc?.total ?? doc?.net_total ?? 0);
  const totalTax = Number(doc?.total_taxes_and_charges ?? 0);
  const discountAmount = Number(doc?.discount_amount ?? doc?.additional_discount_amount ?? 0);
  const grandTotal = Number(doc?.grand_total ?? 0);
  const roundedTotal = Number(doc?.rounded_total ?? 0);
  const displayTotal = roundedTotal > 0 ? roundedTotal : grandTotal;
  const changeAmount = Number(doc?.change_amount ?? 0);
  const taxId = String(doc?.tax_id ?? '');

  const isReturn = Number(doc?.is_return) === 1;

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
          <p className="text-sm text-muted-foreground">جارٍ تحميل الإيصال…</p>
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div dir="rtl" className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-destructive">
            {(error as Error)?.message || 'تعذر تحميل الإيصال'}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     عرض الإيصال — عرض 80 مم
     ════════════════════════════════════════════ */
  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-background print:bg-white">
      {/* ── شريط التحكم (يختفي عند الطباعة) ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            طباعة إيصال
          </Button>
          <span className="text-xs text-muted-foreground font-mono">{invoiceNo}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── محتوى الإيصال ── */}
      <div className="receipt-container max-w-[80mm] mx-auto p-3 print:p-2 print:max-w-none font-mono text-[11px] leading-snug">
        {/* ── رأس الإيصال ── */}
        <div className="text-center mb-3">
          <h1 className="text-sm font-bold mb-0.5">{companyName}</h1>
          {taxId && (
            <p className="text-[9px] text-muted-foreground">الرقم الضريبي: {taxId}</p>
          )}
          <div className="border-b border-dashed border-foreground/30 mt-2" />
        </div>

        {/* ── معلومات الفاتورة ── */}
        <div className="space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>رقم الفاتورة:</span>
            <span className="font-bold">{invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span>التاريخ:</span>
            <span>{postingDate} {postingTime}</span>
          </div>
          <div className="flex justify-between">
            <span>الكاشير:</span>
            <span>{cashierName}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span>العميل:</span>
              <span>{customerName}</span>
            </div>
          )}
          {isReturn && (
            <div className="text-center font-bold text-destructive mt-1">
              *** إيصال مرتجع ***
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-foreground/30 my-2" />

        {/* ── بنود الإيصال ── */}
        <div className="space-y-1.5 mb-2">
          {items.map((item, idx) => {
            const qty = Number(item.qty ?? 0);
            const rate = Number(item.rate ?? 0);
            const amount = Number(item.amount ?? qty * rate);
            return (
              <div key={idx} className="space-y-0">
                <div className="font-medium truncate">{item.item_name || item.item_code || ''}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {qty.toLocaleString('en-US')} × {formatCurrency(rate, currency)}
                  </span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCurrency(amount, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-b border-dashed border-foreground/30 my-2" />

        {/* ── ملخص المبالغ ── */}
        <div className="space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
          </div>

          {totalTax > 0 && (
            <div className="flex justify-between">
              <span>الضريبة:</span>
              <span className="tabular-nums">{formatCurrency(totalTax, currency)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>الخصم:</span>
              <span className="tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-foreground/30 my-1" />

        <div className="flex justify-between font-bold text-sm py-1">
          <span>الإجمالي:</span>
          <span className="tabular-nums">{formatCurrency(displayTotal, currency)}</span>
        </div>

        {changeAmount > 0.005 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>الباقي:</span>
            <span className="tabular-nums">{formatCurrency(changeAmount, currency)}</span>
          </div>
        )}

        <div className="border-b border-dashed border-foreground/30 my-2" />

        {/* ── وسائل الدفع ── */}
        {payments.length > 0 && (
          <div className="space-y-0.5 mb-2">
            <div className="text-center font-semibold text-[10px] mb-1">وسائل الدفع</div>
            {payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{p.mode_of_payment || '—'}</span>
                <span className="tabular-nums">{formatCurrency(Number(p.amount ?? 0), currency)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-b border-dashed border-foreground/30 my-2" />

        {/* ── تذييل ── */}
        <div className="text-center space-y-1 mt-2">
          <p className="font-semibold text-xs">شكراً لزيارتكم</p>
          <p className="text-[9px] text-muted-foreground">نتمنى لكم يوماً سعيداً</p>
          <p className="text-[8px] text-muted-foreground mt-2">
            {new Date().toLocaleDateString('en-US')} — نظام نقاط البيع
          </p>
        </div>

        {/* مكان QR (ZATCA مستقبلاً) */}
        <div className="flex justify-center mt-3">
          <div className="border border-dashed border-border/50 rounded w-16 h-16 flex items-center justify-center">
            <span className="text-[7px] text-muted-foreground text-center leading-tight">QR<br/>ZATCA</span>
          </div>
        </div>
      </div>

      {/* ── أنماط الطباعة للإيصال الحراري ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container,
          .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 2mm;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

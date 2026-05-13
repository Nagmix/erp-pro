import { formatCurrency } from '@/lib/core/helpers';

/** لقطة إيصال بعد ترحيل فاتورة نقطة البيع — للطباعة أو المعاينة. */
export type PosReceiptSnapshot = {
  invoiceName: string;
  at: string;
  lines: { name: string; code: string; qty: number; rate: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerId: string;
  paymentLabel: string;
  company: string;
  /** باقٍ نقدي للعميل إن احتسبته ERPNext بعد الترحيل */
  changeAmount?: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML إيصال حراري/عادي (عرض RTL) — §11.1 / طباعة المتصفح.
 * يُمرَّر `includePrintScript` لبدء حوار الطباعة تلقائياً بعد الفتح.
 */
export function buildPosReceiptHtml(
  r: PosReceiptSnapshot,
  opts?: { includePrintScript?: boolean }
): string {
  const rows = r.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)}</td><td dir="rtl">${escapeHtml(l.code)}</td><td>${l.qty}</td><td>${escapeHtml(formatCurrency(l.lineTotal))}</td></tr>`
    )
    .join('');
  const script =
    opts?.includePrintScript !== false
      ? '<script>window.onload=function(){window.print();}</script>'
      : '';
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>إيصال ${escapeHtml(r.invoiceName)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:16px;font-size:12px;}
        table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #ddd;padding:4px;text-align:right}
        .num{direction:rtl;text-align:right;font-variant-numeric:tabular-nums}
        @media print{@page{size:80mm auto;margin:4mm}}
      </style></head><body>
      <h2 style="margin:0 0 8px;font-size:14px;">إيصال بيع</h2>
      <p style="margin:0;font-size:11px;color:#555">${escapeHtml(r.company)} · ${escapeHtml(r.invoiceName)}</p>
      <p style="margin:4px 0;font-size:11px;">${escapeHtml(new Date(r.at).toLocaleString('en-US'))}</p>
      <p style="margin:4px 0;"><b>العميل:</b> ${escapeHtml(r.customerId)}</p>
      <p style="margin:4px 0;"><b>الدفع:</b> ${escapeHtml(r.paymentLabel)}</p>
      <table><thead><tr><th>الصنف</th><th>كود</th><th>كمية</th><th>المبلغ</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:8px;"><b>الفرعي:</b> <span class="num">${escapeHtml(formatCurrency(r.subtotal))}</span></p>
      <p><b>الضريبة:</b> <span class="num">${escapeHtml(formatCurrency(r.tax))}</span></p>
      <p><b>خصم:</b> <span class="num">${escapeHtml(formatCurrency(r.discount))}</span></p>
      ${
        r.changeAmount != null && r.changeAmount > 0.005
          ? `<p><b>الباقي:</b> <span class="num">${escapeHtml(formatCurrency(r.changeAmount))}</span></p>`
          : ''
      }
      <p style="font-size:16px;font-weight:bold;"><b>الإجمالي:</b> <span class="num">${escapeHtml(formatCurrency(r.total))}</span></p>
      ${script}
      </body></html>`;
}

/** بناء لقطة إيصال من مستند POS Invoice محمّل من ERPNext (للطباعة من صفحة التفاصيل). */
export function posInvoiceDocToReceiptSnapshot(
  doc: Record<string, unknown>,
  companyDisplay: string
): PosReceiptSnapshot {
  const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
  const rawPay = Array.isArray(doc.payments) ? (doc.payments as Record<string, unknown>[]) : [];

  const lines = rawItems.map((row) => {
    const qty = Number(row.qty ?? 0);
    const rate = Number(row.rate ?? 0);
    const amount = Number(row.amount ?? qty * rate);
    return {
      name: String(row.item_name ?? row.item_code ?? ''),
      code: String(row.item_code ?? ''),
      qty,
      rate,
      lineTotal: amount,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Number(doc.total_taxes_and_charges ?? 0);
  const discount = Number(doc.discount_amount ?? doc.additional_discount_amount ?? 0);
  const total = Number(doc.rounded_total ?? doc.grand_total ?? 0);

  const paymentLabel = rawPay.length
    ? rawPay
        .map((p) => {
          const mode = String(p.mode_of_payment ?? '').trim();
          const amt = Number(p.amount ?? 0);
          return mode ? `${mode} ${formatCurrency(amt)}` : '';
        })
        .filter(Boolean)
        .join(' · ')
    : '—';

  const posting = typeof doc.posting_date === 'string' ? `${doc.posting_date}T12:00:00` : undefined;

  const changeRaw = Number(doc.change_amount ?? 0);
  const changeAmount = Number.isFinite(changeRaw) && changeRaw > 0.005 ? changeRaw : undefined;

  return {
    invoiceName: String(doc.name ?? ''),
    at: posting ?? new Date().toISOString(),
    lines,
    subtotal,
    tax,
    discount,
    total,
    customerId: String(doc.customer_name ?? doc.customer ?? ''),
    paymentLabel,
    company: companyDisplay || String(doc.company ?? ''),
    ...(changeAmount != null ? { changeAmount } : {}),
  };
}

/** أسطر نصية لوحة ESC/POS البسيطة (عرض عربي محدود — أرقام لاتينية). */
export function buildPosEscPosReceiptLines(r: PosReceiptSnapshot): string[] {
  const tail =
    r.changeAmount != null && r.changeAmount > 0.005
      ? [`الباقي ${r.changeAmount.toFixed(2)}`, `الإجمالي ${r.total.toFixed(2)}`]
      : [`الإجمالي ${r.total.toFixed(2)}`];
  return [
    '--- إيصال بيع ---',
    r.invoiceName,
    r.at,
    `العميل: ${r.customerId}`,
    `الدفع: ${r.paymentLabel}`,
    ...r.lines.map((l) => `${l.code} x${l.qty} ${l.lineTotal.toFixed(2)}`),
    ...tail,
  ];
}

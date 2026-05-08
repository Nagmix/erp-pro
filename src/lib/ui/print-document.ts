/**
 * print-document.ts — أداة طباعة المستندات
 * يأخذ نوع المستند واسمه، يجلب البيانات، ويفتح نافذة الطباعة بتنسيق نظيف
 */

const DOCTYPE_AR_MAP: Record<string, string> = {
  'Sales Invoice': 'فاتورة مبيعات',
  'Purchase Invoice': 'فاتورة مشتريات',
  'Payment Entry': 'سند دفع',
  'Journal Entry': 'قيد يومي',
  'Sales Order': 'أمر بيع',
  'Purchase Order': 'أمر شراء',
  'Quotation': 'عرض سعر',
  'Expense Claim': 'مطالبة مصروفات',
  'Delivery Note': 'إشعار تسليم',
  'Purchase Receipt': 'إيصال استلام',
  'Salary Slip': 'قسيمة راتب',
};

function getDefaultTemplate(doctype: string): string {
  const arName = DOCTYPE_AR_MAP[doctype] || doctype;
  return `
<div style="font-family: system-ui, sans-serif; direction: rtl; padding: 24px; color: #111; max-width: 800px; margin: 0 auto;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1 style="margin: 0; font-size: 20px; color: #2563eb;">${arName}</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #666;">رقم المستند: <strong>{{ doc.name }}</strong></p>
    </div>
    <div style="text-align: left;">
      <p style="margin: 0; font-size: 12px; color: #666;">التاريخ: {{ doc.posting_date }}</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #666;">الحالة: {{ doc.status }}</p>
    </div>
  </div>

  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex: 1;">
      <h3 style="margin: 0 0 8px; font-size: 13px; color: #2563eb;">معلومات الطرف</h3>
      <p style="margin: 0; font-size: 12px;">{{ doc.customer_name or doc.supplier_name or doc.party_name or '' }}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background: #f1f5f9;">
        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right; font-size: 11px;">الصنف</th>
        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 11px;">الكمية</th>
        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 11px;">السعر</th>
        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: left;">
    <p style="margin: 4px 0; font-size: 13px;">الإجمالي: <strong>{{ doc.grand_total or doc.total_debit or '' }}</strong></p>
  </div>

  <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #999; text-align: center;">
    تم إنشاؤه بواسطة نظام ERP Pro
  </div>
</div>`;
}

/** Fetches document data from ERPNext API */
async function fetchDocument(doctype: string, name: string): Promise<Record<string, unknown> | null> {
  try {
    const sid = localStorage.getItem('erp_session');
    const baseUrl = process.env.NEXT_PUBLIC_ERP_URL || '';
    const url = baseUrl
      ? `${baseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      : `/api/erp/proxy/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;

    const res = await fetch(url, {
      headers: sid ? { Cookie: `sid=${sid}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** Replaces template variables with document data */
function renderTemplate(html: string, doc: Record<string, unknown>): string {
  let result = html;
  result = result.replace(/\{\{\s*doc\.(\w+)\s*\}\}/gi, (_match, field) => {
    const val = doc[field];
    if (val === null || val === undefined) return '';
    return String(val);
  });
  result = result.replace(/\{%[\s\S]*?%\}/g, '');
  result = result.replace(/<tr>\s*<\/tr>/g, '');
  return result;
}

export interface PrintOptions {
  doctype: string;
  name: string;
  template?: string;
  title?: string;
}

/** Opens a print dialog with formatted document */
export async function printDocument(options: PrintOptions): Promise<void> {
  const { doctype, name, template, title } = options;

  const doc = await fetchDocument(doctype, name);
  if (!doc) {
    throw new Error(`تعذر جلب المستند: ${doctype} ${name}`);
  }

  const htmlTemplate = template || getDefaultTemplate(doctype);
  const renderedContent = renderTemplate(htmlTemplate, doc);
  const printTitle = title || `${DOCTYPE_AR_MAP[doctype] || doctype} - ${name}`;

  const printHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${printTitle}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: system-ui, -apple-system, sans-serif; direction: rtl; margin: 0; padding: 20px; color: #111; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: right; }
    th { background: #f8fafc; font-size: 11px; }
    .print-header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${renderedContent}
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}

/** Quick print using ERPNext Print Format API */
export async function printWithERPFormat(doctype: string, name: string, format?: string): Promise<void> {
  try {
    const sid = localStorage.getItem('erp_session');
    const baseUrl = process.env.NEXT_PUBLIC_ERP_URL || '';
    const params = new URLSearchParams({
      doctype,
      name,
      format: format || 'Standard',
      no_letterhead: '1',
    });
    const url = baseUrl
      ? `${baseUrl}/api/method/frappe.www.printview.get_html?${params}`
      : `/api/erp/proxy/method/frappe.www.printview.get_html?${params}`;

    const res = await fetch(url, {
      headers: sid ? { Cookie: `sid=${sid}` } : {},
      credentials: 'include',
    });
    if (!res.ok) throw new Error('فشل جلب قالب الطباعة');
    const json = await res.json();
    const html = json.message || json.html || '';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${name}</title><style>@page{size:A4;margin:15mm;}body{font-family:system-ui,sans-serif;direction:rtl;margin:0;padding:20px;}@media print{body{padding:0;}}</style></head><body>${html}</body></html>`);
      printWindow.document.close();
    }
  } catch {
    await printDocument({ doctype, name });
  }
}

export { getDefaultTemplate, DOCTYPE_AR_MAP };

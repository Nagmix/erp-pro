'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Label } from '@/components/ui/label';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDocList } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/core/helpers';

type InvoiceRow = { name: string; customer?: string; posting_date?: string; grand_total?: number; outstanding_amount?: number; status?: string };
type QuoteRow = { name: string; party_name?: string; transaction_date?: string; status?: string };
const invCols: Column<InvoiceRow>[] = [
  { key: 'name', header: 'الفاتورة' },
  { key: 'posting_date', header: 'التاريخ' },
  { key: 'grand_total', header: 'الإجمالي', render: (v) => <span className="tabular-nums font-medium">{formatCurrency(Number(v) || 0)}</span> },
  { key: 'outstanding_amount', header: 'المتبقي', render: (v) => <span className="tabular-nums">{formatCurrency(Number(v) || 0)}</span> },
  { key: 'status', header: 'الحالة' },
];
const qCols: Column<QuoteRow>[] = [
  { key: 'name', header: 'العرض' },
  { key: 'transaction_date', header: 'التاريخ' },
  { key: 'status', header: 'الحالة' },
];

export default function CrmPortalPage() {
  const [customer, setCustomer] = useState('');
  const invoices = useDocList<InvoiceRow>('Sales Invoice', {
    fields: ['name', 'customer', 'posting_date', 'grand_total', 'outstanding_amount', 'status'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'posting_date desc',
  });
  const quotes = useDocList<QuoteRow>('Quotation', {
    fields: ['name', 'party_name', 'transaction_date', 'status'],
    filters: customer ? [['party_name', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
  });

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="بوابة العميل"
        description="عرض مستندات العميل داخلياً لحين تفعيل البوابة الذاتية الكاملة"
        iconify="solar:user-id-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'بوابة العميل' }]}
      />

      <div className="max-w-md">
        <Label className="text-xs">اختر عميل</Label>
        <ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-2">فواتير العميل</h2>
          <ListQueryAlert error={invoices.isError ? invoices.error : null} onRetry={() => invoices.refetch()} />
          <DataTable data={invoices.data || []} columns={invCols} searchable loading={invoices.isLoading} />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-2">عروض الأسعار</h2>
          <ListQueryAlert error={quotes.isError ? quotes.error : null} onRetry={() => quotes.refetch()} />
          <DataTable data={quotes.data || []} columns={qCols} searchable loading={quotes.isLoading} />
        </div>
      </div>
    </div>
  );
}

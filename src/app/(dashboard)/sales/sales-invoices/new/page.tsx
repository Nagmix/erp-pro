import { SalesInvoiceNewEditor } from '@/app/(dashboard)/accounting/sales-invoice/new/sales-invoice-new-editor';

export default function SalesInvoicesNewPage() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col" dir="rtl">
      <SalesInvoiceNewEditor />
    </div>
  );
}

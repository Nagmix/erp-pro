'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { StatusBadge } from '@/components/erp/status-badge';
import { useDocList, useDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Receipt,
  ShoppingCart,
  Truck,
  Target,
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  AlertCircle,
} from 'lucide-react';

/* ── Types ── */
type CustomerDoc = {
  name: string;
  customer_name?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  territory?: string;
  customer_group?: string;
  customer_type?: string;
};

type InvoiceRow = {
  name: string;
  customer?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
  currency?: string;
};

type QuoteRow = {
  name: string;
  party_name?: string;
  transaction_date?: string;
  valid_till?: string;
  status?: string;
  grand_total?: number;
  currency?: string;
};

type OrderRow = {
  name: string;
  customer?: string;
  transaction_date?: string;
  delivery_date?: string;
  grand_total?: number;
  status?: string;
  currency?: string;
};

type DeliveryRow = {
  name: string;
  customer?: string;
  posting_date?: string;
  grand_total?: number;
  status?: string;
  currency?: string;
};

type OpportunityRow = {
  name: string;
  party_name?: string;
  customer_name?: string;
  status?: string;
  transaction_date?: string;
  expected_closing?: string;
  opportunity_amount?: number;
  currency?: string;
};

/* ── Column Definitions ── */
const invCols: Column<InvoiceRow>[] = [
  {
    key: 'name',
    header: 'رقم الفاتورة',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  { key: 'posting_date', header: 'تاريخ الإصدار', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  { key: 'due_date', header: 'تاريخ الاستحقاق', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  {
    key: 'grand_total',
    header: 'الإجمالي',
    render: (v) => <span className="tabular-nums font-medium text-xs">{formatCurrency(Number(v) || 0)}</span>,
  },
  {
    key: 'outstanding_amount',
    header: 'المتبقي',
    render: (v) => {
      const val = Number(v) || 0;
      return (
        <span className={`tabular-nums text-xs ${val > 0 ? 'text-destructive font-semibold' : 'text-emerald-600'}`}>
          {formatCurrency(val)}
        </span>
      );
    },
  },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
];

const qCols: Column<QuoteRow>[] = [
  {
    key: 'name',
    header: 'رقم العرض',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  { key: 'transaction_date', header: 'التاريخ', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  { key: 'valid_till', header: 'صالح حتى', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  {
    key: 'grand_total',
    header: 'الإجمالي',
    render: (v) => <span className="tabular-nums font-medium text-xs">{formatCurrency(Number(v) || 0)}</span>,
  },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
];

const orderCols: Column<OrderRow>[] = [
  {
    key: 'name',
    header: 'رقم الطلب',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  { key: 'transaction_date', header: 'التاريخ', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  { key: 'delivery_date', header: 'تاريخ التسليم', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  {
    key: 'grand_total',
    header: 'الإجمالي',
    render: (v) => <span className="tabular-nums font-medium text-xs">{formatCurrency(Number(v) || 0)}</span>,
  },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
];

const delCols: Column<DeliveryRow>[] = [
  {
    key: 'name',
    header: 'رقم الإشعار',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  { key: 'posting_date', header: 'التاريخ', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  {
    key: 'grand_total',
    header: 'الإجمالي',
    render: (v) => <span className="tabular-nums font-medium text-xs">{formatCurrency(Number(v) || 0)}</span>,
  },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
];

const oppCols: Column<OpportunityRow>[] = [
  {
    key: 'name',
    header: 'رقم الفرصة',
    render: (v) => <span className="text-xs font-medium text-primary">{String(v)}</span>,
  },
  {
    key: 'customer_name',
    header: 'العميل',
    render: (_, r) => <span className="text-xs font-medium">{r.customer_name || r.party_name || '—'}</span>,
  },
  { key: 'transaction_date', header: 'التاريخ', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  {
    key: 'opportunity_amount',
    header: 'المبلغ',
    render: (v) => <span className="tabular-nums text-xs">{formatCurrency(Number(v) || 0)}</span>,
  },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
];

/* ── Customer Info Card ── */
function CustomerInfoCard({ customer }: { customer: CustomerDoc | null }) {
  if (!customer) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">اختر عميلاً لعرض بياناته ومستنداته</p>
          <p className="text-xs text-muted-foreground/70 mt-1">استخدم حقل الاختيار أعلاه لتحديد العميل</p>
        </CardContent>
      </Card>
    );
  }

  const infoItems = [
    { icon: Mail, label: 'البريد الإلكتروني', value: customer.email_id },
    { icon: Phone, label: 'الهاتف', value: customer.mobile_no || customer.phone },
    { icon: MapPin, label: 'المنطقة', value: customer.territory },
    { icon: Users, label: 'المجموعة', value: customer.customer_group },
  ];

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="bg-gradient-to-l from-primary/[0.06] via-transparent to-transparent px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">{customer.customer_name || customer.name}</h3>
            <p className="text-[11px] text-muted-foreground" dir="ltr">{customer.name}</p>
          </div>
          {customer.customer_type && (
            <Badge variant="outline" className="ms-auto text-[10px] border-0 bg-primary/10 text-primary shrink-0">
              {customer.customer_type === 'Company' ? 'شركة' : 'فرد'}
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-4">
          {infoItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px]">{item.label}</span>
              </div>
              <p className="text-xs font-medium truncate" dir={item.icon === Mail ? 'ltr' : undefined}>
                {item.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Page ── */
export default function CrmPortalPage() {
  const [customer, setCustomer] = useState('');
  const [tab, setTab] = useState('invoices');

  /* Fetch customer details */
  const { data: customerDoc, isLoading: custLoading } = useDoc<CustomerDoc>('Customer', customer, {
    enabled: Boolean(customer),
  });

  /* Fetch related documents */
  const invoices = useDocList<InvoiceRow>('Sales Invoice', {
    fields: ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'currency'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'posting_date desc',
    enabled: Boolean(customer),
  });

  const quotes = useDocList<QuoteRow>('Quotation', {
    fields: ['name', 'party_name', 'transaction_date', 'valid_till', 'status', 'grand_total', 'currency'],
    filters: customer ? [['party_name', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
    enabled: Boolean(customer),
  });

  const orders = useDocList<OrderRow>('Sales Order', {
    fields: ['name', 'customer', 'transaction_date', 'delivery_date', 'grand_total', 'status', 'currency'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
    enabled: Boolean(customer),
  });

  const deliveries = useDocList<DeliveryRow>('Delivery Note', {
    fields: ['name', 'customer', 'posting_date', 'grand_total', 'status', 'currency'],
    filters: customer ? [['customer', '=', customer]] : [],
    limit: 200,
    order_by: 'posting_date desc',
    enabled: Boolean(customer),
  });

  const opportunities = useDocList<OpportunityRow>('Opportunity', {
    fields: ['name', 'party_name', 'customer_name', 'status', 'transaction_date', 'expected_closing', 'opportunity_amount', 'currency'],
    filters: customer ? [['party_name', '=', customer]] : [],
    limit: 200,
    order_by: 'transaction_date desc',
    enabled: Boolean(customer),
  });

  /* KPI calculations */
  const invoiceData = invoices.data || [];
  const quoteData = quotes.data || [];
  const orderData = orders.data || [];
  const deliveryData = deliveries.data || [];
  const oppData = opportunities.data || [];

  const totalOutstanding = useMemo(
    () => invoiceData.reduce((sum, inv) => sum + (Number(inv.outstanding_amount) || 0), 0),
    [invoiceData],
  );

  const openOpportunities = useMemo(
    () => oppData.filter((o) => o.status === 'Open' || o.status === 'Replied').length,
    [oppData],
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="بوابة العميل"
        description="عرض مستندات العميل داخلياً لحين تفعيل البوابة الذاتية الكاملة — اختر عميلاً لاستعراض كامل ملفه"
        iconify="solar:user-id-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'بوابة العميل' }]}
      />

      {/* Customer selector */}
      <div className="max-w-md">
        <Label className="text-xs font-semibold mb-1.5 block">اختر عميل</Label>
        <ErpLinkCombobox doctype="Customer" value={customer} onChange={setCustomer} displayKey="customer_name" />
      </div>

      {/* Customer info card */}
      <CustomerInfoCard customer={customerDoc ?? null} />

      {/* Tabs for document types */}
      {customer ? (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="invoices" className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5" />
              الفواتير ({invoiceData.length})
            </TabsTrigger>
            <TabsTrigger value="quotations" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              عروض الأسعار ({quoteData.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-xs">
              <ShoppingCart className="h-3.5 w-3.5" />
              أوامر البيع ({orderData.length})
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-1.5 text-xs">
              <Truck className="h-3.5 w-3.5" />
              إشعارات التسليم ({deliveryData.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              الفرص ({oppData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <ListQueryAlert error={invoices.isError ? invoices.error : null} onRetry={() => invoices.refetch()} />
            <DataTable
              data={invoiceData}
              columns={invCols}
              searchable
              loading={invoices.isLoading || custLoading}
              tableId="crm-portal-invoices"
              exportFileName={`فواتير_${customer}`}
            />
          </TabsContent>

          <TabsContent value="quotations">
            <ListQueryAlert error={quotes.isError ? quotes.error : null} onRetry={() => quotes.refetch()} />
            <DataTable
              data={quoteData}
              columns={qCols}
              searchable
              loading={quotes.isLoading || custLoading}
              tableId="crm-portal-quotes"
              exportFileName={`عروض_${customer}`}
            />
          </TabsContent>

          <TabsContent value="orders">
            <ListQueryAlert error={orders.isError ? orders.error : null} onRetry={() => orders.refetch()} />
            <DataTable
              data={orderData}
              columns={orderCols}
              searchable
              loading={orders.isLoading || custLoading}
              tableId="crm-portal-orders"
              exportFileName={`أوامر_بيع_${customer}`}
            />
          </TabsContent>

          <TabsContent value="deliveries">
            <ListQueryAlert error={deliveries.isError ? deliveries.error : null} onRetry={() => deliveries.refetch()} />
            <DataTable
              data={deliveryData}
              columns={delCols}
              searchable
              loading={deliveries.isLoading || custLoading}
              tableId="crm-portal-deliveries"
              exportFileName={`تسليمات_${customer}`}
            />
          </TabsContent>

          <TabsContent value="opportunities">
            <ListQueryAlert error={opportunities.isError ? opportunities.error : null} onRetry={() => opportunities.refetch()} />
            <DataTable
              data={oppData}
              columns={oppCols}
              searchable
              loading={opportunities.isLoading || custLoading}
              tableId="crm-portal-opportunities"
              exportFileName={`فرص_${customer}`}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed border-border/60 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">لا يوجد عميل محدد</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              اختر عميلاً من القائمة أعلاه لاستعراض فواتيره وعروض أسعاره وأوامر بيعه وتسليماته وفرصه
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

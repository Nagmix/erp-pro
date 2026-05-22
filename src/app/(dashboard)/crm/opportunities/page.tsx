'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Target, Building2, Wallet, Calendar, TrendingUp, Eye, Pencil, Loader2 } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildOpportunityCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type OppRow = {
  name: string;
  party_name?: string;
  customer_name?: string;
  opportunity_from?: string;
  status?: string;
  transaction_date?: string;
  expected_closing?: string;
  opportunity_amount?: number;
  company?: string;
  contact_person?: string;
  no_of_employees?: string;
  industry?: string;
  source?: string;
  currency?: string;
};

type OppFullDoc = {
  name: string;
  party_name?: string;
  customer_name?: string;
  opportunity_from?: string;
  status?: string;
  transaction_date?: string;
  expected_closing?: string;
  opportunity_amount?: number;
  company?: string;
  contact_person?: string;
  contact_email?: string;
  contact_mobile?: string;
  no_of_employees?: string;
  industry?: string;
  source?: string;
  currency?: string;
  opportunity_type?: string;
  title?: string;
  creation?: string;
  modified?: string;
  owner?: string;
};

const OPP_STATUS_AR: Record<string, string> = {
  Open: 'مفتوح',
  Quotation: 'عرض سعر',
  Converted: 'تم التحويل',
  Lost: 'مفقود',
  Replied: 'تم الرد',
  Closed: 'مغلق',
};

const OPP_STATUS_COLORS: Record<string, string> = {
  Open: 'bg-chart-1/10 text-chart-1',
  Quotation: 'bg-chart-2/10 text-chart-2',
  Converted: 'bg-primary/10 text-primary',
  Lost: 'bg-destructive/10 text-destructive',
  Replied: 'bg-chart-5/10 text-chart-5',
  Closed: 'bg-muted text-muted-foreground',
};

const emptyForm = {
  opportunity_from: 'Lead',
  party_name: '',
  status: 'Open',
  expected_closing: '',
  opportunity_amount: '',
  currency: '',
  contact_person: '',
  no_of_employees: '',
  industry: '',
  source: '',
};

export default function OpportunitiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<OppRow | null>(null);
  const [viewingOpp, setViewingOpp] = useState<OppRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<OppRow>('Opportunity', {
    fields: ['name', 'party_name', 'customer_name', 'opportunity_from', 'status', 'transaction_date', 'expected_closing', 'opportunity_amount', 'company', 'contact_person', 'no_of_employees', 'industry', 'source'],
    filters: company ? [['company', '=', company]] : [],
    limit: 400,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Opportunity');
  const deleteMutation = useDeleteDoc('Opportunity');
  const updateMutation = useUpdateDoc('Opportunity');

  // Fetch full document for viewing
  const { data: viewDoc, isLoading: viewDocLoading } = useDoc<OppFullDoc>(
    'Opportunity',
    viewingOpp?.name || '',
    { enabled: viewDialogOpen && Boolean(viewingOpp?.name) }
  );

  const rows = data || [];

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter(r => r.status === statusFilter);
  }, [rows, statusFilter]);

  // ── KPIs ──
  const totalOpportunities = rows.length;
  const totalValue = rows.reduce((sum, r) => sum + (Number(r.opportunity_amount) || 0), 0);
  const openCount = rows.filter(r => r.status === 'Open').length;
  const convertedCount = rows.filter(r => r.status === 'Converted').length;
  const lostCount = rows.filter(r => r.status === 'Lost').length;
  const conversionRate = totalOpportunities > 0 ? Math.round((convertedCount / totalOpportunities) * 100) : 0;

  // ── Create handler ──
  const handleCreate = () => {
    if (!company) { toast.error('الشركة مطلوبة'); return; }
    if (!form.party_name) { toast.error('اختر عميلاً محتملاً أو عميلاً'); return; }
    const mapped = buildOpportunityCreate({
      opportunity_from: form.opportunity_from,
      party_name: form.party_name,
      company,
      status: form.status,
      expected_closing: form.expected_closing || undefined,
      opportunity_amount: form.opportunity_amount ? Number(form.opportunity_amount) : undefined,
      currency: form.currency || undefined,
    });
    // Add extra fields
    const doc = prepareFrappeDocForCreate(mapped);
    if (form.contact_person) doc.contact_person = form.contact_person;
    if (form.no_of_employees) doc.no_of_employees = form.no_of_employees;
    if (form.industry) doc.industry = form.industry;
    if (form.source) doc.source = form.source;
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء الفرصة');
        setDialogOpen(false);
        setForm(emptyForm);
        void refetch();
      },
      onError: () => toast.error('فشل الإنشاء — تحقق من الطرف والشركة'),
    });
  };

  // ── Edit handlers ──
  const openEditDialog = (row: OppRow) => {
    setSelected(row);
    setEditForm({
      opportunity_from: row.opportunity_from || 'Lead',
      party_name: row.party_name || '',
      status: row.status || 'Open',
      expected_closing: row.expected_closing || '',
      opportunity_amount: String(row.opportunity_amount ?? ''),
      currency: '',
      contact_person: row.contact_person || '',
      no_of_employees: row.no_of_employees || '',
      industry: row.industry || '',
      source: row.source || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    const doc: Record<string, unknown> = {
      status: editForm.status,
      expected_closing: editForm.expected_closing || undefined,
      opportunity_amount: editForm.opportunity_amount ? Number(editForm.opportunity_amount) : undefined,
      contact_person: editForm.contact_person || undefined,
      no_of_employees: editForm.no_of_employees || undefined,
      industry: editForm.industry || undefined,
      source: editForm.source || undefined,
    };
    if (editForm.currency) doc.currency = editForm.currency;
    updateMutation.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث الفرصة بنجاح');
          setEditDialogOpen(false);
          setSelected(null);
          void refetch();
        },
        onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
      }
    );
  };

  // ── View handler ──
  const openViewDialog = (row: OppRow) => {
    setViewingOpp(row);
    setViewDialogOpen(true);
  };

  // ── Delete handler ──
  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف الفرصة');
        setDeleteDialogOpen(false);
        setSelected(null);
        void refetch();
      },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  // ── Columns ──
  const columns: Column<OppRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'الرقم',
      width: 'w-32',
      render: (v) => <span className="text-xs text-primary font-medium">{String(v)}</span>,
    },
    {
      key: 'customer_name',
      header: 'الطرف',
      sortable: true,
      render: (_, r) => <span className="font-medium">{r.customer_name || r.party_name || '—'}</span>,
    },
    {
      key: 'opportunity_from',
      header: 'المصدر',
      width: 'w-28',
      render: (v) => (
        <Badge variant="outline" className="text-[10px] border-0 bg-muted/50">
          {String(v) === 'Lead' ? 'محتمل' : String(v) === 'Customer' ? 'عميل' : String(v || '—')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      width: 'w-28',
      render: (v) => {
        const status = String(v);
        return (
          <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5 border-0', OPP_STATUS_COLORS[status] || 'bg-muted text-muted-foreground')}>
            {OPP_STATUS_AR[status] || status}
          </Badge>
        );
      },
    },
    {
      key: 'opportunity_amount',
      header: 'المبلغ',
      width: 'w-36',
      sortable: true,
      render: (v) => {
        const amt = Number(v) || 0;
        if (amt > 0) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-semibold tabular-nums cursor-help" dir="ltr">
                    {formatCurrency(amt)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">قيمة الفرصة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-muted-foreground tabular-nums" dir="ltr">{formatCurrency(0)}</span>;
      },
    },
    {
      key: 'expected_closing',
      header: 'الإغلاق المتوقع',
      render: (v) => <span className="text-muted-foreground text-xs" dir="ltr">{String(v || '—')}</span>,
    },
    {
      key: 'company',
      header: 'الشركة',
      render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span>,
    },
  ], []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الفرص"
        description="إدارة الفرص البيعية وربطها بالعملاء المحتملين أو الحاليين ومتابعة قيمها وإغلاقها المتوقع"
        iconify="solar:target-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'الفرص' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />فرصة جديدة
          </Button>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      {/* ملخص خط المبيعات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'مفتوح', count: openCount, color: 'bg-chart-1', icon: Target },
          { label: 'تم التحويل', count: convertedCount, color: 'bg-chart-3', icon: TrendingUp },
          { label: 'مفقود', count: lostCount, color: 'bg-destructive', icon: Building2 },
          { label: 'إجمالي القيمة', count: null, color: 'bg-primary', icon: Wallet, value: formatCurrency(totalValue) },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-3 flex items-center gap-3">
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0', item.color)}>
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold tabular-nums">{item.value || item.count}</p>
            </div>
          </div>
        ))}
      </div>

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Open" className="text-xs">مفتوح</TabsTrigger>
              <TabsTrigger value="Quotation" className="text-xs">عرض سعر</TabsTrigger>
              <TabsTrigger value="Replied" className="text-xs">تم الرد</TabsTrigger>
              <TabsTrigger value="Converted" className="text-xs">تم التحويل</TabsTrigger>
              <TabsTrigger value="Lost" className="text-xs">مفقود</TabsTrigger>
              <TabsTrigger value="Closed" className="text-xs">مغلق</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          onView={(row) => openViewDialog(row)}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
          tableId="crm-opportunities"
          exportFileName="opportunities.csv"
          printTitle="الفرص"
        />
      </PageShell>

      {/* ════════════════════════════════════════════════════════
          Create Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <span>فرصة جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الفرصة البيعية</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Target className="h-3 w-3 text-warning" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">من</Label>
                    <Select dir="rtl" value={form.opportunity_from} onValueChange={(val) => setForm(p => ({ ...p, opportunity_from: val, party_name: '' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Lead">عميل محتمل</SelectItem>
                        <SelectItem value="Customer">عميل حالي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الطرف <span className="text-destructive text-xs">*</span></Label>
                    {form.opportunity_from === 'Lead' ? (
                      <ErpLinkCombobox doctype="Lead" value={form.party_name} onChange={(v) => setForm(p => ({ ...p, party_name: v }))} displayKey="lead_name" className="h-9" />
                    ) : (
                      <ErpLinkCombobox doctype="Customer" value={form.party_name} onChange={(v) => setForm(p => ({ ...p, party_name: v }))} displayKey="customer_name" className="h-9" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحالة</Label>
                    <Select dir="rtl" value={form.status} onValueChange={(val) => setForm(p => ({ ...p, status: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        {['Open', 'Quotation', 'Converted', 'Lost', 'Replied', 'Closed'].map(s => (
                          <SelectItem key={s} value={s}>{OPP_STATUS_AR[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إغلاق متوقع</Label>
                    <Input type="date" dir="ltr" value={form.expected_closing} onChange={(e) => setForm(p => ({ ...p, expected_closing: e.target.value }))} className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Wallet className="h-3 w-3 text-primary" /></span>
                  البيانات المالية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مبلغ الفرصة</Label>
                    <Input dir="ltr" type="number" value={form.opportunity_amount} onChange={(e) => setForm(p => ({ ...p, opportunity_amount: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العملة</Label>
                    <ErpLinkCombobox doctype="Currency" value={form.currency} onChange={(v) => setForm(p => ({ ...p, currency: v }))} placeholder="اختياري" className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-info" /></span>
                  تفاصيل إضافية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">شخص الاتصال</Label>
                    <Input value={form.contact_person} onChange={(e) => setForm(p => ({ ...p, contact_person: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">عدد الموظفين</Label>
                    <Select dir="rtl" value={form.no_of_employees} onValueChange={(val) => setForm(p => ({ ...p, no_of_employees: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                        <SelectItem value="500+">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الصناعة</Label>
                    <ErpLinkCombobox doctype="Industry Type" value={form.industry} onChange={(v) => setForm(p => ({ ...p, industry: v }))} placeholder="اختياري" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المصدر</Label>
                    <Select dir="rtl" value={form.source} onValueChange={(val) => setForm(p => ({ ...p, source: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Lead">عميل محتمل</SelectItem>
                        <SelectItem value="Customer">عميل حالي</SelectItem>
                        <SelectItem value="Campaign">حملة تسويقية</SelectItem>
                        <SelectItem value="Walk In">زيارة مباشرة</SelectItem>
                        <SelectItem value="Referral">إحالة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ الفرصة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Edit Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل الفرصة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل: {selected?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Target className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود الفرصة</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحالة</Label>
                    <Select dir="rtl" value={editForm.status} onValueChange={(val) => setEditForm(p => ({ ...p, status: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        {['Open', 'Quotation', 'Converted', 'Lost', 'Replied', 'Closed'].map(s => (
                          <SelectItem key={s} value={s}>{OPP_STATUS_AR[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">إغلاق متوقع</Label>
                    <Input type="date" dir="ltr" value={editForm.expected_closing} onChange={(e) => setEditForm(p => ({ ...p, expected_closing: e.target.value }))} className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Wallet className="h-3 w-3 text-primary" /></span>
                  البيانات المالية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مبلغ الفرصة</Label>
                    <Input dir="ltr" type="number" value={editForm.opportunity_amount} onChange={(e) => setEditForm(p => ({ ...p, opportunity_amount: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">العملة</Label>
                    <ErpLinkCombobox doctype="Currency" value={editForm.currency} onChange={(v) => setEditForm(p => ({ ...p, currency: v }))} placeholder="اختياري" className="h-9" />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-info" /></span>
                  تفاصيل إضافية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">شخص الاتصال</Label>
                    <Input value={editForm.contact_person} onChange={(e) => setEditForm(p => ({ ...p, contact_person: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">عدد الموظفين</Label>
                    <Select dir="rtl" value={editForm.no_of_employees} onValueChange={(val) => setEditForm(p => ({ ...p, no_of_employees: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                        <SelectItem value="500+">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الصناعة</Label>
                    <ErpLinkCombobox doctype="Industry Type" value={editForm.industry} onChange={(v) => setEditForm(p => ({ ...p, industry: v }))} placeholder="اختياري" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المصدر</Label>
                    <Select dir="rtl" value={editForm.source} onValueChange={(val) => setEditForm(p => ({ ...p, source: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Lead">عميل محتمل</SelectItem>
                        <SelectItem value="Customer">عميل حالي</SelectItem>
                        <SelectItem value="Campaign">حملة تسويقية</SelectItem>
                        <SelectItem value="Walk In">زيارة مباشرة</SelectItem>
                        <SelectItem value="Referral">إحالة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          View Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل الفرصة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{viewingOpp?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewDocLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          ) : viewDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* البيانات الأساسية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><Target className="h-3 w-3 text-success" /></span>
                    البيانات الأساسية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField icon={<Target className="h-3.5 w-3.5" />} label="كود الفرصة" value={viewDoc.name} dir="ltr" />
                    <DetailField icon={<Building2 className="h-3.5 w-3.5" />} label="الطرف" value={viewDoc.customer_name || viewDoc.party_name} />
                    <DetailField
                      icon={<Target className="h-3.5 w-3.5" />}
                      label="المصدر"
                      value={viewDoc.opportunity_from === 'Lead' ? 'عميل محتمل' : viewDoc.opportunity_from === 'Customer' ? 'عميل حالي' : viewDoc.opportunity_from}
                      badge
                      badgeClass="bg-muted/50"
                    />
                    <DetailField
                      icon={<Target className="h-3.5 w-3.5" />}
                      label="الحالة"
                      value={OPP_STATUS_AR[viewDoc.status || ''] || viewDoc.status}
                      badge
                      badgeClass={OPP_STATUS_COLORS[viewDoc.status || ''] || 'bg-muted text-muted-foreground'}
                    />
                    <DetailField icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ المعاملة" value={viewDoc.transaction_date} dir="ltr" />
                    <DetailField icon={<Calendar className="h-3.5 w-3.5" />} label="الإغلاق المتوقع" value={viewDoc.expected_closing} dir="ltr" />
                  </div>
                </div>
              </fieldset>

              {/* البيانات المالية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Wallet className="h-3 w-3 text-primary" /></span>
                    البيانات المالية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      label="مبلغ الفرصة"
                      value={viewDoc.opportunity_amount ? formatCurrency(Number(viewDoc.opportunity_amount)) : formatCurrency(0)}
                      highlight={Number(viewDoc.opportunity_amount) > 0}
                    />
                    <DetailField icon={<Wallet className="h-3.5 w-3.5" />} label="العملة" value={viewDoc.currency || 'YER'} />
                    <DetailField icon={<Building2 className="h-3.5 w-3.5" />} label="الشركة" value={viewDoc.company} />
                  </div>
                </div>
              </fieldset>

              {/* تفاصيل إضافية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-info" /></span>
                    تفاصيل إضافية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField label="شخص الاتصال" value={viewDoc.contact_person} />
                    <DetailField label="عدد الموظفين" value={viewDoc.no_of_employees} />
                    <DetailField label="الصناعة" value={viewDoc.industry} />
                    <DetailField label="المصدر" value={viewDoc.source} />
                  </div>
                </div>
              </fieldset>

              {/* معلومات النظام */}
              {viewDoc.creation && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-muted/20 flex items-center justify-center"><Calendar className="h-3 w-3 text-muted-foreground" /></span>
                      معلومات النظام
                    </h4>
                  </div>
                  <div className="p-4 space-y-3 bg-card/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField label="تاريخ الإنشاء" value={viewDoc.creation ? new Date(viewDoc.creation).toLocaleDateString('en-US') : '—'} />
                      <DetailField label="آخر تعديل" value={viewDoc.modified ? new Date(viewDoc.modified).toLocaleDateString('en-US') : '—'} />
                      <DetailField label="المُنشئ" value={viewDoc.owner || '—'} dir="ltr" />
                    </div>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تعذر تحميل بيانات الفرصة
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
            {viewingOpp && (
              <Button
                className="gap-1.5"
                onClick={() => {
                  setViewDialogOpen(false);
                  openEditDialog(viewingOpp);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Delete Confirmation
          ════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف الفرصة &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Reusable Detail Field component for View Dialog ─── */
function DetailField({
  icon,
  label,
  value,
  dir,
  badge,
  badgeClass,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  dir?: string;
  badge?: boolean;
  badgeClass?: string;
  highlight?: boolean;
}) {
  const displayValue = value || '—';
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {badge ? (
        <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5 border-0', badgeClass)}>
          {displayValue}
        </Badge>
      ) : (
        <p className={cn(
          'text-sm font-medium',
          highlight && 'text-destructive font-semibold',
          !value && 'text-muted-foreground',
        )} dir={dir}>
          {displayValue}
        </p>
      )}
    </div>
  );
}

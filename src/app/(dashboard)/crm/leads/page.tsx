'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  UserPlus,
  Building2,
  RefreshCw,
  Filter,
  X,
  Loader2,
  Users,
  Flame,
  Snowflake,
  Sun,
  ArrowRightLeft,
  Mail,
  Phone,
  MapPin,
  Tag,
  Eye,
} from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useDeleteDoc, useErpMethodCall } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { StatusBadge } from '@/components/erp/status-badge';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildLeadCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';

/* ───────────────────────────── Types & Constants ───────────────────────────── */

type LeadRow = {
  name: string;
  lead_name?: string;
  first_name?: string;
  last_name?: string;
  salutation?: string;
  company_name?: string;
  source?: string;
  status?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  lead_owner?: string;
  territory?: string;
};

const STATUS_AR: Record<string, string> = {
  Lead: 'عميل محتمل',
  Open: 'مفتوح',
  Replied: 'تم الرد',
  Opportunity: 'فرصة',
  Quotation: 'عرض سعر',
  'Lost Quotation': 'عرض مرفوض',
  Interested: 'مهتم',
  Converted: 'مُحوَّل',
  'Do Not Contact': 'عدم الاتصال',
};

const SOURCE_AR: Record<string, string> = {
  Advertisement: 'إعلان',
  'Cold Call': 'اتصال بارد',
  Customer: 'عميل',
  Email: 'بريد إلكتروني',
  'Employee Referral': 'إحالة موظف',
  'Existing Customer': 'عميل حالي',
  'Partner Referral': 'إحالة شريك',
  'Phone Call': 'اتصال هاتفي',
  Reference: 'مرجع',
  'Trade Show': 'معرض تجاري',
  Web: 'موقع إلكتروني',
  'Word of mouth': 'توصية شفهية',
  Website: 'موقع ويب',
  Campaign: 'حملة تسويقية',
  CRM: 'نظام إدارة العملاء',
  Social: 'وسائل التواصل',
};

const SALUTATION_OPTIONS = [
  { value: 'Mr', label: 'السيد' },
  { value: 'Ms', label: 'السيدة' },
  { value: 'Mrs', label: 'السيدة' },
  { value: 'Dr', label: 'د.' },
  { value: 'Prof', label: 'أ.' },
];

const STATUS_OPTIONS = ['Lead', 'Open', 'Replied', 'Interested', 'Opportunity', 'Quotation', 'Converted', 'Lost Quotation', 'Do Not Contact'];

const SOURCE_OPTIONS = Object.keys(SOURCE_AR);

/* ───────────────────────────── Helpers ───────────────────────────── */

function getSourceBadge(source: string | undefined) {
  if (!source) return <Badge variant="outline" className="text-[9px] text-muted-foreground">—</Badge>;
  const arLabel = SOURCE_AR[source];
  return (
    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-info/30 bg-info/5 text-info">
      {arLabel || source}
    </Badge>
  );
}

function getStatusBadge(status: string | undefined) {
  if (!status) return <Badge variant="outline" className="text-[9px]">—</Badge>;
  // Try StatusBadge for known statuses
  const knownStatuses = ['Open', 'Converted'];
  if (knownStatuses.includes(status)) {
    return <StatusBadge status={status} className="text-[9px]" />;
  }
  const arLabel = STATUS_AR[status];
  // Color coding by status type
  if (status === 'Lead') return <Badge variant="outline" className="text-[9px] border-muted/40 bg-muted/10 text-muted-foreground">{arLabel}</Badge>;
  if (status === 'Interested') return <Badge variant="outline" className="text-[9px] border-warning/30 bg-warning/5 text-warning">{arLabel}</Badge>;
  if (status === 'Opportunity' || status === 'Quotation') return <Badge variant="outline" className="text-[9px] border-info/30 bg-info/5 text-info">{arLabel}</Badge>;
  if (status === 'Replied') return <Badge variant="outline" className="text-[9px] border-primary/30 bg-primary/5 text-primary">{arLabel}</Badge>;
  if (status === 'Lost Quotation' || status === 'Do Not Contact') return <Badge variant="outline" className="text-[9px] border-destructive/30 bg-destructive/5 text-destructive">{arLabel}</Badge>;
  return <Badge variant="outline" className="text-[9px]">{arLabel || status}</Badge>;
}

/* ───────────────────────────── Main Page ───────────────────────────── */

const emptyForm = {
  salutation: '',
  first_name: '',
  last_name: '',
  company_name: '',
  source: '',
  status: 'Lead',
  email_id: '',
  phone: '',
  territory: '',
  lead_owner: '',
};

export default function LeadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [convertBusy, setConvertBusy] = useState<string | null>(null);

  /* ── Filter state ── */
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTerritory, setFilterTerritory] = useState<string>('all');

  const { company } = useDefaultCompanyName();

  /* ── Data ── */
  const { data, isLoading, isError, error, refetch } = useDocList<LeadRow>('Lead', {
    fields: ['name', 'lead_name', 'first_name', 'last_name', 'salutation', 'company_name', 'source', 'status', 'email_id', 'mobile_no', 'phone', 'lead_owner', 'territory'],
    limit: 400,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Lead');
  const deleteMutation = useDeleteDoc('Lead');
  const convertMethod = useErpMethodCall(['Lead', 'Customer']);

  const leads = data || [];

  /* ── Derived data ── */
  const territories = useMemo(() => [...new Set(leads.map(l => l.territory).filter((t): t is string => Boolean(t)))], [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterSource !== 'all') result = result.filter(l => l.source === filterSource);
    if (filterStatus !== 'all') result = result.filter(l => l.status === filterStatus);
    if (filterTerritory !== 'all') result = result.filter(l => l.territory === filterTerritory);
    return result;
  }, [leads, filterSource, filterStatus, filterTerritory]);

  /* ── KPI calculations ── */
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === 'Interested' || l.status === 'Opportunity').length;
  const warmLeads = leads.filter(l => l.status === 'Replied' || l.status === 'Quotation').length;
  const coldLeads = leads.filter(l => l.status === 'Lead' || l.status === 'Open').length;
  const convertedLeads = leads.filter(l => l.status === 'Converted').length;

  /* ── Columns ── */
  const columns: Column<LeadRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'الرقم',
      render: (v) => <span className="text-primary font-medium text-xs">{String(v)}</span>,
    },
    {
      key: 'lead_name',
      header: 'الاسم',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
            {(row.first_name || row.lead_name || '?').toString().charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-medium block truncate">
              {row.lead_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company_name || '—'}
            </span>
            {row.salutation && <span className="text-[10px] text-muted-foreground">{SALUTATION_OPTIONS.find(s => s.value === row.salutation)?.label}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'company_name',
      header: 'الشركة',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate text-xs">{row.company_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'المصدر',
      render: (value) => getSourceBadge(value as string | undefined),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (value) => getStatusBadge(value as string | undefined),
    },
    {
      key: 'email_id',
      header: 'البريد',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-xs truncate" dir="ltr">{String(value || '—')}</span>
        </div>
      ),
    },
    {
      key: 'mobile_no',
      header: 'الجوال',
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs" dir="ltr">{String(value || row.phone || '—')}</span>
        </div>
      ),
    },
    {
      key: 'lead_owner',
      header: 'المسؤول',
      render: (value) => <span className="text-muted-foreground text-xs truncate max-w-[100px] block">{String(value || '—')}</span>,
    },
    {
      key: 'territory',
      header: 'المنطقة',
      render: (value) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-xs">{String(value || '—')}</span>
        </div>
      ),
    },
  ], []);

  /* ── Handlers ── */
  const handleCreate = () => {
    if (!formData.first_name.trim() && !formData.company_name.trim()) {
      toast.error('أدخل الاسم الأول أو اسم المنشأة');
      return;
    }
    const mapped = buildLeadCreate({
      first_name: formData.first_name || undefined,
      last_name: formData.last_name || undefined,
      company_name: formData.company_name || undefined,
      email_id: formData.email_id || undefined,
      mobile_no: formData.phone || undefined,
      status: formData.status,
      company: company || undefined,
    });
    // Add extra fields that buildLeadCreate may not cover
    const extra: Record<string, unknown> = {};
    if (formData.salutation) extra.salutation = formData.salutation;
    if (formData.source) extra.source = formData.source;
    if (formData.territory) extra.territory = formData.territory;
    if (formData.lead_owner) extra.lead_owner = formData.lead_owner;

    const finalDoc = { ...prepareFrappeDocForCreate(mapped), ...extra };

    createMutation.mutate(finalDoc, {
      onSuccess: () => { toast.success('تم إنشاء العميل المحتمل'); setDialogOpen(false); setFormData({ ...emptyForm }); },
      onError: () => toast.error('فشل الإنشاء'),
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteDialogOpen(false); setSelected(null); },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  const handleConvertToCustomer = async (lead: LeadRow) => {
    if (lead.status === 'Converted') {
      toast.info('هذا العميل محوّل بالفعل');
      return;
    }
    setConvertBusy(lead.name);
    try {
      await convertMethod.mutateAsync({
        method: 'frappe.client.insert',
        args: {
          doc: {
            doctype: 'Customer',
            customer_name: lead.lead_name || lead.company_name || lead.name,
            customer_type: lead.company_name ? 'Company' : 'Individual',
            customer_group: 'All Customer Groups',
            territory: lead.territory || 'All Territories',
            lead_name: lead.name,
          },
        },
      });
      toast.success(`تم تحويل العميل المحتمل "${lead.lead_name || lead.name}" إلى عميل`);
      void refetch();
    } catch {
      toast.error('فشل تحويل العميل المحتمل');
    } finally {
      setConvertBusy(null);
    }
  };

  const clearFilters = () => {
    setFilterSource('all');
    setFilterStatus('all');
    setFilterTerritory('all');
  };

  const hasActiveFilters = filterSource !== 'all' || filterStatus !== 'all' || filterTerritory !== 'all';

  /* ── Render ── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="العملاء المحتملون"
        description="إدارة العملاء المحتملين ومتابعة حالات التحويل عبر مراحل التواصل والصفقات"
        iconify="solar:user-plus-rounded-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'العملاء المحتملون' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" onClick={() => setFormData({ ...emptyForm })}>
                  <Plus className="h-3.5 w-3.5" />
                  عميل محتمل
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
                <DialogHeader className="pb-4">
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <span>عميل محتمل جديد</span>
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات العميل المحتمل</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[65vh] overflow-y-auto">
                  {/* Personal Info */}
                  <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                    <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                      <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                          <UserPlus className="h-3 w-3 text-primary" />
                        </span>
                        البيانات الشخصية
                      </h4>
                    </div>
                    <div className="p-4 space-y-4 bg-card/50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">اللقب</Label>
                          <Select value={formData.salutation} onValueChange={v => setFormData(p => ({ ...p, salutation: v }))}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="اللقب" />
                            </SelectTrigger>
                            <SelectContent>
                              {SALUTATION_OPTIONS.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">الاسم الأول <span className="text-destructive text-xs">*</span></Label>
                          <Input value={formData.first_name} onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))} className="h-9" placeholder="الاسم الأول" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">اسم العائلة</Label>
                          <Input value={formData.last_name} onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))} className="h-9" placeholder="اسم العائلة" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">اسم المنشأة (بديل عن الاسم)</Label>
                        <Input value={formData.company_name} onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))} className="h-9" placeholder="اسم المنشأة" />
                      </div>
                    </div>
                  </fieldset>

                  {/* Contact & Source */}
                  <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                    <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                      <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                          <Building2 className="h-3 w-3 text-info" />
                        </span>
                        معلومات الاتصال والمصدر
                      </h4>
                    </div>
                    <div className="p-4 space-y-4 bg-card/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                          <Input dir="ltr" type="email" value={formData.email_id} onChange={(e) => setFormData((p) => ({ ...p, email_id: e.target.value }))} className="h-9" placeholder="email@company.com" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">رقم الجوال</Label>
                          <Input dir="ltr" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className="h-9" placeholder="05xxxxxxxx" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">المصدر</Label>
                          <Select value={formData.source || '_none'} onValueChange={v => setFormData(p => ({ ...p, source: v === '_none' ? '' : v }))}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="اختر المصدر" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">— بدون —</SelectItem>
                              {SOURCE_OPTIONS.map(s => (
                                <SelectItem key={s} value={s}>{SOURCE_AR[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">الحالة</Label>
                          <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s} value={s}>{STATUS_AR[s] || s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {/* Territory & Owner */}
                  <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                    <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                      <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                          <MapPin className="h-3 w-3 text-success" />
                        </span>
                        المنطقة والمسؤول
                      </h4>
                    </div>
                    <div className="p-4 space-y-4 bg-card/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">المنطقة</Label>
                          <ErpLinkCombobox
                            doctype="Territory"
                            value={formData.territory}
                            onChange={v => setFormData(p => ({ ...p, territory: v }))}
                            placeholder="اختر المنطقة..."
                            showCreateShortcut={false}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">مسؤول العميل</Label>
                          <ErpLinkCombobox
                            doctype="User"
                            value={formData.lead_owner}
                            onChange={v => setFormData(p => ({ ...p, lead_owner: v }))}
                            placeholder="اختر المسؤول..."
                            showCreateShortcut={false}
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
                  <Button disabled={createMutation.isPending} onClick={handleCreate} className="gap-1.5 min-w-[130px]">
                    {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ─── KPI Strip ─── */}
      <KpiStrip cols={5}>
        <KpiCard
          title="إجمالي العملاء المحتملين"
          value={totalLeads}
          icon={Users}
          accent="primary"
          description="جميع السجلات"
        />
        <KpiCard
          title="عملاء ساخنون"
          value={hotLeads}
          icon={Flame}
          accent="destructive"
          description="مهتمون وفرص"
        />
        <KpiCard
          title="عملاء دافئون"
          value={warmLeads}
          icon={Sun}
          accent="warning"
          description="تم الرد / عرض سعر"
        />
        <KpiCard
          title="عملاء باردون"
          value={coldLeads}
          icon={Snowflake}
          accent="info"
          description="جدد / مفتوحون"
        />
        <KpiCard
          title="تم التحويل"
          value={convertedLeads}
          icon={ArrowRightLeft}
          accent="success"
          description={totalLeads > 0 ? `${Math.round((convertedLeads / totalLeads) * 100)}% معدل التحويل` : 'لا بيانات بعد'}
        />
      </KpiStrip>

      {/* ─── Filters Bar ─── */}
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Toggle */}
          <Button
            size="sm"
            variant={filtersOpen ? 'secondary' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            فلاتر
            {hasActiveFilters && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">!</Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 me-1" />
              مسح الفلاتر
            </Button>
          )}

          <div className="ms-auto">
            <Badge variant="outline" className="text-[11px] h-7 px-2.5 rounded-lg border-border/40 bg-muted/30 text-muted-foreground">
              {filteredLeads.length} من {totalLeads}
            </Badge>
          </div>
        </div>

        {/* Filter Controls */}
        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">المصدر</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="جميع المصادر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المصادر</SelectItem>
                  {SOURCE_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{SOURCE_AR[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_AR[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">المنطقة</Label>
              <Select value={filterTerritory} onValueChange={setFilterTerritory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="جميع المناطق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المناطق</SelectItem>
                  {territories.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ─── Data Table ─── */}
      <PageShell padded={false}>
        <DataTable
          data={filteredLeads}
          columns={columns}
          searchable
          loading={isLoading}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
          tableId="crm-leads"
          exportFileName="leads.csv"
          printTitle="العملاء المحتملون"
          selectable
          bulkActions={[
            {
              label: 'تحويل إلى عملاء',
              onClick: (rows) => {
                const nonConverted = rows.filter(r => r.status !== 'Converted');
                if (nonConverted.length === 0) {
                  toast.info('جميع المحددون محوّلون بالفعل');
                  return;
                }
                toast.info(`جاري تحويل ${nonConverted.length} عميل محتمل...`);
                for (const lead of nonConverted) {
                  void handleConvertToCustomer(lead as LeadRow);
                }
              },
            },
          ]}
        />
      </PageShell>

      {/* ─── Quick Convert Floating Actions ─── */}
      {/* Show inline convert button on selected lead via table actions */}

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عميل محتمل؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العميل المحتمل &quot;{selected?.lead_name || selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحذف...</span>
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

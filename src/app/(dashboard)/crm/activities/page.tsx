'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus,
  Phone,
  Mail,
  Users,
  MapPin,
  MessageSquare,
  RefreshCw,
  Filter,
  X,
  Activity,
  CalendarDays,
  Link2,
  User,
  ChevronDown,
  Loader2,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildCommunicationCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ───────────────────────────── Types & Constants ───────────────────────────── */

type Row = {
  name: string;
  subject?: string;
  communication_medium?: string;
  communication_date?: string;
  reference_doctype?: string;
  reference_name?: string;
  sender?: string;
  status?: string;
  phone_no?: string;
  content?: string;
};

type MediumType = 'Phone' | 'Email' | 'Meeting' | 'Visit' | 'SMS' | 'Other';

const MEDIUM_AR: Record<string, string> = {
  Phone: 'هاتف',
  Email: 'بريد',
  Meeting: 'اجتماع',
  Visit: 'زيارة',
  SMS: 'رسالة',
  Other: 'أخرى',
};

const MEDIUM_ICON: Record<string, typeof Phone> = {
  Phone: Phone,
  Email: Mail,
  Meeting: Users,
  Visit: MapPin,
  SMS: MessageSquare,
  Other: Activity,
};

const MEDIUM_COLORS: Record<string, string> = {
  Phone: 'border-primary/30 bg-primary/5 text-primary',
  Email: 'border-chart-1/30 bg-chart-1/5 text-chart-1',
  Meeting: 'border-chart-5/30 bg-chart-5/5 text-chart-5',
  Visit: 'border-chart-2/30 bg-chart-2/5 text-chart-2',
  SMS: 'border-chart-5/30 bg-chart-5/5 text-chart-5',
  Other: 'border-gray-400/40 bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300',
};

const CRM_DOCTYPE_AR: Record<string, string> = {
  'Lead': 'عميل محتمل',
  'Customer': 'عميل',
  'Opportunity': 'فرصة',
  'Quotation': 'عرض سعر',
  'Sales Order': 'أمر بيع',
  'Sales Invoice': 'فاتورة مبيعات',
  'Contact': 'جهة اتصال',
  'Address': 'عنوان',
  'Communication': 'تواصل',
  'Issue': 'بلاغ',
};

const REF_TYPE_OPTIONS = [
  { value: 'Lead', label: 'عميل محتمل' },
  { value: 'Customer', label: 'عميل حالي' },
  { value: 'Opportunity', label: 'فرصة' },
];

const MEDIUM_OPTIONS: { value: MediumType; label: string }[] = [
  { value: 'Phone', label: 'هاتف' },
  { value: 'Email', label: 'بريد إلكتروني' },
  { value: 'Meeting', label: 'اجتماع' },
  { value: 'Visit', label: 'زيارة' },
  { value: 'SMS', label: 'رسالة نصية' },
  { value: 'Other', label: 'أخرى' },
];

/* ───────────────────────────── Helpers ───────────────────────────── */

function getMediumBadge(medium: string | undefined) {
  if (!medium) return <Badge variant="outline" className="text-[9px] text-muted-foreground">—</Badge>;
  const Icon = MEDIUM_ICON[medium] || Activity;
  const colorClass = MEDIUM_COLORS[medium] || MEDIUM_COLORS.Other;
  return (
    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0.5 gap-1', colorClass)}>
      <Icon className="h-3 w-3" />
      {MEDIUM_AR[medium] || medium}
    </Badge>
  );
}

function formatDate(v: string | undefined) {
  if (!v) return '—';
  return <span dir="ltr" className="text-xs">{String(v).slice(0, 16)}</span>;
}

function formatRef(doctype: string | undefined, name: string | undefined) {
  if (!doctype || !name) return <span className="text-xs text-muted-foreground">—</span>;
  const arLabel = CRM_DOCTYPE_AR[doctype] || doctype;
  return (
    <span className="text-xs">
      <span className="text-muted-foreground">{arLabel}:</span>{' '}
      <span className="text-primary font-medium">{name}</span>
    </span>
  );
}

/* ───────────────────────────── Main Page ───────────────────────────── */

export default function ActivitiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [medium, setMedium] = useState<MediumType>('Phone');
  const [content, setContent] = useState('');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [sender, setSender] = useState('');

  // Filter state
  const [filterMedium, setFilterMedium] = useState<string>('all');
  const [filterRefType, setFilterRefType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  /* ── Data ── */
  const { data, isLoading, isError, error, refetch } = useDocList<Row>('Communication', {
    fields: ['name', 'subject', 'communication_medium', 'communication_date', 'reference_doctype', 'reference_name', 'sender', 'status', 'phone_no', 'content'],
    filters: [['communication_type', '=', 'Communication']],
    limit: 500,
    order_by: 'communication_date desc',
  });

  const createMutation = useCreateDoc('Communication');
  const deleteMutation = useDeleteDoc('Communication');

  const activities = data || [];

  /* ── Filtered data ── */
  const filteredData = useMemo(() => {
    let result = activities;
    // Tab filter
    if (activeTab !== 'all') result = result.filter((r) => r.communication_medium === activeTab);
    // Medium filter
    if (filterMedium !== 'all') result = result.filter((r) => r.communication_medium === filterMedium);
    // Ref type filter
    if (filterRefType !== 'all') result = result.filter((r) => r.reference_doctype === filterRefType);
    // Date range
    if (filterDateFrom) result = result.filter((r) => r.communication_date && r.communication_date >= filterDateFrom);
    if (filterDateTo) result = result.filter((r) => r.communication_date && r.communication_date <= filterDateTo + ' 23:59:59');
    return result;
  }, [activities, activeTab, filterMedium, filterRefType, filterDateFrom, filterDateTo]);

  /* ── KPI calculations ── */
  const totalActivities = activities.length;
  const callsCount = activities.filter((r) => r.communication_medium === 'Phone').length;
  const meetingsCount = activities.filter((r) => r.communication_medium === 'Meeting').length;
  const visitsCount = activities.filter((r) => r.communication_medium === 'Visit').length;
  const emailsCount = activities.filter((r) => r.communication_medium === 'Email').length;

  /* ── Columns ── */
  const columns: Column<Row>[] = useMemo(() => [
    {
      key: 'subject',
      header: 'الموضوع',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-xs truncate max-w-[200px]">{String(v || '—')}</span>
        </div>
      ),
    },
    {
      key: 'communication_medium',
      header: 'وسيلة التواصل',
      width: 'w-32',
      render: (v) => getMediumBadge(v as string | undefined),
    },
    {
      key: 'communication_date',
      header: 'التاريخ',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
          {formatDate(v as string | undefined)}
        </div>
      ),
    },
    {
      key: 'reference_doctype',
      header: 'المرجع',
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
          {formatRef(r.reference_doctype, r.reference_name)}
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'المرسل',
      render: (v) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{String(v || '—')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      width: 'w-24',
      render: (v) => {
        const s = String(v || 'Open');
        const colorMap: Record<string, string> = {
          Open: 'border-primary/30 bg-primary/5 text-primary',
          Replied: 'border-success/30 bg-success/5 text-success',
          Closed: 'border-muted/30 bg-muted/10 text-muted-foreground',
          Linked: 'border-info/30 bg-info/5 text-info',
        };
        const statusAr: Record<string, string> = { Open: 'مفتوح', Replied: 'تم الرد', Closed: 'مغلق', Linked: 'مرتبط' };
        return (
          <Badge variant="outline" className={cn('text-[9px] px-1.5', colorMap[s] || 'border-muted/30 bg-muted/10 text-muted-foreground')}>
            {statusAr[s] || s}
          </Badge>
        );
      },
    },
  ], []);

  /* ── Handlers ── */
  const resetForm = () => {
    setSubject('');
    setMedium('Phone');
    setContent('');
    setRefType('');
    setRefName('');
    setPhoneNo('');
    setSender('');
  };

  const handleCreate = () => {
    if (!subject.trim()) { toast.error('الموضوع مطلوب'); return; }
    const mapped = buildCommunicationCreate({
      subject,
      communication_medium: medium,
      content: content || undefined,
      reference_doctype: refType || undefined,
      reference_name: refName || undefined,
      phone_no: (medium === 'Phone' || medium === 'SMS') ? (phoneNo || undefined) : undefined,
    });
    const extra: Record<string, unknown> = {};
    if (sender) extra.sender = sender;
    const finalDoc = { ...prepareFrappeDocForCreate(mapped), ...extra };
    createMutation.mutate(finalDoc, {
      onSuccess: () => { toast.success('تم تسجيل النشاط بنجاح'); setDialogOpen(false); resetForm(); },
      onError: () => toast.error('فشل حفظ النشاط'),
    });
  };

  const clearFilters = () => {
    setFilterMedium('all');
    setFilterRefType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterMedium !== 'all' || filterRefType !== 'all' || filterDateFrom || filterDateTo;

  /* ── Render ── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الأنشطة"
        description="مكالمات، اجتماعات، زيارات، رسائل وكل أنواع التواصل المسجّل ضمن CRM"
        iconify="solar:phone-calling-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'الأنشطة' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              نشاط جديد
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3 gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              الكل
              <Badge variant="outline" className="h-4 px-1 text-[9px] ms-1">{totalActivities}</Badge>
            </TabsTrigger>
            <TabsTrigger value="Phone" className="text-xs px-3 gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              مكالمات
            </TabsTrigger>
            <TabsTrigger value="Meeting" className="text-xs px-3 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              اجتماعات
            </TabsTrigger>
            <TabsTrigger value="Visit" className="text-xs px-3 gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              زيارات
            </TabsTrigger>
            <TabsTrigger value="Email" className="text-xs px-3 gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              بريد
            </TabsTrigger>
          </TabsList>

          {/* Filter Toggle */}
          <Button
            size="sm"
            variant={filtersOpen ? 'secondary' : 'outline'}
            className="h-9 gap-1.5 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            فلاتر
            {hasActiveFilters && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">!</Badge>
            )}
            <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 me-1" />
              مسح الفلاتر
            </Button>
          )}

          <div className="ms-auto">
            <Badge variant="outline" className="text-xs h-7 px-2.5 rounded-lg border-border/40 bg-muted/30 text-muted-foreground">
              {filteredData.length} من {totalActivities}
            </Badge>
          </div>
        </div>

        {/* Filter Controls */}
        {filtersOpen && (
          <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">وسيلة التواصل</Label>
                <Select value={filterMedium} onValueChange={setFilterMedium}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {MEDIUM_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">نوع المرجع</Label>
                <Select value={filterRefType} onValueChange={setFilterRefType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {REF_TYPE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">من تاريخ</Label>
                <Input type="date" dir="ltr" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">إلى تاريخ</Label>
                <Input type="date" dir="ltr" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>
        )}

        <TabsContent value={activeTab}>
          <PageShell padded={false}>
            <DataTable
              data={filteredData}
              columns={columns}
              searchable
              loading={isLoading}
              onDelete={(r) => { setToDelete(r); setDeleteDialogOpen(true); }}
              tableId="crm-activities"
              exportFileName="crm-activities.csv"
              printTitle="أنشطة CRM"
            />
          </PageShell>
        </TabsContent>
      </Tabs>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              حذف النشاط
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف النشاط &quot;{toDelete?.subject || toDelete?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!toDelete) return;
                deleteMutation.mutate(toDelete.name, {
                  onSuccess: () => { toast.success('تم حذف النشاط'); void refetch(); },
                  onError: () => toast.error('فشل حذف النشاط'),
                });
                setDeleteDialogOpen(false);
                setToDelete(null);
              }}
              variant="destructive"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحذف...</span>
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>تسجيل نشاط جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">سجّل مكالمة، اجتماع، زيارة أو أي تواصل</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Basic Info */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                    <Activity className="h-3 w-3 text-info" />
                  </span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الموضوع <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="موضوع النشاط" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">وسيلة التواصل</Label>
                    <Select value={medium} onValueChange={(v) => setMedium(v as MediumType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIUM_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المرسل</Label>
                    <ErpLinkCombobox
                      doctype="User"
                      value={sender}
                      onChange={setSender}
                      placeholder="اختر المرسل..."
                      displayKey="full_name"
                      showCreateShortcut={false}
                    />
                  </div>
                </div>
                {(medium === 'Phone' || medium === 'SMS') && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الهاتف</Label>
                    <Input dir="ltr" placeholder="رقم الهاتف" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">المحتوى / الملاحظات</Label>
                  <Textarea placeholder="أدخل تفاصيل النشاط..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px]" />
                </div>
              </div>
            </fieldset>

            {/* Reference Info */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-success" />
                  </span>
                  الارتباط (اختياري)
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المرجع</Label>
                    <Select value={refType || '_none'} onValueChange={(v) => { setRefType(v === '_none' ? '' : v); setRefName(''); }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="بدون مرجع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">بدون مرجع</SelectItem>
                        {REF_TYPE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {refType && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">اسم المرجع</Label>
                      <ErpLinkCombobox
                        doctype={refType}
                        value={refName}
                        onChange={setRefName}
                        displayKey={refType === 'Customer' ? 'customer_name' : undefined}
                        placeholder="اختر السجل..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ النشاط'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

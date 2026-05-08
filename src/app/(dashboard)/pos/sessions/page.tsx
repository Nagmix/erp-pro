'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDocList, useCreateDoc, useSubmitDoc } from '@/lib/client/hooks';
import { formatCurrency, formatNumber, formatDate, STATUS_COLORS } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  Play,
  Square,
  Banknote,
  Plus,
  Filter,
  ChevronDown,
  X,
  Loader2,
  ExternalLink,
  CircleDot,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────
   أنواع البيانات
   ──────────────────────────────────────────────── */

type PosSessionRow = {
  name: string;
  pos_profile?: string;
  user?: string;
  period_start_date?: string;
  period_end_date?: string;
  opening_balance?: number;
  closing_balance?: number;
  status?: string;
  docstatus?: number;
  company?: string;
};

type PosClosingEntryRow = {
  name: string;
  pos_opening_entry?: string;
  pos_profile?: string;
  period_start_date?: string;
  period_end_date?: string;
  closing_balance?: number;
  grand_total?: number;
  docstatus?: number;
};

/* ────────────────────────────────────────────────
   مكونات مساعدة
   ──────────────────────────────────────────────── */

/** شارة حالة الجلسة */
function SessionStatusBadge({ status, docstatus }: { status?: string; docstatus?: number }) {
  // مفتوحة = status مفتوح أو docstatus=0 بدون إغلاق
  if (status === 'Open' || status === 'مفتوح' || (docstatus === 0)) {
    return (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-warning/12 text-warning ring-1 ring-inset ring-warning/25">
        <CircleDot className="h-3 w-3 me-1" />
        مفتوحة
      </Badge>
    );
  }
  if (docstatus === 1) {
    return (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-success/12 text-success ring-1 ring-inset ring-success/25">
        <CheckCircle2 className="h-3 w-3 me-1" />
        مغلقة
      </Badge>
    );
  }
  if (docstatus === 2) {
    return (
      <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25">
        <AlertCircle className="h-3 w-3 me-1" />
        ملغاة
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{status ?? '—'}</Badge>;
}

/** تعيين حالة الجلسة محلياً */
function getSessionState(row: PosSessionRow): 'open' | 'closed' | 'cancelled' {
  if (row.docstatus === 2) return 'cancelled';
  if (row.docstatus === 1) return 'closed';
  return 'open';
}

/* ────────────────────────────────────────────────
   الصفحة الرئيسية
   ──────────────────────────────────────────────── */

export default function PosSessionsListPage() {
  const { toast } = useToast();
  const { company } = useDefaultCompanyName();

  /* ── حالة الفلاتر ── */
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [profileFilter, setProfileFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── حالة حوار فتح وردية ── */
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState('');
  const [openBalance, setOpenBalance] = useState('0');
  const [openCompany, setOpenCompany] = useState('');

  /* ── حالة حوار إغلاق وردية ── */
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeSessionName, setCloseSessionName] = useState('');
  const [closeBalance, setCloseBalance] = useState('');

  /* ── جلب البيانات ── */
  const { data = [], isLoading, isError, error, refetch } = useDocList<PosSessionRow>('POS Opening Entry', {
    fields: [
      'name', 'pos_profile', 'user', 'period_start_date', 'period_end_date',
      'opening_balance', 'closing_balance', 'status', 'docstatus', 'company',
    ],
    limit: 500,
    order_by: 'modified desc',
  });

  const { data: closingEntries = [] } = useDocList<PosClosingEntryRow>('POS Closing Entry', {
    fields: ['name', 'pos_opening_entry', 'pos_profile', 'closing_balance', 'grand_total', 'docstatus'],
    limit: 500,
    order_by: 'modified desc',
  });

  const { data: companies = [] } = useDocList<Record<string, unknown>>('Company', {
    fields: ['name'],
    limit: 50,
  });

  /* ── حسابات KPI ── */
  const rows = useMemo(() => data ?? [], [data]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => getSessionState(r) === 'open').length;
    const closed = rows.filter((r) => getSessionState(r) === 'closed').length;
    const totalCash = rows.reduce((sum, r) => sum + (Number(r.closing_balance ?? r.opening_balance ?? 0)), 0);
    return { total, open, closed, totalCash };
  }, [rows]);

  /* ── فلترة البيانات ── */
  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter === 'open') result = result.filter((r) => getSessionState(r) === 'open');
    if (statusFilter === 'closed') result = result.filter((r) => getSessionState(r) === 'closed');
    if (profileFilter.trim()) {
      result = result.filter((r) =>
        (r.pos_profile ?? '').toLowerCase().includes(profileFilter.trim().toLowerCase())
      );
    }
    return result;
  }, [rows, statusFilter, profileFilter]);

  /* ── قائمة ملفات نقاط البيع المتاحة ── */
  const profileOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.pos_profile).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  /* ── إنشاء وردية ── */
  const createMutation = useCreateDoc('POS Opening Entry');
  const submitMutation = useSubmitDoc('POS Opening Entry');

  const handleOpenSession = () => {
    if (!openProfile) {
      toast({ title: 'اختر ملف نقطة البيع', variant: 'destructive' });
      return;
    }
    const selCompany = openCompany || company;
    if (!selCompany) {
      toast({ title: 'حدد الشركة', variant: 'destructive' });
      return;
    }
    createMutation.mutate(
      {
        pos_profile: openProfile,
        company: selCompany,
        period_start_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        opening_balance: Number(openBalance) || 0,
        doctype: 'POS Opening Entry',
      },
      {
        onSuccess: (doc: unknown) => {
          const docName = (doc as Record<string, unknown>)?.name;
          if (docName) {
            submitMutation.mutate(String(docName), {
              onSuccess: () => {
                toast({ title: 'تم فتح الوردية بنجاح' });
                setOpenDialogOpen(false);
                setOpenProfile('');
                setOpenBalance('0');
                setOpenCompany('');
                void refetch();
              },
              onError: () => {
                toast({ title: 'تم الإنشاء لكن فشل الترحيل', variant: 'destructive' });
                setOpenDialogOpen(false);
                void refetch();
              },
            });
          } else {
            toast({ title: 'تم فتح الوردية' });
            setOpenDialogOpen(false);
            void refetch();
          }
        },
        onError: () => {
          toast({ title: 'تعذر فتح الوردية', variant: 'destructive' });
        },
      },
    );
  };

  /* ── إغلاق وردية ── */
  const handleCloseSession = () => {
    if (!closeSessionName) {
      toast({ title: 'حدد الجلسة للإغلاق', variant: 'destructive' });
      return;
    }
    // البحث عن إغلاق موجود
    const existingClose = closingEntries.find(
      (ce) => ce.pos_opening_entry === closeSessionName && ce.docstatus === 0
    );
    if (existingClose) {
      submitMutation.mutate(existingClose.name, {
        onSuccess: () => {
          toast({ title: 'تم إغلاق الوردية بنجاح' });
          setCloseDialogOpen(false);
          setCloseSessionName('');
          setCloseBalance('');
          void refetch();
        },
        onError: () => toast({ title: 'فشل ترحيل الإغلاق', variant: 'destructive' }),
      });
      return;
    }
    createMutation.mutate(
      {
        doctype: 'POS Closing Entry',
        pos_opening_entry: closeSessionName,
        closing_balance: Number(closeBalance) || 0,
        company: company || undefined,
      },
      {
        onSuccess: (doc: unknown) => {
          const docName = (doc as Record<string, unknown>)?.name;
          if (docName) {
            submitMutation.mutate(String(docName), {
              onSuccess: () => {
                toast({ title: 'تم إغلاق الوردية بنجاح' });
                setCloseDialogOpen(false);
                setCloseSessionName('');
                setCloseBalance('');
                void refetch();
              },
              onError: () => toast({ title: 'فشل ترحيل الإغلاق', variant: 'destructive' }),
            });
          }
        },
        onError: () => toast({ title: 'تعذر إغلاق الوردية', variant: 'destructive' }),
      },
    );
  };

  const isBusy = createMutation.isPending || submitMutation.isPending;

  const openSessions = useMemo(() => rows.filter((r) => getSessionState(r) === 'open'), [rows]);

  /* ── مسح الفلاتر ── */
  const clearFilters = () => {
    setStatusFilter('all');
    setProfileFilter('');
  };
  const hasActiveFilters = statusFilter !== 'all' || profileFilter.trim() !== '';

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إدارة الجلسات والورديات"
        description="عرض سجل الورديات وفتح وإغلاق الجلسات مع متابعة الأرصدة والحالات"
        iconify="solar:clock-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الجلسات' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setCloseDialogOpen(true)}
              disabled={openSessions.length === 0}
            >
              <Square className="h-3.5 w-3.5" />
              إغلاق وردية
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setOpenDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              فتح وردية جديدة
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── بطاقات KPI ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الجلسات"
          value={formatNumber(kpis.total)}
          icon={Clock}
          accent="info"
          description="عدد سجلات الورديات المسجّلة"
        />
        <KpiCard
          title="جلسات مفتوحة"
          value={formatNumber(kpis.open)}
          icon={Play}
          accent="warning"
          description="ورديات نشطة لم تُغلق بعد"
          change={kpis.open > 0 ? undefined : undefined}
        />
        <KpiCard
          title="جلسات مغلقة"
          value={formatNumber(kpis.closed)}
          icon={Square}
          accent="success"
          description="ورديات أُغلقت وتم ترحيلها"
        />
        <KpiCard
          title="إجمالي النقدية"
          value={formatCurrency(kpis.totalCash)}
          icon={Banknote}
          accent="primary"
          description="مجموع الأرصدة (افتتاحية + ختامية)"
        />
      </KpiStrip>

      {/* ── شريط الفلاتر ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="w-full">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                  <Filter className="h-3 w-3" />
                  فلاتر
                  <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                  <X className="h-3 w-3" />
                  مسح الفلاتر
                </Button>
              )}
              <div className="flex items-center gap-2 ms-auto">
                <span className="text-xs text-muted-foreground">
                  عرض {formatNumber(filteredRows.length)} من {formatNumber(rows.length)}
                </span>
              </div>
            </div>
            <CollapsibleContent>
              <div className="flex flex-wrap items-end gap-3 pt-3 border-t mt-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">حالة الجلسة</Label>
                  <Select dir="rtl" value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'open' | 'closed')}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="open">مفتوحة</SelectItem>
                      <SelectItem value="closed">مغلقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ملف نقطة البيع</Label>
                  <Select dir="rtl" value={profileFilter} onValueChange={setProfileFilter}>
                    <SelectTrigger className="h-8 text-xs w-48">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">الكل</SelectItem>
                      {profileOptions.map((p) => (
                        <SelectItem key={p} value={p!}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* ── جدول الجلسات ── */}
      <PageShell padded={false}>
        <div className="px-4 pt-4 pb-1">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-block h-4 w-1 rounded-full bg-primary/70" aria-hidden />
            سجل الورديات (POS Opening Entry)
          </h2>
        </div>
        <div className="rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">جاري تحميل الجلسات…</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? 'لا توجد جلسات مطابقة للفلاتر المحددة' : 'لا توجد جلسات مسجّلة بعد'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/90">
                    <TableHead className="text-start font-semibold text-xs">الرقم</TableHead>
                    <TableHead className="text-start font-semibold text-xs">ملف نقطة البيع</TableHead>
                    <TableHead className="text-start font-semibold text-xs">المستخدم</TableHead>
                    <TableHead className="text-start font-semibold text-xs">وقت البداية</TableHead>
                    <TableHead className="text-start font-semibold text-xs">وقت النهاية</TableHead>
                    <TableHead className="text-start font-semibold text-xs">رصيد افتتاحي</TableHead>
                    <TableHead className="text-start font-semibold text-xs">رصيد ختامي</TableHead>
                    <TableHead className="text-start font-semibold text-xs">الحالة</TableHead>
                    <TableHead className="text-start font-semibold text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const state = getSessionState(r);
                    return (
                      <TableRow
                        key={r.name}
                        className={cn(
                          'hover:bg-muted/40 transition-colors',
                          state === 'open' && 'bg-warning/[0.03]'
                        )}
                      >
                        <TableCell className="font-mono text-xs tabular-nums">{r.name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <CircleDot className={cn('h-3 w-3 shrink-0', state === 'open' ? 'text-warning' : 'text-muted-foreground/50')} />
                            <span className="truncate max-w-[120px]" title={r.pos_profile}>
                              {r.pos_profile ?? '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[120px]" title={r.user}>
                          {r.user ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {r.period_start_date ? formatDate(r.period_start_date) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {r.period_end_date ? formatDate(r.period_end_date) : '—'}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          <span className="font-medium">
                            {r.opening_balance != null ? formatCurrency(Number(r.opening_balance)) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          <span className={cn('font-medium', state === 'closed' && 'text-success')}>
                            {r.closing_balance != null ? formatCurrency(Number(r.closing_balance)) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SessionStatusBadge status={r.status} docstatus={r.docstatus} />
                        </TableCell>
                        <TableCell className="text-start">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/pos/sessions/${encodeURIComponent(r.name)}`}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                            >
                              تفاصيل
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </PageShell>

      {/* ── حوار فتح وردية جديدة ── */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-warning" />
              فتح وردية جديدة
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              اختر ملف نقطة البيع وأدخل الرصيد الافتتاحي لبدء وردية جديدة.
              يمكن فتح الوردية من شاشة البيع أيضاً.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ملف نقطة البيع */}
            <div className="space-y-2">
              <Label className="text-xs">ملف نقطة البيع *</Label>
              <ErpLinkCombobox
                doctype="POS Profile"
                value={openProfile}
                onChange={setOpenProfile}
                placeholder="اختر ملف نقطة البيع..."
                showCreateShortcut={false}
              />
            </div>

            {/* الشركة */}
            <div className="space-y-2">
              <Label className="text-xs">الشركة</Label>
              <Select
                dir="rtl"
                value={openCompany || company}
                onValueChange={setOpenCompany}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر الشركة" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {companies.map((c) => (
                    <SelectItem key={String(c.name)} value={String(c.name)}>
                      {String(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!openCompany && company && (
                <p className="text-[10px] text-muted-foreground">الشركة الافتراضية: {company}</p>
              )}
            </div>

            {/* الرصيد الافتتاحي */}
            <div className="space-y-2">
              <Label className="text-xs">الرصيد الافتتاحي</Label>
              <Input
                type="number"
                dir="ltr"
                min={0}
                step="any"
                className="h-9 tabular-nums"
                value={openBalance}
                onChange={(e) => setOpenBalance(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-[10px] text-muted-foreground">
                المبلغ المتوفر في الصندوق عند بدء الوردية. يمكن تركه صفراً.
              </p>
            </div>

            {/* ملخص سريع */}
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs space-y-1">
              <p className="font-medium">ملخص</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ملف نقطة البيع</span>
                <span>{openProfile || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الشركة</span>
                <span>{openCompany || company || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرصيد الافتتاحي</span>
                <span className="tabular-nums">{formatCurrency(Number(openBalance) || 0)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={isBusy || !openProfile}
              onClick={handleOpenSession}
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الفتح
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  تأكيد فتح الوردية
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── حوار إغلاق وردية ── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-4 w-4 text-success" />
              إغلاق وردية
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              اختر وردية مفتوحة وأدخل الرصيد الختامي لإغلاقها وترحيلها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* اختيار وردية مفتوحة */}
            <div className="space-y-2">
              <Label className="text-xs">اختر وردية مفتوحة *</Label>
              {openSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">لا توجد ورديات مفتوحة للإغلاق</p>
              ) : (
                <Select dir="rtl" value={closeSessionName} onValueChange={(v) => {
                  setCloseSessionName(v);
                  const sel = openSessions.find((s) => s.name === v);
                  if (sel) {
                    setCloseBalance(String(sel.closing_balance ?? sel.opening_balance ?? 0));
                  }
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر الوردية..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {openSessions.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name} · {s.pos_profile ?? '—'} · {s.user ?? '—'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* بيانات الوردية المختارة */}
            {closeSessionName && (() => {
              const sel = openSessions.find((s) => s.name === closeSessionName);
              if (!sel) return null;
              return (
                <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs space-y-1">
                  <p className="font-medium">بيانات الوردية</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ملف نقطة البيع</span>
                    <span>{sel.pos_profile ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المستخدم</span>
                    <span>{sel.user ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">وقت البداية</span>
                    <span className="tabular-nums">{sel.period_start_date ? formatDate(sel.period_start_date) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الرصيد الافتتاحي</span>
                    <span className="tabular-nums">{sel.opening_balance != null ? formatCurrency(Number(sel.opening_balance)) : '—'}</span>
                  </div>
                </div>
              );
            })()}

            {/* الرصيد الختامي */}
            {closeSessionName && (
              <div className="space-y-2">
                <Label className="text-xs">الرصيد الختامي</Label>
                <Input
                  type="number"
                  dir="ltr"
                  step="any"
                  className="h-9 tabular-nums"
                  value={closeBalance}
                  onChange={(e) => setCloseBalance(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-[10px] text-muted-foreground">
                  أدخل المبلغ الفعلي الموجود في الصندوق عند الإغلاق. الفرق يُسجّل كفرق تسوية.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setCloseDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={isBusy || !closeSessionName}
              onClick={handleCloseSession}
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الإغلاق
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  تأكيد إغلاق الوردية
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

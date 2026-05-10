'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Layers,
  TrendingUp,
  TrendingDown,
  Send,
  Trash2,
} from 'lucide-react';
import {
  useDocList,
  useDeleteDoc,
  useSubmitDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc, apiSubmitDoc } from '@/lib/client/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────
   Types
   ──────────────────────────────────────── */

type SalaryComponentRow = {
  name: string;
  salary_component?: string;
  type?: string;
  depends_on_lwp?: number | boolean;
  is_tax_applicable?: number | boolean;
  is_flexible_benefit?: number | boolean;
  statistical_component?: number | boolean;
  description?: string;
  docstatus?: number;
};

type FormData = {
  salary_component: string;
  type: 'Earning' | 'Deduction';
  salary_component_abbr: string;
  depends_on_lwp: boolean;
  is_tax_applicable: boolean;
  is_flexible_benefit: boolean;
  statistical_component: boolean;
  description: string;
  condition: string;
  formula: string;
};

const initialForm: FormData = {
  salary_component: '',
  type: 'Earning',
  salary_component_abbr: '',
  depends_on_lwp: false,
  is_tax_applicable: false,
  is_flexible_benefit: false,
  statistical_component: false,
  description: '',
  condition: '',
  formula: '',
};

/* ────────────────────────────────────────
   Helper: boolean-like field renderer
   ──────────────────────────────────────── */

function BoolBadge({ value, trueLabel, falseLabel }: { value: unknown; trueLabel: string; falseLabel: string }) {
  const on = Number(value) === 1 || value === true;
  return on ? (
    <span className="text-xs font-medium text-emerald-700 bg-primary/5 dark:text-emerald-300 dark:bg-primary/10 px-2 py-0.5 rounded-full">
      {trueLabel}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      {falseLabel}
    </span>
  );
}

/* ────────────────────────────────────────
   Component
   ──────────────────────────────────────── */

export default function SalaryComponentsPage() {
  const [tab, setTab] = useState('components');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<SalaryComponentRow | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'Earning' | 'Deduction'>('all');
  const [formData, setFormData] = useState<FormData>({ ...initialForm });
  const qc = useQueryClient();

  /* ── Data ── */
  const { data, isLoading, isError, error, refetch } = useDocList<SalaryComponentRow>('Salary Component', {
    fields: [
      'name',
      'salary_component',
      'type',
      'depends_on_lwp',
      'is_tax_applicable',
      'is_flexible_benefit',
      'statistical_component',
      'description',
      'docstatus',
    ],
    limit: 500,
    order_by: 'modified desc',
  });

  const deleteMutation = useDeleteDoc('Salary Component');
  const submitMutation = useSubmitDoc('Salary Component');

  const components = data || [];

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return components;
    return components.filter((r) => r.type === typeFilter);
  }, [components, typeFilter]);

  /* ── KPIs ── */
  const totalCount = components.length;
  const earningCount = components.filter((r) => r.type === 'Earning').length;
  const deductionCount = components.filter((r) => r.type === 'Deduction').length;

  /* ── Create mutation ── */
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.salary_component.trim()) throw new Error('اسم المكوّن مطلوب');
      const payload: Record<string, unknown> = {
        doctype: 'Salary Component',
        salary_component: formData.salary_component.trim(),
        type: formData.type,
        salary_component_abbr: formData.salary_component_abbr.trim() || undefined,
        depends_on_lwp: formData.depends_on_lwp ? 1 : 0,
        is_tax_applicable: formData.is_tax_applicable ? 1 : 0,
        is_flexible_benefit: formData.is_flexible_benefit ? 1 : 0,
        statistical_component: formData.statistical_component ? 1 : 0,
        description: formData.description.trim() || undefined,
        condition: formData.condition.trim() || undefined,
        formula: formData.formula.trim() || undefined,
      };
      const created = await apiCreateDoc<{ name: string }>('Salary Component', prepareFrappeDocForCreate(payload));
      if (created?.name) await apiSubmitDoc('Salary Component', created.name);
      return created;
    },
    onSuccess: () => {
      toast.success('تم إنشاء المكوّن وترحيله');
      qc.invalidateQueries({ queryKey: ['docList', 'Salary Component'] });
      setDialogOpen(false);
      setFormData({ ...initialForm });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'تعذر إنشاء المكوّن');
    },
  });

  /* ── Handlers ── */
  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setFormData({ ...initialForm });
  };

  /* ── Columns ── */
  const columns: Column<SalaryComponentRow>[] = [
    {
      key: 'name',
      header: 'الرقم',
      sortable: true,
      width: 'w-28',
      render: (value) => <span className="font-medium text-primary">{String(value)}</span>,
    },
    {
      key: 'salary_component',
      header: 'اسم المكوّن',
      sortable: true,
      render: (value) => <span className="font-medium">{String(value || '—')}</span>,
    },
    {
      key: 'type',
      header: 'النوع',
      sortable: true,
      render: (value) => {
        const v = String(value);
        if (v === 'Earning') {
          return (
            <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary ring-1 ring-inset ring-primary/25">
              استحقاق
            </Badge>
          );
        }
        if (v === 'Deduction') {
          return (
            <Badge variant="outline" className="border-0 text-xs font-semibold px-2 py-0.5 bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25">
              استقطاع
            </Badge>
          );
        }
        return <span>{v || '—'}</span>;
      },
    },
    {
      key: 'depends_on_lwp',
      header: 'يعتمد على الإجازة',
      render: (value) => <BoolBadge value={value} trueLabel="نعم" falseLabel="لا" />,
    },
    {
      key: 'is_tax_applicable',
      header: 'خاضع للضريبة',
      render: (value) => <BoolBadge value={value} trueLabel="نعم" falseLabel="لا" />,
    },
    {
      key: 'is_flexible_benefit',
      header: 'ميزة مرنة',
      render: (value) => <BoolBadge value={value} trueLabel="نعم" falseLabel="لا" />,
    },
    {
      key: 'docstatus',
      header: 'الحالة',
      render: (value) => <DocStatusBadge docstatus={Number(value ?? 0) as 0 | 1 | 2} />,
    },
  ];

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مكوّنات الرواتب"
        description="إدارة مكوّنات الاستحقاق والاستقطاع — الأساس لكل هيكل رواتب"
        iconify="solar:widget-2-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مكوّنات الرواتب' }]}
      />

      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي المكوّنات"
          value={totalCount}
          icon={Layers}
          accent="primary"
          description="جميع المكوّنات"
        />
        <KpiCard
          title="استحقاقات"
          value={earningCount}
          icon={TrendingUp}
          accent="success"
          description="مكوّنات نوع Earning"
        />
        <KpiCard
          title="استقطاعات"
          value={deductionCount}
          icon={TrendingDown}
          accent="destructive"
          description="مكوّنات نوع Deduction"
        />
      </KpiStrip>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap justify-between gap-3">
          <TabsList>
            <TabsTrigger value="components">المكوّنات</TabsTrigger>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          </TabsList>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                مكوّن جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة مكوّن راتب</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3">
                {/* اسم المكوّن */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    اسم المكوّن <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="مثال: الراتب الأساسي"
                    value={formData.salary_component}
                    onChange={(e) => setFormData((p) => ({ ...p, salary_component: e.target.value }))}
                  />
                </div>

                {/* النوع والاختصار */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">النوع</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                      value={formData.type}
                      onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'Earning' | 'Deduction' }))}
                    >
                      <option value="Earning">استحقاق</option>
                      <option value="Deduction">استقطاع</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الاختصار</Label>
                    <Input
                      placeholder="مثال: BS, HA"
                      dir="ltr"
                      value={formData.salary_component_abbr}
                      onChange={(e) => setFormData((p) => ({ ...p, salary_component_abbr: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="depends_on_lwp"
                      checked={formData.depends_on_lwp}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, depends_on_lwp: !!v }))}
                    />
                    <Label htmlFor="depends_on_lwp" className="text-xs">يعتمد على الإجازة بدون راتب</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_tax_applicable"
                      checked={formData.is_tax_applicable}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, is_tax_applicable: !!v }))}
                    />
                    <Label htmlFor="is_tax_applicable" className="text-xs">خاضع للضريبة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_flexible_benefit"
                      checked={formData.is_flexible_benefit}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, is_flexible_benefit: !!v }))}
                    />
                    <Label htmlFor="is_flexible_benefit" className="text-xs">ميزة مرنة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="statistical_component"
                      checked={formData.statistical_component}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, statistical_component: !!v }))}
                    />
                    <Label htmlFor="statistical_component" className="text-xs">مكوّن إحصائي</Label>
                  </div>
                </div>

                {/* الوصف */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف</Label>
                  <Input
                    placeholder="وصف اختياري للمكوّن"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* الشرط والصيغة */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <p className="text-[10px] text-muted-foreground font-medium">الشرط والصيغة</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">الشرط</Label>
                    <Input
                      placeholder="مثال: base > 100000"
                      dir="ltr"
                      className="text-xs font-mono"
                      value={formData.condition}
                      onChange={(e) => setFormData((p) => ({ ...p, condition: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">الصيغة</Label>
                    <Input
                      placeholder="مثال: base * 0.1"
                      dir="ltr"
                      className="text-xs font-mono"
                      value={formData.formula}
                      onChange={(e) => setFormData((p) => ({ ...p, formula: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء وترحيل'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* ─── Tab: المكوّنات ─── */}
        <TabsContent value="components" className="mt-4 space-y-4">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">فلتر النوع:</Label>
            <div className="flex gap-1">
              {([
                { value: 'all', label: 'الكل' },
                { value: 'Earning', label: 'استحقاق' },
                { value: 'Deduction', label: 'استقطاع' },
              ] as const).map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={typeFilter === opt.value ? 'default' : 'outline'}
                  className={cn(
                    'h-7 text-xs',
                    typeFilter === opt.value && opt.value === 'Earning' && 'bg-chart-3 hover:bg-chart-3',
                    typeFilter === opt.value && opt.value === 'Deduction' && 'bg-destructive hover:bg-destructive',
                  )}
                  onClick={() => setTypeFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
          <PageShell padded={false}>
            <DataTable
              data={filtered}
              columns={columns}
              searchable
              loading={isLoading}
              onDelete={(row) => Number(row.docstatus) === 0 && setDeleteDialog(row)}
              onEdit={(row) => {
                if (Number(row.docstatus) !== 0) return;
                submitMutation.mutate(row.name, {
                  onSuccess: () => toast.success('تم ترحيل المكوّن'),
                  onError: () => toast.error('فشل ترحيل المكوّن'),
                });
              }}
            />
          </PageShell>
          <p className="text-[10px] text-muted-foreground">
            للمسودات: من القائمة «تعديل» لترحيل المكوّن، أو «حذف» لإزالة المسودة.
          </p>
        </TabsContent>

        {/* ─── Tab: نظرة عامة ─── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings breakdown */}
            <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-chart-3" aria-hidden />
                مكوّنات الاستحقاق ({earningCount})
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {components
                  .filter((r) => r.type === 'Earning')
                  .map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                      <span className="font-medium">{r.salary_component || r.name}</span>
                      <div className="flex items-center gap-1.5">
                        {Number(r.is_tax_applicable) === 1 && (
                          <span className="text-[10px] bg-chart-2/5 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300 px-1.5 py-0.5 rounded">ضريبة</span>
                        )}
                        {Number(r.is_flexible_benefit) === 1 && (
                          <span className="text-[10px] bg-chart-1/5 text-sky-700 dark:bg-chart-1/10 dark:text-sky-300 px-1.5 py-0.5 rounded">مرن</span>
                        )}
                        <DocStatusBadge docstatus={Number(r.docstatus ?? 0) as 0 | 1 | 2} />
                      </div>
                    </div>
                  ))}
                {earningCount === 0 && (
                  <p className="text-xs text-muted-foreground py-2">لا توجد مكوّنات استحقاق</p>
                )}
              </div>
            </div>

            {/* Deductions breakdown */}
            <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
                مكوّنات الاستقطاع ({deductionCount})
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {components
                  .filter((r) => r.type === 'Deduction')
                  .map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                      <span className="font-medium">{r.salary_component || r.name}</span>
                      <div className="flex items-center gap-1.5">
                        {Number(r.is_tax_applicable) === 1 && (
                          <span className="text-[10px] bg-chart-2/5 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300 px-1.5 py-0.5 rounded">ضريبة</span>
                        )}
                        <DocStatusBadge docstatus={Number(r.docstatus ?? 0) as 0 | 1 | 2} />
                      </div>
                    </div>
                  ))}
                {deductionCount === 0 && (
                  <p className="text-xs text-muted-foreground py-2">لا توجد مكوّنات استقطاع</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المكوّن؟</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.salary_component || deleteDialog?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog &&
                deleteMutation.mutate(deleteDialog.name, {
                  onSuccess: () => {
                    toast.success('تم حذف المكوّن');
                    setDeleteDialog(null);
                  },
                  onError: () => toast.error('فشل حذف المكوّن'),
                })
              }
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

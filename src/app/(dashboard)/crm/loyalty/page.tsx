'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { BarChart3, Plus, Heart, Users, Star, Zap, Pencil, CalendarDays } from 'lucide-react';
import { useCreateDoc, useDocList, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type LPRow = {
  name: string;
  loyalty_program_name?: string;
  from_date?: string;
  collection_factor?: number;
  tier_name?: string;
  company?: string;
  auto_optimize?: number | boolean;
  customer_collection?: string;
  collection_rules?: unknown[];
};

const emptyForm = {
  loyalty_program_name: '',
  tier_name: 'أساسي',
  min_amount: '0',
  collection_factor: '1',
  from_date: new Date().toISOString().slice(0, 10),
  auto_optimize: false,
};

/** ولاء العملاء — قوائم ERPNext + تقارير المركز + إنشاء برنامج أساسي (M-28). */
export default function CrmLoyaltyPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LPRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);

  const { data = [], isLoading, isError, error, refetch } = useDocList<LPRow>('Loyalty Program', {
    fields: ['name', 'loyalty_program_name', 'from_date', 'collection_factor', 'company', 'auto_optimize', 'collection_rules'],
    limit: 200,
    order_by: 'modified desc',
  });

  const createLp = useCreateDoc('Loyalty Program');
  const deleteLp = useDeleteDoc('Loyalty Program');
  const updateLp = useUpdateDoc('Loyalty Program');

  // ── KPIs ──
  const totalPrograms = data.length;
  const totalCollectionFactor = data.reduce((sum, p) => sum + (Number(p.collection_factor) || 0), 0);
  const activeWithOptimize = data.filter(p => Number(p.auto_optimize) === 1).length;

  // ── Create handler ──
  const handleCreate = () => {
    if (!formData.loyalty_program_name.trim()) {
      toast.error('اسم البرنامج مطلوب');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة من النظام');
      return;
    }
    createLp.mutate(
      {
        company: defaultCompany,
        loyalty_program_name: formData.loyalty_program_name.trim(),
        from_date: formData.from_date,
        auto_optimize: formData.auto_optimize ? 1 : 0,
        collection_rules: [
          {
            tier_name: formData.tier_name || 'أساسي',
            min_amount: Number(formData.min_amount) || 0,
            collection_factor: Number(formData.collection_factor) || 1,
          },
        ],
      } as Record<string, unknown>,
      {
        onSuccess: () => {
          toast.success('تم إنشاء برنامج الولاء بنجاح');
          setDialogOpen(false);
          setFormData(emptyForm);
          void refetch();
        },
        onError: () =>
          toast.error('فشل الإنشاء — تحقق من صلاحيات البيع ولحقول Loyalty Program على الخادم'),
      }
    );
  };

  // ── Edit handlers ──
  const openEditDialog = (row: LPRow) => {
    setSelected(row);
    // Extract tier info from collection_rules if available
    let tierName = 'أساسي';
    let minAmount = '0';
    let collectionFactor = '1';
    const rules = row.collection_rules as Array<{ tier_name?: string; min_amount?: number; collection_factor?: number }> | undefined;
    if (rules && rules.length > 0) {
      tierName = rules[0].tier_name || 'أساسي';
      minAmount = String(rules[0].min_amount ?? 0);
      collectionFactor = String(rules[0].collection_factor ?? 1);
    } else {
      collectionFactor = String(row.collection_factor ?? 1);
    }
    setEditFormData({
      loyalty_program_name: row.loyalty_program_name || row.name,
      tier_name: tierName,
      min_amount: minAmount,
      collection_factor: collectionFactor,
      from_date: row.from_date || '',
      auto_optimize: Number(row.auto_optimize) === 1,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    if (!editFormData.loyalty_program_name.trim()) {
      toast.error('اسم البرنامج مطلوب');
      return;
    }
    const doc: Record<string, unknown> = {
      loyalty_program_name: editFormData.loyalty_program_name.trim(),
      from_date: editFormData.from_date || undefined,
      auto_optimize: editFormData.auto_optimize ? 1 : 0,
      collection_rules: [
        {
          tier_name: editFormData.tier_name || 'أساسي',
          min_amount: Number(editFormData.min_amount) || 0,
          collection_factor: Number(editFormData.collection_factor) || 1,
        },
      ],
    };
    updateLp.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث برنامج الولاء بنجاح');
          setEditDialogOpen(false);
          setSelected(null);
          void refetch();
        },
        onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
      }
    );
  };

  // ── Delete handler ──
  const handleDelete = () => {
    if (!selected) return;
    deleteLp.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم حذف برنامج الولاء بنجاح');
        setDeleteDialogOpen(false);
        setSelected(null);
        void refetch();
      },
      onError: () => toast.error('فشل الحذف — تحقق من الصلاحيات'),
    });
  };

  // ── Columns ──
  const columns: Column<LPRow>[] = useMemo(
    () => [
      {
        key: 'loyalty_program_name',
        header: 'البرنامج',
        sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">{row.loyalty_program_name || row.name}</span>
          </div>
        ),
      },
      {
        key: 'from_date',
        header: 'تاريخ البدء',
        sortable: true,
        render: (v) => <span className="text-muted-foreground" dir="ltr">{String(v || '—')}</span>,
      },
      {
        key: 'collection_factor',
        header: 'معامل التجميع',
        width: 'w-28',
        render: (v) => (
          <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-primary/10 text-primary">
            {Number(v || 0).toLocaleString('en-US')}
          </Badge>
        ),
      },
      {
        key: 'company',
        header: 'الشركة',
        render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'auto_optimize',
        header: 'تحسين تلقائي',
        width: 'w-28',
        render: (v) => (
          <Badge variant="outline" className={cn(
            'text-[10px] font-medium px-2 py-0.5 border-0',
            Number(v) === 1 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          )}>
            {Number(v) === 1 ? 'مفعّل' : 'معطّل'}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="ولاء العملاء"
        description="عرض برامج الولاء وإنشاء برنامج جديد؛ تقرير تحليلي من مركز التقارير."
        iconify="solar:heart-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'الولاء' }]}
        actions={
          <Button size="sm" className="gap-2" disabled={coLoading} onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            برنامج ولاء
          </Button>
        }
      />
      {/* رابط التقرير */}
      <Card className="border-border/40">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">تقرير نقاط الولاء والحركة</p>
          <Button asChild size="sm" variant="secondary" className="gap-2">
            <Link href="/reports?openReport=crm-loyalty">
              <BarChart3 className="h-4 w-4" />
              فتح التقرير في المركز
            </Link>
          </Button>
        </CardContent>
      </Card>

      <PageShell className="space-y-4" padded={false}>
        <DataTable
          data={data}
          columns={columns}
          searchable
          loading={isLoading}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
          tableId="crm-loyalty-programs"
          exportFileName="loyalty-programs.csv"
          printTitle="برامج الولاء"
        />
      </PageShell>

      {/* ════════════════════════════════════════════════════════
          Create Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>برنامج ولاء جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات برنامج الولاء</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Star className="h-3 w-3 text-primary" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم البرنامج <span className="text-destructive text-xs">*</span></Label>
                  <Input
                    placeholder="مثال: ولاء عملاء التجزئة"
                    value={formData.loyalty_program_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, loyalty_program_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ البدء</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={formData.from_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تحسين تلقائي</Label>
                    <Select
                      dir="rtl"
                      value={formData.auto_optimize ? '1' : '0'}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, auto_optimize: val === '1' }))}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="0">معطّل</SelectItem>
                        <SelectItem value="1">مفعّل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Zap className="h-3 w-3 text-warning" /></span>
                  قاعدة النقاط الافتراضية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم المستوى</Label>
                    <Input
                      placeholder="أساسي"
                      value={formData.tier_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, tier_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحد الأدنى للمبلغ</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      placeholder="0"
                      value={formData.min_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">معامل التجميع</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      placeholder="1"
                      value={formData.collection_factor}
                      onChange={(e) => setFormData(prev => ({ ...prev, collection_factor: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  يُنشئ صفاً بقاعدة نقاط افتراضية (مجموعة واحدة). مستويات إضافية تُضاف لاحقاً عبر واجهات التطبيق أو تحديث المستند.
                </p>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createLp.isPending || coLoading} className="gap-1.5 min-w-[130px]">
              {createLp.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ البرنامج'}
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
                <span>تعديل برنامج الولاء</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل: {selected?.loyalty_program_name || selected?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Star className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود البرنامج</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم البرنامج <span className="text-destructive text-xs">*</span></Label>
                  <Input
                    placeholder="اسم البرنامج"
                    value={editFormData.loyalty_program_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, loyalty_program_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ البدء</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={editFormData.from_date}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, from_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تحسين تلقائي</Label>
                    <Select
                      dir="rtl"
                      value={editFormData.auto_optimize ? '1' : '0'}
                      onValueChange={(val) => setEditFormData(prev => ({ ...prev, auto_optimize: val === '1' }))}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="0">معطّل</SelectItem>
                        <SelectItem value="1">مفعّل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Zap className="h-3 w-3 text-warning" /></span>
                  قاعدة النقاط
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم المستوى</Label>
                    <Input
                      value={editFormData.tier_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, tier_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحد الأدنى للمبلغ</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={editFormData.min_amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, min_amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">معامل التجميع</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={editFormData.collection_factor}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, collection_factor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateLp.isPending} className="gap-1.5 min-w-[130px]">
              {updateLp.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
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
            <AlertDialogDescription>
              هل أنت متأكد من حذف برنامج الولاء &quot;{selected?.loyalty_program_name || selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
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

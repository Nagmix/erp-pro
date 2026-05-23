'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Send,
  Undo2,
  Trash2,
  Edit,
  Layers,
  FileCheck,
  FileClock,
} from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useSubmitDoc,
  useCancelDoc,
  useDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  buildSalaryStructureCreate,
  buildSalaryStructureAssignmentCreate,
  prepareFrappeDocForCreate,
} from '@/lib/erp/erpnext-payloads';
import { apiSubmitDoc } from '@/lib/client/api';
import { KpiCard } from '@/components/erp/kpi-card';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

type StructureRow = {
  name: string;
  company?: string;
  currency?: string;
  payroll_frequency?: string;
  is_active?: string;
  docstatus?: number;
};

type AssignRow = {
  name: string;
  employee_name?: string;
  salary_structure?: string;
  from_date?: string;
  company?: string;
};

const columns: Column<StructureRow>[] = [
  {
    key: 'name',
    header: 'الاسم',
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  { key: 'company', header: 'الشركة' },
  {
    key: 'currency',
    header: 'العملة',
    render: (v) => String(v || '—'),
  },
  {
    key: 'payroll_frequency',
    header: 'دورة الدفع',
    render: (v) => {
      const map: Record<string, string> = {
        Monthly: 'شهري',
        Fortnightly: 'نصف شهري',
        Bimonthly: 'كل شهرين',
        Weekly: 'أسبوعي',
        Daily: 'يومي',
      };
      return map[String(v)] || String(v || '—');
    },
  },
  {
    key: 'is_active',
    header: 'نشط',
    render: (v) => {
      const val = String(v || '');
      if (val === 'Yes') return 'نعم';
      if (val === 'No') return 'لا';
      return val || '—';
    },
  },
  {
    key: 'docstatus',
    header: 'المستند',
    render: (v) => (
      <DocStatusBadge docstatus={Number(v ?? 0) as 0 | 1 | 2} />
    ),
  },
];

const assignCols: Column<AssignRow>[] = [
  {
    key: 'name',
    header: 'الرقم',
    render: (v) => (
      <span className="text-xs text-primary">{String(v)}</span>
    ),
  },
  { key: 'employee_name', header: 'الموظف' },
  { key: 'salary_structure', header: 'الهيكل' },
  {
    key: 'from_date',
    header: 'من',
    render: (v) => (v ? formatDate(String(v)) : '—'),
  },
];

interface ComponentItem {
  salary_component: string;
  amount: string;
}

const initialForm = {
  name: '',
  currency: '',
  payroll_frequency: 'Monthly',
  earnings: [{ salary_component: '', amount: '0' }] as ComponentItem[],
  deductions: [{ salary_component: '', amount: '0' }] as ComponentItem[],
};

export default function SalaryStructuresPage() {
  const [tab, setTab] = useState('structures');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<StructureRow | null>(null);
  const [formData, setFormData] = useState({
    ...initialForm,
    earnings: [...initialForm.earnings],
    deductions: [...initialForm.deductions],
  });
  const [assignForm, setAssignForm] = useState({
    employee: '',
    salary_structure: '',
    from_date: '',
  });
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const qc = useQueryClient();
  // Edit state
  const [editingDoc, setEditingDoc] = useState<StructureRow | null>(null);
  const { data: editFullDoc } = useDoc<
    StructureRow & { earnings?: ComponentItem[]; deductions?: ComponentItem[] }
  >('Salary Structure', editingDoc?.name ?? '', {
    enabled: !!editingDoc && dialogOpen,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<StructureRow>('Salary Structure', {
    fields: [
      'name',
      'company',
      'currency',
      'payroll_frequency',
      'is_active',
      'docstatus',
    ],
    filters: company ? [['company', '=', company]] : [],
    limit: 200,
  });
  const {
    data: assigns,
    isLoading: al,
    isError: ae,
    error: aerr,
    refetch: ar,
  } = useDocList<AssignRow>('Salary Structure Assignment', {
    fields: [
      'name',
      'employee_name',
      'salary_structure',
      'from_date',
      'company',
    ],
    limit: 300,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('no company');
      if (!formData.name.trim()) throw new Error('name');
      const cur = formData.currency || 'YER';
      const earnings = formData.earnings
        .filter((e) => e.salary_component && Number(e.amount) > 0)
        .map((e) => ({
          salary_component: e.salary_component,
          amount: Number(e.amount),
        }));
      if (earnings.length === 0) throw new Error('earnings');
      const deductions = formData.deductions
        .filter((e) => e.salary_component && Number(e.amount) > 0)
        .map((e) => ({
          salary_component: e.salary_component,
          amount: Number(e.amount),
        }));
      const mapped = buildSalaryStructureCreate({
        name: formData.name,
        company,
        currency: cur,
        payroll_frequency: formData.payroll_frequency,
        earnings,
        deductions,
      });
      const { apiCreateDoc } = await import('@/lib/client/api');
      const created = await apiCreateDoc<{ name: string }>(
        'Salary Structure',
        prepareFrappeDocForCreate(mapped)
      );
      if (created?.name) await apiSubmitDoc('Salary Structure', created.name);
      return created;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الهيكل وترحيله');
      qc.invalidateQueries({ queryKey: ['docList', 'Salary Structure'] });
      setDialogOpen(false);
      setFormData({
        ...initialForm,
        earnings: [{ salary_component: '', amount: '0' }],
        deductions: [{ salary_component: '', amount: '0' }],
      });
    },
    onError: (e: Error) => {
      toast.error(e.message === 'earnings'
            ? 'أضف بند استحقاق واحداً على الأقل'
            : 'تعذر الحفظ أو الترحيل');
    },
  });

  const updateMutation = useUpdateDoc('Salary Structure');
  const deleteMutation = useDeleteDoc('Salary Structure');
  const createAssign = useCreateDoc('Salary Structure Assignment');
  const submitMutation = useSubmitDoc('Salary Structure');
  const cancelMutation = useCancelDoc('Salary Structure');

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  const structures = data || [];

  // When editFullDoc loads, populate earnings/deductions
  useEffect(() => {
    if (
      editingDoc &&
      editFullDoc &&
      formData.earnings.length === 1 &&
      !formData.earnings[0].salary_component
    ) {
      const eArr =
        Array.isArray(editFullDoc.earnings) && editFullDoc.earnings.length > 0
          ? editFullDoc.earnings.map((e: ComponentItem) => ({
              salary_component: e.salary_component || '',
              amount: String(e.amount || '0'),
            }))
          : [{ salary_component: '', amount: '0' }];
      const dArr =
        Array.isArray(editFullDoc.deductions) && editFullDoc.deductions.length > 0
          ? editFullDoc.deductions.map((e: ComponentItem) => ({
              salary_component: e.salary_component || '',
              amount: String(e.amount || '0'),
            }))
          : [{ salary_component: '', amount: '0' }];
      setFormData((p) => ({ ...p, earnings: eArr, deductions: dArr }));
    }
  }, [editingDoc, editFullDoc, formData.earnings]);

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="هياكل الرواتب"
          description="هيكل الراتب + تعيين هيكل الراتب"
          iconify="solar:document-text-bold-duotone"
          accent="primary"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'هياكل الرواتب' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  const updateEarning = (
    idx: number,
    field: keyof ComponentItem,
    value: string
  ) => {
    const next = [...formData.earnings];
    next[idx] = { ...next[idx], [field]: value };
    setFormData((p) => ({ ...p, earnings: next }));
  };
  const updateDeduction = (
    idx: number,
    field: keyof ComponentItem,
    value: string
  ) => {
    const next = [...formData.deductions];
    next[idx] = { ...next[idx], [field]: value };
    setFormData((p) => ({ ...p, deductions: next }));
  };

  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({
      ...initialForm,
      earnings: [{ salary_component: '', amount: '0' }],
      deductions: [{ salary_component: '', amount: '0' }],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: StructureRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل مستند معتمد — الهياكل المرحّلة غير قابلة للتعديل');
      return;
    }
    setEditingDoc(row);
    setFormData({
      name: row.name,
      currency: row.currency || '',
      payroll_frequency: row.payroll_frequency || 'Monthly',
      earnings: [{ salary_component: '', amount: '0' }],
      deductions: [{ salary_component: '', amount: '0' }],
    });
    setDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    const earnings = formData.earnings
      .filter((e) => e.salary_component && Number(e.amount) > 0)
      .map((e) => ({
        salary_component: e.salary_component,
        amount: Number(e.amount),
      }));
    const deductions = formData.deductions
      .filter((e) => e.salary_component && Number(e.amount) > 0)
      .map((e) => ({
        salary_component: e.salary_component,
        amount: Number(e.amount),
      }));
    updateMutation.mutate(
      {
        name: editingDoc.name,
        doc: {
          currency: formData.currency || 'YER',
          payroll_frequency: formData.payroll_frequency,
          earnings,
          deductions,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم تعديل الهيكل');
          setDialogOpen(false);
          setEditingDoc(null);
        },
        onError: () => toast.error('تعذر تعديل الهيكل'),
      }
    );
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDoc(null);
      setFormData({
        ...initialForm,
        earnings: [{ salary_component: '', amount: '0' }],
        deductions: [{ salary_component: '', amount: '0' }],
      });
    }
  };

  const handleAssign = () => {
    if (
      !assignForm.employee ||
      !assignForm.salary_structure ||
      !assignForm.from_date ||
      !company
    ) {
      toast.error('أكمل الحقول');
      return;
    }
    const mapped = buildSalaryStructureAssignmentCreate({
      employee: assignForm.employee,
      salary_structure: assignForm.salary_structure,
      company,
      from_date: assignForm.from_date,
    });
    createAssign.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => {
        toast.success('تم الربط');
        setAssignOpen(false);
        setAssignForm({ employee: '', salary_structure: '', from_date: '' });
        ar();
      },
      onError: () =>
        toast.error('فشل تعيين الهيكل'),
    });
  };

  const handleSubmit = (row: StructureRow) => {
    submitMutation.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم ترحيل الهيكل');
        void refetch();
      },
      onError: () => {
        toast.error('تعذر ترحيل الهيكل');
      },
    });
  };

  const handleCancel = (row: StructureRow) => {
    cancelMutation.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم إلغاء الهيكل');
        void refetch();
      },
      onError: () => {
        toast.error('تعذر إلغاء الهيكل');
      },
    });
  };

  const totalCount = structures.length;
  const draftCount = structures.filter((r) => Number(r.docstatus) === 0).length;
  const submittedCount = structures.filter(
    (r) => Number(r.docstatus) === 1
  ).length;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="هياكل الرواتب"
        description="هيكل الراتب + تعيين هيكل الراتب"
        iconify="solar:document-text-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'الموارد البشرية', href: '/hr' },
          { label: 'هياكل الرواتب' },
        ]}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="إجمالي الهياكل" value={totalCount} icon={Layers} accent="primary" compact />
        <KpiCard title="مسودات" value={draftCount} icon={FileClock} accent="warning" compact />
        <KpiCard title="مُرحّلة" value={submittedCount} icon={FileCheck} accent="success" compact />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap justify-between gap-3">
          <TabsList>
            <TabsTrigger value="structures">الهياكل</TabsTrigger>
            <TabsTrigger value="assign">ربط بالموظف</TabsTrigger>
          </TabsList>
          {tab === 'structures' && (
            <Button
              size="sm"
              disabled={coLoading}
              onClick={openCreateDialog}
            >
              <Plus className="h-3.5 w-3.5" />
              هيكل جديد
            </Button>
          )}
          {tab === 'assign' && (
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={coLoading}>
                  <Plus className="h-3.5 w-3.5" />
                  ربط موظف
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تعيين هيكل الراتب</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <ErpLinkCombobox
                    doctype="Employee"
                    value={assignForm.employee}
                    onChange={(v) =>
                      setAssignForm((p) => ({ ...p, employee: v }))
                    }
                    displayKey="employee_name"
                  />
                  <ErpLinkCombobox
                    doctype="Salary Structure"
                    value={assignForm.salary_structure}
                    onChange={(v) =>
                      setAssignForm((p) => ({ ...p, salary_structure: v }))
                    }
                  />
                  <Input
                    type="date"
                    dir="ltr"
                    value={assignForm.from_date}
                    onChange={(e) =>
                      setAssignForm((p) => ({
                        ...p,
                        from_date: e.target.value,
                      }))
                    }
                  />
                  <Button
                    className="w-full"
                    onClick={handleAssign}
                    disabled={createAssign.isPending}
                  >
                    حفظ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="structures" className="mt-4 space-y-4">
          <ListQueryAlert
            error={isError ? error : null}
            onRetry={() => refetch()}
          />
          <PageShell padded={false}>
            <DataTable
              data={structures}
              columns={columns}
              searchable
              loading={isLoading}
              onEdit={(row) => openEditDialog(row)}
              onDelete={(row) =>
                Number(row.docstatus) === 0 && setDeleteDialog(row)
              }
            />
          </PageShell>
        </TabsContent>

        <TabsContent value="assign" className="mt-4">
          <ListQueryAlert
            error={ae ? aerr : null}
            onRetry={() => ar()}
          />
          <PageShell padded={false}>
            <DataTable
              data={assigns || []}
              columns={assignCols}
              searchable
              loading={al}
            />
          </PageShell>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent
          dir="rtl"
          className="max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editingDoc
                ? `تعديل هيكل الراتب — ${editingDoc.name}`
                : 'هيكل راتب'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <Input
              placeholder="اسم الهيكل (فريد)"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              disabled={!!editingDoc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">العملة</Label>
                <ErpLinkCombobox
                  doctype="Currency"
                  value={formData.currency}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, currency: v }))
                  }
                  placeholder="YER"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">دورة الدفع</Label>
                <Select
                  value={formData.payroll_frequency}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, payroll_frequency: v }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">شهري</SelectItem>
                    <SelectItem value="Fortnightly">نصف شهري</SelectItem>
                    <SelectItem value="Bimonthly">كل شهرين</SelectItem>
                    <SelectItem value="Weekly">أسبوعي</SelectItem>
                    <SelectItem value="Daily">يومي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              الاستحقاقات (Salary Component)
            </p>
            {formData.earnings.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ErpLinkCombobox
                  doctype="Salary Component"
                  value={row.salary_component}
                  onChange={(v) => updateEarning(idx, 'salary_component', v)}
                  placeholder="مكوّن"
                />
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="مبلغ"
                  value={row.amount}
                  onChange={(e) => updateEarning(idx, 'amount', e.target.value)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  earnings: [
                    ...p.earnings,
                    { salary_component: '', amount: '0' },
                  ],
                }))
              }
            >
              + بند استحقاق
            </Button>
            <p className="text-[10px] text-muted-foreground">
              الاستقطاعات (اختياري)
            </p>
            {formData.deductions.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ErpLinkCombobox
                  doctype="Salary Component"
                  value={row.salary_component}
                  onChange={(v) => updateDeduction(idx, 'salary_component', v)}
                  placeholder="مكوّن"
                />
                <Input
                  type="number"
                  dir="ltr"
                  value={row.amount}
                  onChange={(e) =>
                    updateDeduction(idx, 'amount', e.target.value)
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  deductions: [
                    ...p.deductions,
                    { salary_component: '', amount: '0' },
                  ],
                }))
              }
            >
              + بند استقطاع
            </Button>
            {editingDoc ? (
              <Button
                className="w-full"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? 'جاري الحفظ...'
                  : 'حفظ التعديل'}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                إنشاء وترحيل
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف هيكل؟</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialog?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog &&
                deleteMutation.mutate(deleteDialog.name, {
                  onSuccess: () => {
                    toast.success('تم');
                    setDeleteDialog(null);
                  },
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

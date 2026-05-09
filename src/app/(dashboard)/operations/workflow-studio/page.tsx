'use client';

import { useMemo, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Workflow,
  Edit,
  Eye,
  ArrowLeft,
  CircleDot,
  Play,
  Square,
  GitBranch,
  Layers,
  ToggleLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { apiGetDoc } from '@/lib/client/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────

interface WorkflowState {
  id: string;
  state: string;
  style: string; // 'start' | 'middle' | 'end'
  color: string; // 'green' | 'blue' | 'amber' | 'red' | 'purple'
}

interface WorkflowTransition {
  id: string;
  state: string;
  next_state: string;
  action: string;
  allowed: string;
  allow_edit?: boolean;
  condition?: string;
}

interface WorkflowRow {
  name: string;
  document_type?: string;
  is_active?: number;
  workflow_state_field?: string;
  states?: { state: string; style?: string; color?: string }[];
  transitions?: {
    state: string;
    next_state: string;
    action: string;
    allowed: string;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STATE_STYLE_OPTIONS = [
  { value: 'start', label: 'نقطة بداية', icon: Play },
  { value: 'middle', label: 'وسيطة', icon: CircleDot },
  { value: 'end', label: 'نقطة نهاية', icon: Square },
] as const;

const STATE_COLOR_OPTIONS = [
  { value: 'green', label: 'أخضر' },
  { value: 'blue', label: 'أزرق' },
  { value: 'amber', label: 'كهرماني' },
  { value: 'red', label: 'أحمر' },
  { value: 'purple', label: 'بنفسجي' },
] as const;

const colorClass: Record<string, { border: string; bg: string; text: string }> = {
  green: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  blue: {
    border: 'border-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-300',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  red: {
    border: 'border-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
  purple: {
    border: 'border-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-300',
  },
};

function getColorCls(color?: string, style?: string) {
  if (style === 'start') return colorClass.green;
  if (style === 'end') return colorClass.red;
  return colorClass[color || 'blue'] || colorClass.blue;
}

// ─── Workflow Diagram ─────────────────────────────────────────────

function WorkflowDiagram({
  states,
  transitions,
}: {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}) {
  if (states.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[180px] text-muted-foreground text-xs">
        أضف حالات لعرض المعاينة المرئية
      </div>
    );
  }

  // Group states by style for layout
  const startStates = states.filter((s) => s.style === 'start');
  const middleStates = states.filter((s) => s.style === 'middle');
  const endStates = states.filter((s) => s.style === 'end');
  // Fallback: if no styles assigned, put all in middle
  const hasStyles = startStates.length > 0 || endStates.length > 0;
  const layoutGroups = hasStyles
    ? [startStates, middleStates, endStates].filter((g) => g.length > 0)
    : [states];

  return (
    <div className="relative p-4 space-y-6">
      {layoutGroups.map((group, gi) => (
        <div key={gi}>
          {/* Connector line between groups */}
          {gi > 0 && (
            <div className="flex justify-center mb-2">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-4 bg-border" />
                <ArrowLeft className="h-3 w-3 text-muted-foreground rotate-90" />
              </div>
            </div>
          )}

          {/* Group label */}
          {hasStyles && group.length > 0 && (
            <div className="flex justify-center mb-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-2 py-0.5',
                  group[0].style === 'start' && 'border-emerald-400 text-emerald-600',
                  group[0].style === 'middle' && 'border-sky-400 text-sky-600',
                  group[0].style === 'end' && 'border-rose-400 text-rose-600'
                )}
              >
                {group[0].style === 'start'
                  ? 'نقطة بداية'
                  : group[0].style === 'end'
                    ? 'نقطة نهاية'
                    : 'وسيطة'}
              </Badge>
            </div>
          )}

          {/* State nodes */}
          <div className="flex flex-wrap gap-3 justify-center">
            {group.map((s) => {
              const cls = getColorCls(s.color, s.style);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'px-4 py-2.5 rounded-xl border-2 text-sm font-medium shadow-sm min-w-[110px] text-center transition-all duration-200',
                    cls.border,
                    cls.bg,
                    cls.text
                  )}
                >
                  <span>{s.state || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Transitions arrows section */}
      {transitions.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <p className="text-[10px] text-muted-foreground mb-2 text-center font-medium">
            التحولات
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {transitions.map((t, i) => {
              const srcState = states.find((s) => s.state === t.state);
              const tgtState = states.find((s) => s.state === t.next_state);
              const srcCls = getColorCls(srcState?.color, srcState?.style);
              const tgtCls = getColorCls(tgtState?.color, tgtState?.style);
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border/50 text-xs shadow-sm"
                >
                  <span className={cn('font-medium', srcCls.text)}>
                    {t.state || '—'}
                  </span>
                  <span className="text-muted-foreground">←</span>
                  <span className="text-primary font-semibold">{t.action || '—'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={cn('font-medium', tgtCls.text)}>
                    {t.next_state || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function WorkflowStudioPage() {
  // ── State for the create/edit form ──
  const [workflowName, setWorkflowName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [stateField, setStateField] = useState('workflow_state');
  const [formStates, setFormStates] = useState<WorkflowState[]>([]);
  const [formTransitions, setFormTransitions] = useState<WorkflowTransition[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ── Delete ──
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  // ── Data fetching ──
  const {
    data: workflows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<WorkflowRow>('Workflow', {
    fields: ['name', 'document_type', 'is_active', 'workflow_state_field', 'states', 'transitions'],
    order_by: 'modified desc',
    limit: 200,
  });

  const createMutation = useCreateDoc('Workflow');
  const updateMutation = useUpdateDoc('Workflow');
  const deleteMutation = useDeleteDoc('Workflow');

  // ── KPIs ──
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => Number(w.is_active) === 1).length;
  const inactiveWorkflows = totalWorkflows - activeWorkflows;
  const uniqueDocTypes = new Set(workflows.map((w) => w.document_type).filter(Boolean)).size;

  // ── State names for select dropdowns ──
  const stateNames = useMemo(() => formStates.map((s) => s.state).filter(Boolean), [formStates]);

  // ── States management ──
  const addState = useCallback(() => {
    setFormStates((prev) => [
      ...prev,
      { id: uid(), state: '', style: 'middle', color: 'blue' },
    ]);
  }, []);

  const removeState = useCallback((id: string) => {
    setFormStates((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateState = useCallback(
    (id: string, field: keyof WorkflowState, value: string) => {
      setFormStates((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  // ── Transitions management ──
  const addTransition = useCallback(() => {
    setFormTransitions((prev) => [
      ...prev,
      { id: uid(), state: '', next_state: '', action: '', allowed: '', allow_edit: false },
    ]);
  }, []);

  const removeTransition = useCallback((id: string) => {
    setFormTransitions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTransition = useCallback(
    (id: string, field: keyof WorkflowTransition, value: string | boolean) => {
      setFormTransitions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setWorkflowName('');
    setDocumentType('');
    setStateField('workflow_state');
    setFormStates([]);
    setFormTransitions([]);
    setEditingName(null);
  }, []);

  // ── Open Create Dialog ──
  const openCreateDialog = useCallback(() => {
    resetForm();
    setCreateDialogOpen(true);
  }, [resetForm]);

  // ── Open Edit Dialog ──
  const openEditDialog = useCallback(
    async (row: WorkflowRow) => {
      try {
        const doc = await apiGetDoc<Record<string, unknown>>('Workflow', row.name);
        if (!doc) {
          toast.error('لم يُعثر على سير العمل');
          return;
        }

        setEditingName(row.name);
        setWorkflowName(String(doc.workflow_name || doc.name || ''));
        setDocumentType(String(doc.document_type || ''));
        setStateField(String(doc.workflow_state_field || 'workflow_state'));

        const rawStates = (doc.states as Record<string, unknown>[]) || [];
        setFormStates(
          rawStates.map((s) => ({
            id: uid(),
            state: String(s.state || ''),
            style: String(s.style || 'middle'),
            color: String(s.color || 'blue'),
          }))
        );

        const rawTransitions = (doc.transitions as Record<string, unknown>[]) || [];
        setFormTransitions(
          rawTransitions.map((t) => ({
            id: uid(),
            state: String(t.state || ''),
            next_state: String(t.next_state || ''),
            action: String(t.action || ''),
            allowed: String(t.allowed || ''),
            allow_edit: Boolean(t.allow_edit),
          }))
        );

        setEditDialogOpen(true);
      } catch {
        toast.error('فشل تحميل سير العمل');
      }
    },
    [toast]
  );

  // ── Save (create or update) ──
  const handleSave = useCallback(async () => {
    if (!workflowName.trim()) {
      toast.error('اسم سير العمل مطلوب');
      return;
    }
    if (!documentType.trim()) {
      toast.error('نوع المستند مطلوب');
      return;
    }
    if (formStates.length < 2) {
      toast.error('أدخل حالتين على الأقل');
      return;
    }
    for (const s of formStates) {
      if (!s.state.trim()) {
        toast.error('اسم الحالة مطلوب لكل صف');
        return;
      }
    }
    for (const t of formTransitions) {
      if (!t.state || !t.next_state || !t.action) {
        toast.error('أكمل كل تحول: الحالة المصدر، الحالة الهدف، الإجراء');
        return;
      }
    }

    // Check for duplicate state names
    const stateNameSet = new Set(formStates.map((s) => s.state.trim()));
    if (stateNameSet.size !== formStates.length) {
      toast.error('أسماء الحالات يجب أن تكون فريدة');
      return;
    }

    const statesPayload = formStates.map((s) => ({
      state: s.state.trim(),
      style: s.style,
      color: s.color,
      doc_status: s.style === 'end' ? 1 : 0,
    }));

    const transitionsPayload = formTransitions.map((t) => ({
      state: t.state,
      action: t.action,
      next_state: t.next_state,
      allowed: t.allowed || '',
      allow_edit: t.allow_edit ? 1 : 0,
    }));

    const payload = {
      doctype: 'Workflow',
      workflow_name: workflowName.trim(),
      document_type: documentType.trim(),
      workflow_state_field: stateField.trim() || 'workflow_state',
      is_active: 1,
      override_status: 0,
      states: statesPayload,
      transitions: transitionsPayload,
    };

    try {
      if (editingName) {
        await updateMutation.mutateAsync({
          name: editingName,
          doc: payload,
        });
        toast.success('تم تحديث سير العمل بنجاح');
        setEditDialogOpen(false);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('تم إنشاء سير العمل بنجاح');
        setCreateDialogOpen(false);
      }
      resetForm();
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(editingName ? 'فشل تحديث سير العمل' : 'فشل إنشاء سير العمل', { description: msg });
    }
  }, [
    workflowName,
    documentType,
    stateField,
    formStates,
    formTransitions,
    editingName,
    createMutation,
    updateMutation,
    resetForm,
    refetch,
    toast,
  ]);

  // ── Toggle active ──
  const handleToggle = useCallback(
    (row: WorkflowRow, checked: boolean) => {
      updateMutation.mutate(
        { name: row.name, doc: { is_active: checked ? 1 : 0 } },
        {
          onSuccess: () => {
            toast.success(checked ? 'تم تفعيل سير العمل' : 'تم تعطيل سير العمل');
          },
          onError: () => {
            toast.error('تعذر تحديث حالة سير العمل');
          },
        }
      );
    },
    [updateMutation, toast]
  );

  // ── Delete ──
  const openDeleteDialog = useCallback((name: string) => {
    setSelectedForDelete(name);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedForDelete) return;
    deleteMutation.mutate(selectedForDelete, {
      onSuccess: () => {
        toast.success('تم حذف سير العمل بنجاح');
        setDeleteDialogOpen(false);
        setSelectedForDelete(null);
      },
      onError: () => {
        toast.error('فشل حذف سير العمل');
      },
    });
  }, [selectedForDelete, deleteMutation, toast]);

  // ── Table columns ──
  const wfColumns: Column<WorkflowRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الاسم',
        sortable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
      },
      {
        key: 'document_type',
        header: 'نوع المستند',
        render: (v) => (
          <span className="text-xs">{String(v || '—')}</span>
        ),
      },
      {
        key: 'states',
        header: 'الحالات',
        render: (_v, row) => {
          const count = Array.isArray(row.states) ? row.states.length : 0;
          return (
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              <span dir="ltr">{count}</span>
            </Badge>
          );
        },
      },
      {
        key: 'transitions',
        header: 'التحولات',
        render: (_v, row) => {
          const count = Array.isArray(row.transitions) ? row.transitions.length : 0;
          return (
            <Badge variant="outline" className="text-[10px] tabular-nums">
              <span dir="ltr">{count}</span>
            </Badge>
          );
        },
      },
      {
        key: 'is_active',
        header: 'نشط',
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={Number(v) === 1}
              disabled={updateMutation.isPending}
              onCheckedChange={(checked) => handleToggle(row, checked)}
            />
            <span className="text-[10px] text-muted-foreground">
              {Number(v) === 1 ? 'نعم' : 'لا'}
            </span>
          </div>
        ),
      },
    ],
    [updateMutation, handleToggle]
  );

  // ── Render form (shared between create & edit dialogs) ──
  const renderForm = () => (
    <div className="space-y-4">
      {/* Basic fields */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">اسم سير العمل *</Label>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="مثال: موافقة متعددة المستويات"
            dir="ltr"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">نوع المستند *</Label>
          <ErpLinkCombobox
            doctype="DocType"
            value={documentType}
            onChange={setDocumentType}
            placeholder="اختر نوع المستند..."
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-medium">حقل الحالة</Label>
          <Input
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
            placeholder="workflow_state"
            dir="ltr"
            className="font-mono text-sm"
          />
        </div>
      </div>

      {/* States table */}
      <div className="rounded-xl border border-border/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            جدول الحالات
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={addState}
          >
            <Plus className="h-3 w-3" />
            حالة
          </Button>
        </div>

        {formStates.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">
            لا حالات بعد — أضف حالات سير العمل (مثلاً: مسودة، قيد المراجعة، معتمد).
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {formStates.map((s, idx) => (
              <div
                key={s.id}
                className="grid gap-2 rounded-lg border border-border/30 bg-muted/10 p-2 items-end md:grid-cols-12"
              >
                <div className="md:col-span-4 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    اسم الحالة *
                  </Label>
                  <ErpLinkCombobox
                    doctype="Workflow State"
                    value={s.state}
                    onChange={(v) => updateState(s.id, 'state', v)}
                    placeholder="اختر حالة..."
                    className="h-8 text-xs"
                    showCreateShortcut={false}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    لون الحالة
                  </Label>
                  <Select
                    value={s.color}
                    onValueChange={(v) => updateState(s.id, 'color', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {STATE_COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-block h-2.5 w-2.5 rounded-full',
                                c.value === 'green' && 'bg-emerald-500',
                                c.value === 'blue' && 'bg-sky-500',
                                c.value === 'amber' && 'bg-amber-500',
                                c.value === 'red' && 'bg-rose-500',
                                c.value === 'purple' && 'bg-violet-500'
                              )}
                            />
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    نمط الحالة
                  </Label>
                  <Select
                    value={s.style}
                    onValueChange={(v) => updateState(s.id, 'style', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {STATE_STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-1.5">
                            <opt.icon className="h-3 w-3" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 flex justify-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeState(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transitions table */}
      <div className="rounded-xl border border-border/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            جدول التحولات
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={addTransition}
          >
            <Plus className="h-3 w-3" />
            تحول
          </Button>
        </div>

        {formTransitions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">
            لا تحولات بعد — أضف تحولاً لكل انتقال بين الحالات.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {formTransitions.map((t, idx) => (
              <div
                key={t.id}
                className="grid gap-2 rounded-lg border border-border/30 bg-muted/10 p-2 items-end md:grid-cols-12"
              >
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    الحالة المصدر *
                  </Label>
                  <Select
                    value={t.state}
                    onValueChange={(v) => updateTransition(t.id, 'state', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {stateNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    الحالة الهدف *
                  </Label>
                  <Select
                    value={t.next_state}
                    onValueChange={(v) => updateTransition(t.id, 'next_state', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {stateNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    الإجراء *
                  </Label>
                  <ErpLinkCombobox
                    doctype="Workflow Action Master"
                    value={t.action}
                    onChange={(v) => updateTransition(t.id, 'action', v)}
                    placeholder="اختر إجراء..."
                    className="h-8 text-xs"
                    showCreateShortcut={false}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    الدور المسموح
                  </Label>
                  <ErpLinkCombobox
                    doctype="Role"
                    value={t.allowed}
                    onChange={(v) => updateTransition(t.id, 'allowed', v)}
                    placeholder="اختر دور..."
                    className="h-8 text-xs"
                    showCreateShortcut={false}
                  />
                </div>
                <div className="md:col-span-1 space-y-1 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={t.allow_edit || false}
                      onCheckedChange={(checked) =>
                        updateTransition(t.id, 'allow_edit', Boolean(checked))
                      }
                    />
                    <Label className="text-[9px] text-muted-foreground leading-none">
                      تعديل
                    </Label>
                  </div>
                </div>
                <div className="md:col-span-1 flex justify-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeTransition(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            معاينة سير العمل
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 min-h-[120px]">
            <WorkflowDiagram states={formStates} transitions={formTransitions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="منشئ سير العمل"
        description="إنشاء وتعديل وإدارة مسارات الموافقات متعددة المستويات مع معاينة مرئية فورية"
        iconify="solar:course-up-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'منشئ سير العمل' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            سير عمل جديد
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip>
        <KpiCard
          title="إجمالي سير العمل"
          value={totalWorkflows}
          icon={Workflow}
          accent="primary"
          compact
        />
        <KpiCard
          title="نشطة"
          value={activeWorkflows}
          icon={ToggleLeft}
          accent="success"
          compact
        />
        <KpiCard
          title="غير نشطة"
          value={inactiveWorkflows}
          icon={Square}
          accent="warning"
          compact
        />
        <KpiCard
          title="أنواع المستندات"
          value={uniqueDocTypes}
          icon={Layers}
          accent="info"
          compact
        />
      </KpiStrip>

      {/* Existing workflows table */}
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3">
        <DataTable
          data={workflows}
          columns={wfColumns}
          searchable
          loading={isLoading}
          tableId="workflow-studio"
          exportFileName="workflows"
          onEdit={openEditDialog}
          onDelete={(row) => openDeleteDialog(row.name)}
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-4.5 w-4.5" />
              إنشاء سير عمل جديد
            </DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="gap-1.5 min-w-[130px]"
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ سير العمل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4.5 w-4.5" />
              تعديل سير العمل
            </DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-1.5 min-w-[130px]"
            >
              {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث سير العمل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  هل أنت متأكد من حذف سير العمل &quot;{selectedForDelete}&quot;؟ لا يمكن
                  التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

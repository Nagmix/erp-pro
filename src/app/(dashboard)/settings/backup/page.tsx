'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ConfirmationDialog } from '@/components/erp/confirmation-dialog';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useBackups, useCreateBackup, useDeleteBackup, useUpdateBackupSettings } from '@/lib/client/hooks';
import type { BackupRecord, BackupSettings } from '@/lib/client/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
 HardDrive,
 Plus,
 Trash2,
 Clock,
 Shield,
 Database,
 FileArchive,
 Loader2,
 Save,
 Settings2,
} from 'lucide-react';

// ============================================================
// Helpers
// ============================================================

function formatBytes(bytes: number): string {
 if (bytes === 0) return '0 بايت';
 const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب'];
 const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024));
 const val = bytes / Math.pow(1024, i);
 return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i] || 'بايت'}`;
}

function formatDateAr(dateStr: string): string {
 try {
 const date = new Date(dateStr);
 if (isNaN(date.getTime())) return dateStr;
 return date.toLocaleDateString('ar-SA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
 });
 } catch {
 return dateStr;
 }
}

function typeLabel(type: BackupRecord['type']): string {
 switch (type) {
 case 'database': return 'قاعدة بيانات';
 case 'files': return 'ملفات';
 case 'full': return 'كامل';
 default: return type;
 }
}

function typeBadgeVariant(type: BackupRecord['type']): 'default' | 'secondary' | 'outline' {
 switch (type) {
 case 'database': return 'default';
 case 'files': return 'secondary';
 case 'full': return 'outline';
 default: return 'secondary';
 }
}

function statusLabel(status: BackupRecord['status']): string {
 switch (status) {
 case 'completed': return 'مكتمل';
 case 'failed': return 'فشل';
 case 'in_progress': return 'قيد التنفيذ';
 default: return status;
 }
}

function statusColor(status: BackupRecord['status']): string {
 switch (status) {
 case 'completed': return 'bg-primary/10 text-primary border-primary/20';
 case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
 case 'in_progress': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
 default: return 'bg-muted text-muted-foreground';
 }
}

function typeColor(type: BackupRecord['type']): string {
 switch (type) {
 case 'database': return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
 case 'files': return 'bg-primary/10 text-primary border-primary/20';
 case 'full': return 'bg-chart-5/10 text-chart-5 border-chart-5/20';
 default: return 'bg-muted text-muted-foreground';
 }
}

function frequencyLabel(freq: BackupSettings['autoBackupFrequency']): string {
 switch (freq) {
 case 'daily': return 'يومياً';
 case 'weekly': return 'أسبوعياً';
 case 'monthly': return 'شهرياً';
 default: return freq;
 }
}

// ============================================================
// Component
// ============================================================

export default function BackupPage() {
 const { data: backupData, isLoading, error, refetch } = useBackups();
 const createBackup = useCreateBackup();
 const deleteBackup = useDeleteBackup();
 const updateSettings = useUpdateBackupSettings();

 const backups = backupData?.backups ?? [];
 const settings = backupData?.settings ?? {
 autoBackupEnabled: false,
 autoBackupFrequency: 'daily' as const,
 retentionCount: 10,
 };

 // Local state for settings (synced from server data)
 const [autoEnabled, setAutoEnabled] = useState(settings.autoBackupEnabled);
 const [frequency, setFrequency] = useState<BackupSettings['autoBackupFrequency']>(settings.autoBackupFrequency);
 const [retention, setRetention] = useState(String(settings.retentionCount));
 const [savingSettings, setSavingSettings] = useState(false);

 // Create backup dialog
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [backupType, setBackupType] = useState<BackupRecord['type']>('full');

 // Delete confirmation
 const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
 const [deleting, setDeleting] = useState(false);

 // Sync settings when data loads
 const [settingsSynced, setSettingsSynced] = useState(false);
 if (!settingsSynced && backupData) {
 setAutoEnabled(settings.autoBackupEnabled);
 setFrequency(settings.autoBackupFrequency);
 setRetention(String(settings.retentionCount));
 setSettingsSynced(true);
 }

 // ── Summary stats ──
 const totalBackups = backups.length;
 const completedBackups = backups.filter((b) => b.status === 'completed').length;
 const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
 const lastBackupDate = backups.length > 0 ? backups[0]!.date : null;

 // ── Create backup handler ──
 const handleCreateBackup = useCallback(async () => {
 try {
  const result = await createBackup.mutateAsync(backupType);
  if (result?.success) {
  toast.success(result.message || 'تم إنشاء النسخة الاحتياطية بنجاح');
  } else {
  toast.warning(result?.message || 'تم تسجيل الطلب لكن لم يتم التأكيد من الخادم');
  }
  setCreateDialogOpen(false);
 } catch (err) {
  toast.error(err instanceof Error ? err.message : 'فشل إنشاء النسخة الاحتياطية');
 }
 }, [backupType, createBackup]);

 // ── Delete backup handler ──
 const handleDeleteBackup = useCallback(async () => {
 if (!deleteTarget) return;
 setDeleting(true);
 try {
  await deleteBackup.mutateAsync(deleteTarget.id);
  toast.success('تم حذف النسخة الاحتياطية');
  setDeleteTarget(null);
 } catch (err) {
  toast.error(err instanceof Error ? err.message : 'فشل حذف النسخة الاحتياطية');
 } finally {
  setDeleting(false);
 }
 }, [deleteTarget, deleteBackup]);

 // ── Save settings handler ──
 const handleSaveSettings = useCallback(async () => {
 setSavingSettings(true);
 try {
  await updateSettings.mutateAsync({
  autoBackupEnabled: autoEnabled,
  autoBackupFrequency: frequency,
  retentionCount: Number(retention) || 10,
  });
  toast.success('تم حفظ إعدادات النسخ الاحتياطي التلقائي');
 } catch (err) {
  toast.error(err instanceof Error ? err.message : 'فشل حفظ الإعدادات');
 } finally {
  setSavingSettings(false);
 }
 }, [autoEnabled, frequency, retention, updateSettings]);

 // ── Table columns ──
 const columns: Column<BackupRecord>[] = [
 {
  key: 'name',
  header: 'اسم النسخة',
  sortable: true,
  render: (_, row) => (
  <span className="font-medium truncate max-w-[200px] block">{row.name}</span>
  ),
 },
 {
  key: 'date',
  header: 'التاريخ',
  sortable: true,
  render: (_, row) => (
  <span className="text-muted-foreground">{formatDateAr(row.date)}</span>
  ),
 },
 {
  key: 'size',
  header: 'الحجم',
  sortable: true,
  render: (_, row) => (
  <span className="tabular-nums">{formatBytes(row.size)}</span>
  ),
 },
 {
  key: 'type',
  header: 'النوع',
  sortable: true,
  render: (_, row) => (
  <Badge variant={typeBadgeVariant(row.type)} className={cn('text-[10px] border', typeColor(row.type))}>
   {row.type === 'database' && <Database className="me-1 h-3 w-3" />}
   {row.type === 'files' && <FileArchive className="me-1 h-3 w-3" />}
   {row.type === 'full' && <HardDrive className="me-1 h-3 w-3" />}
   {typeLabel(row.type)}
  </Badge>
  ),
 },
 {
  key: 'status',
  header: 'الحالة',
  sortable: true,
  render: (_, row) => (
  <Badge variant="outline" className={cn('text-[10px] border', statusColor(row.status))}>
   {row.status === 'in_progress' && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
   {statusLabel(row.status)}
  </Badge>
  ),
 },
 ];

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="النسخ الاحتياطي"
  description="إدارة النسخ الاحتياطية وإعدادات النسخ التلقائي للنظام"
  iconify="solar:database-bold-duotone"
  accent="purple"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'النسخ الاحتياطي' },
  ]}
  actions={
   <Button
   size="sm"
   className="gap-1.5"
   onClick={() => setCreateDialogOpen(true)}
   disabled={createBackup.isPending}
   >
   {createBackup.isPending ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
   ) : (
    <Plus className="h-3.5 w-3.5" />
   )}
   إنشاء نسخة احتياطية
   </Button>
  }
  />

  {/* ── Summary KPIs ── */}
  {/* ── Backup table ── */}
  <DataTable<BackupRecord>
  data={backups}
  columns={columns}
  searchable
  loading={isLoading}
  error={error}
  onRetry={() => refetch()}
  tableId="backup-list"
  exportFileName="backups"
  onDelete={(row) => setDeleteTarget(row)}
  addLabel="إنشاء نسخة احتياطية"
  onAdd={() => setCreateDialogOpen(true)}
  getRowId={(row) => row.id}
  />

  {/* ── Auto Backup Settings ── */}
  <PageShell>
  <div className="flex items-center gap-2 mb-4">
   <Settings2 className="h-5 w-5 text-primary" />
   <h2 className="text-base font-semibold">إعدادات النسخ الاحتياطي التلقائي</h2>
  </div>

  <div className="grid md:grid-cols-2 gap-6">
   {/* Enable toggle */}
   <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-4">
   <div className="space-y-1">
    <Label className="text-sm font-semibold">تفعيل النسخ التلقائي</Label>
    <p className="text-xs text-muted-foreground">إنشاء نسخ احتياطية تلقائياً حسب الجدول المحدد</p>
   </div>
   <Switch
    checked={autoEnabled}
    onCheckedChange={setAutoEnabled}
    aria-label="تفعيل النسخ التلقائي"
   />
   </div>

   {/* Frequency */}
   <div className="space-y-2">
   <Label className="text-sm font-semibold">التكرار</Label>
   <Select value={frequency} onValueChange={(v) => setFrequency(v as BackupSettings['autoBackupFrequency'])}>
    <SelectTrigger className="w-full">
    <SelectValue placeholder="اختر التكرار" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="daily">يومياً</SelectItem>
    <SelectItem value="weekly">أسبوعياً</SelectItem>
    <SelectItem value="monthly">شهرياً</SelectItem>
    </SelectContent>
   </Select>
   <p className="text-xs text-muted-foreground">عدد مرات إنشاء النسخ الاحتياطية تلقائياً</p>
   </div>

   {/* Retention count */}
   <div className="space-y-2">
   <Label className="text-sm font-semibold">عدد النسخ المحفوظة</Label>
   <Input
    type="number"
    min={1}
    max={100}
    value={retention}
    onChange={(e) => setRetention(e.target.value)}
    placeholder="10"
   />
   <p className="text-xs text-muted-foreground">
    يتم حذف النسخ القديمة تلقائياً عند تجاوز هذا العدد
   </p>
   </div>

   {/* Save button */}
   <div className="flex items-end">
   <Button
    className="gap-1.5 w-full"
    onClick={() => void handleSaveSettings()}
    disabled={savingSettings}
   >
    {savingSettings ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : (
    <Save className="h-3.5 w-3.5" />
    )}
    حفظ الإعدادات
   </Button>
   </div>
  </div>
  </PageShell>

  {/* ── Create Backup Dialog ── */}
  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
  <DialogContent dir="rtl" size="sm">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <HardDrive className="h-4 w-4 text-primary" />
    إنشاء نسخة احتياطية جديدة
   </DialogTitle>
   <DialogDescription>
    اختر نوع النسخة الاحتياطية التي تريد إنشاءها
   </DialogDescription>
   </DialogHeader>

   <div className="space-y-3 py-2">
   {/* Full backup */}
   <button
    type="button"
    onClick={() => setBackupType('full')}
    className={cn(
    'w-full flex items-center gap-3 rounded-lg border-2 p-3 text-start transition-all',
    backupType === 'full'
     ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
     : 'border-border/50 hover:border-border'
    )}
   >
    <div className={cn(
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
    backupType === 'full' ? 'bg-chart-5/10 text-chart-5' : 'bg-muted text-muted-foreground'
    )}>
    <HardDrive className="h-5 w-5" />
    </div>
    <div className="min-w-0">
    <p className="text-sm font-semibold">نسخة كاملة</p>
    <p className="text-xs text-muted-foreground">قاعدة البيانات + جميع الملفات</p>
    </div>
   </button>

   {/* Database only */}
   <button
    type="button"
    onClick={() => setBackupType('database')}
    className={cn(
    'w-full flex items-center gap-3 rounded-lg border-2 p-3 text-start transition-all',
    backupType === 'database'
     ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
     : 'border-border/50 hover:border-border'
    )}
   >
    <div className={cn(
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
    backupType === 'database' ? 'bg-chart-1/10 text-chart-1' : 'bg-muted text-muted-foreground'
    )}>
    <Database className="h-5 w-5" />
    </div>
    <div className="min-w-0">
    <p className="text-sm font-semibold">قاعدة بيانات فقط</p>
    <p className="text-xs text-muted-foreground">نسخ بيانات SQL فقط بدون ملفات</p>
    </div>
   </button>

   {/* Files only */}
   <button
    type="button"
    onClick={() => setBackupType('files')}
    className={cn(
    'w-full flex items-center gap-3 rounded-lg border-2 p-3 text-start transition-all',
    backupType === 'files'
     ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
     : 'border-border/50 hover:border-border'
    )}
   >
    <div className={cn(
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
    backupType === 'files' ? 'bg-chart-3/10 text-chart-3' : 'bg-muted text-muted-foreground'
    )}>
    <FileArchive className="h-5 w-5" />
    </div>
    <div className="min-w-0">
    <p className="text-sm font-semibold">ملفات فقط</p>
    <p className="text-xs text-muted-foreground">نسخ الملفات والمرفقات فقط</p>
    </div>
   </button>
   </div>

   <DialogFooter>
   <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createBackup.isPending}>
    إلغاء
   </Button>
   <Button
    onClick={() => void handleCreateBackup()}
    disabled={createBackup.isPending}
    loading={createBackup.isPending}
   >
    {createBackup.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Delete Confirmation ── */}
  <ConfirmationDialog
  open={!!deleteTarget}
  onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
  title="حذف النسخة الاحتياطية"
  description={
   deleteTarget
   ? `هل أنت متأكد من حذف النسخة "${deleteTarget.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
   : ''
  }
  confirmLabel="حذف"
  variant="destructive"
  isLoading={deleting}
  onConfirm={() => void handleDeleteBackup()}
  />
 </div>
 );
}

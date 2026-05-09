'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { CHART_PALETTE } from '@/lib/core/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
 Dialog,
 DialogContent,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
 Shield,
 Users,
 Plus,
 Trash2,
 CheckSquare,
 XSquare,
 Save,
 Search,
 Key,
 UserCheck,
 Lock,
 Loader2,
 RefreshCw,
 AlertCircle,
 X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                */
/* ------------------------------------------------------------------ */

type ERPRole = {
 name: string;
 disabled: number | boolean;
};

type ERPDocType = {
 name: string;
 module: string;
 issingle: number | boolean;
 istable: number | boolean;
};

type ERPDocPerm = {
 name: string;
 role: string;
 parent: string;
 permlevel: number;
 read: number | boolean;
 write: number | boolean;
 create: number | boolean;
 delete: number | boolean;
 submit: number | boolean;
 cancel: number | boolean;
 amend: number | boolean;
 print: number | boolean;
 email: number | boolean;
 export: number | boolean;
 import: number | boolean;
 share: number | boolean;
 set_user_permissions: number | boolean;
};

type PermKey =
 | 'read'
 | 'write'
 | 'create'
 | 'delete'
 | 'submit'
 | 'cancel'
 | 'amend'
 | 'print'
 | 'email'
 | 'export'
 | 'import'
 | 'share'
 | 'set_user_permissions';

type WorkingPerm = {
 [doctype: string]: {
 name?: string; // existing Custom DocPerm record name (for updates)
 perms: Record<PermKey, boolean>;
 changed: boolean;
 };
};

/* ------------------------------------------------------------------ */
/* Constants               */
/* ------------------------------------------------------------------ */

const PERM_KEYS: PermKey[] = [
 'create',
 'read',
 'write',
 'delete',
 'submit',
 'cancel',
 'amend',
 'print',
 'email',
 'export',
 'import',
 'share',
 'set_user_permissions',
];

const PERM_LABELS: Record<PermKey, string> = {
 create: 'إنشاء',
 read: 'قراءة',
 write: 'تحديث',
 delete: 'حذف',
 submit: 'تقديم',
 cancel: 'إلغاء',
 amend: 'تعديل',
 print: 'طباعة',
 email: 'بريد',
 export: 'تصدير',
 import: 'استيراد',
 share: 'مشاركة',
 set_user_permissions: 'أذونات',
};

// ROLE_COLORS removed — using CHART_PALETTE.series from helpers

/* ------------------------------------------------------------------ */
/* Helpers               */
/* ------------------------------------------------------------------ */

function toBool(v: number | boolean | undefined): boolean {
 if (v === undefined || v === null) return false;
 return v === 1 || v === true;
}

function roleColor(index: number): string {
 return CHART_PALETTE.series[index % CHART_PALETTE.series.length];
}

function extractData<T>(json: unknown): T[] {
 if (!json || typeof json !== 'object') return [];
 const obj = json as Record<string, unknown>;
 if (Array.isArray(obj.data)) return obj.data as T[];
 if (Array.isArray(obj)) return obj as T[];
 return [];
}

/* ------------------------------------------------------------------ */
/* API helpers              */
/* ------------------------------------------------------------------ */

async function fetchRoles(): Promise<ERPRole[]> {
 const res = await fetch(
 '/api/data/Role?fields=["name","disabled"]&limit_page_length=200'
 );
 const json = await res.json();
 return extractData<ERPRole>(json);
}

async function fetchDocTypes(): Promise<ERPDocType[]> {
 const res = await fetch(
 '/api/data/DocType?fields=["name","module","issingle","istable"]&filters=[["istable","=",0],["issingle","=",0]]&limit_page_length=500'
 );
 const json = await res.json();
 return extractData<ERPDocType>(json);
}

async function fetchDocPerms(): Promise<ERPDocPerm[]> {
 const res = await fetch(
 '/api/data/Custom DocPerm?fields=["name","role","parent","permlevel","read","write","create","delete","submit","cancel","amend","print","email","export","import","share","set_user_permissions"]&limit_page_length=500'
 );
 const json = await res.json();
 return extractData<ERPDocPerm>(json);
}

async function updateDocPerm(permName: string, data: Partial<ERPDocPerm>) {
 const res = await fetch(`/api/data/Custom DocPerm/${encodeURIComponent(permName)}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 return res.json();
}

async function createDocPerm(data: Partial<ERPDocPerm>) {
 const res = await fetch('/api/data/Custom DocPerm', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 return res.json();
}

async function deleteDocPerm(permName: string) {
 const res = await fetch(`/api/data/Custom DocPerm/${encodeURIComponent(permName)}`, {
 method: 'DELETE',
 });
 return res.json();
}

/* ------------------------------------------------------------------ */
/* Build working permissions from fetched data      */
/* ------------------------------------------------------------------ */

function buildWorkingPerms(
 roleName: string,
 doctypes: ERPDocType[],
 docPerms: ERPDocPerm[]
): WorkingPerm {
 const wp: WorkingPerm = {};
 const rolePerms = docPerms.filter(
 (p) => p.role === roleName && p.permlevel === 0
 );
 const permMap = new Map<string, ERPDocPerm>();
 rolePerms.forEach((p) => permMap.set(p.parent, p));

 doctypes.forEach((dt) => {
 const existing = permMap.get(dt.name);
 wp[dt.name] = {
  name: existing?.name,
  perms: {
  create: toBool(existing?.create),
  read: toBool(existing?.read),
  write: toBool(existing?.write),
  delete: toBool(existing?.delete),
  submit: toBool(existing?.submit),
  cancel: toBool(existing?.cancel),
  amend: toBool(existing?.amend),
  print: toBool(existing?.print),
  email: toBool(existing?.email),
  export: toBool(existing?.export),
  import: toBool(existing?.import),
  share: toBool(existing?.share),
  set_user_permissions: toBool(existing?.set_user_permissions),
  },
  changed: false,
 };
 });

 return wp;
}

/* ------------------------------------------------------------------ */
/* Main Page Component            */
/* ------------------------------------------------------------------ */

export default function RolePermissionsPage() {
 /* ---- Data state ---- */
 const [roles, setRoles] = useState<ERPRole[]>([]);
 const [doctypes, setDoctypes] = useState<ERPDocType[]>([]);
 const [docPerms, setDocPerms] = useState<ERPDocPerm[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 /* ---- UI state ---- */
 const [selectedRole, setSelectedRole] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [moduleFilter, setModuleFilter] = useState<string>('الكل');
 const [workingPerms, setWorkingPerms] = useState<WorkingPerm>({});
 const [hasUnsaved, setHasUnsaved] = useState(false);
 const [saving, setSaving] = useState(false);

 /* ---- Create role dialog ---- */
 const [dialogOpen, setDialogOpen] = useState(false);
 const [formRoleName, setFormRoleName] = useState('');
 const [creatingRole, setCreatingRole] = useState(false);

 /* ---- Delete role dialog ---- */
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
 const [deletingRole, setDeletingRole] = useState(false);

 /* ---- Computed ---- */
 const activeRoles = useMemo(
 () => roles.filter((r) => !toBool(r.disabled)),
 [roles]
 );

 const modules = useMemo(() => {
 const mods = new Set<string>();
 doctypes.forEach((dt) => {
  if (dt.module) mods.add(dt.module);
 });
 return Array.from(mods).sort();
 }, [doctypes]);

 const filteredRoles = useMemo(() => {
 if (!searchQuery.trim()) return activeRoles;
 const q = searchQuery.trim().toLowerCase();
 return activeRoles.filter((r) => r.name.toLowerCase().includes(q));
 }, [activeRoles, searchQuery]);

 const filteredDocTypes = useMemo(() => {
 if (moduleFilter === 'الكل') return doctypes;
 return doctypes.filter((dt) => dt.module === moduleFilter);
 }, [doctypes, moduleFilter]);

 const kpiData = useMemo(() => {
 const totalRoles = roles.length;
 const active = activeRoles.length;
 const totalPermCount = Object.values(workingPerms).reduce(
  (sum, wp) => sum + PERM_KEYS.filter((k) => wp.perms[k]).length,
  0
 );
 return { totalRoles, active, totalPermCount, doctypeCount: doctypes.length };
 }, [roles, activeRoles, workingPerms, doctypes]);

 const unsavedCount = useMemo(
 () => Object.values(workingPerms).filter((wp) => wp.changed).length,
 [workingPerms]
 );

 /* ---- Load initial data ---- */
 const loadData = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
  const [r, dt, dp] = await Promise.all([fetchRoles(), fetchDocTypes(), fetchDocPerms()]);
  setRoles(r);
  setDoctypes(dt);
  setDocPerms(dp);
 } catch (err) {
  setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
 } finally {
  setLoading(false);
 }
 }, []);

 useEffect(() => {
 let cancelled = false;
 queueMicrotask(() => { if (!cancelled) setLoading(true); });
 Promise.all([fetchRoles(), fetchDocTypes(), fetchDocPerms()])
  .then(([r, dt, dp]) => {
  if (!cancelled) {
   setRoles(r);
   setDoctypes(dt);
   setDocPerms(dp);
  }
  })
  .catch((err) => {
  if (!cancelled) setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
  })
  .finally(() => {
  if (!cancelled) setLoading(false);
  });
 return () => { cancelled = true; };
 }, []);

 /* ---- Select role ---- */
 const handleSelectRole = useCallback(
 (roleName: string) => {
  if (hasUnsaved) {
  const ok = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟');
  if (!ok) return;
  }
  setSelectedRole(roleName);
  setWorkingPerms(buildWorkingPerms(roleName, doctypes, docPerms));
  setHasUnsaved(false);
 },
 [hasUnsaved, doctypes, docPerms]
 );

 /* ---- Toggle permission ---- */
 const handlePermToggle = useCallback(
 (doctype: string, key: PermKey, checked: boolean) => {
  setWorkingPerms((prev) => {
  const existing = prev[doctype];
  if (!existing) return prev;
  return {
   ...prev,
   [doctype]: {
   ...existing,
   perms: { ...existing.perms, [key]: checked },
   changed: true,
   },
  };
  });
  setHasUnsaved(true);
 },
 []
 );

 /* ---- Select / deselect all for a row ---- */
 const handleSelectAllRow = useCallback((doctype: string) => {
 setWorkingPerms((prev) => {
  const existing = prev[doctype];
  if (!existing) return prev;
  const allTrue: Record<PermKey, boolean> = {} as Record<PermKey, boolean>;
  PERM_KEYS.forEach((k) => {
  allTrue[k] = true;
  });
  return {
  ...prev,
  [doctype]: { ...existing, perms: allTrue, changed: true },
  };
 });
 setHasUnsaved(true);
 }, []);

 const handleDeselectAllRow = useCallback((doctype: string) => {
 setWorkingPerms((prev) => {
  const existing = prev[doctype];
  if (!existing) return prev;
  const allFalse: Record<PermKey, boolean> = {} as Record<PermKey, boolean>;
  PERM_KEYS.forEach((k) => {
  allFalse[k] = false;
  });
  return {
  ...prev,
  [doctype]: { ...existing, perms: allFalse, changed: true },
  };
 });
 setHasUnsaved(true);
 }, []);

 /* ---- Save permissions ---- */
 const handleSave = useCallback(async () => {
 if (!selectedRole) return;
 setSaving(true);
 let successCount = 0;
 let errorCount = 0;

 const changedEntries = Object.entries(workingPerms).filter(
  ([, wp]) => wp.changed
 );

 for (const [doctype, wp] of changedEntries) {
  try {
  const permData: Partial<ERPDocPerm> = {
   role: selectedRole,
   parent: doctype,
   permlevel: 0,
   create: wp.perms.create ? 1 : 0,
   read: wp.perms.read ? 1 : 0,
   write: wp.perms.write ? 1 : 0,
   delete: wp.perms.delete ? 1 : 0,
   submit: wp.perms.submit ? 1 : 0,
   cancel: wp.perms.cancel ? 1 : 0,
   amend: wp.perms.amend ? 1 : 0,
   print: wp.perms.print ? 1 : 0,
   email: wp.perms.email ? 1 : 0,
   export: wp.perms.export ? 1 : 0,
   import: wp.perms.import ? 1 : 0,
   share: wp.perms.share ? 1 : 0,
   set_user_permissions: wp.perms.set_user_permissions ? 1 : 0,
  };

  if (wp.name) {
   // Update existing
   await updateDocPerm(wp.name, permData);
  } else {
   // Create new
   const result = await createDocPerm(permData);
   // Store the new name for future updates
   if (result?.data?.name) {
   wp.name = result.data.name;
   }
  }
  wp.changed = false;
  successCount++;
  } catch {
  errorCount++;
  }
 }

 setSaving(false);

 if (errorCount === 0) {
  setHasUnsaved(false);
  toast.success('تم الحفظ', { description: `تم حفظ الصلاحيات بنجاح (${successCount} سجل)` });
  // Refresh perms from server
  try {
  const dp = await fetchDocPerms();
  setDocPerms(dp);
  setWorkingPerms(buildWorkingPerms(selectedRole, doctypes, dp));
  } catch {
  // keep current state
  }
 } else {
  toast.error('تحذير', { description: `تم حفظ ${successCount} سجل، فشل ${errorCount} سجل` });
 }
 }, [selectedRole, workingPerms, doctypes, toast]);

 /* ---- Create role ---- */
 const openCreateDialog = useCallback(() => {
 setFormRoleName('');
 setDialogOpen(true);
 }, []);

 const handleCreateRole = useCallback(async () => {
 if (!formRoleName.trim()) {
  toast.error('خطأ', { description: 'يرجى إدخال اسم الدور' });
  return;
 }
 setCreatingRole(true);
 try {
  const res = await fetch('/api/data/Role', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   doctype: 'Role',
   name: formRoleName.trim(),
   role_name: formRoleName.trim(),
   disabled: 0,
  }),
  });
  const data = await res.json();
  if (data?.success === false) {
  throw new Error(data?.message || 'فشل الإنشاء');
  }
  toast.success('تم الإنشاء', { description: `تم إنشاء دور "${formRoleName}"` });
  setDialogOpen(false);
  await loadData();
 } catch (err) {
  toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل إنشاء الدور' });
 } finally {
  setCreatingRole(false);
 }
 }, [formRoleName, toast, loadData]);

 /* ---- Delete role ---- */
 const openDeleteDialog = useCallback((roleName: string) => {
 setRoleToDelete(roleName);
 setDeleteDialogOpen(true);
 }, []);

 const handleConfirmDelete = useCallback(async () => {
 if (!roleToDelete) return;
 setDeletingRole(true);
 try {
  await fetch(`/api/data/Role/${encodeURIComponent(roleToDelete)}`, {
  method: 'DELETE',
  });
  toast.success('تم الحذف', { description: `تم حذف دور "${roleToDelete}"` });
  if (selectedRole === roleToDelete) {
  setSelectedRole(null);
  setWorkingPerms({});
  setHasUnsaved(false);
  }
  setDeleteDialogOpen(false);
  setRoleToDelete(null);
  await loadData();
 } catch (err) {
  toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حذف الدور' });
 } finally {
  setDeletingRole(false);
 }
 }, [roleToDelete, selectedRole, toast, loadData]);

 /* ---- Toggle role active/disabled ---- */
 const handleToggleActive = useCallback(
 async (roleName: string, currentDisabled: number | boolean) => {
  const newDisabled = toBool(currentDisabled) ? 0 : 1;
  try {
  await fetch(`/api/data/Role/${encodeURIComponent(roleName)}`, {
   method: 'PUT',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ disabled: newDisabled }),
  });
  setRoles((prev) =>
   prev.map((r) =>
   r.name === roleName ? { ...r, disabled: newDisabled } : r
   )
  );
  toast.success(newDisabled === 0 ? 'تم التفعيل' : 'تم التعطيل', { description: newDisabled === 0 ? `تم تفعيل دور "${roleName}"` : `تم تعطيل دور "${roleName}"` });
  } catch (err) {
  toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل تحديث حالة الدور' });
  }
 },
 [toast]
 );

 /* ---- Select all / deselect all (global) ---- */
 const handleGlobalSelectAll = useCallback(() => {
 setWorkingPerms((prev) => {
  const next = { ...prev };
  Object.keys(next).forEach((dt) => {
  const allTrue: Record<PermKey, boolean> = {} as Record<PermKey, boolean>;
  PERM_KEYS.forEach((k) => {
   allTrue[k] = true;
  });
  next[dt] = { ...next[dt], perms: allTrue, changed: true };
  });
  return next;
 });
 setHasUnsaved(true);
 }, []);

 const handleGlobalDeselectAll = useCallback(() => {
 setWorkingPerms((prev) => {
  const next = { ...prev };
  Object.keys(next).forEach((dt) => {
  const allFalse: Record<PermKey, boolean> = {} as Record<PermKey, boolean>;
  PERM_KEYS.forEach((k) => {
   allFalse[k] = false;
  });
  next[dt] = { ...next[dt], perms: allFalse, changed: true };
  });
  return next;
 });
 setHasUnsaved(true);
 }, []);

 /* ---- Loading skeleton ---- */
 if (loading) {
 return (
  <div dir="rtl" className="p-4 lg:p-6 space-y-4">
  <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
   {[1, 2, 3, 4].map((i) => (
   <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
   ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
   <div className="lg:col-span-4 xl:col-span-3 h-96 rounded-xl bg-muted/30 animate-pulse" />
   <div className="lg:col-span-8 xl:col-span-9 h-96 rounded-xl bg-muted/30 animate-pulse" />
  </div>
  </div>
 );
 }

 /* ---- Error state ---- */
 if (error) {
 return (
  <div dir="rtl" className="p-4 lg:p-6 space-y-5">
  <PageHeader
   title="صلاحيات الأدوار"
   iconify="solar:shield-keyhole-bold-duotone"
   accent="destructive"
   description="إدارة أدوار المستخدمين وصلاحيات الوصول لكل وحدة نظام"
   breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'صلاحيات الأدوار' },
   ]}
  />
  <Card className="border-destructive/30">
   <CardContent className="p-6 text-center">
   <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
   <h3 className="text-base font-semibold text-destructive mb-1">خطأ في تحميل البيانات</h3>
   <p className="text-sm text-muted-foreground mb-4">{error}</p>
   <Button onClick={loadData} className="gap-2">
    <RefreshCw className="h-4 w-4" />
    إعادة المحاولة
   </Button>
   </CardContent>
  </Card>
  </div>
 );
 }

 /* ---- Selected role data ---- */
 const selectedRoleData = roles.find((r) => r.name === selectedRole);

 return (
 <div dir="rtl" className="p-4 lg:p-6 space-y-5">
  {/* ---- Page Header ---- */}
  <PageHeader
  title="صلاحيات الأدوار"
  iconify="solar:shield-keyhole-bold-duotone"
  accent="destructive"
  description="إدارة أدوار المستخدمين وصلاحيات الوصول لكل وحدة نظام"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'صلاحيات الأدوار' },
  ]}
  actions={
   <div className="flex items-center gap-2">
   <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
    <RefreshCw className="h-4 w-4" />
    تحديث
   </Button>
   <Button onClick={openCreateDialog} className="gap-2">
    <Plus className="h-4 w-4" />
    إنشاء دور جديد
   </Button>
   </div>
  }
  />

  {/* ---- KPI Strip ---- */}
  <KpiStrip cols={4}>
  <KpiCard
   title="إجمالي الأدوار"
   value={kpiData.totalRoles}
   icon={Shield}
   accent="destructive"
   description="عدد الأدوار المسجلة في النظام"
  />
  <KpiCard
   title="أدوار مفعّلة"
   value={kpiData.active}
   icon={UserCheck}
   accent="success"
   change={kpiData.totalRoles > 0 ? Math.round((kpiData.active / kpiData.totalRoles) * 100) : 0}
   changeType="positive"
   description="أدوار نشطة حالياً"
  />
  <KpiCard
   title="أنواع المستندات"
   value={kpiData.doctypeCount}
   icon={Key}
   accent="info"
   description="أنواع المستندات المتاحة للصلاحيات"
  />
  <KpiCard
   title="صلاحيات مفعّلة"
   value={kpiData.totalPermCount}
   icon={Lock}
   accent="warning"
   description="صلاحيات مفعّلة للدور المحدد"
  />
  </KpiStrip>

  {/* ---- Main Content ---- */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
  {/* ---- Roles Panel (Right in RTL = start) ---- */}
  <div className="lg:col-span-4 xl:col-span-3">
   <Card className="border-border/40 shadow-sm">
   <CardContent className="p-4">
    <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-semibold text-foreground">الأدوار</h2>
    <Button
     size="sm"
     variant="outline"
     onClick={openCreateDialog}
     className="gap-1.5 h-8 text-xs"
    >
     <Plus className="h-3.5 w-3.5" />
     جديد
    </Button>
    </div>

    {/* Search */}
    <div className="relative mb-3">
    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    <Input
     placeholder="بحث عن دور..."
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     className="ps-8 h-9 text-sm"
    />
    </div>

    {/* Role list */}
    <div
    className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto"
    style={{ scrollbarWidth: 'thin' }}
    >
    {filteredRoles.length === 0 && (
     <div className="text-center py-8 text-muted-foreground text-sm">
     لا توجد أدوار مطابقة
     </div>
    )}
    {filteredRoles.map((role, idx) => {
     const isActive = !toBool(role.disabled);
     const isSelected = selectedRole === role.name;
     const color = roleColor(idx);
     // Count enabled perms for this role
     const rolePermRecords = docPerms.filter(
     (p) => p.role === role.name && p.permlevel === 0
     );
     const permEnabledCount = rolePermRecords.reduce(
     (sum, p) => sum + PERM_KEYS.filter((k) => toBool(p[k])).length,
     0
     );

     return (
     <div
      key={role.name}
      onClick={() => handleSelectRole(role.name)}
      className={`
      group relative rounded-lg border p-3 cursor-pointer transition-all duration-150
      hover:border-border hover:bg-muted/20
      ${isSelected
       ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
       : 'border-border/30 bg-card'
      }
      `}
     >
      <div className="flex items-start gap-3">
      {/* Color indicator */}
      <div
       className="mt-0.5 h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-xs"
       style={{ backgroundColor: color }}
      >
       {role.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
       <div className="flex items-center gap-2">
       <span className="text-sm font-semibold text-foreground truncate">
        {role.name}
       </span>
       {isActive ? (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary ring-1 ring-inset ring-chart-3/25">
        مفعّل
        </span>
       ) : (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border/40">
        معطّل
        </span>
       )}
       </div>
       <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
       <Key className="h-3 w-3" />
       <span>{permEnabledCount} صلاحية</span>
       </div>
      </div>
      </div>

      {/* Action buttons on hover */}
      <div className="absolute end-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
       size="icon"
       variant="ghost"
       className="h-7 w-7 text-destructive hover:text-destructive"
       onClick={(e) => {
       e.stopPropagation();
       openDeleteDialog(role.name);
       }}
      >
       <Trash2 className="h-3.5 w-3.5" />
      </Button>
      </div>
     </div>
     );
    })}
    </div>
   </CardContent>
   </Card>
  </div>

  {/* ---- Permission Matrix Panel ---- */}
  <div className="lg:col-span-8 xl:col-span-9">
   {selectedRole && selectedRoleData ? (
   <Card className="border-border/40 shadow-sm">
    <CardContent className="p-4 lg:p-5">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
     <div className="flex items-center gap-3">
     <div
      className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm"
      style={{
      backgroundColor: roleColor(
       roles.findIndex((r) => r.name === selectedRole)
      ),
      }}
     >
      {selectedRole.charAt(0)}
     </div>
     <div>
      <h2 className="text-base font-semibold text-foreground">
      {selectedRole}
      </h2>
      <p className="text-xs text-muted-foreground">
      صلاحيات الوصول لأنواع المستندات
      </p>
     </div>
     </div>
     <div className="flex items-center gap-3">
     <div className="flex items-center gap-2">
      <Label
      htmlFor="role-active-switch"
      className="text-xs text-muted-foreground"
      >
      تفعيل الدور
      </Label>
      <Switch
      id="role-active-switch"
      checked={!toBool(selectedRoleData.disabled)}
      onCheckedChange={() =>
       handleToggleActive(selectedRoleData.name, selectedRoleData.disabled)
      }
      />
     </div>
     <Button
      onClick={handleSave}
      disabled={!hasUnsaved || saving}
      className="gap-2"
      size="sm"
     >
      {saving ? (
      <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
      <Save className="h-4 w-4" />
      )}
      حفظ الصلاحيات
     </Button>
     </div>
    </div>

    {hasUnsaved && (
     <div className="mb-4 px-3 py-2 rounded-lg bg-chart-2/10 border border-chart-2/20 text-chart-2 text-xs font-medium flex items-center gap-2">
     <Lock className="h-3.5 w-3.5" />
     لديك {unsavedCount} تغيير غير محفوظ — اضغط &quot;حفظ الصلاحيات&quot; لتأكيد التعديلات
     </div>
    )}

    {/* Module Filter Tabs */}
    <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
     <Badge
     variant={moduleFilter === 'الكل' ? 'default' : 'outline'}
     className="cursor-pointer whitespace-nowrap text-xs px-3 py-1"
     onClick={() => setModuleFilter('الكل')}
     >
     الكل ({doctypes.length})
     </Badge>
     {modules.map((mod) => {
     const count = doctypes.filter((dt) => dt.module === mod).length;
     return (
      <Badge
      key={mod}
      variant={moduleFilter === mod ? 'default' : 'outline'}
      className="cursor-pointer whitespace-nowrap text-xs px-3 py-1"
      onClick={() => setModuleFilter(mod)}
      >
      {mod} ({count})
      </Badge>
     );
     })}
    </div>

    {/* Permission Matrix */}
    <div className="overflow-x-auto rounded-lg border border-border/40">
     <table className="w-full text-sm">
     <thead>
      <tr className="bg-muted/40 border-b border-border/40">
      <th className="px-3 py-2.5 text-start font-semibold text-foreground min-w-[180px] sticky start-0 bg-muted/40 z-10">
       نوع المستند
      </th>
      <th className="px-2 py-2.5 text-center font-medium text-muted-foreground min-w-[80px]">
       الوحدة
      </th>
      {PERM_KEYS.map((key) => (
       <th
       key={key}
       className="px-1.5 py-2.5 text-center font-medium text-muted-foreground min-w-[56px] text-xs"
       >
       {PERM_LABELS[key]}
       </th>
      ))}
      <th className="px-2 py-2.5 text-center font-medium text-muted-foreground min-w-[80px]">
       إجراءات
      </th>
      </tr>
     </thead>
     <tbody>
      {filteredDocTypes.length === 0 && (
      <tr>
       <td
       colSpan={PERM_KEYS.length + 3}
       className="px-3 py-8 text-center text-muted-foreground"
       >
       لا توجد أنواع مستندات مطابقة
       </td>
      </tr>
      )}
      {filteredDocTypes.map((dt, mIdx) => {
      const wp = workingPerms[dt.name];
      const perm = wp?.perms;
      const enabledCount = perm
       ? PERM_KEYS.filter((k) => perm[k]).length
       : 0;
      const isChanged = wp?.changed ?? false;

      return (
       <tr
       key={dt.name}
       className={`border-b border-border/30 transition-colors hover:bg-muted/10 ${
        mIdx % 2 === 0 ? '' : 'bg-muted/5'
       } ${isChanged ? 'bg-chart-2/5' : ''}`}
       >
       <td className="px-3 py-2 font-medium text-foreground sticky start-0 bg-inherit z-10">
        <div className="flex items-center gap-2">
        <div
         className="h-2 w-2 rounded-full shrink-0"
         style={{
         backgroundColor: roleColor(
          roles.findIndex((r) => r.name === selectedRole)
         ),
         opacity: enabledCount > 0 ? 1 : 0.3,
         }}
        />
        <span className="truncate" title={dt.name}>
         {dt.name}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
         ({enabledCount}/{PERM_KEYS.length})
        </span>
        </div>
       </td>
       <td className="px-2 py-2 text-center">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {dt.module}
        </Badge>
       </td>
       {PERM_KEYS.map((key) => {
        const isChecked = perm?.[key] ?? false;
        return (
        <td key={key} className="px-1.5 py-2 text-center">
         <button
         type="button"
         onClick={() =>
          handlePermToggle(dt.name, key, !isChecked)
         }
         className={`
          inline-flex items-center justify-center h-6 w-6 rounded-md transition-all duration-150
          ${
          isChecked
           ? 'bg-chart-3/10 text-chart-3 ring-1 ring-inset ring-chart-3/30 hover:bg-chart-3/50/25'
           : 'bg-destructive/8 text-destructive ring-1 ring-inset ring-destructive/15 hover:bg-destructive/10'
          }
         `}
         title={`${PERM_LABELS[key]}: ${isChecked ? 'مفعّل' : 'معطّل'}`}
         >
         {isChecked ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
         ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
         )}
         </button>
        </td>
        );
       })}
       <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
        <Button
         size="icon"
         variant="ghost"
         className="h-7 w-7 text-chart-3 hover:text-chart-3"
         title="تحديد الكل"
         onClick={() => handleSelectAllRow(dt.name)}
        >
         <CheckSquare className="h-3.5 w-3.5" />
        </Button>
        <Button
         size="icon"
         variant="ghost"
         className="h-7 w-7 text-destructive hover:text-destructive"
         title="إلغاء الكل"
         onClick={() => handleDeselectAllRow(dt.name)}
        >
         <XSquare className="h-3.5 w-3.5" />
        </Button>
        </div>
       </td>
       </tr>
      );
      })}
     </tbody>
     </table>
    </div>

    {/* Summary */}
    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
     <span>
     إجمالي الصلاحيات المفعّلة للدور المحدد:{' '}
     <strong className="text-foreground">
      {Object.values(workingPerms).reduce(
      (sum, wp) =>
       sum + PERM_KEYS.filter((k) => wp.perms[k]).length,
      0
      )}
     </strong>{' '}
     من {Object.keys(workingPerms).length * PERM_KEYS.length}
     {hasUnsaved && (
      <span className="text-chart-2 ms-2">
      ({unsavedCount} سجل متغير)
      </span>
     )}
     </span>
     <div className="flex items-center gap-2">
     <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5"
      onClick={handleGlobalSelectAll}
     >
      <CheckSquare className="h-3 w-3" />
      تحديد الكل
     </Button>
     <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5"
      onClick={handleGlobalDeselectAll}
     >
      <XSquare className="h-3 w-3" />
      إلغاء الكل
     </Button>
     </div>
    </div>
    </CardContent>
   </Card>
   ) : (
   <Card className="border-border/40 shadow-sm h-full min-h-[400px] flex items-center justify-center">
    <CardContent className="text-center py-16">
    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
     <Shield className="h-8 w-8 text-muted-foreground/50" />
    </div>
    <h3 className="text-base font-semibold text-muted-foreground mb-1">
     اختر دوراً لعرض الصلاحيات
    </h3>
    <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto">
     حدد أحد الأدوار من القائمة الجانبية لعرض وتعديل مصفوفة الصلاحيات الخاصة به
    </p>
    </CardContent>
   </Card>
   )}
  </div>
  </div>

  {/* ---- Create Role Dialog ---- */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="sm:max-w-[480px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Shield className="h-5 w-5 text-destructive" />
    إنشاء دور جديد
   </DialogTitle>
   </DialogHeader>

   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label htmlFor="roleName" className="text-sm font-medium">
    اسم الدور <span className="text-destructive">*</span>
    </Label>
    <Input
    id="roleName"
    placeholder="مثال: Branch Manager"
    value={formRoleName}
    onChange={(e) => setFormRoleName(e.target.value)}
    dir="ltr"
    />
    <p className="text-[11px] text-muted-foreground">
    الاسم بالإنجليزية كما سيظهر في النظام
    </p>
   </div>
   </div>

   <DialogFooter className="gap-2">
   <Button
    variant="outline"
    onClick={() => setDialogOpen(false)}
    disabled={creatingRole}
   >
    إلغاء
   </Button>
   <Button
    onClick={handleCreateRole}
    className="gap-2"
    disabled={creatingRole}
   >
    {creatingRole ? (
    <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
    <Plus className="h-4 w-4" />
    )}
    إنشاء
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ---- Delete Confirmation Dialog ---- */}
  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <DialogContent className="sm:max-w-[400px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2 text-destructive">
    <Trash2 className="h-5 w-5" />
    تأكيد الحذف
   </DialogTitle>
   </DialogHeader>
   <div className="py-3">
   <p className="text-sm text-muted-foreground">
    هل أنت متأكد من حذف دور &quot;{roleToDelete}&quot;؟
   </p>
   <p className="text-xs text-muted-foreground/60 mt-2">
    لا يمكن التراجع عن هذا الإجراء.
   </p>
   </div>
   <DialogFooter className="gap-2">
   <Button
    variant="outline"
    onClick={() => setDeleteDialogOpen(false)}
    disabled={deletingRole}
   >
    إلغاء
   </Button>
   <Button
    variant="destructive"
    onClick={handleConfirmDelete}
    className="gap-2"
    disabled={deletingRole}
   >
    {deletingRole ? (
    <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
    <Trash2 className="h-4 w-4" />
    )}
    حذف الدور
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>
 </div>
 );
}

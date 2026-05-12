'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
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
 Search,
 Plus,
 Users,
 UserCheck,
 Shield,
 RotateCcw,
 Edit,
 Trash2,
 Eye,
 EyeOff,
 Mail,
 Loader2,
 RefreshCw,
 UserPlus,
 Key,
 X,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Types                */
/* ------------------------------------------------------------------ */

type UserRole = {
 role: string;
 parent?: string;
};

type ERPUser = {
 name: string;
 email: string;
 first_name?: string;
 last_name?: string;
 full_name?: string;
 enabled?: number | boolean;
 user_type?: string;
 last_active?: string;
 last_login?: string;
 creation?: string;
 roles?: UserRole[];
 send_welcome_email?: number | boolean;
};

/* ------------------------------------------------------------------ */
/* Available Roles             */
/* ------------------------------------------------------------------ */

const AVAILABLE_ROLES = [
 'System Manager',
 'Administrator',
 'Accounts Manager',
 'Accounts User',
 'Sales Manager',
 'Sales User',
 'Purchase Manager',
 'Purchase User',
 'Stock Manager',
 'Stock User',
 'HR Manager',
 'HR User',
 'Manufacturing Manager',
 'Manufacturing User',
 'POS User',
 'Report Manager',
 'Website User',
 'Desk User',
];

const ROLE_LABELS: Record<string, string> = {
 'System Manager': 'مدير النظام',
 'Administrator': 'المسؤول',
 'Accounts Manager': 'مدير الحسابات',
 'Accounts User': 'مستخدم الحسابات',
 'Sales Manager': 'مدير المبيعات',
 'Sales User': 'مندوب مبيعات',
 'Purchase Manager': 'مدير المشتريات',
 'Purchase User': 'مستخدم المشتريات',
 'Stock Manager': 'مدير المخزون',
 'Stock User': 'مستخدم المخزون',
 'HR Manager': 'مدير الموارد البشرية',
 'HR User': 'مستخدم الموارد البشرية',
 'Manufacturing Manager': 'مدير التصنيع',
 'Manufacturing User': 'مستخدم التصنيع',
 'POS User': 'مستخدم نقاط البيع',
 'Report Manager': 'مدير التقارير',
 'Website User': 'مستخدم الموقع',
 'Desk User': 'مستخدم لوحة التحكم',
};

const ROLE_COLORS: Record<string, string> = {
 'System Manager': 'bg-destructive/10 text-destructive ring-destructive/25',
 'Administrator': 'bg-destructive/10 text-destructive ring-destructive/25',
 'Accounts Manager': 'bg-chart-2/10 text-chart-2 ring-chart-2/25',
 'Accounts User': 'bg-chart-2/10 text-chart-2 ring-chart-2/25',
 'Sales Manager': 'bg-primary/10 text-primary ring-chart-3/25',
 'Sales User': 'bg-primary/10 text-primary ring-chart-3/25',
 'Purchase Manager': 'bg-chart-1/10 text-chart-1 ring-chart-1/25',
 'Purchase User': 'bg-chart-1/10 text-chart-1 ring-chart-1/25',
 'Stock Manager': 'bg-chart-5/10 text-chart-5 ring-chart-5/25',
 'Stock User': 'bg-chart-5/10 text-chart-5 ring-chart-5/25',
 'HR Manager': 'bg-chart-5/10 text-chart-5 ring-chart-5/25',
 'HR User': 'bg-chart-5/10 text-chart-5 ring-chart-5/25',
 'Manufacturing Manager': 'bg-chart-4/10 text-chart-4 ring-chart-4/25',
 'Manufacturing User': 'bg-chart-4/10 text-chart-4 ring-chart-4/25',
 'POS User': 'bg-chart-3/10 text-chart-3 ring-chart-3/25',
 'Report Manager': 'bg-chart-1/10 text-chart-1 ring-chart-1/25',
 'Website User': 'bg-muted text-muted-foreground ring-muted',
 'Desk User': 'bg-muted text-muted-foreground ring-muted',
};

const DEFAULT_ROLE_COLOR = 'bg-muted text-muted-foreground ring-border/40';

/* ------------------------------------------------------------------ */
/* API helpers              */
/* ------------------------------------------------------------------ */

async function fetchUsers(): Promise<ERPUser[]> {
 const res = await fetch(
 '/api/data/User?fields=["name","email","first_name","last_name","full_name","enabled","user_type","last_active","last_login","creation"]&limit_page_length=200&order_by=creation desc'
 );
 const data = await res.json();
 return data.data || [];
}

async function fetchUserRoles(userName: string): Promise<UserRole[]> {
 try {
 const res = await fetch(
  `/api/data/Has%20Role?fields=["role","parent"]&filters=[["parent","=","${encodeURIComponent(userName)}"]]&limit_page_length=50`
 );
 const data = await res.json();
 return data.data || [];
 } catch {
 return [];
 }
}

async function fetchUserDetail(userName: string): Promise<ERPUser | null> {
 try {
 const res = await fetch(`/api/data/User/${encodeURIComponent(userName)}`);
 const data = await res.json();
 return data.success ? data.data : null;
 } catch {
 return null;
 }
}

async function createUser(userData: Record<string, unknown>) {
 const res = await fetch('/api/data/User', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ doctype: 'User', ...userData }),
 });
 return res.json();
}

async function updateUser(userName: string, userData: Partial<ERPUser>) {
 const res = await fetch(`/api/data/User/${encodeURIComponent(userName)}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(userData),
 });
 return res.json();
}

async function resetUserPassword(userName: string) {
 const res = await fetch('/api/method/frappe.core.doctype.user.user.reset_password', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ user: userName }),
 });
 return res.json();
}

/* ------------------------------------------------------------------ */
/* Form state type             */
/* ------------------------------------------------------------------ */

type UserFormData = {
 email: string;
 first_name: string;
 last_name: string;
 roles: string[];
 send_welcome_email: boolean;
 enabled: boolean;
};

const emptyForm: UserFormData = {
 email: '',
 first_name: '',
 last_name: '',
 roles: [],
 send_welcome_email: true,
 enabled: true,
};

/* ------------------------------------------------------------------ */
/* Main Page Component            */
/* ------------------------------------------------------------------ */

export default function UsersManagementPage() {
 /* ---- State ---- */
 const [users, setUsers] = useState<ERPUser[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [roleFilter, setRoleFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // Dialog state
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingUser, setEditingUser] = useState<ERPUser | null>(null);
 const [formData, setFormData] = useState<UserFormData>(emptyForm);
 const [saving, setSaving] = useState(false);

 // Role dialog for inline role management
 const [roleDialogOpen, setRoleDialogOpen] = useState(false);
 const [roleDialogUser, setRoleDialogUser] = useState<ERPUser | null>(null);
 const [roleDialogRoles, setRoleDialogRoles] = useState<string[]>([]);
 const [roleDialogSaving, setRoleDialogSaving] = useState(false);

 // Delete confirmation
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [userToDelete, setUserToDelete] = useState<ERPUser | null>(null);

 // Reset password confirmation
 const [resetDialogOpen, setResetDialogOpen] = useState(false);
 const [userToReset, setUserToReset] = useState<ERPUser | null>(null);

 // User roles cache
 const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({});
 const [loadingRoles, setLoadingRoles] = useState<Record<string, boolean>>({});

 // Refs for stable callback references in role loading
 const userRolesMapRef = useRef<Record<string, string[]>>({});
 const loadingRolesRef = useRef<Record<string, boolean>>({});

 // Keep refs in sync with state
 useEffect(() => { userRolesMapRef.current = userRolesMap; }, [userRolesMap]);
 useEffect(() => { loadingRolesRef.current = loadingRoles; }, [loadingRoles]);

 /* ---- Fetch users ---- */
 const loadUsers = useCallback(async () => {
 setLoading(true);
 try {
  const data = await fetchUsers();
  setUsers(data);
 } catch {
  toast.error('خطأ', { description: 'فشل تحميل بيانات المستخدمين' });
 } finally {
  setLoading(false);
 }
 }, [toast]);

 useEffect(() => {
 let cancelled = false;
 queueMicrotask(() => { if (!cancelled) setLoading(true); });
 fetchUsers()
  .then((data) => {
  if (!cancelled) setUsers(data);
  })
  .catch(() => {
  if (!cancelled) toast.error('خطأ', { description: 'فشل تحميل بيانات المستخدمين' });
  })
  .finally(() => {
  if (!cancelled) setLoading(false);
  });
 return () => { cancelled = true; };
 }, []);

 /* ---- Load roles for visible users progressively ---- */
 const loadUserRoles = useCallback(async (userName: string) => {
 if (userRolesMapRef.current[userName] || loadingRolesRef.current[userName]) return;
 setLoadingRoles((prev) => ({ ...prev, [userName]: true }));
 try {
  const roles = await fetchUserRoles(userName);
  const roleNames = roles.map((r) => r.role).filter((r) => r && r !== 'Guest' && r !== 'All');
  setUserRolesMap((prev) => ({ ...prev, [userName]: roleNames }));
 } catch {
  // ignore individual role load failures
 } finally {
  setLoadingRoles((prev) => ({ ...prev, [userName]: false }));
 }
 }, []);

 // Load roles for all users after initial fetch
 useEffect(() => {
 if (users.length === 0) return;
 users.forEach((u) => {
  loadUserRoles(u.name);
 });
 }, [users, loadUserRoles]);

 /* ---- Computed / filtered users ---- */
 const filteredUsers = useMemo(() => {
 let result = users;

 // Search filter
 if (searchQuery.trim()) {
  const q = searchQuery.trim().toLowerCase();
  result = result.filter(
  (u) =>
   (u.full_name || '').toLowerCase().includes(q) ||
   (u.first_name || '').toLowerCase().includes(q) ||
   (u.last_name || '').toLowerCase().includes(q) ||
   (u.email || '').toLowerCase().includes(q) ||
   (u.name || '').toLowerCase().includes(q)
  );
 }

 // Status filter
 if (statusFilter === 'active') {
  result = result.filter((u) => u.enabled);
 } else if (statusFilter === 'disabled') {
  result = result.filter((u) => !u.enabled);
 }

 // Role filter
 if (roleFilter !== 'all') {
  result = result.filter((u) => {
  const roles = userRolesMap[u.name] || [];
  return roles.includes(roleFilter);
  });
 }

 return result;
 }, [users, searchQuery, statusFilter, roleFilter, userRolesMap]);

 /* ---- Stats ---- */
 const stats = useMemo(() => {
 const total = users.length;
 const active = users.filter((u) => u.enabled).length;
 const admins = users.filter((u) => {
  const roles = userRolesMap[u.name] || [];
  return roles.includes('System Manager') || roles.includes('Administrator');
 }).length;
 const now = new Date();
 const thisMonth = users.filter((u) => {
  if (!u.creation) return false;
  const d = new Date(u.creation);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
 }).length;
 return { total, active, admins, thisMonth };
 }, [users, userRolesMap]);

 /* ---- Dialog handlers ---- */
 const openCreateDialog = useCallback(() => {
 setEditingUser(null);
 setFormData(emptyForm);
 setDialogOpen(true);
 }, []);

 const openEditDialog = useCallback(async (user: ERPUser) => {
 setEditingUser(user);
 setFormData({
  email: user.email || '',
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  roles: userRolesMap[user.name] || [],
  send_welcome_email: false,
  enabled: !!user.enabled,
 });
 setDialogOpen(true);
 }, [userRolesMap]);

 const handleSaveUser = useCallback(async () => {
 if (!formData.email.trim()) {
  toast.error('خطأ', { description: 'يرجى إدخال البريد الإلكتروني' });
  return;
 }
 if (!formData.first_name.trim()) {
  toast.error('خطأ', { description: 'يرجى إدخال الاسم الأول' });
  return;
 }

 setSaving(true);
 try {
  if (editingUser) {
  // Update existing user
  const updateData: Partial<ERPUser> = {
   email: formData.email,
   first_name: formData.first_name,
   last_name: formData.last_name,
   enabled: formData.enabled ? 1 : 0,
   roles: formData.roles.map((r) => ({ role: r, doctype: 'Has Role' })),
  };
  const result = await updateUser(editingUser.name, updateData);
  if (result.success) {
   toast.success('تم التحديث', { description: `تم تحديث بيانات المستخدم "${formData.first_name}" بنجاح` });
   setDialogOpen(false);
   // Refresh roles cache
   setUserRolesMap((prev) => ({ ...prev, [editingUser.name]: formData.roles }));
   loadUsers();
  } else {
   toast.error('فشل التحديث', { description: result.error || 'حدث خطأ أثناء التحديث' });
  }
  } else {
  // Create new user
  const createData: Record<string, unknown> = {
   email: formData.email,
   first_name: formData.first_name,
   last_name: formData.last_name,
   send_welcome_email: formData.send_welcome_email ? 1 : 0,
   enabled: formData.enabled ? 1 : 0,
   roles: formData.roles.map((r) => ({ role: r, doctype: 'Has Role' })),
  };
  const result = await createUser(createData);
  if (result.success) {
   toast.success('تم الإنشاء', { description: `تم إنشاء المستخدم "${formData.first_name}" بنجاح` });
   setDialogOpen(false);
   loadUsers();
  } else {
   toast.error('فشل الإنشاء', { description: result.error || 'حدث خطأ أثناء الإنشاء' });
  }
  }
 } catch {
  toast.error('خطأ', { description: 'تعذر الاتصال بالخادم' });
 } finally {
  setSaving(false);
 }
 }, [editingUser, formData, toast, loadUsers]);

 /* ---- Delete handler ---- */
 const handleDeleteUser = useCallback(async () => {
 if (!userToDelete) return;
 try {
  const res = await fetch(`/api/data/User/${encodeURIComponent(userToDelete.name)}`, {
  method: 'DELETE',
  });
  const result = await res.json();
  if (result.success) {
  toast.success('تم الحذف', { description: `تم حذف المستخدم "${userToDelete.full_name || userToDelete.name}"` });
  loadUsers();
  } else {
  toast.error('فشل الحذف', { description: result.error || 'حدث خطأ' });
  }
 } catch {
  toast.error('خطأ', { description: 'تعذر الاتصال بالخادم' });
 }
 setDeleteDialogOpen(false);
 setUserToDelete(null);
 }, [userToDelete, toast, loadUsers]);

 /* ---- Reset password handler ---- */
 const handleResetPassword = useCallback(async () => {
 if (!userToReset) return;
 try {
  const result = await resetUserPassword(userToReset.name);
  if (result.success) {
  toast.success('تم الإرسال', { description: `تم إرسال رابط إعادة تعيين كلمة المرور إلى "${userToReset.email}"` });
  } else {
  toast.error('فشل الإرسال', { description: result.error || 'حدث خطأ أثناء إرسال رابط إعادة التعيين' });
  }
 } catch {
  toast.error('خطأ', { description: 'تعذر الاتصال بالخادم' });
 }
 setResetDialogOpen(false);
 setUserToReset(null);
 }, [userToReset, toast]);

 /* ---- Role dialog handlers ---- */
 const openRoleDialog = useCallback((user: ERPUser) => {
 setRoleDialogUser(user);
 setRoleDialogRoles(userRolesMap[user.name] || []);
 setRoleDialogOpen(true);
 }, [userRolesMap]);

 const handleSaveRoles = useCallback(async () => {
 if (!roleDialogUser) return;
 setRoleDialogSaving(true);
 try {
  const result = await updateUser(roleDialogUser.name, {
  roles: roleDialogRoles.map((r) => ({ role: r, doctype: 'Has Role' })),
  });
  if (result.success) {
  toast.success('تم الحفظ', { description: `تم تحديث أدوار المستخدم "${roleDialogUser.full_name || roleDialogUser.name}"` });
  setUserRolesMap((prev) => ({ ...prev, [roleDialogUser.name]: roleDialogRoles }));
  setRoleDialogOpen(false);
  } else {
  toast.error('فشل الحفظ', { description: result.error || 'حدث خطأ' });
  }
 } catch {
  toast.error('خطأ', { description: 'تعذر الاتصال بالخادم' });
 } finally {
  setRoleDialogSaving(false);
 }
 }, [roleDialogUser, roleDialogRoles, toast]);

 /* ---- Toggle enabled ---- */
 const handleToggleEnabled = useCallback(async (user: ERPUser) => {
 const newEnabled = !user.enabled;
 try {
  const result = await updateUser(user.name, { enabled: newEnabled ? 1 : 0 });
  if (result.success) {
  toast.success(newEnabled ? 'تم التفعيل' : 'تم التعطيل', { description: newEnabled
   ? `تم تفعيل المستخدم "${user.full_name || user.name}"`
   : `تم تعطيل المستخدم "${user.full_name || user.name}"` });
  setUsers((prev) =>
   prev.map((u) => (u.name === user.name ? { ...u, enabled: newEnabled } : u))
  );
  } else {
  toast.error('فشل التحديث', { description: result.error || 'حدث خطأ' });
  }
 } catch {
  toast.error('خطأ', { description: 'تعذر الاتصال بالخادم' });
 }
 }, [toast]);

 /* ---- Format date ---- */
 const formatDate = (dateStr?: string) => {
 if (!dateStr) return '—';
 try {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  });
 } catch {
  return dateStr;
 }
 };

 const formatDateTime = (dateStr?: string) => {
 if (!dateStr) return '—';
 try {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  });
 } catch {
  return dateStr;
 }
 };

 /* ---- Render role badge ---- */
 const renderRoleBadge = (roleName: string, removable?: boolean, onRemove?: () => void) => {
 const colorClass = ROLE_COLORS[roleName] || DEFAULT_ROLE_COLOR;
 const label = ROLE_LABELS[roleName] || roleName;
 return (
  <span
  key={roleName}
  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${colorClass}`}
  >
  {label}
  {removable && onRemove && (
   <button
   type="button"
   onClick={onRemove}
   className="ms-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10"
   >
   <X className="h-2.5 w-2.5" />
   </button>
  )}
  </span>
 );
 };

 /* ---- Unique roles for filter dropdown ---- */
 const allUsedRoles = useMemo(() => {
 const roleSet = new Set<string>();
 Object.values(userRolesMap).forEach((roles) => {
  roles.forEach((r) => roleSet.add(r));
 });
 return Array.from(roleSet).sort();
 }, [userRolesMap]);

 /* ---- Loading skeleton ---- */
 if (loading && users.length === 0) {
 return (
  <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
   title="إدارة المستخدمين"
   description="إدارة مستخدمي النظام وأدوارهم وصلاحياتهم"
   iconify="solar:users-group-rounded-bold-duotone"
   accent="info"
   breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'المستخدمين' }]}
  />
  <div className="flex items-center justify-center py-20">
   <Loader2 className="h-8 w-8 animate-spin text-primary" />
   <span className="ms-3 text-sm text-muted-foreground">جارٍ تحميل المستخدمين…</span>
  </div>
  </div>
 );
 }

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  {/* ---- Page Header ---- */}
  <PageHeader
  title="إدارة المستخدمين"
  description="إدارة مستخدمي النظام وأدوارهم وصلاحياتهم ومراقبة نشاطهم"
  iconify="solar:users-group-rounded-bold-duotone"
  accent="info"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'المستخدمين' }]}
  actions={
   <div className="flex items-center gap-2">
   <Button variant="outline" size="sm" className="gap-1.5" onClick={loadUsers} disabled={loading}>
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    تحديث
   </Button>
   <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
    <UserPlus className="h-3.5 w-3.5" />
    مستخدم جديد
   </Button>
   </div>
  }
  />

  {/* ---- Stats Cards ---- */}
  {/* ---- Search & Filters ---- */}
  <Card className="border-border/40 shadow-sm">
  <CardContent className="p-4">
   <div className="flex flex-col sm:flex-row gap-3">
   {/* Search */}
   <div className="relative flex-1">
    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
    placeholder="بحث بالاسم أو البريد الإلكتروني..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="ps-9 h-9 text-sm"
    />
   </div>

   {/* Role filter */}
   <Select value={roleFilter} onValueChange={setRoleFilter}>
    <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
    <Shield className="h-3.5 w-3.5 ms-1 text-muted-foreground" />
    <SelectValue placeholder="فلترة حسب الدور" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">جميع الأدوار</SelectItem>
    {allUsedRoles.map((role) => (
     <SelectItem key={role} value={role}>
     {ROLE_LABELS[role] || role}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>

   {/* Status filter */}
   <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
    <SelectValue placeholder="الحالة" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">الكل</SelectItem>
    <SelectItem value="active">مفعّل</SelectItem>
    <SelectItem value="disabled">معطّل</SelectItem>
    </SelectContent>
   </Select>
   </div>
  </CardContent>
  </Card>

  {/* ---- Users Table ---- */}
  <Card className="border-border/40 shadow-sm">
  <CardContent className="p-0">
   <div className="overflow-x-auto">
   <Table>
    <TableHeader>
    <TableRow className="bg-muted/40 hover:bg-muted/40">
     <TableHead className="text-xs font-semibold ps-4">المستخدم</TableHead>
     <TableHead className="text-xs font-semibold">البريد الإلكتروني</TableHead>
     <TableHead className="text-xs font-semibold">الأدوار</TableHead>
     <TableHead className="text-center text-xs font-semibold">الحالة</TableHead>
     <TableHead className="text-xs font-semibold">آخر نشاط</TableHead>
     <TableHead className="text-center text-xs font-semibold">مفعّل</TableHead>
     <TableHead className="text-center text-xs font-semibold pe-4">إجراءات</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {filteredUsers.length === 0 && (
     <TableRow>
     <TableCell colSpan={7} className="text-center py-12">
      <div className="flex flex-col items-center gap-3">
      <Users className="h-9 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">
       {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
       ? 'لا توجد نتائج مطابقة للبحث'
       : 'لا يوجد مستخدمون مسجلون'}
      </p>
      {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
       <Button
       variant="outline"
       size="sm"
       className="text-xs"
       onClick={() => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
       }}
       >
       مسح الفلاتر
       </Button>
      )}
      </div>
     </TableCell>
     </TableRow>
    )}
    {filteredUsers.map((user) => {
     const userRoles = userRolesMap[user.name] || [];
     const isLoadingRoles = loadingRoles[user.name];
     const fullName = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name;
     const initials = fullName
     .split(' ')
     .map((w) => w.charAt(0))
     .slice(0, 2)
     .join('')
     .toUpperCase();

     return (
     <TableRow
      key={user.name}
      className={`hover:bg-muted/20 transition-colors ${!user.enabled ? 'opacity-60' : ''}`}
     >
      {/* User name + avatar */}
      <TableCell className="ps-4">
      <div className="flex items-center gap-3">
       <div
       className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
        user.enabled
        ? 'bg-chart-1/10 text-chart-1'
        : 'bg-muted text-muted-foreground'
       }`}
       >
       {initials || '?'}
       </div>
       <div className="min-w-0">
       <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
       <p className="text-[11px] text-muted-foreground truncate">{user.name}</p>
       </div>
      </div>
      </TableCell>

      {/* Email */}
      <TableCell>
      <div className="flex items-center gap-1.5">
       <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
       <span className="text-xs truncate max-w-[200px]" dir="ltr">
       {user.email}
       </span>
      </div>
      </TableCell>

      {/* Roles */}
      <TableCell>
      <div className="flex flex-wrap gap-1 max-w-[280px]">
       {isLoadingRoles ? (
       <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
       ) : userRoles.length === 0 ? (
       <span className="text-[11px] text-muted-foreground">—</span>
       ) : (
       userRoles.slice(0, 3).map((role) => renderRoleBadge(role))
       )}
       {userRoles.length > 3 && (
       <button
        type="button"
        onClick={() => openRoleDialog(user)}
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border/40 hover:bg-muted/80 transition-colors"
       >
        +{userRoles.length - 3}
       </button>
       )}
      </div>
      </TableCell>

      {/* Status */}
      <TableCell className="text-center">
      {user.enabled ? (
       <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">
       نشط
       </Badge>
      ) : (
       <Badge variant="outline" className="text-[10px] border-0 bg-destructive/10 text-destructive">
       معطّل
       </Badge>
      )}
      </TableCell>

      {/* Last active */}
      <TableCell className="text-xs text-muted-foreground">
      {formatDateTime(user.last_active || user.last_login)}
      </TableCell>

      {/* Enabled toggle */}
      <TableCell className="text-center">
      <Switch
       checked={!!user.enabled}
       onCheckedChange={() => handleToggleEnabled(user)}
       className="mx-auto"
      />
      </TableCell>

      {/* Actions */}
      <TableCell className="pe-4">
      <div className="flex items-center justify-center gap-1">
       <Button
       size="icon"
       variant="ghost"
       className="h-7 w-7"
       title="تعديل"
       onClick={() => openEditDialog(user)}
       >
       <Edit className="h-3.5 w-3.5" />
       </Button>
       <Button
       size="icon"
       variant="ghost"
       className="h-7 w-7"
       title="إدارة الأدوار"
       onClick={() => openRoleDialog(user)}
       >
       <Shield className="h-3.5 w-3.5" />
       </Button>
       <Button
       size="icon"
       variant="ghost"
       className="h-7 w-7"
       title="إعادة تعيين كلمة المرور"
       onClick={() => {
        setUserToReset(user);
        setResetDialogOpen(true);
       }}
       >
       <Key className="h-3.5 w-3.5" />
       </Button>
       <Button
       size="icon"
       variant="ghost"
       className="h-7 w-7 text-destructive hover:text-destructive"
       title="حذف"
       onClick={() => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
       }}
       >
       <Trash2 className="h-3.5 w-3.5" />
       </Button>
      </div>
      </TableCell>
     </TableRow>
     );
    })}
    </TableBody>
   </Table>
   </div>

   {/* Table footer */}
   <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
   <span>
    عرض {filteredUsers.length} من {users.length} مستخدم
   </span>
   {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
    <Button
    variant="ghost"
    size="sm"
    className="h-7 text-xs gap-1"
    onClick={() => {
     setSearchQuery('');
     setRoleFilter('all');
     setStatusFilter('all');
    }}
    >
    <X className="h-3 w-3" />
    مسح الفلاتر
    </Button>
   )}
   </div>
  </CardContent>
  </Card>

  {/* ---- Create / Edit User Dialog ---- */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="sm:max-w-[560px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    {editingUser ? (
    <>
     <Edit className="h-5 w-5 text-chart-1" />
     تعديل المستخدم
    </>
    ) : (
    <>
     <UserPlus className="h-5 w-5 text-chart-1" />
     إنشاء مستخدم جديد
    </>
    )}
   </DialogTitle>
   </DialogHeader>

   <div className="space-y-4 py-2">
   {/* Email */}
   <div className="space-y-2">
    <Label htmlFor="user-email" className="text-sm font-medium">
    البريد الإلكتروني <span className="text-destructive">*</span>
    </Label>
    <div className="relative">
    <Mail className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
     id="user-email"
     placeholder="user@example.com"
     value={formData.email}
     onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
     dir="ltr"
     className="ps-9"
     disabled={!!editingUser}
    />
    </div>
   </div>

   {/* First & Last Name */}
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-2">
    <Label htmlFor="first-name" className="text-sm font-medium">
     الاسم الأول <span className="text-destructive">*</span>
    </Label>
    <Input
     id="first-name"
     placeholder="أحمد"
     value={formData.first_name}
     onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
    />
    </div>
    <div className="space-y-2">
    <Label htmlFor="last-name" className="text-sm font-medium">
     الاسم الأخير
    </Label>
    <Input
     id="last-name"
     placeholder="المحمدي"
     value={formData.last_name}
     onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
    />
    </div>
   </div>

   {/* Roles multi-select */}
   <div className="space-y-2">
    <Label className="text-sm font-medium">الأدوار</Label>
    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-muted/10 min-h-[60px]">
    {formData.roles.length === 0 && (
     <span className="text-xs text-muted-foreground">لم يتم تحديد أدوار</span>
    )}
    {formData.roles.map((role) =>
     renderRoleBadge(role, true, () =>
     setFormData((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
     }))
     )
    )}
    </div>
    <Select
    onValueChange={(value) => {
     if (!formData.roles.includes(value)) {
     setFormData((prev) => ({ ...prev, roles: [...prev.roles, value] }));
     }
    }}
    >
    <SelectTrigger className="h-9 text-sm">
     <Plus className="h-3.5 w-3.5 ms-1 text-muted-foreground" />
     <SelectValue placeholder="إضافة دور..." />
    </SelectTrigger>
    <SelectContent>
     {AVAILABLE_ROLES.filter((r) => !formData.roles.includes(r)).map((role) => (
     <SelectItem key={role} value={role}>
      {ROLE_LABELS[role] || role}
     </SelectItem>
     ))}
    </SelectContent>
    </Select>
   </div>

   {/* Enabled toggle (edit only) */}
   {editingUser && (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/35">
    <div>
     <p className="text-sm font-medium">تفعيل المستخدم</p>
     <p className="text-xs text-muted-foreground mt-0.5">
     السماح للمستخدم بتسجيل الدخول واستخدام النظام
     </p>
    </div>
    <Switch
     checked={formData.enabled}
     onCheckedChange={(checked) =>
     setFormData((prev) => ({ ...prev, enabled: checked }))
     }
    />
    </div>
   )}

   {/* Send welcome email (create only) */}
   {!editingUser && (
    <div className="flex items-center gap-3">
    <Checkbox
     id="send-welcome"
     checked={formData.send_welcome_email}
     onCheckedChange={(checked) =>
     setFormData((prev) => ({ ...prev, send_welcome_email: !!checked }))
     }
    />
    <div>
     <Label htmlFor="send-welcome" className="text-sm font-medium cursor-pointer">
     إرسال بريد ترحيبي
     </Label>
     <p className="text-xs text-muted-foreground mt-0.5">
     إرسال رسالة ترحيبية تحتوي على رابط إعداد كلمة المرور
     </p>
    </div>
    </div>
   )}
   </div>

   <DialogFooter className="gap-2">
   <Button variant="outline" onClick={() => setDialogOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={handleSaveUser} disabled={saving} className="gap-2">
    {saving ? (
    <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
    <UserPlus className="h-4 w-4" />
    )}
    {editingUser ? 'تحديث' : 'إنشاء'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ---- Role Management Dialog ---- */}
  <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
  <DialogContent className="sm:max-w-[500px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Shield className="h-5 w-5 text-chart-2" />
    إدارة أدوار المستخدم
   </DialogTitle>
   </DialogHeader>

   {roleDialogUser && (
   <div className="space-y-4 py-2">
    {/* User info */}
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
    <div className="h-9 w-10 shrink-0 rounded-full bg-chart-1/10 text-chart-1 flex items-center justify-center font-bold text-sm">
     {(roleDialogUser.full_name || roleDialogUser.name).charAt(0).toUpperCase()}
    </div>
    <div>
     <p className="text-sm font-medium">
     {roleDialogUser.full_name || roleDialogUser.name}
     </p>
     <p className="text-xs text-muted-foreground" dir="ltr">
     {roleDialogUser.email}
     </p>
    </div>
    </div>

    {/* Current roles */}
    <div className="space-y-2">
    <Label className="text-sm font-medium">الأدوار الحالية</Label>
    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-muted/10 min-h-[50px]">
     {roleDialogRoles.length === 0 && (
     <span className="text-xs text-muted-foreground">لا توجد أدوار معينة</span>
     )}
     {roleDialogRoles.map((role) =>
     renderRoleBadge(role, true, () =>
      setRoleDialogRoles((prev) => prev.filter((r) => r !== role))
     )
     )}
    </div>
    </div>

    {/* Add role */}
    <div className="space-y-2">
    <Label className="text-sm font-medium">إضافة دور</Label>
    <Select
     onValueChange={(value) => {
     if (!roleDialogRoles.includes(value)) {
      setRoleDialogRoles((prev) => [...prev, value]);
     }
     }}
    >
     <SelectTrigger className="h-9 text-sm">
     <Plus className="h-3.5 w-3.5 ms-1 text-muted-foreground" />
     <SelectValue placeholder="اختر دوراً لإضافته..." />
     </SelectTrigger>
     <SelectContent>
     {AVAILABLE_ROLES.filter((r) => !roleDialogRoles.includes(r)).map((role) => (
      <SelectItem key={role} value={role}>
      {ROLE_LABELS[role] || role}
      </SelectItem>
     ))}
     </SelectContent>
    </Select>
    </div>

    {/* Quick role presets */}
    <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">تعيين سريع</Label>
    <div className="flex flex-wrap gap-2">
     <Button
     variant="outline"
     size="sm"
     className="h-7 text-[11px] gap-1"
     onClick={() =>
      setRoleDialogRoles((prev) => {
      const next = [...prev];
      if (!next.includes('Desk User')) next.push('Desk User');
      return next;
      })
     }
     >
     <Eye className="h-3 w-3" />
     مستخدم لوحة تحكم
     </Button>
     <Button
     variant="outline"
     size="sm"
     className="h-7 text-[11px] gap-1"
     onClick={() =>
      setRoleDialogRoles((prev) => {
      const next = [...prev];
      if (!next.includes('System Manager')) next.push('System Manager');
      return next;
      })
     }
     >
     <Shield className="h-3 w-3" />
     مدير نظام
     </Button>
     <Button
     variant="outline"
     size="sm"
     className="h-7 text-[11px] gap-1"
     onClick={() => setRoleDialogRoles([])}
     >
     <Trash2 className="h-3 w-3" />
     إزالة الكل
     </Button>
    </div>
    </div>
   </div>
   )}

   <DialogFooter className="gap-2">
   <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={handleSaveRoles} disabled={roleDialogSaving} className="gap-2">
    {roleDialogSaving ? (
    <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
    <Shield className="h-4 w-4" />
    )}
    حفظ الأدوار
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ---- Delete Confirmation Dialog ---- */}
  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle className="flex items-center gap-2 text-destructive">
    <Trash2 className="h-5 w-5" />
    تأكيد حذف المستخدم
   </AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف المستخدم &quot;{userToDelete?.full_name || userToDelete?.name}&quot;؟
    سيتم حذف جميع بياناته وصلاحياته. لا يمكن التراجع عن هذا الإجراء.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction
    onClick={handleDeleteUser}
    variant="destructive"
   >
    حذف المستخدم
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>

  {/* ---- Reset Password Confirmation Dialog ---- */}
  <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle className="flex items-center gap-2">
    <RotateCcw className="h-5 w-5 text-chart-2" />
    إعادة تعيين كلمة المرور
   </AlertDialogTitle>
   <AlertDialogDescription>
    سيتم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني
    &quot;{userToReset?.email}&quot;. هل تريد المتابعة؟
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction onClick={handleResetPassword} className="gap-2">
    <Mail className="h-4 w-4" />
    إرسال رابط التعيين
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}

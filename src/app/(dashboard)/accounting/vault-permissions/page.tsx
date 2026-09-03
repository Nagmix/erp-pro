'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/erp/data-table';
import {
  ShieldCheck,
  Users,
  Lock,
  Save,
  Plus,
  Trash2,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ──
interface VaultPermission {
  id: string;
  employeeId: string;
  vaultId: string;
  canDeposit: boolean;
  canWithdraw: boolean;
  canView: boolean;
}

type ViewMode = 'employee' | 'vault';

// ── API helpers for local DB ──
async function fetchPermissions(): Promise<VaultPermission[]> {
  const res = await fetch('/api/accounting/vault-permissions');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل تحميل الصلاحيات');
  return json.data ?? [];
}

async function saveAllPermissionsAPI(perms: Omit<VaultPermission, 'id'>[]): Promise<VaultPermission[]> {
  const res = await fetch('/api/accounting/vault-permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions: perms }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل حفظ الصلاحيات');
  return json.data ?? [];
}

async function deletePermissionAPI(employeeId: string, vaultId: string): Promise<void> {
  const params = new URLSearchParams({ employeeId, vaultId });
  const res = await fetch(`/api/accounting/vault-permissions?${params.toString()}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'فشل حذف الصلاحية');
}

export default function VaultPermissionsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('employee');

  // ── Fetch permissions from local DB via API ──
  const {
    data: permissions = [],
    isLoading: permLoading,
    error: permError,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ['vaultPermissions'],
    queryFn: fetchPermissions,
  });

  const saveAllMutation = useMutation({
    mutationFn: saveAllPermissionsAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPermissions'] });
    },
  });

  const deletePermMutation = useMutation({
    mutationFn: ({ employeeId, vaultId }: { employeeId: string; vaultId: string }) =>
      deletePermissionAPI(employeeId, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPermissions'] });
    },
  });

  // ── Local state for modifications (before save) ──
  const [localPerms, setLocalPerms] = useState<VaultPermission[]>([]);
  const [localInitialized, setLocalInitialized] = useState(false);

  // Sync local state with server data
  useEffect(() => {
    if (permissions.length > 0 && !localInitialized) {
      setLocalPerms(permissions);
      setLocalInitialized(true);
    }
  }, [permissions, localInitialized]);

  // When permissions refetch, update local
  useEffect(() => {
    if (localInitialized) {
      setLocalPerms(permissions);
    }
  }, [permissions, localInitialized]);

  // ── Employee view state ──
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // ── Vault view state ──
  const [selectedVault, setSelectedVault] = useState('');
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addDeposit, setAddDeposit] = useState(false);
  const [addWithdraw, setAddWithdraw] = useState(false);
  const [addView, setAddView] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);

  // ── Fetch employees ──
  const { data: employeesRaw, isLoading: empLoading } = useDocList<Record<string, unknown>>(
    'Employee',
    {
      fields: ['name', 'employee_name', 'status'],
      filters: [['status', '=', 'Active']],
      limit: 500,
    }
  );

  // ── Fetch vault accounts (Cash accounts) ──
  const { data: vaultsRaw, isLoading: vaultLoading } = useVaults();

  const employees = useMemo(
    () =>
      (employeesRaw || []).map((e) => ({
        name: String(e.name ?? ''),
        label: String(e.employee_name ?? e.name ?? ''),
      })),
    [employeesRaw]
  );

  const vaults = useMemo(
    () =>
      (vaultsRaw || []).map((v) => ({
        name: String(v.name ?? ''),
        label: String(v.account_name ?? v.name ?? ''),
      })),
    [vaultsRaw]
  );

  // ── Employee view: permissions for selected employee ──
  const employeePerms = useMemo(() => {
    if (!selectedEmployee) return [];
    return localPerms.filter((p) => p.employeeId === selectedEmployee);
  }, [localPerms, selectedEmployee]);

  // ── Vault view: permissions for selected vault ──
  const vaultPerms = useMemo(() => {
    if (!selectedVault) return [];
    return localPerms.filter((p) => p.vaultId === selectedVault);
  }, [localPerms, selectedVault]);

  // ── KPIs ──
  const totalPermissions = localPerms.length;
  const authorizedEmployees = new Set(localPerms.map((p) => p.employeeId)).size;
  const protectedVaults = new Set(localPerms.map((p) => p.vaultId)).size;

  // ── Handlers ──
  const handleTogglePerm = useCallback(
    (vaultId: string, field: 'canDeposit' | 'canWithdraw' | 'canView', value: boolean) => {
      setLocalPerms((prev) => {
        const existing = prev.find(
          (p) => p.employeeId === selectedEmployee && p.vaultId === vaultId
        );
        if (existing) {
          return prev.map((p) =>
            p.employeeId === selectedEmployee && p.vaultId === vaultId
              ? { ...p, [field]: value }
              : p
          );
        }
        // Create new entry
        return [
          ...prev,
          {
            id: `local-${selectedEmployee}-${vaultId}`,
            employeeId: selectedEmployee,
            vaultId,
            canDeposit: field === 'canDeposit' ? value : false,
            canWithdraw: field === 'canWithdraw' ? value : false,
            canView: field === 'canView' ? value : false,
          },
        ];
      });
    },
    [selectedEmployee]
  );

  const handleToggleVaultPerm = useCallback(
    (empId: string, field: 'canDeposit' | 'canWithdraw' | 'canView', value: boolean) => {
      setLocalPerms((prev) => {
        const existing = prev.find(
          (p) => p.vaultId === selectedVault && p.employeeId === empId
        );
        if (existing) {
          return prev.map((p) =>
            p.vaultId === selectedVault && p.employeeId === empId
              ? { ...p, [field]: value }
              : p
          );
        }
        return [
          ...prev,
          {
            id: `local-${empId}-${selectedVault}`,
            employeeId: empId,
            vaultId: selectedVault,
            canDeposit: field === 'canDeposit' ? value : false,
            canWithdraw: field === 'canWithdraw' ? value : false,
            canView: field === 'canView' ? value : false,
          },
        ];
      });
    },
    [selectedVault]
  );

  const handleSave = useCallback(async () => {
    try {
      // Filter out local-only entries (no real id yet) and prepare for save
      const permsToSave = localPerms.map((p) => ({
        employeeId: p.employeeId,
        vaultId: p.vaultId,
        canDeposit: p.canDeposit,
        canWithdraw: p.canWithdraw,
        canView: p.canView,
      }));
      await saveAllMutation.mutateAsync(permsToSave);
      toast.success('تم الحفظ', { description: 'تم حفظ صلاحيات الخزائن بنجاح' });
    } catch (err) {
      toast.error('خطأ في الحفظ', { description: String(err) });
    }
  }, [localPerms, saveAllMutation, toast]);

  const handleAddEmployeeToVault = useCallback(() => {
    if (!addEmployeeId || !selectedVault) return;
    setLocalPerms((prev) => {
      const existing = prev.find(
        (p) => p.vaultId === selectedVault && p.employeeId === addEmployeeId
      );
      if (existing) return prev;
      return [
        ...prev,
        {
          id: `local-${addEmployeeId}-${selectedVault}`,
          employeeId: addEmployeeId,
          vaultId: selectedVault,
          canDeposit: addDeposit,
          canWithdraw: addWithdraw,
          canView: addView,
        },
      ];
    });
    setAddEmployeeId('');
    setAddDeposit(false);
    setAddWithdraw(false);
    setAddView(true);
    setAddingEmployee(false);
    toast.success('تمت الإضافة', { description: 'تم إضافة صلاحيات الموظف للخزينة (اضغط حفظ للتأكيد)' });
  }, [addEmployeeId, selectedVault, addDeposit, addWithdraw, addView, toast]);

  const handleRemoveEmployeeFromVault = useCallback(
    (empId: string) => {
      setLocalPerms((prev) =>
        prev.filter((p) => !(p.vaultId === selectedVault && p.employeeId === empId))
      );
      toast.success('تم الحذف', { description: 'تم إزالة صلاحيات الموظف من الخزينة (اضغط حفظ للتأكيد)' });
    },
    [selectedVault, toast]
  );

  // ── Employee view columns ──
  const empViewColumns: Column<VaultPermission>[] = useMemo(
    () => [
      {
        key: 'vaultId',
        header: 'الخزينة',
        render: (v) => {
          const vault = vaults.find((va) => va.name === String(v));
          return <span className="font-medium">{vault?.label || String(v)}</span>;
        },
      },
      {
        key: 'canDeposit',
        header: 'إيداع',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canDeposit}
            onCheckedChange={(c) => handleTogglePerm(row.vaultId, 'canDeposit', !!c)}
            aria-label="صلاحية الإيداع"
          />
        ),
      },
      {
        key: 'canWithdraw',
        header: 'سحب',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canWithdraw}
            onCheckedChange={(c) => handleTogglePerm(row.vaultId, 'canWithdraw', !!c)}
            aria-label="صلاحية السحب"
          />
        ),
      },
      {
        key: 'canView',
        header: 'عرض',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canView}
            onCheckedChange={(c) => handleTogglePerm(row.vaultId, 'canView', !!c)}
            aria-label="صلاحية العرض"
          />
        ),
      },
    ],
    [vaults, handleTogglePerm]
  );

  // ── Vault view columns ──
  const vaultViewColumns: Column<VaultPermission>[] = useMemo(
    () => [
      {
        key: 'employeeId',
        header: 'الموظف',
        render: (v) => {
          const emp = employees.find((e) => e.name === String(v));
          return <span className="font-medium">{emp?.label || String(v)}</span>;
        },
      },
      {
        key: 'canDeposit',
        header: 'إيداع',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canDeposit}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employeeId, 'canDeposit', !!c)}
            aria-label="صلاحية الإيداع"
          />
        ),
      },
      {
        key: 'canWithdraw',
        header: 'سحب',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canWithdraw}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employeeId, 'canWithdraw', !!c)}
            aria-label="صلاحية السحب"
          />
        ),
      },
      {
        key: 'canView',
        header: 'عرض',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.canView}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employeeId, 'canView', !!c)}
            aria-label="صلاحية العرض"
          />
        ),
      },
      {
        key: '_actions',
        header: '',
        width: 'w-12',
        render: (_v, row) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={()=> handleRemoveEmployeeFromVault(row.employeeId)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [employees, handleToggleVaultPerm, handleRemoveEmployeeFromVault]
  );

  // Combine employee permissions with all vaults (show unchecked ones too)
  const employeeViewData = useMemo(() => {
    if (!selectedEmployee) return [];
    const existingMap = new Map(employeePerms.map((p) => [p.vaultId, p]));
    return vaults.map((v) => existingMap.get(v.name) || {
      id: `local-${selectedEmployee}-${v.name}`,
      employee_id: selectedEmployee,
      employeeId: selectedEmployee,
      vault_id: v.name,
      vaultId: v.name,
      can_deposit: false,
      canDeposit: false,
      can_withdraw: false,
      canWithdraw: false,
      can_view: false,
      canView: false,
    });
  }, [selectedEmployee, employeePerms, vaults]);

  const selectedEmpLabel = useMemo(
    () => employees.find((e) => e.name === selectedEmployee)?.label || '',
    [employees, selectedEmployee]
  );

  const selectedVaultLabel = useMemo(
    () => vaults.find((v) => v.name === selectedVault)?.label || '',
    [vaults, selectedVault]
  );

  const saving = saveAllMutation.isPending;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="صلاحيات الخزائن"
        description="إدارة صلاحيات الإيداع والسحب والعرض لكل موظف"
        iconify="solar:shield-keyhole-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'صلاحيات الخزائن' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ الصلاحيات
          </Button>
        }
      />

      <ListQueryAlert error={permError} onRetry={() => refetchPermissions()} />

      {/* KPI Strip */}
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-border/40 bg-card p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('employee')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              viewMode === 'employee'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            حسب الموظف
          </button>
          <button
            type="button"
            onClick={() => setViewMode('vault')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
              viewMode === 'vault'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            حسب الخزينة
          </button>
        </div>
      </div>

      {/* Employee View */}
      {viewMode === 'employee' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
            <div className="space-y-2 max-w-md">
              <Label className="text-sm font-medium">اختر الموظف</Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                placeholder="اختر موظفاً..."
                displayKey="employee_name"
                filters={[['status', '=', 'Active']]}
              />
            </div>
          </div>

          {selectedEmployee && (
            <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold">صلاحيات {selectedEmpLabel}</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {vaults.length} خزينة
                </Badge>
              </div>

              {vaultLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  جارٍ تحميل الخزائن...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/50">
                        <th className="text-start px-4 py-2.5 font-semibold">الخزينة</th>
                        <th className="text-center px-4 py-2.5 font-semibold w-20">إيداع</th>
                        <th className="text-center px-4 py-2.5 font-semibold w-20">سحب</th>
                        <th className="text-center px-4 py-2.5 font-semibold w-20">عرض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeViewData.map((perm) => {
                        const vaultLabel = vaults.find((v) => v.name === perm.vaultId)?.label || perm.vaultId;
                        return (
                          <tr key={perm.vaultId} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{vaultLabel}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.canDeposit}
                                onCheckedChange={(c) => handleTogglePerm(perm.vaultId, 'canDeposit', !!c)}
                                aria-label={`إيداع ${vaultLabel}`}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.canWithdraw}
                                onCheckedChange={(c) => handleTogglePerm(perm.vaultId, 'canWithdraw', !!c)}
                                aria-label={`سحب ${vaultLabel}`}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.canView}
                                onCheckedChange={(c) => handleTogglePerm(perm.vaultId, 'canView', !!c)}
                                aria-label={`عرض ${vaultLabel}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {employeeViewData.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-muted-foreground">
                            لا توجد خزائن متاحة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedEmployee && (
            <div className="rounded-xl border border-border/40 bg-card p-8 text-center text-muted-foreground text-sm">
              اختر موظفاً لعرض وتعديل صلاحياته على الخزائن
            </div>
          )}
        </div>
      )}

      {/* Vault View */}
      {viewMode === 'vault' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
            <div className="space-y-2 max-w-md">
              <Label className="text-sm font-medium">اختر الخزينة</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={selectedVault}
                onChange={setSelectedVault}
                placeholder="اختر خزينة..."
                displayKey="account_name"
                filters={[['account_type', '=', 'Cash']]}
              />
            </div>
          </div>

          {selectedVault && (
            <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">صلاحيات {selectedVaultLabel}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {vaultPerms.length} موظف
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => setAddingEmployee(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة موظف
                </Button>
              </div>

              {/* Add employee form */}
              {addingEmployee && (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground">إضافة موظف جديد</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold">الموظف</Label>
                      <ErpLinkCombobox
                        doctype="Employee"
                        value={addEmployeeId}
                        onChange={setAddEmployeeId}
                        placeholder="اختر موظفاً..."
                        displayKey="employee_name"
                        filters={[['status', '=', 'Active']]}
                      />
                    </div>
                    <div className="flex items-end gap-4 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <Checkbox checked={addDeposit} onCheckedChange={(c) => setAddDeposit(!!c)} />
                        <span>إيداع</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <Checkbox checked={addWithdraw} onCheckedChange={(c) => setAddWithdraw(!!c)} />
                        <span>سحب</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <Checkbox checked={addView} onCheckedChange={(c) => setAddView(!!c)} />
                        <span>عرض</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="text-xs gap-1.5"
                      disabled={!addEmployeeId}
                      onClick={handleAddEmployeeToVault}
                    >
                      <Plus className="h-3 w-3" />
                      إضافة
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => {
                        setAddingEmployee(false);
                        setAddEmployeeId('');
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}

              {/* Permissions table */}
              <DataTable
                data={vaultPerms}
                columns={vaultViewColumns}
                searchable={false}
                loading={empLoading}
                tableId="vault-permissions-by-vault"
                addLabel=""
              />
            </div>
          )}

          {!selectedVault && (
            <div className="rounded-xl border border-border/40 bg-card p-8 text-center text-muted-foreground text-sm">
              اختر خزينة لعرض وتعديل صلاحيات الموظفين عليها
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Custom hook to fetch Cash accounts as vaults ──
function useVaults() {
  return useDocList<Record<string, unknown>>('Account', {
    fields: ['name', 'account_name', 'account_type'],
    filters: [['account_type', '=', 'Cash']],
    limit: 500,
  });
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Types ──
interface VaultPermission {
  employee_id: string;
  vault_id: string;
  can_deposit: boolean;
  can_withdraw: boolean;
  can_view: boolean;
}

const STORAGE_KEY = 'erp_vault_permissions';

function loadPermissions(): VaultPermission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePermissions(perms: VaultPermission[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

type ViewMode = 'employee' | 'vault';

export default function VaultPermissionsPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('employee');

  // Load from localStorage on mount — use lazy initializer to avoid effect
  const [permissions, setPermissions] = useState<VaultPermission[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadPermissions();
  });
  const [loaded] = useState(() => typeof window !== 'undefined');

  // ── Employee view state ──
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // ── Vault view state ──
  const [selectedVault, setSelectedVault] = useState('');
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addDeposit, setAddDeposit] = useState(false);
  const [addWithdraw, setAddWithdraw] = useState(false);
  const [addView, setAddView] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);

  // ── Saving state ──
  const [saving, setSaving] = useState(false);

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
    return permissions.filter((p) => p.employee_id === selectedEmployee);
  }, [permissions, selectedEmployee]);

  // ── Vault view: permissions for selected vault ──
  const vaultPerms = useMemo(() => {
    if (!selectedVault) return [];
    return permissions.filter((p) => p.vault_id === selectedVault);
  }, [permissions, selectedVault]);

  // ── KPIs ──
  const totalPermissions = permissions.length;
  const authorizedEmployees = new Set(permissions.map((p) => p.employee_id)).size;
  const protectedVaults = new Set(permissions.map((p) => p.vault_id)).size;

  // ── Handlers ──
  const handleTogglePerm = useCallback(
    (vaultId: string, field: 'can_deposit' | 'can_withdraw' | 'can_view', value: boolean) => {
      setPermissions((prev) => {
        const existing = prev.find(
          (p) => p.employee_id === selectedEmployee && p.vault_id === vaultId
        );
        if (existing) {
          return prev.map((p) =>
            p.employee_id === selectedEmployee && p.vault_id === vaultId
              ? { ...p, [field]: value }
              : p
          );
        }
        // Create new entry
        return [
          ...prev,
          {
            employee_id: selectedEmployee,
            vault_id: vaultId,
            can_deposit: field === 'can_deposit' ? value : false,
            can_withdraw: field === 'can_withdraw' ? value : false,
            can_view: field === 'can_view' ? value : false,
          },
        ];
      });
    },
    [selectedEmployee]
  );

  const handleToggleVaultPerm = useCallback(
    (empId: string, field: 'can_deposit' | 'can_withdraw' | 'can_view', value: boolean) => {
      setPermissions((prev) => {
        const existing = prev.find(
          (p) => p.vault_id === selectedVault && p.employee_id === empId
        );
        if (existing) {
          return prev.map((p) =>
            p.vault_id === selectedVault && p.employee_id === empId
              ? { ...p, [field]: value }
              : p
          );
        }
        return [
          ...prev,
          {
            employee_id: empId,
            vault_id: selectedVault,
            can_deposit: field === 'can_deposit' ? value : false,
            can_withdraw: field === 'can_withdraw' ? value : false,
            can_view: field === 'can_view' ? value : false,
          },
        ];
      });
    },
    [selectedVault]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    // Simulate a brief delay for UX feedback
    await new Promise((r) => setTimeout(r, 300));
    savePermissions(permissions);
    setSaving(false);
    toast({ title: 'تم الحفظ', description: 'تم حفظ صلاحيات الخزائن بنجاح' });
  }, [permissions, toast]);

  const handleAddEmployeeToVault = useCallback(() => {
    if (!addEmployeeId || !selectedVault) return;
    setPermissions((prev) => {
      const existing = prev.find(
        (p) => p.vault_id === selectedVault && p.employee_id === addEmployeeId
      );
      if (existing) return prev;
      return [
        ...prev,
        {
          employee_id: addEmployeeId,
          vault_id: selectedVault,
          can_deposit: addDeposit,
          can_withdraw: addWithdraw,
          can_view: addView,
        },
      ];
    });
    setAddEmployeeId('');
    setAddDeposit(false);
    setAddWithdraw(false);
    setAddView(true);
    setAddingEmployee(false);
    toast({ title: 'تمت الإضافة', description: 'تم إضافة صلاحيات الموظف للخزينة' });
  }, [addEmployeeId, selectedVault, addDeposit, addWithdraw, addView, toast]);

  const handleRemoveEmployeeFromVault = useCallback(
    (empId: string) => {
      setPermissions((prev) =>
        prev.filter((p) => !(p.vault_id === selectedVault && p.employee_id === empId))
      );
      toast({ title: 'تم الحذف', description: 'تم إزالة صلاحيات الموظف من الخزينة' });
    },
    [selectedVault, toast]
  );

  // ── Employee view columns ──
  const empViewColumns: Column<VaultPermission>[] = useMemo(
    () => [
      {
        key: 'vault_id',
        header: 'الخزينة',
        render: (v) => {
          const vault = vaults.find((va) => va.name === String(v));
          return <span className="font-medium">{vault?.label || String(v)}</span>;
        },
      },
      {
        key: 'can_deposit',
        header: 'إيداع',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_deposit}
            onCheckedChange={(c) => handleTogglePerm(row.vault_id, 'can_deposit', !!c)}
            aria-label="صلاحية الإيداع"
          />
        ),
      },
      {
        key: 'can_withdraw',
        header: 'سحب',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_withdraw}
            onCheckedChange={(c) => handleTogglePerm(row.vault_id, 'can_withdraw', !!c)}
            aria-label="صلاحية السحب"
          />
        ),
      },
      {
        key: 'can_view',
        header: 'عرض',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_view}
            onCheckedChange={(c) => handleTogglePerm(row.vault_id, 'can_view', !!c)}
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
        key: 'employee_id',
        header: 'الموظف',
        render: (v) => {
          const emp = employees.find((e) => e.name === String(v));
          return <span className="font-medium">{emp?.label || String(v)}</span>;
        },
      },
      {
        key: 'can_deposit',
        header: 'إيداع',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_deposit}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employee_id, 'can_deposit', !!c)}
            aria-label="صلاحية الإيداع"
          />
        ),
      },
      {
        key: 'can_withdraw',
        header: 'سحب',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_withdraw}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employee_id, 'can_withdraw', !!c)}
            aria-label="صلاحية السحب"
          />
        ),
      },
      {
        key: 'can_view',
        header: 'عرض',
        width: 'w-20',
        render: (_v, row) => (
          <Checkbox
            checked={row.can_view}
            onCheckedChange={(c) => handleToggleVaultPerm(row.employee_id, 'can_view', !!c)}
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
            onClick={() => handleRemoveEmployeeFromVault(row.employee_id)}
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
    const existingMap = new Map(employeePerms.map((p) => [p.vault_id, p]));
    return vaults.map((v) => existingMap.get(v.name) || {
      employee_id: selectedEmployee,
      vault_id: v.name,
      can_deposit: false,
      can_withdraw: false,
      can_view: false,
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

      {/* KPI Strip */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي الصلاحيات"
          value={totalPermissions}
          icon={ShieldCheck}
          accent="warning"
          description="عدد سجلات الصلاحيات المسجّلة"
        />
        <KpiCard
          title="موظفين مفوّضين"
          value={authorizedEmployees}
          icon={Users}
          accent="primary"
          description="موظفون لديهم صلاحيات وصول"
        />
        <KpiCard
          title="خزائن محمية"
          value={protectedVaults}
          icon={Lock}
          accent="success"
          description="خزائن لها صلاحيات محددة"
        />
      </KpiStrip>

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
              <Label className="text-[13px] font-semibold">اختر الموظف</Label>
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
                        const vaultLabel = vaults.find((v) => v.name === perm.vault_id)?.label || perm.vault_id;
                        return (
                          <tr key={perm.vault_id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{vaultLabel}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.can_deposit}
                                onCheckedChange={(c) => handleTogglePerm(perm.vault_id, 'can_deposit', !!c)}
                                aria-label={`إيداع ${vaultLabel}`}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.can_withdraw}
                                onCheckedChange={(c) => handleTogglePerm(perm.vault_id, 'can_withdraw', !!c)}
                                aria-label={`سحب ${vaultLabel}`}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Checkbox
                                checked={perm.can_view}
                                onCheckedChange={(c) => handleTogglePerm(perm.vault_id, 'can_view', !!c)}
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
              <Label className="text-[13px] font-semibold">اختر الخزينة</Label>
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

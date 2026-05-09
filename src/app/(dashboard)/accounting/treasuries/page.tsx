"use client";

import { useState, useCallback, useMemo } from "react";
import { useDocList, useDeleteDoc } from "@/lib/client/hooks";
import { apiCreateDoc } from "@/lib/client/api";
import { ListQueryAlert } from "@/components/erp/list-query-alert";
import { PageHeader,  } from "@/components/erp/page-header";
import { KpiCard } from "@/components/erp/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/erp/data-table";
import {
  Wallet,
  Banknote,
  PlusCircle,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErpLinkCombobox } from "@/components/erp/erp-link-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useDefaultCompanyName } from "@/lib/erp/default-company";
import { useAccountBalances } from "@/lib/erp/use-account-balances";
import { formatCurrency } from "@/lib/core/helpers";
import { translateAccountName } from "@/lib/core/arabic-labels";
import { toast } from 'sonner';

/* ───────────── Types ───────────── */

type VaultRow = {
  name: string;
  account_name: string;
  account_number?: string;
  parent_account?: string;
  is_group?: number | boolean;
  balance?: number;
};

/* ───────────── Page Component ───────────── */

export default function TreasuriesPage() {
  const { company: defaultCompany } = useDefaultCompanyName();

  /* ── State ── */
  const [openVaultDialog, setOpenVaultDialog] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [vaultAccountNumber, setVaultAccountNumber] = useState("");
  const [vaultParentAccount, setVaultParentAccount] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<VaultRow | null>(null);

  /* ── Data: جلب حسابات من نوع Cash ── */
  const asOfDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const {
    data: vaultAccounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<VaultRow>("Account", {
    fields: ["name", "account_name", "account_number", "parent_account", "is_group"],
    filters: [["account_type", "=", "Cash"]],
    limit: 200,
  });

  /* ── Balances ── */
  const vaultNames = useMemo(() => vaultAccounts.map((v) => v.name), [vaultAccounts]);
  const balanceResults = useAccountBalances(
    vaultNames,
    defaultCompany || "",
    asOfDate,
    Boolean(defaultCompany && vaultNames.length > 0)
  );
  const balanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    vaultNames.forEach((name, i) => {
      const d = balanceResults[i]?.data;
      if (typeof d === "number" && !Number.isNaN(d)) m[name] = d;
    });
    return m;
  }, [vaultNames, balanceResults]);

  /* ── Computed ── */
  const totalCashBalance = useMemo(
    () => vaultAccounts.reduce((s, v) => s + (balanceMap[v.name] || 0), 0),
    [vaultAccounts, balanceMap]
  );
  const maxBalanceVault = useMemo(() => {
    if (vaultAccounts.length === 0) return null;
    return vaultAccounts.reduce((max, v) => {
      const b = balanceMap[v.name] || 0;
      const maxB = balanceMap[max.name] || 0;
      return b > maxB ? v : max;
    }, vaultAccounts[0]);
  }, [vaultAccounts, balanceMap]);

  /* ── Delete handler ── */
  const deleteMutation = useDeleteDoc("Account");
  const handleDelete = useCallback(async () => {
    if (!selectedVault) return;
    try {
      await deleteMutation.mutateAsync(selectedVault.name);
      toast.success("تم حذف الخزينة");
      setSelectedVault(null);
      setDeleteDialogOpen(false);
      void refetch();
    } catch (e) {
      toast.error("تعذر حذف الخزينة", { description: String((e as Error).message || e) });
    }
  }, [selectedVault, deleteMutation, refetch, toast]);

  /* ── Create handler ── */
  const createVault = useCallback(async () => {
    if (!vaultName.trim()) {
      toast.error("اسم الخزينة مطلوب");
      return;
    }
    if (!defaultCompany) {
      toast.error("يجب ضبط الشركة الافتراضية أولاً");
      return;
    }
    setVaultBusy(true);
    try {
      const parent = vaultParentAccount.trim() || "النقدية بالخزينة - " + defaultCompany.split(" - ")[0];
      await apiCreateDoc("Account", {
        account_name: vaultName.trim(),
        account_number: vaultAccountNumber.trim() || undefined,
        account_type: "Cash",
        parent_account: parent,
        is_group: 0,
        company: defaultCompany,
        root_type: "Asset",
      });
      setOpenVaultDialog(false);
      setVaultName("");
      setVaultAccountNumber("");
      setVaultParentAccount("");
      toast.success("تم إنشاء الخزينة بنجاح");
      void refetch();
    } catch (e) {
      toast.error("تعذر إنشاء الخزينة", { description: String((e as Error).message || e) });
    } finally {
      setVaultBusy(false);
    }
  }, [vaultName, vaultAccountNumber, vaultParentAccount, defaultCompany, refetch, toast]);

  /* ── Columns with Arabic labels and translations ── */
  const vaultCols: Column<VaultRow>[] = useMemo(
    () => [
      {
        key: "account_name",
        header: "اسم الخزينة",
        sortable: true,
        filterable: true,
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <span className="font-medium">{translateAccountName(String(v))}</span>
              {row.account_number && (
                <p className="text-[10px] text-muted-foreground" dir="ltr">
                  #{row.account_number}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "name",
        header: "رمز الحساب",
        render: (v) => (
          <Badge variant="secondary" className="font-mono text-[10px]" dir="ltr">
            {String(v)}
          </Badge>
        ),
      },
      {
        key: "name",
        header: "الرصيد الحالي",
        sortable: true,
        render: (_v, row) => {
          const bal = balanceMap[row.name] || 0;
          return (
            <span className={`tabular-nums font-bold text-base ${bal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(bal)}
            </span>
          );
        },
      },
      {
        key: "parent_account",
        header: "الحساب الأب",
        render: (v) => (
          <span className="text-muted-foreground text-xs">
            {v ? translateAccountName(String(v)) : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "إجراءات",
        width: "w-20",
        render: (_v, row) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVault(row);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [balanceMap]
  );

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الخزائن"
        description="إدارة الخزائن النقدية وأرصدة الصناديق والتحويلات بينها"
        iconify="solar:wallet-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: "المحاسبة", href: "/accounting" }, { label: "الخزائن" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Dialog open={openVaultDialog} onOpenChange={setOpenVaultDialog}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  خزينة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    إنشاء خزينة نقدية
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اسم الخزينة *</Label>
                    <Input
                      value={vaultName}
                      onChange={(e) => setVaultName(e.target.value)}
                      placeholder="مثال: الصندوق الرئيسي، خزينة الفرع"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الحساب (اختياري)</Label>
                    <Input
                      value={vaultAccountNumber}
                      onChange={(e) => setVaultAccountNumber(e.target.value)}
                      placeholder="مثال: 1101"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحساب الأب (اختياري)</Label>
                    <ErpLinkCombobox
                      doctype="Account"
                      value={vaultParentAccount}
                      onChange={setVaultParentAccount}
                      placeholder="اختر الحساب الأب..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      إذا تُرك فارغاً، سيُستخدم الحساب الأب الافتراضي &quot;النقدية بالخزينة&quot;
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpenVaultDialog(false)}>
                      إلغاء
                    </Button>
                    <Button type="button" onClick={() => void createVault()} disabled={vaultBusy}>
                      {vaultBusy ? "جاري الإنشاء..." : "إنشاء الخزينة"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            الخزائن النقدية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={vaultAccounts}
            columns={vaultCols}
            pageSize={10}
            searchable
            loading={isLoading}
            error={isError ? error : null}
            onRetry={() => void refetch()}
            tableId="accounting-treasuries"
            exportFileName="treasuries.csv"
            printTitle="تقرير الخزائن النقدية"
            getRowId={(row, i) => (row as VaultRow).name || String(i)}
          />
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الخزينة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الخزينة &quot;{selectedVault ? translateAccountName(selectedVault.account_name) : ""}&quot;؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

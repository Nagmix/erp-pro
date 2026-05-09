'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  useDocList,
  useCreateDoc,
  useSubmitDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { formatDate, formatNumber } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Info,
  AlertTriangle,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Upload,
  FileSpreadsheet,
  Scale,
  Users,
  Package,
  BookOpen,
  ArrowLeftRight,
  Save,
  SendHorizonal,
  Trash2,
  ChevronDown,
  AlertCircle,
  Wallet,
  Landmark,
  Banknote,
  FileDown,
} from 'lucide-react';
import { buildJournalEntry, type JournalLineInput } from '@/lib/erp/erpnext-payloads';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type CustomerRow = {
  name: string;
  customer_name: string;
  opening_balance?: number;
  currency?: string;
  party_type?: string;
  docstatus?: number;
};

type SupplierRow = {
  name: string;
  supplier_name: string;
  opening_balance?: number;
  currency?: string;
  party_type?: string;
  docstatus?: number;
};

type InventoryRow = {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse?: string;
  qty?: number;
  valuation_rate?: number;
  stock_value?: number;
};

type AccountRow = {
  name: string;
  account_number?: string;
  account_name: string;
  root_type?: string;
  account_type?: string;
  opening_debit?: number;
  opening_credit?: number;
  parent_account?: string;
  is_group?: number;
  company?: string;
};

type JournalEntryRow = {
  name: string;
  posting_date: string;
  voucher_type: string;
  title?: string;
  user_remark?: string;
  total_debit?: number;
  total_credit?: number;
  docstatus: number;
};

type BalanceTab = 'customers' | 'suppliers' | 'inventory' | 'accounts';

// ────────────────────────────────────────────────────────────
// Form types
// ────────────────────────────────────────────────────────────
type CustomerForm = {
  customer: string;
  opening_balance: string;
  currency: string;
};

type SupplierForm = {
  supplier: string;
  opening_balance: string;
  currency: string;
};

type InventoryForm = {
  item_code: string;
  warehouse: string;
  qty: string;
  unit_cost: string;
};

type AccountForm = {
  account: string;
  debit: string;
  credit: string;
  cost_center: string;
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function OpeningBalancesPage() {
  const { company, isLoading: coLoad } = useDefaultCompanyName();
  const [activeTab, setActiveTab] = useState<BalanceTab>('customers');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // ── Customer form ──
  const [custForm, setCustForm] = useState<CustomerForm>({
    customer: '',
    opening_balance: '',
    currency: 'YER',
  });

  // ── Supplier form ──
  const [suppForm, setSuppForm] = useState<SupplierForm>({
    supplier: '',
    opening_balance: '',
    currency: 'YER',
  });

  // ── Inventory form ──
  const [invForm, setInvForm] = useState<InventoryForm>({
    item_code: '',
    warehouse: '',
    qty: '',
    unit_cost: '',
  });

  // ── Account form ──
  const [accForm, setAccForm] = useState<AccountForm>({
    account: '',
    debit: '',
    credit: '',
    cost_center: '',
  });

  // ── Account balance rows (local state for adding) ──
  const [accountBalances, setAccountBalances] = useState<
    { account: string; debit: number; credit: number; cost_center: string }[]
  >([]);

  // ── Data queries ──
  const {
    data: customers,
    isLoading: custLoading,
    isError: custError,
    error: custErr,
    refetch: refetchCustomers,
  } = useDocList<CustomerRow>('Customer', {
    fields: ['name', 'customer_name', 'opening_balance', 'currency'],
    limit: 500,
  });

  const {
    data: suppliers,
    isLoading: suppLoading,
    isError: suppError,
    error: suppErr,
    refetch: refetchSuppliers,
  } = useDocList<SupplierRow>('Supplier', {
    fields: ['name', 'supplier_name', 'opening_balance', 'currency'],
    limit: 500,
  });

  const {
    data: inventoryItems,
    isLoading: invLoading,
    isError: invError,
    error: invErr,
    refetch: refetchInventory,
  } = useDocList<InventoryRow>('Item', {
    fields: ['name', 'item_code', 'item_name'],
    filters: [['is_stock_item', '=', '1']],
    limit: 500,
  });

  const {
    data: accounts,
    isLoading: accLoading,
    isError: accError,
    error: accErr,
    refetch: refetchAccounts,
  } = useDocList<AccountRow>('Account', {
    fields: [
      'name',
      'account_number',
      'account_name',
      'root_type',
      'account_type',
      'parent_account',
      'is_group',
    ],
    limit: 500,
  });

  const {
    data: journalEntries,
    isLoading: jeLoading,
    refetch: refetchJE,
  } = useDocList<JournalEntryRow>('Journal Entry', {
    fields: ['name', 'posting_date', 'voucher_type', 'title', 'user_remark', 'total_debit', 'total_credit', 'docstatus'],
    filters: [['voucher_type', '=', 'Opening Entry']],
    order_by: 'creation desc',
    limit: 200,
  });

  // ── Mutations ──
  const updateCustomer = useCreateDoc('Customer');
  const updateSupplier = useCreateDoc('Supplier');
  const createJournal = useCreateDoc('Journal Entry');
  const submitJournal = useSubmitDoc<JournalEntryRow>('Journal Entry');
  const deleteJournal = useDeleteDoc('Journal Entry');

  // ── Computed KPIs ──
  const customerRows = customers || [];
  const supplierRows = suppliers || [];
  const accountRows = accounts || [];
  const jeRows = journalEntries || [];

  const totalCustomerBalance = useMemo(
    () => customerRows.reduce((s, c) => s + (Number(c.opening_balance) || 0), 0),
    [customerRows]
  );

  const totalSupplierBalance = useMemo(
    () => supplierRows.reduce((s, c) => s + (Number(c.opening_balance) || 0), 0),
    [supplierRows]
  );

  const totalAccountDebit = useMemo(
    () => accountBalances.reduce((s, a) => s + (a.debit || 0), 0),
    [accountBalances]
  );

  const totalAccountCredit = useMemo(
    () => accountBalances.reduce((s, a) => s + (a.credit || 0), 0),
    [accountBalances]
  );

  const openingAssets = useMemo(() => {
    const assetAccounts = accountBalances.filter((a) => {
      const acc = accountRows.find((ar) => ar.name === a.account);
      return acc?.root_type === 'Asset';
    });
    return assetAccounts.reduce((s, a) => s + (a.debit || 0) - (a.credit || 0), 0);
  }, [accountBalances, accountRows]);

  const openingLiabilities = useMemo(() => {
    const liabilityAccounts = accountBalances.filter((a) => {
      const acc = accountRows.find((ar) => ar.name === a.account);
      return acc?.root_type === 'Liability';
    });
    return liabilityAccounts.reduce((s, a) => s + (a.credit || 0) - (a.debit || 0), 0);
  }, [accountBalances, accountRows]);

  const openingEquity = useMemo(() => {
    const equityAccounts = accountBalances.filter((a) => {
      const acc = accountRows.find((ar) => ar.name === a.account);
      return acc?.root_type === 'Equity';
    });
    return equityAccounts.reduce((s, a) => s + (a.credit || 0) - (a.debit || 0), 0);
  }, [accountBalances, accountRows]);

  const balanceDiff = Math.abs(totalAccountDebit - totalAccountCredit);
  const isBalanced = balanceDiff < 0.01;

  // ── Handlers ──
  const handleAddCustomerBalance = () => {
    if (!custForm.customer || !custForm.opening_balance) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    updateCustomer.mutate(
      {
        doctype: 'Customer',
        name: custForm.customer,
        opening_balance: Number(custForm.opening_balance),
        currency: custForm.currency || 'YER',
      } as unknown as Record<string, unknown>,
      {
        onSuccess: () => {
          toast.success('تم حفظ الرصيد الافتتاحي للعميل');
          void refetchCustomers();
          setCustForm({ customer: '', opening_balance: '', currency: 'YER' });
          setAddDialogOpen(false);
        },
        onError: () => {
          toast.error('تعذر حفظ الرصيد الافتتاحي');
        },
      }
    );
  };

  const handleAddSupplierBalance = () => {
    if (!suppForm.supplier || !suppForm.opening_balance) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    updateSupplier.mutate(
      {
        doctype: 'Supplier',
        name: suppForm.supplier,
        opening_balance: Number(suppForm.opening_balance),
        currency: suppForm.currency || 'YER',
      } as unknown as Record<string, unknown>,
      {
        onSuccess: () => {
          toast.success('تم حفظ الرصيد الافتتاحي للمورد');
          void refetchSuppliers();
          setSuppForm({ supplier: '', opening_balance: '', currency: 'YER' });
          setAddDialogOpen(false);
        },
        onError: () => {
          toast.error('تعذر حفظ الرصيد الافتتاحي');
        },
      }
    );
  };

  const handleAddInventoryBalance = () => {
    if (!invForm.item_code || !invForm.warehouse || !invForm.qty || !invForm.unit_cost) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    // Add to account balances as inventory asset
    const totalValue = Number(invForm.qty) * Number(invForm.unit_cost);
    setAccountBalances((prev) => [
      ...prev,
      {
        account: 'Inventory Asset - ' + (company || ''),
        debit: totalValue,
        credit: 0,
        cost_center: invForm.warehouse,
      },
    ]);
    toast.success(`تمت إضافة رصيد مخزون بقيمة ${formatNumber(totalValue)}`);
    setInvForm({ item_code: '', warehouse: '', qty: '', unit_cost: '' });
    setAddDialogOpen(false);
  };

  const handleAddAccountBalance = () => {
    if (!accForm.account) {
      toast.error('يرجى اختيار الحساب');
      return;
    }
    const existing = accountBalances.findIndex((a) => a.account === accForm.account);
    if (existing >= 0) {
      const updated = [...accountBalances];
      updated[existing] = {
        ...updated[existing],
        debit: (updated[existing].debit || 0) + (Number(accForm.debit) || 0),
        credit: (updated[existing].credit || 0) + (Number(accForm.credit) || 0),
        cost_center: accForm.cost_center || updated[existing].cost_center,
      };
      setAccountBalances(updated);
    } else {
      setAccountBalances((prev) => [
        ...prev,
        {
          account: accForm.account,
          debit: Number(accForm.debit) || 0,
          credit: Number(accForm.credit) || 0,
          cost_center: accForm.cost_center,
        },
      ]);
    }
    toast.success('تمت إضافة الرصيد الافتتاحي للحساب');
    setAccForm({ account: '', debit: '', credit: '', cost_center: '' });
    setAddDialogOpen(false);
  };

  const handleRemoveAccountBalance = (index: number) => {
    setAccountBalances((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostAllBalances = () => {
    if (!company) {
      toast.error('لم يتم تحديد الشركة الافتراضية');
      return;
    }
    if (!isBalanced) {
      toast.error(`الأرصدة غير متوازنة — الفرق: ${formatNumber(balanceDiff)}`);
      return;
    }
    if (accountBalances.length === 0) {
      toast.error('لا توجد أرصدة لترحيلها');
      return;
    }

    // Build journal entry lines from all balance types
    const lines: JournalLineInput[] = [];

    // Customer opening balances (debit = positive)
    customerRows.forEach((c) => {
      const bal = Number(c.opening_balance) || 0;
      if (bal !== 0) {
        lines.push({
          account: 'Debtors - ' + company,
          party_type: 'Customer',
          party: c.name,
          debit: bal > 0 ? Math.abs(bal) : 0,
          credit: bal < 0 ? Math.abs(bal) : 0,
          cost_center: '',
          remarks: `رصيد افتتاحي - عميل: ${c.customer_name}`,
        });
      }
    });

    // Supplier opening balances (credit = positive)
    supplierRows.forEach((s) => {
      const bal = Number(s.opening_balance) || 0;
      if (bal !== 0) {
        lines.push({
          account: 'Creditors - ' + company,
          party_type: 'Supplier',
          party: s.name,
          debit: bal < 0 ? Math.abs(bal) : 0,
          credit: bal > 0 ? Math.abs(bal) : 0,
          cost_center: '',
          remarks: `رصيد افتتاحي - مورد: ${s.supplier_name}`,
        });
      }
    });

    // Account opening balances
    accountBalances.forEach((ab) => {
      if (ab.debit > 0 || ab.credit > 0) {
        lines.push({
          account: ab.account,
          party_type: '',
          party: '',
          debit: ab.debit || 0,
          credit: ab.credit || 0,
          cost_center: ab.cost_center || '',
          remarks: 'رصيد افتتاحي',
        });
      }
    });

    if (lines.length === 0) {
      toast.error('لا توجد أرصدة لترحيلها');
      return;
    }

    const jeDoc = buildJournalEntry({
      company,
      posting_date: new Date().toISOString().split('T')[0],
      voucher_type: 'Opening Entry',
      title: 'الأرصدة الافتتاحية',
      user_remark: 'قيد أرصدة افتتاحية — من ERP Pro',
      lines,
    });

    createJournal.mutate(jeDoc, {
      onSuccess: (data) => {
        const jeName = (data as Record<string, unknown>)?.name as string;
        toast.success(`تم إنشاء قيد الأرصدة الافتتاحية: ${jeName}`);
        void refetchJE();
        setPostConfirmOpen(false);
      },
      onError: () => {
        toast.error('تعذر إنشاء قيد الأرصدة الافتتاحية');
      },
    });
  };

  const handleSubmitJE = (name: string) => {
    submitJournal.mutate(name, {
      onSuccess: () => {
        toast.success('تم ترحيل القيد الافتتاحي');
        void refetchJE();
      },
      onError: () => {
        toast.error('فشل ترحيل القيد');
      },
    });
  };

  const handleDeleteJE = (name: string) => {
    deleteJournal.mutate(name, {
      onSuccess: () => {
        toast.success('تم حذف القيد الافتتاحي');
        void refetchJE();
      },
      onError: () => {
        toast.error('تعذر حذف القيد');
      },
    });
  };

  // ── Column definitions ──
  const customerColumns: Column<CustomerRow>[] = [
    {
      key: 'name',
      header: 'رقم العميل',
      sortable: true,
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    { key: 'customer_name', header: 'اسم العميل', sortable: true },
    {
      key: 'opening_balance',
      header: 'الرصيد الافتتاحي',
      sortable: true,
      render: (v, row) => {
        const bal = Number(v) || 0;
        return (
          <span className={bal > 0 ? 'text-emerald-600 font-semibold' : bal < 0 ? 'text-rose-600 font-semibold' : ''}>
            {formatNumber(bal)}
          </span>
        );
      },
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (v) => (
        <Badge variant="outline" className="text-[10px] h-5">
          {String(v || 'YER')}
        </Badge>
      ),
    },
    {
      key: '_type',
      header: 'النوع',
      render: (_, row) => {
        const bal = Number(row.opening_balance) || 0;
        return (
          <Badge variant={bal > 0 ? 'default' : bal < 0 ? 'secondary' : 'outline'} className="text-[10px] h-5">
            {bal > 0 ? 'مدين' : bal < 0 ? 'دائن' : '—'}
          </Badge>
        );
      },
    },
  ];

  const supplierColumns: Column<SupplierRow>[] = [
    {
      key: 'name',
      header: 'رقم المورد',
      sortable: true,
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    { key: 'supplier_name', header: 'اسم المورد', sortable: true },
    {
      key: 'opening_balance',
      header: 'الرصيد الافتتاحي',
      sortable: true,
      render: (v) => {
        const bal = Number(v) || 0;
        return (
          <span className={bal > 0 ? 'text-emerald-600 font-semibold' : bal < 0 ? 'text-rose-600 font-semibold' : ''}>
            {formatNumber(bal)}
          </span>
        );
      },
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (v) => (
        <Badge variant="outline" className="text-[10px] h-5">
          {String(v || 'YER')}
        </Badge>
      ),
    },
    {
      key: '_type',
      header: 'النوع',
      render: (_, row) => {
        const bal = Number(row.opening_balance) || 0;
        return (
          <Badge variant={bal > 0 ? 'default' : bal < 0 ? 'secondary' : 'outline'} className="text-[10px] h-5">
            {bal > 0 ? 'مدين' : bal < 0 ? 'دائن' : '—'}
          </Badge>
        );
      },
    },
  ];

  const inventoryColumns: Column<InventoryRow>[] = [
    {
      key: 'item_code',
      header: 'كود الصنف',
      sortable: true,
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    { key: 'item_name', header: 'اسم الصنف', sortable: true },
    {
      key: 'warehouse',
      header: 'المستودع',
      render: (v) => String(v || '—'),
    },
    {
      key: 'qty',
      header: 'الكمية',
      sortable: true,
      render: (v) => formatNumber(Number(v) || 0),
    },
    {
      key: 'valuation_rate',
      header: 'تكلفة الوحدة',
      sortable: true,
      render: (v) => formatNumber(Number(v) || 0),
    },
    {
      key: 'stock_value',
      header: 'القيمة الإجمالية',
      sortable: true,
      render: (v) => {
        const val = Number(v) || 0;
        return <span className="font-semibold">{formatNumber(val)}</span>;
      },
    },
  ];

  const accountBalanceColumns: Column<{ account: string; debit: number; credit: number; cost_center: string }>[] = [
    {
      key: 'account',
      header: 'الحساب',
      sortable: true,
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      key: 'debit',
      header: 'مدين',
      sortable: true,
      render: (v) => (
        <span className={Number(v) > 0 ? 'text-emerald-600 font-semibold' : ''}>
          {formatNumber(Number(v) || 0)}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'دائن',
      sortable: true,
      render: (v) => (
        <span className={Number(v) > 0 ? 'text-rose-600 font-semibold' : ''}>
          {formatNumber(Number(v) || 0)}
        </span>
      ),
    },
    { key: 'cost_center', header: 'مركز التكلفة', render: (v) => String(v || '—') },
    {
      key: '_del',
      header: '',
      render: (_, row) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => {
            const idx = accountBalances.findIndex((a) => a.account === row.account && a.debit === row.debit && a.credit === row.credit);
            if (idx >= 0) handleRemoveAccountBalance(idx);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  const jeColumns: Column<JournalEntryRow>[] = [
    {
      key: 'name',
      header: 'رقم القيد',
      render: (v) => <span className="font-mono text-primary text-xs">{String(v)}</span>,
    },
    {
      key: 'posting_date',
      header: 'تاريخ القيد',
      render: (v) => formatDate(String(v || '')),
    },
    { key: 'title', header: 'العنوان', render: (v) => String(v || '—') },
    {
      key: 'total_debit',
      header: 'إجمالي المدين',
      render: (v) => <span className="text-emerald-600 font-semibold">{formatNumber(Number(v) || 0)}</span>,
    },
    {
      key: 'total_credit',
      header: 'إجمالي الدائن',
      render: (v) => <span className="text-rose-600 font-semibold">{formatNumber(Number(v) || 0)}</span>,
    },
    {
      key: 'docstatus',
      header: 'الحالة',
      render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
    },
    {
      key: '_a',
      header: 'إجراءات',
      render: (_, row) => (
        <div className="flex gap-1">
          {row.docstatus === 0 && (
            <>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[10px] px-2 gap-1"
                disabled={submitJournal.isPending}
                onClick={() => handleSubmitJE(row.name)}
              >
                <CheckCircle2 className="h-3 w-3" />
                ترحيل
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
                disabled={deleteJournal.isPending}
                onClick={() => handleDeleteJE(row.name)}
              >
                <Trash2 className="h-3 w-3" />
                حذف
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ── Render add form based on active tab ──
  const renderAddForm = () => {
    switch (activeTab) {
      case 'customers':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">العميل *</Label>
                <ErpLinkCombobox
                  doctype="Customer"
                  value={custForm.customer}
                  onChange={(v) => setCustForm((p) => ({ ...p, customer: v }))}
                  placeholder="اختر العميل"
                  displayKey="customer_name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الرصيد الافتتاحي *</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="موجب = مدين، سالب = دائن"
                  value={custForm.opening_balance}
                  onChange={(e) => setCustForm((p) => ({ ...p, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">العملة</Label>
                <Select
                  value={custForm.currency}
                  onValueChange={(v) => setCustForm((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">ر.ي (YER)</SelectItem>
                    <SelectItem value="SAR">ر.س (SAR)</SelectItem>
                    <SelectItem value="USD">$ (USD)</SelectItem>
                    <SelectItem value="EUR">€ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">نوع الطرف</Label>
                <Badge variant="outline" className="h-9 px-3 text-xs">عميل</Badge>
              </div>
            </div>
            <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>الرصيد الموجب يعني أن العميل مدين (له رصيد مستحق)، والسالب يعني دائن (له رصيد لصالحه).</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={updateCustomer.isPending}
                onClick={handleAddCustomerBalance}
              >
                <Save className="h-3.5 w-3.5" />
                {updateCustomer.isPending ? 'جاري الحفظ...' : 'حفظ الرصيد'}
              </Button>
            </div>
          </div>
        );

      case 'suppliers':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">المورد *</Label>
                <ErpLinkCombobox
                  doctype="Supplier"
                  value={suppForm.supplier}
                  onChange={(v) => setSuppForm((p) => ({ ...p, supplier: v }))}
                  placeholder="اختر المورد"
                  displayKey="supplier_name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الرصيد الافتتاحي *</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="موجب = دائن، سالب = مدين"
                  value={suppForm.opening_balance}
                  onChange={(e) => setSuppForm((p) => ({ ...p, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">العملة</Label>
                <Select
                  value={suppForm.currency}
                  onValueChange={(v) => setSuppForm((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">ر.ي (YER)</SelectItem>
                    <SelectItem value="SAR">ر.س (SAR)</SelectItem>
                    <SelectItem value="USD">$ (USD)</SelectItem>
                    <SelectItem value="EUR">€ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>الرصيد الموجب يعني أن المورد دائن (له رصيد مستحق)، والسالب يعني مدين.</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={updateSupplier.isPending}
                onClick={handleAddSupplierBalance}
              >
                <Save className="h-3.5 w-3.5" />
                {updateSupplier.isPending ? 'جاري الحفظ...' : 'حفظ الرصيد'}
              </Button>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الصنف *</Label>
                <ErpLinkCombobox
                  doctype="Item"
                  value={invForm.item_code}
                  onChange={(v) => setInvForm((p) => ({ ...p, item_code: v }))}
                  placeholder="اختر الصنف"
                  displayKey="item_name"
                  filters={[['is_stock_item', '=', '1']]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">المستودع *</Label>
                <ErpLinkCombobox
                  doctype="Warehouse"
                  value={invForm.warehouse}
                  onChange={(v) => setInvForm((p) => ({ ...p, warehouse: v }))}
                  placeholder="اختر المستودع"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الكمية *</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="0"
                  value={invForm.qty}
                  onChange={(e) => setInvForm((p) => ({ ...p, qty: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">تكلفة الوحدة *</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="0.00"
                  value={invForm.unit_cost}
                  onChange={(e) => setInvForm((p) => ({ ...p, unit_cost: e.target.value }))}
                />
              </div>
            </div>
            {invForm.qty && invForm.unit_cost && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <span className="text-muted-foreground">القيمة الإجمالية: </span>
                <span className="font-bold text-primary">
                  {formatNumber(Number(invForm.qty) * Number(invForm.unit_cost))}
                </span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={handleAddInventoryBalance}>
                <Save className="h-3.5 w-3.5" />
                حفظ الرصيد
              </Button>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">الحساب *</Label>
                <ErpLinkCombobox
                  doctype="Account"
                  value={accForm.account}
                  onChange={(v) => setAccForm((p) => ({ ...p, account: v }))}
                  placeholder="اختر الحساب"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">مدين (Debit)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="0.00"
                  value={accForm.debit}
                  onChange={(e) => setAccForm((p) => ({ ...p, debit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">دائن (Credit)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  placeholder="0.00"
                  value={accForm.credit}
                  onChange={(e) => setAccForm((p) => ({ ...p, credit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">مركز التكلفة</Label>
                <ErpLinkCombobox
                  doctype="Cost Center"
                  value={accForm.cost_center}
                  onChange={(v) => setAccForm((p) => ({ ...p, cost_center: v }))}
                  placeholder="اختر مركز التكلفة (اختياري)"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={handleAddAccountBalance}>
                <Plus className="h-3.5 w-3.5" />
                إضافة للجدول
              </Button>
            </div>
          </div>
        );
    }
  };

  // ── Tab loading/error based on active tab ──
  const activeLoading =
    activeTab === 'customers'
      ? custLoading
      : activeTab === 'suppliers'
        ? suppLoading
        : activeTab === 'inventory'
          ? invLoading
          : accLoading;

  const activeError =
    activeTab === 'customers'
      ? custError
        ? custErr
        : null
      : activeTab === 'suppliers'
        ? suppError
          ? suppErr
          : null
        : activeTab === 'inventory'
          ? invError
            ? invErr
            : null
          : accError
            ? accErr
            : null;

  const activeRefetch =
    activeTab === 'customers'
      ? refetchCustomers
      : activeTab === 'suppliers'
        ? refetchSuppliers
        : activeTab === 'inventory'
          ? refetchInventory
          : refetchAccounts;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={activeError} onRetry={() => void activeRefetch()} />

      {/* ── Page Header ── */}
      <PageHeader
        title="الأرصدة الافتتاحية"
        description="إدارة أرصدة العملاء والموردين والمخزون والحسابات الافتتاحية وترحيلها كقيود محاسبية"
        iconify="solar:wallet-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'الأرصدة الافتتاحية' }]}
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  استخدم هذه الشاشة لإدخال الأرصدة الافتتاحية عند بداية استخدام النظام. بعد إدخال جميع الأرصدة، اضغط &quot;ترحيل جميع الأرصدة&quot; لإنشاء قيد يومية افتتاحي.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  استيراد من Excel
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>استيراد الأرصدة من Excel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-medium">اسحب ملف Excel هنا أو انقر للاختيار</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      يدعم ملفات .xlsx و .xls
                    </p>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      className="mt-3 max-w-xs mx-auto"
                      dir="ltr"
                      onChange={() => {
                        toast.success('سيتم معالجة الملف قريباً');
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">تنسيق الملف المطلوب:</p>
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs font-mono leading-relaxed" dir="ltr">
                      {activeTab === 'customers' && 'customer_name | opening_balance | currency'}
                      {activeTab === 'suppliers' && 'supplier_name | opening_balance | currency'}
                      {activeTab === 'inventory' && 'item_code | warehouse | qty | unit_cost'}
                      {activeTab === 'accounts' && 'account | debit | credit | cost_center'}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setImportDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="button" size="sm" className="gap-1.5" onClick={() => setImportDialogOpen(false)}>
                      <Upload className="h-3.5 w-3.5" />
                      استيراد
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  إضافة رصيد
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-3xl gap-3">
                <DialogHeader>
                  <DialogTitle>
                    إضافة رصيد افتتاحي —{' '}
                    {activeTab === 'customers'
                      ? 'العملاء'
                      : activeTab === 'suppliers'
                        ? 'الموردين'
                        : activeTab === 'inventory'
                          ? 'المخزون'
                          : 'الحسابات'}
                  </DialogTitle>
                </DialogHeader>
                {renderAddForm()}
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => setPostConfirmOpen(true)}
              disabled={!isBalanced || accountBalances.length === 0}
            >
              <SendHorizonal className="h-3.5 w-3.5" />
              ترحيل جميع الأرصدة
            </Button>
          </div>
        }
      />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي أرصدة العملاء" value={formatNumber(totalCustomerBalance)} icon={Users} accent="primary" compact />
        <KpiCard title="إجمالي أرصدة الموردين" value={formatNumber(totalSupplierBalance)} icon={Landmark} accent="info" compact />
        <KpiCard
          title="فرق التوازن"
          value={formatNumber(balanceDiff)}
          icon={Scale}
          accent={isBalanced ? 'success' : 'destructive'}
          compact
          description={isBalanced ? 'الأرصدة متوازنة ✓' : 'الأرصدة غير متوازنة!'}
        />
        <KpiCard title="قيود افتتاحية" value={jeRows.length} icon={FileCheck} accent={jeRows.length > 0 ? 'success' : 'warning'} compact />
      </KpiStrip>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-s-[3px] border-s-emerald-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الأصول الافتتاحية</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">{formatNumber(openingAssets)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-[3px] border-s-rose-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الالتزامات الافتتاحية</p>
                <p className="text-lg font-bold text-rose-600 mt-1">{formatNumber(openingLiabilities)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-[3px] border-s-amber-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي حقوق الملكية الافتتاحية</p>
                <p className="text-lg font-bold text-amber-600 mt-1">{formatNumber(openingEquity)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Landmark className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Balance Validation Warning ── */}
      {!isBalanced && accountBalances.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-destructive">الأرصدة غير متوازنة</p>
              <p className="text-muted-foreground">
                إجمالي المدين: <span className="font-semibold text-foreground">{formatNumber(totalAccountDebit)}</span> | إجمالي الدائن: <span className="font-semibold text-foreground">{formatNumber(totalAccountCredit)}</span> | الفرق: <span className="font-semibold text-destructive">{formatNumber(balanceDiff)}</span>
              </p>
              <p className="text-muted-foreground">
                يجب أن يتساوى إجمالي المدين مع إجمالي الدائن قبل ترحيل الأرصدة الافتتاحية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BalanceTab)} dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            العملاء
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5 text-xs">
            <Landmark className="h-3.5 w-3.5" />
            الموردين
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            المخزون
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            الحسابات
          </TabsTrigger>
        </TabsList>

        {/* ── Customers Tab ── */}
        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">أرصدة العملاء الافتتاحية</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {customerRows.length} عميل
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    الإجمالي: {formatNumber(totalCustomerBalance)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={customerRows}
                columns={customerColumns}
                title="العملاء"
                searchable
                loading={custLoading}
                tableId="opening-balance-customers"
                exportFileName="opening-balances-customers"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Suppliers Tab ── */}
        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">أرصدة الموردين الافتتاحية</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {supplierRows.length} مورد
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    الإجمالي: {formatNumber(totalSupplierBalance)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={supplierRows}
                columns={supplierColumns}
                title="الموردين"
                searchable
                loading={suppLoading}
                tableId="opening-balance-suppliers"
                exportFileName="opening-balances-suppliers"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Inventory Tab ── */}
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">أرصدة المخزون الافتتاحية</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {inventoryItems?.length || 0} صنف
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={inventoryItems || []}
                columns={inventoryColumns}
                title="المخزون"
                searchable
                loading={invLoading}
                tableId="opening-balance-inventory"
                exportFileName="opening-balances-inventory"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accounts Tab ── */}
        <TabsContent value="accounts" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">أرصدة الحسابات الافتتاحية</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {accountBalances.length} حساب
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    مدين: {formatNumber(totalAccountDebit)}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    دائن: {formatNumber(totalAccountCredit)}
                  </Badge>
                  <Badge
                    variant={isBalanced ? 'default' : 'destructive'}
                    className="text-[10px]"
                  >
                    {isBalanced ? 'متوازن ✓' : `فرق: ${formatNumber(balanceDiff)}`}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {accountBalances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">لا توجد أرصدة حسابات بعد</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    أضف أرصدة الحسابات الافتتاحية باستخدام زر &quot;إضافة رصيد&quot;
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة رصيد حساب
                  </Button>
                </div>
              ) : (
                <DataTable
                  data={accountBalances}
                  columns={accountBalanceColumns}
                  title="أرصدة الحسابات"
                  searchable
                  tableId="opening-balance-accounts"
                  exportFileName="opening-balances-accounts"
                />
              )}
            </CardContent>
          </Card>

          {/* Balance Summary */}
          {accountBalances.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">ملخص التوازن</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">إجمالي المدين</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{formatNumber(totalAccountDebit)}</p>
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">إجمالي الدائن</p>
                    <p className="text-lg font-bold text-rose-600 mt-1">{formatNumber(totalAccountCredit)}</p>
                  </div>
                  <div className={`rounded-lg border p-3 text-center ${isBalanced ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                    <p className="text-xs text-muted-foreground">الفرق</p>
                    <p className={`text-lg font-bold mt-1 ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatNumber(balanceDiff)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Journal Entries Section ── */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">قيود الأرصدة الافتتاحية</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {jeRows.length} قيد
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={jeRows}
            columns={jeColumns}
            title="القيود الافتتاحية"
            searchable
            loading={jeLoading}
            tableId="opening-balance-je"
            exportFileName="opening-entries"
          />
        </CardContent>
      </Card>

      {/* ── Post Confirmation Dialog ── */}
      <AlertDialog open={postConfirmOpen} onOpenChange={setPostConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تأكيد ترحيل جميع الأرصدة الافتتاحية
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                سيتم إنشاء قيد يومية افتتاحي يتضمن جميع الأرصدة المدخلة.
              </p>
              {!isBalanced && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-destructive">⚠️ الأرصدة غير متوازنة!</p>
                  <p className="text-muted-foreground">
                    لا يمكن ترحيل الأرصدة حتى يتساوى إجمالي المدين مع إجمالي الدائن. الفرق الحالي: {formatNumber(balanceDiff)}
                  </p>
                </div>
              )}
              {isBalanced && (
                <div className="rounded-lg border border-success/30 bg-success/[0.04] p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-emerald-600">✓ الأرصدة متوازنة</p>
                  <p className="text-muted-foreground">
                    إجمالي المدين: {formatNumber(totalAccountDebit)} | إجمالي الدائن: {formatNumber(totalAccountCredit)}
                  </p>
                </div>
              )}
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>سيتم إنشاء قيد يومية من نوع &quot;قيد افتتاحي&quot;</li>
                <li>يشمل أرصدة العملاء والموردين والحسابات</li>
                <li>يمكن ترحيل القيد لاحقاً من جدول القيود</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={handlePostAllBalances}
              disabled={!isBalanced || createJournal.isPending}
            >
              {createJournal.isPending ? 'جاري الإنشاء...' : 'نعم، إنشاء القيد الافتتاحي'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

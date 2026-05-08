'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PosOpeningDialog } from '@/components/pos/pos-opening-dialog';
import { PosClosingDialog } from '@/components/pos/pos-closing-dialog';
import { PosSellHeader } from '@/components/pos/pos-sell-header';
import { PosSellProductColumn } from '@/components/pos/pos-sell-product-column';
import {
  PosSellCheckoutColumn,
  PosSellSettingsPane,
} from '@/components/pos/pos-sell-checkout-column';
import { PosVariantPickerDialog } from '@/components/pos/pos-variant-picker-dialog';
import { PosReturnDialog } from '@/components/pos/pos-return-dialog';
import {
  usePOSShift,
  useOpenPOSShift,
  useClosePOSShift,
  useCreatePosInvoice,
  usePOSCustomerInfo,
  usePOSSessionSummary,
} from '@/lib/client/pos-hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { ShoppingCart, CreditCard, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/core/helpers';
import { useToast } from '@/hooks/use-toast';
import { useDocList, useDoc } from '@/lib/client/hooks';
import {
  buildPosInvoice,
  buildPosInvoiceReturn,
  type BuildPosInvoiceReturnOpts,
} from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useAuthStore } from '@/stores/auth-store';
import { canUseWebSerialPrint, printEscPosSerial } from '@/lib/client/pos-serial-print';
import { apiPosSearchBarcode, apiPosGetItems, apiPosParentItemGroup } from '@/lib/client/api';
import { extractBarcodeHit } from '@/lib/client/pos-barcode';
import {
  isPosTemplateItem,
  normalizePosCatalogPayload,
  posTemplateDocName,
  type PosSellCatalogRow,
} from '@/lib/client/pos-catalog';
import {
  buildPosEscPosReceiptLines,
  buildPosReceiptHtml,
  type PosReceiptSnapshot,
} from '@/lib/client/pos-receipt';

interface CartLine {
  item_code: string;
  item_name: string;
  rate: number;
  qty: number;
  warehouse: string;
}

const HOLD_KEY = 'erp_pos_holds_v1';

/** حقول تحقق من نوع 0/1 في ملف نقطة البيع — عند الغياب يُستخدم الافتراضي الممرَّر */
function erpProfileBool(v: unknown, whenMissing: boolean): boolean {
  if (v === undefined || v === null) return whenMissing;
  return v === 1 || v === true || v === '1';
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function nowTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function POSPage() {
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [barcodeScan, setBarcodeScan] = useState('');
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [draftId] = useState(() => `TMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [variantPickerTemplate, setVariantPickerTemplate] = useState<PosSellCatalogRow | null>(null);
  const [discount, setDiscount] = useState(0);
  /** مبالغ الدفع لكل وسيلة من جدول ملف نقطة البيع */
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customer, setCustomer] = useState('');
  const [posProfile, setPosProfile] = useState('');
  const [defaultWarehouse, setDefaultWarehouse] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [lastReceipt, setLastReceipt] = useState<PosReceiptSnapshot | null>(null);
  const [shiftOpenDialog, setShiftOpenDialog] = useState(false);
  const [shiftCloseDialog, setShiftCloseDialog] = useState(false);
  /** أرصدة افتتاحية لكل وسيلة دفع من ملف نقطة البيع */
  const [openingByMode, setOpeningByMode] = useState<Record<string, string>>({});
  const [cashierUser, setCashierUser] = useState('');
  const [selectedClosingPoe, setSelectedClosingPoe] = useState('');
  /** مبالغ تسوية الإغلاق لكل وسيلة دفع (تُهيأ من ملخص الوردية) */
  const [closingByMode, setClosingByMode] = useState<Record<string, string>>({});
  const [returnDialog, setReturnDialog] = useState(false);
  const [returnInvName, setReturnInvName] = useState('');
  const shiftAutoPrompted = useRef(false);

  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const sessionUser = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split('T')[0]!;

  useEffect(() => {
    if (sessionUser?.name && !cashierUser) queueMicrotask(() => setCashierUser(sessionUser.name));
  }, [sessionUser?.name, cashierUser]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: profileDoc } = useDoc<Record<string, unknown>>('POS Profile', posProfile, {
    enabled: Boolean(posProfile.trim()),
  });

  const catalogEnabled = Boolean(
    posProfile.trim() &&
      profileDoc &&
      typeof profileDoc.selling_price_list === 'string' &&
      profileDoc.selling_price_list.trim().length > 0
  );

  const parentIgQuery = useQuery({
    queryKey: ['pos', 'parent-item-group', posProfile],
    queryFn: () => apiPosParentItemGroup(posProfile),
    enabled: catalogEnabled && Boolean(posProfile.trim()),
    staleTime: 60_000,
  });

  const rootGroupName = parentIgQuery.data ?? '';
  const effectiveItemGroup = activeGroup === 'all' ? rootGroupName : activeGroup;

  const catalogQuery = useQuery({
    queryKey: [
      'pos',
      'catalog',
      posProfile,
      String(profileDoc?.selling_price_list ?? ''),
      effectiveItemGroup,
      debouncedSearch,
    ],
    queryFn: async () => {
      const raw = await apiPosGetItems({
        pos_profile: posProfile.trim(),
        price_list: String(profileDoc?.selling_price_list ?? ''),
        item_group: effectiveItemGroup,
        search: debouncedSearch.trim() || undefined,
        page_length: 80,
      });
      return normalizePosCatalogPayload(raw);
    },
    enabled:
      catalogEnabled &&
      parentIgQuery.isSuccess &&
      Boolean(posProfile.trim()),
  });

  const {
    data: legacyItems = [],
    isLoading: legacyLoading,
    isError: legacyIsError,
    error: legacyError,
    refetch: refetchLegacyItems,
  } = useDocList<PosSellCatalogRow>('Item', {
    fields: ['name', 'item_name', 'item_code', 'item_group', 'disabled', 'has_variants', 'variant_of'],
    filters: { disabled: 0, is_sales_item: 1 },
    limit: 2000,
    enabled: !catalogEnabled,
  });

  const { data: openPoeList = [], refetch: refetchPoe } = useDocList<{
    name: string;
    status: string;
    pos_profile: string;
    user: string;
    period_start_date: string;
  }>('POS Opening Entry', {
    fields: ['name', 'status', 'pos_profile', 'user', 'period_start_date'],
    filters: { status: 'Open' },
    limit: 50,
    order_by: 'creation desc',
  });

  const { data: recentPosInv = [] } = useDocList<{ name: string; customer_name: string; grand_total: number; posting_date: string }>(
    'POS Invoice',
    {
      fields: ['name', 'customer_name', 'grand_total', 'posting_date'],
      filters: { docstatus: 1, is_return: 0 },
      order_by: 'modified desc',
      limit: 40,
    }
  );

  const returnSource = useDoc<Record<string, unknown>>('POS Invoice', returnInvName);

  const createInvoiceMut = useCreatePosInvoice();

  const shiftQuery = usePOSShift(Boolean(sessionUser?.name));
  const customerInfoQuery = usePOSCustomerInfo(customer.trim() || undefined);
  const openShiftMut = useOpenPOSShift();
  const closeShiftMut = useClosePOSShift();
  const shiftCheck = shiftQuery.data;
  const hasOpenShift = Boolean(shiftCheck?.has_open_entry);
  const openEntry = shiftCheck?.open_entry;
  const shiftMatchesProfile =
    !posProfile || !openEntry?.pos_profile || openEntry.pos_profile === posProfile;
  const canUsePosShift = hasOpenShift && shiftMatchesProfile;

  const profilePaymentModes = useMemo(() => {
    const rows = profileDoc?.payments;
    if (!Array.isArray(rows)) return [] as string[];
    const modes = rows
      .map((row) => (row as Record<string, unknown>)?.mode_of_payment)
      .filter((m): m is string => typeof m === 'string' && m.length > 0);
    return [...new Set(modes)];
  }, [profileDoc]);

  const allowRateEdit = erpProfileBool(profileDoc?.allow_rate_change, true);
  const allowWarehouseEdit = erpProfileBool(profileDoc?.allow_warehouse_change, false);
  const allowDiscountEdit = erpProfileBool(profileDoc?.allow_discount_change, true);

  useEffect(() => {
    if (!allowDiscountEdit) queueMicrotask(() => setDiscount(0));
  }, [allowDiscountEdit]);

  const cartQtyByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cart) m.set(c.item_code, c.qty);
    return m;
  }, [cart]);

  useEffect(() => {
    queueMicrotask(() => {
      setPaymentAmounts((prev) => {
        const next: Record<string, string> = {};
        for (const m of profilePaymentModes) {
          next[m] = prev[m] ?? '';
        }
        return next;
      });
    });
  }, [profilePaymentModes]);

  useEffect(() => {
    queueMicrotask(() =>
      setOpeningByMode((prev) => {
        const next = { ...prev };
        for (const m of profilePaymentModes) {
          if (next[m] === undefined) next[m] = '0';
        }
        return next;
      })
    );
  }, [profilePaymentModes]);

  useEffect(() => {
    if (!posProfile || !profileDoc?.warehouse || typeof profileDoc.warehouse !== 'string') return;
    const wh = String(profileDoc.warehouse);
    queueMicrotask(() => {
      setDefaultWarehouse((prev) => prev || wh);
      setCart((c) => (c.length ? c.map((l) => ({ ...l, warehouse: l.warehouse || wh })) : c));
    });
  }, [posProfile, profileDoc?.warehouse]);

  useEffect(() => {
    if (!posProfile || !profileDoc?.cost_center || typeof profileDoc.cost_center !== 'string') return;
    const cc = String(profileDoc.cost_center);
    queueMicrotask(() => setCostCenter((prev) => prev || cc));
  }, [posProfile, profileDoc?.cost_center]);

  useEffect(() => {
    if (!sessionUser?.name || coLoading) return;
    if (shiftQuery.isLoading || shiftQuery.isError) return;
    if (shiftCheck?.has_open_entry) {
      shiftAutoPrompted.current = false;
      return;
    }
    if (shiftAutoPrompted.current) return;
    shiftAutoPrompted.current = true;
    queueMicrotask(() => setShiftOpenDialog(true));
  }, [
    sessionUser?.name,
    coLoading,
    shiftQuery.isLoading,
    shiftQuery.isError,
    shiftCheck?.has_open_entry,
  ]);

  const myOpenPoeList = useMemo(
    () =>
      !cashierUser
        ? openPoeList
        : openPoeList.filter((p) => p.user === cashierUser),
    [openPoeList, cashierUser]
  );

  const sessionCloseSummary = usePOSSessionSummary(
    shiftCloseDialog && selectedClosingPoe ? selectedClosingPoe : undefined,
    Boolean(shiftCloseDialog && selectedClosingPoe)
  );

  useEffect(() => {
    if (!shiftCloseDialog) return;
    const names = new Set(myOpenPoeList.map((p) => p.name));
    if (selectedClosingPoe && names.has(selectedClosingPoe)) return;
    const first = myOpenPoeList[0]?.name;
    if (first) queueMicrotask(() => setSelectedClosingPoe(first));
  }, [shiftCloseDialog, myOpenPoeList, selectedClosingPoe]);

  useEffect(() => {
    if (!selectedClosingPoe) return;
    queueMicrotask(() => setClosingByMode({}));
  }, [selectedClosingPoe]);

  useEffect(() => {
    const s = sessionCloseSummary.data;
    if (!s || s.pos_opening_entry !== selectedClosingPoe) return;
    const pay = s.payments_by_mode;
    if (!pay || Object.keys(pay).length === 0) return;
    queueMicrotask(() =>
      setClosingByMode((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(pay)) {
          if (next[k] === undefined) next[k] = Number(v).toFixed(2);
        }
        return next;
      })
    );
  }, [sessionCloseSummary.data, selectedClosingPoe]);

  const openingAmountsInvalid = useMemo(
    () =>
      profilePaymentModes.some((m) => {
        const n = Number(openingByMode[m]);
        return Number.isNaN(n) || n < 0;
      }),
    [profilePaymentModes, openingByMode]
  );

  const categoryTabs = useMemo(() => {
    const base = { id: 'all', label: 'الكل' };
    if (catalogEnabled) {
      const rows = profileDoc?.item_groups;
      if (Array.isArray(rows) && rows.length > 0) {
        const ids = rows
          .map((r) => String((r as Record<string, unknown>).item_group ?? '').trim())
          .filter(Boolean);
        const uniq = [...new Set(ids)];
        return [base, ...uniq.map((id) => ({ id, label: id }))];
      }
      return [base];
    }
    const s = new Set<string>();
    legacyItems.forEach((i) => {
      if (i.item_group) s.add(String(i.item_group));
    });
    return [base, ...[...s].sort((a, b) => a.localeCompare(b, 'ar')).map((id) => ({ id, label: id }))];
  }, [catalogEnabled, profileDoc?.item_groups, legacyItems]);

  useEffect(() => {
    if (categoryTabs.length > 0 && !categoryTabs.some((t) => t.id === activeGroup)) {
      queueMicrotask(() => setActiveGroup('all'));
    }
  }, [categoryTabs, activeGroup]);

  const filteredLegacyProducts = useMemo(() => {
    let list = legacyItems;
    if (activeGroup !== 'all') {
      list = list.filter((i) => i.item_group === activeGroup);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          (i.item_name && i.item_name.toLowerCase().includes(q)) ||
          (i.item_code && i.item_code.toLowerCase().includes(q)) ||
          (i.name && i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [legacyItems, activeGroup, searchQuery]);

  const displayItems = catalogEnabled ? catalogQuery.data ?? [] : filteredLegacyProducts;

  const hideUnavailableItems = erpProfileBool(profileDoc?.hide_unavailable_items, false);
  const displayItemsFiltered = useMemo(() => {
    if (!hideUnavailableItems) return displayItems;
    return displayItems.filter((row) => {
      const q = row.actual_qty;
      if (q == null || !Number.isFinite(Number(q))) return true;
      return Number(q) > 0.0001;
    });
  }, [displayItems, hideUnavailableItems]);

  const itemsLoading = catalogEnabled ? catalogQuery.isLoading : legacyLoading;

  const itemsFetchError =
    catalogEnabled && catalogQuery.isError
      ? catalogQuery.error
      : legacyIsError
        ? legacyError
        : null;

  const resolveItemByCode = useCallback(
    (raw: string): PosSellCatalogRow | null => {
      const s = raw.trim();
      if (!s) return null;
      const lower = s.toLowerCase();
      const pool = catalogEnabled ? catalogQuery.data ?? [] : legacyItems;
      const hit = pool.find(
        (i) =>
          (i.item_code || '').toLowerCase() === lower ||
          i.name === s ||
          (i.name || '').toLowerCase() === lower
      );
      return hit ?? null;
    },
    [catalogEnabled, catalogQuery.data, legacyItems]
  );

  const handleBarcodeEnter = async () => {
    const raw = barcodeScan.trim();
    if (!raw) return;
    setBarcodeBusy(true);
    try {
      let hitRow: PosSellCatalogRow | null = null;
      try {
        const data = await apiPosSearchBarcode(raw);
        const extracted = extractBarcodeHit(data);
        if (extracted) {
          const byCode = resolveItemByCode(extracted.item_code);
          hitRow =
            byCode ??
            ({
              name: extracted.item_code,
              item_name: extracted.item_name || extracted.item_code,
              item_code: extracted.item_code,
              item_group: '',
            } as PosSellCatalogRow);
        }
      } catch {
        /* يُكمل بالتطابق المحلي */
      }
      if (!hitRow) hitRow = resolveItemByCode(raw);
      if (hitRow) {
        setBarcodeScan('');
        if (isPosTemplateItem(hitRow)) {
          setVariantPickerTemplate(hitRow);
          toast({ title: 'صنف له متغيرات', description: 'اختر المتغير من النافذة' });
        } else {
          addToCart(hitRow);
          toast({ title: 'أُضيف للسلة', description: hitRow.item_name || hitRow.name });
        }
      } else {
        toast({
          title: 'صنف غير معروف',
          description: `لا يوجد تطابق للرمز: ${raw}`,
          variant: 'destructive',
        });
      }
    } finally {
      setBarcodeBusy(false);
      barcodeRef.current?.focus();
    }
  };

  const [holds, setHolds] = useState<{ id: string; label: string; cart: CartLine[]; at: string }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOLD_KEY);
      if (raw)
        queueMicrotask(() =>
          setHolds(JSON.parse(raw) as { id: string; label: string; cart: CartLine[]; at: string }[])
        );
    } catch {
      /* ignore */
    }
  }, []);

  const persistHolds = useCallback((next: typeof holds) => {
    setHolds(next);
    try {
      localStorage.setItem(HOLD_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.rate * item.qty, 0), [cart]);
  /** صافي البنود ناقص الخصم؛ الضريبة والإجمالي النهائي يُحدَّدان بعد حفظ الفاتورة */
  const lineNet = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const paymentSum = useMemo(() => {
    let s = 0;
    for (const m of profilePaymentModes) {
      s += Number(paymentAmounts[m]) || 0;
    }
    return s;
  }, [profilePaymentModes, paymentAmounts]);

  const paymentSumOk =
    lineNet <= 0 ? false : paymentSum > 0 && paymentSum + 0.009 >= lineNet;

  const allowPartialPayment = useMemo(() => {
    const v = profileDoc?.allow_partial_payment as unknown;
    return v === 1 || v === true || v === '1';
  }, [profileDoc]);

  /** مدفوعات جزئية أقل من صافي البنود — مسودة (§6.5) */
  const paymentDraftOk = useMemo(() => {
    if (lineNet <= 0) return false;
    if (!allowPartialPayment) return false;
    return paymentSum > 0.005 && paymentSum + 0.009 < lineNet;
  }, [lineNet, allowPartialPayment, paymentSum]);

  const checkoutReady = paymentSumOk || paymentDraftOk;

  const hasChangeAccount =
    typeof profileDoc?.account_for_change_amount === 'string' &&
    Boolean(String(profileDoc.account_for_change_amount).trim());

  useEffect(() => {
    if (profilePaymentModes.length === 0 || lineNet <= 0) return;
    queueMicrotask(() => {
      setPaymentAmounts((prev) => {
        let sum = 0;
        for (const m of profilePaymentModes) {
          sum += Number(prev[m]) || 0;
        }
        if (sum > 0.005) return prev;
        const first = profilePaymentModes[0]!;
        return { ...prev, [first]: String(lineNet) };
      });
    });
  }, [lineNet, profilePaymentModes]);

  const addToCart = (row: PosSellCatalogRow) => {
    setCart((prev) => {
      const code = row.item_code || row.name;
      const rate0 = Number(row.price_list_rate);
      const initialRate = Number.isFinite(rate0) && rate0 >= 0 ? rate0 : 0;
      const existing = prev.find((c) => c.item_code === code);
      if (existing) {
        return prev.map((c) => (c.item_code === code ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          item_code: code,
          item_name: row.item_name || row.name,
          rate: initialRate,
          qty: 1,
          warehouse: defaultWarehouse,
        },
      ];
    });
  };

  const requestAddCatalogRow = (row: PosSellCatalogRow) => {
    if (isPosTemplateItem(row)) {
      setVariantPickerTemplate(row);
      return;
    }
    addToCart(row);
  };

  const updateQty = (item_code: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item_code === item_code ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const setLineRate = (item_code: string, rate: number) => {
    setCart((prev) => prev.map((c) => (c.item_code === item_code ? { ...c, rate: Math.max(0, rate) } : c)));
  };

  const setLineWarehouse = (item_code: string, warehouse: string) => {
    setCart((prev) => prev.map((c) => (c.item_code === item_code ? { ...c, warehouse } : c)));
  };

  const removeFromCart = (item_code: string) => {
    setCart((prev) => prev.filter((c) => c.item_code !== item_code));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const handleHold = () => {
    if (cart.length === 0) return;
    const id = `H${Date.now()}`;
    const label = `${cart.length} صنف — ${new Date().toLocaleTimeString('ar-SA')}`;
    persistHolds([...holds, { id, label, cart: [...cart], at: new Date().toISOString() }]);
    clearCart();
    toast({ title: 'تعليق الطلب', description: 'يُحفظ محلياً في هذا المتصفح' });
  };

  const restoreHold = (id: string) => {
    const h = holds.find((x) => x.id === id);
    if (!h) return;
    setCart(h.cart);
    persistHolds(holds.filter((x) => x.id !== id));
    toast({ title: 'استُعيد الطلب المعلق' });
  };

  const deleteHold = (id: string) => {
    persistHolds(holds.filter((x) => x.id !== id));
  };

  const printBrowserReceipt = (r: PosReceiptSnapshot) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      toast({ title: 'السماح بالنوافذ المنبثقة للطباعة', variant: 'destructive' });
      return;
    }
    w.document.write(buildPosReceiptHtml(r, { includePrintScript: true }));
    w.document.close();
  };

  const previewBrowserReceipt = (r: PosReceiptSnapshot) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      toast({ title: 'السماح بالنوافذ المنبثقة للمعاينة', variant: 'destructive' });
      return;
    }
    w.document.write(buildPosReceiptHtml(r, { includePrintScript: false }));
    w.document.close();
  };

  const printSerialSimple = async (r: PosReceiptSnapshot) => {
    const lines = buildPosEscPosReceiptLines(r);
    try {
      await printEscPosSerial(lines);
      toast({ title: 'أُرسل للطابعة' });
    } catch (e) {
      toast({ title: (e as Error).message || 'فشل الطباعة', variant: 'destructive' });
    }
  };

  const handleConfirmOrder = async () => {
    if (!customer) {
      toast({ title: 'اختر العميل', variant: 'destructive' });
      return;
    }
    if (!company) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (cart.some((c) => c.item_code && !c.warehouse)) {
      toast({ title: 'مستودع لكل بند أو مستودع افتراضي', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: 'السلة فارغة', variant: 'destructive' });
      return;
    }
    if (!posProfile) {
      toast({ title: 'اختر ملف نقطة البيع', variant: 'destructive' });
      return;
    }
    if (!checkoutReady) {
      toast({
        title: 'وزّع الدفع',
        description: allowPartialPayment
          ? `للترحيل: مجموع المدفوعات ≥ صافي البنود (${formatCurrency(lineNet)}). للمسودة بمدفوعات جزئية: مجموع أقل من ذلك مع تفعيل الدفع الجزئي في الملف.`
          : `مجموع المبالغ يجب أن لا يقل عن صافي البنود (${formatCurrency(lineNet)})`,
        variant: 'destructive',
      });
      return;
    }
    if (!profileDoc || typeof profileDoc.currency !== 'string' || !profileDoc.selling_price_list) {
      toast({ title: 'تعذر تحميل بيانات الملف — انتظر التحميل أو راجع ملف نقطة البيع', variant: 'destructive' });
      return;
    }
    if (!costCenter) {
      toast({ title: 'مركز تكلفة مطلوب (من الملف أو يدوياً)', variant: 'destructive' });
      return;
    }

    const cur = String(profileDoc.currency);
    const pl = String(profileDoc.selling_price_list);
    const plc =
      typeof profileDoc.price_list_currency === 'string' && profileDoc.price_list_currency
        ? String(profileDoc.price_list_currency)
        : cur;
    const plcRate = Number(profileDoc.plc_conversion_rate) || 1;
    const conv = Number(profileDoc.conversion_rate) || 1;
    const accChange =
      typeof profileDoc.account_for_change_amount === 'string' && profileDoc.account_for_change_amount
        ? String(profileDoc.account_for_change_amount)
        : undefined;
    const updStock = profileDoc.update_stock === 0 ? 0 : 1;

    const payments = profilePaymentModes
      .map((m) => ({
        mode_of_payment: m,
        amount: Number(paymentAmounts[m]) || 0,
      }))
      .filter((p) => p.amount > 0);
    if (payments.length === 0) {
      toast({ title: 'أدخل مبالغ الدفع', variant: 'destructive' });
      return;
    }

    const doc = buildPosInvoice({
      company,
      customer,
      posting_date: today,
      posting_time: nowTimeStr(),
      due_date: today,
      pos_profile: posProfile,
      cost_center: costCenter,
      currency: cur,
      selling_price_list: pl,
      price_list_currency: plc,
      conversion_rate: conv,
      plc_conversion_rate: plcRate,
      account_for_change_amount: accChange,
      update_stock: updStock as 0 | 1,
      items: cart.map((c) => ({
        item_code: c.item_code,
        qty: c.qty,
        rate: c.rate,
        amount: c.qty * c.rate,
        warehouse: c.warehouse,
        cost_center: costCenter,
      })),
      payments,
      discount_amount: discount > 0 ? discount : undefined,
    });

    const snapLines = cart.map((c) => ({
      name: c.item_name,
      code: c.item_code,
      qty: c.qty,
      rate: c.rate,
      lineTotal: c.qty * c.rate,
    }));
    const payLabel = payments.map((p) => `${p.mode_of_payment} ${formatCurrency(p.amount)}`).join(' · ');

    try {
      const wantsDraft = paymentDraftOk;
      const {
        name: invName,
        rounded_total: finalGt,
        total_taxes_and_charges: finalTax,
        draft,
      } = await createInvoiceMut.mutateAsync({
        doc: doc as Record<string, unknown>,
        submit: !wantsDraft,
      });

      if (draft) {
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 2000);
        toast({
          title: 'حُفظت مسودة فاتورة',
          description: (
            <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
              <span className="font-mono tabular-nums">{invName}</span>
              <span>— أكمل الدفع ثم رحّل من تفاصيل الفاتورة أو القائمة.</span>
              <Link
                href={`/pos/invoices/${encodeURIComponent(invName)}`}
                className="text-primary underline font-medium"
              >
                فتح الفاتورة
              </Link>
            </span>
          ),
        });
        clearCart();
        void catalogQuery.refetch();
        void refetchLegacyItems();
        void refetchPoe();
        return;
      }

      setLastReceipt({
        invoiceName: invName,
        at: new Date().toISOString(),
        lines: snapLines,
        subtotal,
        tax: finalTax,
        discount,
        total: finalGt,
        customerId: customer,
        paymentLabel: payLabel,
        company: company ?? '',
      });
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 2000);
      toast({ title: 'تم تسجيل الفاتورة', description: `الإجمالي ${formatCurrency(finalGt)} — تم الترحيل` });
      clearCart();
      void catalogQuery.refetch();
      void refetchLegacyItems();
      void refetchPoe();
    } catch (e) {
      toast({
        title: 'تعذر إنشاء الفاتورة أو ترحيلها',
        description: (e as Error).message || undefined,
        variant: 'destructive',
      });
    }
  };

  const handleOpenShift = async () => {
    if (!company || !posProfile) {
      toast({
        title: 'اختر الشركة وملف نقطة البيع',
        description: 'على الشاشة العريضة من العمود الأيمن (ملف نقطة البيع)، أو من تبويب «الإعدادات» على الجوال.',
        variant: 'destructive',
      });
      return;
    }
    if (!cashierUser) {
      toast({ title: 'حدد الكاشير', variant: 'destructive' });
      return;
    }
    if (profilePaymentModes.length === 0) {
      toast({ title: 'لا وسائل دفع في ملف نقطة البيع', variant: 'destructive' });
      return;
    }
    const balance_details = profilePaymentModes.map((m) => ({
      mode_of_payment: m,
      opening_amount: Number(openingByMode[m]) || 0,
    }));
    try {
      await openShiftMut.mutateAsync({
        company,
        pos_profile: posProfile,
        user: cashierUser,
        balance_details,
        posting_date: today,
        period_start_date: nowDatetimeLocal(),
      });
      toast({ title: 'تم فتح الوردية' });
      setShiftOpenDialog(false);
      void refetchPoe();
      void shiftQuery.refetch();
    } catch (e) {
      toast({ title: (e as Error).message || 'تعذر فتح الوردية', variant: 'destructive' });
    }
  };

  const handleCloseShift = async () => {
    if (!selectedClosingPoe) {
      toast({ title: 'اختر فتحة وردية مفتوحة', variant: 'destructive' });
      return;
    }
    try {
      const pay = sessionCloseSummary.data?.payments_by_mode ?? {};
      const modes = [...new Set([...Object.keys(pay), ...Object.keys(closingByMode)])];
      const payment_reconciliation =
        modes.length > 0
          ? modes.map((mode) => ({
              mode_of_payment: mode,
              closing_amount: Number(closingByMode[mode] ?? pay[mode] ?? 0),
            }))
          : undefined;

      await closeShiftMut.mutateAsync({
        pos_opening_entry: selectedClosingPoe,
        ...(payment_reconciliation?.length ? { payment_reconciliation } : {}),
      });
      toast({ title: 'تم إغلاق الوردية' });
      setShiftCloseDialog(false);
      setSelectedClosingPoe('');
      setClosingByMode({});
      void refetchPoe();
      void shiftQuery.refetch();
    } catch (e) {
      toast({ title: (e as Error).message || 'تعذر الإغلاق', variant: 'destructive' });
    }
  };

  const handleReturnConfirm = async (opts: BuildPosInvoiceReturnOpts) => {
    const src = returnSource.data;
    if (!returnInvName || !src) {
      toast({ title: 'اختر فاتورة', variant: 'destructive' });
      return;
    }
    if (Number(src.is_return) === 1) {
      toast({ title: 'اختر فاتورة أصلية', variant: 'destructive' });
      return;
    }
    const payRows = (src.payments as Record<string, unknown>[]) || [];
    if (!payRows.some((p) => p?.mode_of_payment)) {
      toast({ title: 'الفاتورة الأصلية بدون جدول مدفوعات', variant: 'destructive' });
      return;
    }
    const doc = buildPosInvoiceReturn(src, today, opts);
    const pr = doc.payments as { mode_of_payment?: string; amount?: number }[];
    if (!pr?.length) {
      toast({ title: 'تعذر بناء صفوف المرتجع المالية', variant: 'destructive' });
      return;
    }
    try {
      await createInvoiceMut.mutateAsync({ doc: doc as Record<string, unknown> });
      toast({ title: 'تم إنشاء وترحيل فاتورة المرتجع' });
      setReturnDialog(false);
      setReturnInvName('');
      void refetchLegacyItems();
      void catalogQuery.refetch();
    } catch (e) {
      toast({
        title: 'تعذر المرتجع',
        description: (e as Error).message || undefined,
        variant: 'destructive',
      });
    }
  };

  const cashierDisplay =
    sessionUser?.fullName?.trim() || sessionUser?.name?.trim() || cashierUser.trim() || '—';

  const checkoutProps = {
    myOpenPoeListLength: myOpenPoeList.length,
    onReturnClick: () => setReturnDialog(true),
    customer,
    onCustomerChange: setCustomer,
    customerInfo: customerInfoQuery.data ?? undefined,
    customerInfoLoading: customerInfoQuery.isLoading,
    customerInfoError: customerInfoQuery.isError,
    profileDefaultCustomer:
      typeof profileDoc?.customer === 'string' ? profileDoc.customer : undefined,
    posProfile,
    onPosProfileChange: setPosProfile,
    defaultWarehouse,
    onDefaultWarehouseChange: (w: string) => {
      setDefaultWarehouse(w);
      setCart((c) => c.map((l) => ({ ...l, warehouse: l.warehouse || w })));
    },
    costCenter,
    onCostCenterChange: setCostCenter,
    lastReceipt,
    onPrintReceipt: printBrowserReceipt,
    onPreviewReceipt: previewBrowserReceipt,
    onSerialPrint: printSerialSimple,
    showSerialPrint: canUseWebSerialPrint(),
    cartLines: cart,
    totalItems,
    holds: holds.map(({ id, label, at }) => ({ id, label, at })),
    onRemoveLine: removeFromCart,
    onQtyDelta: updateQty,
    onRateChange: setLineRate,
    onWarehouseChange: setLineWarehouse,
    onHold: handleHold,
    onRestoreHold: restoreHold,
    onDeleteHold: deleteHold,
    onClearCart: clearCart,
    subtotal,
    discount,
    onDiscountChange: setDiscount,
    lineNet,
    profilePaymentModes,
    paymentAmounts,
    onPaymentAmountChange: (mode: string, val: string) =>
      setPaymentAmounts((prev) => ({ ...prev, [mode]: val })),
    paymentSum,
    paymentSumOk,
    partialDraftOk: paymentDraftOk,
    allowPartialPayment,
    hasChangeAccount,
    onConfirm: () => void handleConfirmOrder(),
    confirmDisabled:
      cart.length === 0 ||
      coLoading ||
      createInvoiceMut.isPending ||
      orderSuccess ||
      !posProfile ||
      !checkoutReady ||
      !canUsePosShift,
    confirmBusy: createInvoiceMut.isPending,
    orderSuccess,
    allowRateEdit,
    allowWarehouseEdit,
    allowDiscountEdit,
  };

  const productPaneProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    barcodeValue: barcodeScan,
    onBarcodeChange: setBarcodeScan,
    onBarcodeEnter: () => void handleBarcodeEnter(),
    barcodeInputRef: barcodeRef,
    barcodeBusy,
    categoryTabs,
    activeGroup,
    onSelectGroup: setActiveGroup,
    itemsLoading,
    displayItems: displayItemsFiltered,
    catalogEnabled,
    posProfile,
    cartQtyByCode,
    onProductClick: requestAddCatalogRow,
  };

  return (
    <div dir="rtl" className="flex flex-col h-[calc(100vh-8rem)] -m-4 md:-m-6">
      <PosSellHeader
        draftId={draftId}
        posProfileLabel={posProfile.trim() || undefined}
        cashierLabel={cashierDisplay}
        shiftDocName={openEntry?.name}
        hasOpenShift={hasOpenShift}
        canCloseShift={myOpenPoeList.length > 0}
        onOpenShift={() => setShiftOpenDialog(true)}
        onCloseShift={() => setShiftCloseDialog(true)}
      />
      <div className="px-3 pt-2 shrink-0 space-y-2">
        <ListQueryAlert
          error={itemsFetchError}
          onRetry={() => {
            if (catalogEnabled) void catalogQuery.refetch();
            else void refetchLegacyItems();
          }}
        />
        {catalogEnabled && parentIgQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle className="text-sm">تعذر جلب مجموعة الأصناف للملف</AlertTitle>
            <AlertDescription className="text-xs flex flex-wrap gap-2 items-center">
              {(parentIgQuery.error as Error)?.message ?? 'تحقق من الاتصال'}
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void parentIgQuery.refetch()}>
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {shiftQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>تعذر التحقق من الوردية</AlertTitle>
            <AlertDescription className="text-xs">
              تحقق من الاتصال ثم أعد المحاولة؛ إذا استمر الخطأ أعد تسجيل الدخول.
            </AlertDescription>
          </Alert>
        )}
        {hasOpenShift && !shiftMatchesProfile && Boolean(posProfile) && (
          <Alert className="border-amber-500/35 bg-amber-500/[0.06]">
            <AlertTitle className="text-sm">تعارض ملف نقطة البيع</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              الوردية المفتوحة لملف «{openEntry?.pos_profile ?? '—'}». إمّا اختر نفس الملف أو أغلق الوردية ثم
              افتح وردية جديدة لهذا الملف.
            </AlertDescription>
          </Alert>
        )}
        {!hasOpenShift &&
          !shiftQuery.isLoading &&
          !shiftQuery.isError &&
          !shiftOpenDialog && (
            <Alert>
              <AlertTitle className="text-sm">لا توجد وردية مفتوحة للكاشير</AlertTitle>
              <AlertDescription className="text-xs flex flex-wrap items-center gap-2">
                لا يمكن ترحيل فواتير نقطة البيع قبل فتح وردية.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShiftOpenDialog(true)}
                >
                  فتح وردية
                </Button>
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* §3.1 — عريض: ~60% أصناف / ~40% سلة وعميل ودفع */}
      <div className="hidden lg:flex flex-1 flex-row min-h-0 overflow-hidden border-t border-border/60">
        <PosSellProductColumn {...productPaneProps} compactGrid={false} />
        <PosSellCheckoutColumn {...checkoutProps} showReturnBar />
      </div>

      <div className="flex lg:hidden flex-1 flex-col min-h-0 overflow-hidden border-t border-border/60">
        <Tabs defaultValue="products" className="flex flex-1 flex-col min-h-0 min-w-0">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1 mx-3 my-2 rounded-xl shrink-0">
            <TabsTrigger
              value="products"
              className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              الأصناف
            </TabsTrigger>
            <TabsTrigger
              value="cart"
              className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Receipt className="h-3.5 w-3.5" />
              السلة
              {cart.length > 0 && <Badge className="h-5 px-1.5 text-[10px]">{cart.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CreditCard className="h-3.5 w-3.5" />
              الإعدادات
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
            <PosSellProductColumn {...productPaneProps} compactGrid />
          </TabsContent>
          <TabsContent value="cart" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
            <PosSellCheckoutColumn {...checkoutProps} showReturnBar />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 min-h-0 overflow-auto mt-0">
            <PosSellSettingsPane
              posProfile={posProfile}
              onPosProfileChange={setPosProfile}
              defaultWarehouse={defaultWarehouse}
              onDefaultWarehouseChange={(w) => {
                setDefaultWarehouse(w);
                setCart((c) => c.map((l) => ({ ...l, warehouse: l.warehouse || w })));
              }}
              costCenter={costCenter}
              onCostCenterChange={setCostCenter}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PosOpeningDialog
        open={shiftOpenDialog}
        onOpenChange={setShiftOpenDialog}
        companyLabel={company || undefined}
        posProfileName={posProfile || undefined}
        profilePaymentModes={profilePaymentModes}
        cashierUser={cashierUser}
        onCashierChange={setCashierUser}
        openingByMode={openingByMode}
        onOpeningByModeChange={(mode, value) =>
          setOpeningByMode((prev) => ({ ...prev, [mode]: value }))
        }
        companyLoading={coLoading}
        onConfirm={() => void handleOpenShift()}
        busy={openShiftMut.isPending}
        canSubmit={
          Boolean(company && posProfile && cashierUser && profilePaymentModes.length > 0) &&
          !openingAmountsInvalid
        }
      />

      <PosClosingDialog
        open={shiftCloseDialog}
        onOpenChange={setShiftCloseDialog}
        openPoeList={myOpenPoeList}
        selectedPoe={selectedClosingPoe}
        onSelectPoe={setSelectedClosingPoe}
        onConfirm={() => void handleCloseShift()}
        busy={closeShiftMut.isPending}
        summary={sessionCloseSummary.data ?? null}
        summaryLoading={sessionCloseSummary.isLoading && Boolean(selectedClosingPoe)}
        closingByMode={closingByMode}
        onClosingByModeChange={(mode, value) =>
          setClosingByMode((prev) => ({ ...prev, [mode]: value }))
        }
      />

      <PosVariantPickerDialog
        open={variantPickerTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setVariantPickerTemplate(null);
        }}
        templateLabel={
          variantPickerTemplate?.item_name ||
          variantPickerTemplate?.item_code ||
          ''
        }
        templateDocName={
          variantPickerTemplate ? posTemplateDocName(variantPickerTemplate) : ''
        }
        posProfile={posProfile.trim()}
        priceList={
          profileDoc && typeof profileDoc.selling_price_list === 'string'
            ? profileDoc.selling_price_list.trim()
            : undefined
        }
        itemGroup={effectiveItemGroup}
        onPick={(row) => addToCart(row)}
      />

      <PosReturnDialog
        open={returnDialog}
        onOpenChange={setReturnDialog}
        invoiceName={returnInvName || null}
        source={returnSource.data}
        sourceLoading={returnSource.isLoading}
        postingDate={today}
        busy={createInvoiceMut.isPending}
        onConfirm={handleReturnConfirm}
        pickerSlot={
          <div className="space-y-2">
            <Select dir="rtl" value={returnInvName} onValueChange={setReturnInvName}>
              <SelectTrigger>
                <SelectValue placeholder="اختر فاتورة مرحّلة…" />
              </SelectTrigger>
              <SelectContent dir="rtl" align="start" className="max-h-64">
                {recentPosInv.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {r.name} · {r.customer_name} · {formatCurrency(r.grand_total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {returnInvName && returnSource.isLoading ? (
              <p className="text-xs text-muted-foreground">جاري تحميل بنود الفاتورة…</p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}

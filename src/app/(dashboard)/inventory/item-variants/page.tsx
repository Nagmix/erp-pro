'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Package,
  Layers,
  Palette,
  Ruler,
  Barcode,
  ChevronDown,
  X,
  Filter,
  Copy,
  Edit,
  RefreshCw,
  Search,
  Tag,
  Loader2,
  Grid3X3,
  ToggleLeft,
  ToggleRight,
  Hash,
  DollarSign,
  Box,
  Boxes,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useDeleteDoc } from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { apiBulkCreate, apiCreateDoc, apiUpdateDoc, apiCallMethod } from '@/lib/client/api';
import { formatCurrency, formatNumber } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

// ─── أنواع ────────────────────────────────────────────────────

interface AttributeValue {
  attribute: string;
  values: string;
}

interface VariantCombination {
  label: string;
  attributes: Record<string, string>;
  item_code: string;
  barcode: string;
  buy_price: string;
  sell_price: string;
  enabled: boolean;
}

interface TemplateItemRow {
  name: string;
  item_code: string;
  item_name: string;
  has_variants: 0 | 1 | boolean;
  variant_of?: string;
  item_group?: string;
  stock_uom?: string;
  standard_rate?: number;
  disabled?: 0 | 1 | boolean;
}

interface ItemAttributeRow {
  name: string;
  attribute_name: string;
  numeric_values?: 0 | 1 | boolean;
  item_attribute_values?: { attribute_value: string; abbr: string }[];
}

interface VariantGroupRow {
  name: string;
  item_code: string;
  item_name: string;
  variant_of: string;
  attributes?: string;
  disabled?: 0 | 1 | boolean;
  standard_rate?: number;
  valuation_rate?: number;
  barcode?: string;
  serial_no?: string;
}

// ─── سمات مقترحة ─────────────────────────────────────────────

const SUGGESTED_ATTRIBUTES: { label: string; name: string; values: string }[] = [
  { label: 'اللون', name: 'اللون', values: 'أحمر,أزرق,أسود,أبيض' },
  { label: 'المقاس', name: 'المقاس', values: 'S,M,L,XL' },
  { label: 'الحجم', name: 'الحجم', values: 'صغير,متوسط,كبير' },
  { label: 'المادة', name: 'المادة', values: 'قطن,بوليستر,حرير' },
  { label: 'اللون الثانوي', name: 'اللون الثانوي', values: 'ذهبي,فضي,برونزي' },
];

// ─── أدوات مساعدة ─────────────────────────────────────────────

function isFlag(v: unknown): boolean {
  return Number(v) === 1 || v === true;
}

function generateBarcode(): string {
  const prefix = '628';
  let code = prefix;
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  // EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i] ?? '0', 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
}

function generateCombinations(attributes: AttributeValue[]): VariantCombination[] {
  if (attributes.length === 0) return [];

  const attrArrays = attributes
    .filter((a) => a.attribute.trim() && a.values.trim())
    .map((a) => ({
      attribute: a.attribute.trim(),
      values: a.values.split(',').map((v) => v.trim()).filter(Boolean),
    }));

  if (attrArrays.length === 0) return [];

  // دالة التباديل الكرتيزية
  function cartesian<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCartesian = cartesian(rest);
    const result: T[][] = [];
    for (const item of first) {
      for (const combo of restCartesian) {
        result.push([item, ...combo]);
      }
    }
    return result;
  }

  const valueArrays = attrArrays.map((a) => a.values);
  const allCombos = cartesian(valueArrays);

  return allCombos.map((combo, idx) => {
    const attrMap: Record<string, string> = {};
    attrArrays.forEach((a, i) => {
      attrMap[a.attribute] = combo[i] ?? '';
    });
    const label = combo.join(' - ');
    return {
      label,
      attributes: attrMap,
      item_code: '',
      barcode: generateBarcode(),
      buy_price: '',
      sell_price: '',
      enabled: true,
    };
  });
}

// ─── المكون الرئيسي ───────────────────────────────────────────

export default function ItemVariantsPage() {
  const queryClient = useQueryClient();

  // ─── حالة الصفحة ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // ─── حالة الحوار ────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewVariantsOpen, setViewVariantsOpen] = useState(false);
  const [editVariantOpen, setEditVariantOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);

  // ─── حالة إنشاء مجموعة التبديلات ──────────────────────────
  const [templateItem, setTemplateItem] = useState('');
  const [itemCodePrefix, setItemCodePrefix] = useState('');
  const [attributes, setAttributes] = useState<AttributeValue[]>([
    { attribute: '', values: '' },
  ]);
  const [combinations, setCombinations] = useState<VariantCombination[]>([]);
  const [defaultSellPrice, setDefaultSellPrice] = useState('');
  const [defaultBuyPrice, setDefaultBuyPrice] = useState('');
  const [autoGenerateBarcodes, setAutoGenerateBarcodes] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState('attributes');

  // ─── حالة عرض التبديلات ────────────────────────────────────
  const [viewingGroup, setViewingGroup] = useState<TemplateItemRow | null>(null);
  const [viewVariants, setViewVariants] = useState<VariantGroupRow[]>([]);
  const [viewVariantsLoading, setViewVariantsLoading] = useState(false);

  // ─── حالة تعديل تبديل ──────────────────────────────────────
  const [editingVariant, setEditingVariant] = useState<VariantGroupRow | null>(null);
  const [editVariantSellPrice, setEditVariantSellPrice] = useState('');
  const [editVariantBuyPrice, setEditVariantBuyPrice] = useState('');
  const [editVariantBarcode, setEditVariantBarcode] = useState('');
  const [editVariantEnabled, setEditVariantEnabled] = useState(true);



  // ─── حالة تحديث الأسعار الجماعي ────────────────────────────
  const [bulkPriceType, setBulkPriceType] = useState<'sell' | 'buy'>('sell');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkPriceUpdating, setBulkPriceUpdating] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());

  // ─── جلب البيانات ───────────────────────────────────────────
  const { data: templateItems, isLoading: templatesLoading, isError, error, refetch } = useDocList<TemplateItemRow>('Item', {
    fields: ['name', 'item_code', 'item_name', 'has_variants', 'variant_of', 'item_group', 'stock_uom', 'standard_rate'],
    filters: [['has_variants', '=', '1']],
    order_by: 'modified desc',
    limit: 2000,
  });

  const { data: allAttributes } = useDocList<ItemAttributeRow>('Item Attribute', {
    fields: ['name', 'attribute_name', 'numeric_values'],
    limit: 500,
  });

  // ─── حسابات ──────────────────────────────────────────────────
  const groups = templateItems || [];

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.item_code?.toLowerCase().includes(s) ||
          g.item_name?.toLowerCase().includes(s) ||
          g.item_group?.toLowerCase().includes(s)
      );
    }
    if (statusFilter === 'active') {
      result = result.filter((g) => !isFlag(g.disabled));
    } else if (statusFilter === 'disabled') {
      result = result.filter((g) => isFlag(g.disabled));
    }
    return result;
  }, [groups, search, statusFilter]);



  // ─── إعادة حساب التوليفات ──────────────────────────────────
  useEffect(() => {
    const combos = generateCombinations(attributes);
    setCombinations((prev) => {
      return combos.map((combo, i) => ({
        ...combo,
        item_code: itemCodePrefix
          ? `${itemCodePrefix}-${String(i + 1).padStart(3, '0')}`
          : '',
        buy_price: prev[i]?.buy_price || defaultBuyPrice,
        sell_price: prev[i]?.sell_price || defaultSellPrice,
        enabled: prev[i]?.enabled ?? true,
        barcode: autoGenerateBarcodes ? generateBarcode() : (prev[i]?.barcode || ''),
      }));
    });
  }, [attributes, itemCodePrefix, defaultBuyPrice, defaultSellPrice, autoGenerateBarcodes]);

  // ─── أعمدة الجدول ───────────────────────────────────────────
  const columns: Column<TemplateItemRow>[] = useMemo(
    () => [
      {
        key: 'item_code',
        header: 'كود القالب',
        sortable: true,
        filterable: true,
        render: (v) => <span className="font-mono text-primary font-medium">{String(v)}</span>,
      },
      {
        key: 'item_name',
        header: 'اسم المجموعة',
        sortable: true,
        filterable: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{row.item_name}</span>
          </div>
        ),
      },
      {
        key: 'item_group',
        header: 'مجموعة الأصناف',
        filterable: true,
        render: (v) => v ? <Badge variant="outline" className="text-xs">{String(v)}</Badge> : '—',
      },
      {
        key: 'stock_uom',
        header: 'الوحدة',
        render: (v) => <span className="text-xs text-muted-foreground">{String(v || '—')}</span>,
      },
      {
        key: 'has_variants',
        header: 'التبديلات',
        render: (v) =>
          isFlag(v) ? (
            <Badge className="text-xs bg-primary/10 text-emerald-700 dark:bg-chart-3/10 dark:text-emerald-400 border-0 gap-1">
              <Grid3X3 className="h-3 w-3" />
              مفعل
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">لا</Badge>
          ),
      },
      {
        key: 'standard_rate',
        header: 'سعر البيع',
        render: (v) => (
          <span className="tabular-nums font-medium">
            {v ? formatCurrency(Number(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'disabled',
        header: 'الحالة',
        render: (v) =>
          isFlag(v) ? (
            <Badge className="text-xs bg-destructive/10 text-red-700 dark:bg-destructive/10 dark:text-red-400 border-0">معطّل</Badge>
          ) : (
            <Badge className="text-xs bg-primary/10 text-green-700 dark:bg-primary/10 dark:text-green-400 border-0">نشط</Badge>
          ),
      },
    ],
    []
  );

  // ─── أعمدة جدول التبديلات ──────────────────────────────────
  const variantColumns: Column<VariantGroupRow>[] = useMemo(
    () => [
      {
        key: 'item_code',
        header: 'كود التبديل',
        sortable: true,
        filterable: true,
        render: (v) => <span className="font-mono text-primary font-medium text-xs">{String(v)}</span>,
      },
      {
        key: 'item_name',
        header: 'اسم التبديل',
        sortable: true,
        filterable: true,
        render: (_, row) => (
          <span className="text-xs font-medium">{row.item_name}</span>
        ),
      },
      {
        key: 'barcode',
        header: 'الباركود',
        render: (v) => (
          <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">{String(v || '—')}</span>
        ),
      },
      {
        key: 'standard_rate',
        header: 'سعر البيع',
        render: (v) => <span className="tabular-nums text-xs">{v ? formatCurrency(Number(v)) : '—'}</span>,
      },
      {
        key: 'valuation_rate',
        header: 'سعر الشراء',
        render: (v) => <span className="tabular-nums text-xs">{v ? formatCurrency(Number(v)) : '—'}</span>,
      },
      {
        key: 'disabled',
        header: 'الحالة',
        render: (v) =>
          isFlag(v) ? (
            <Badge className="text-xs bg-destructive/10 text-red-700 border-0">معطّل</Badge>
          ) : (
            <Badge className="text-xs bg-primary/10 text-green-700 border-0">نشط</Badge>
          ),
      },
    ],
    []
  );

  // ─── إضافة سمة ─────────────────────────────────────────────
  const addAttribute = useCallback(() => {
    setAttributes((prev) => [...prev, { attribute: '', values: '' }]);
  }, []);

  const removeAttribute = useCallback((index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAttribute = useCallback((index: number, field: 'attribute' | 'values', value: string) => {
    setAttributes((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }, []);

  const applyPreset = useCallback((presetIndex: number) => {
    const preset = SUGGESTED_ATTRIBUTES[presetIndex];
    if (!preset) return;
    setAttributes((prev) => {
      const exists = prev.some((a) => a.attribute === preset.name);
      if (exists) return prev;
      return [...prev, { attribute: preset.name, values: preset.values }];
    });
  }, []);

  const copySellPriceToAll = useCallback(() => {
    if (!defaultSellPrice) return;
    setCombinations((prev) =>
      prev.map((c) => ({ ...c, sell_price: defaultSellPrice }))
    );
  }, [defaultSellPrice]);

  const copyBuyPriceToAll = useCallback(() => {
    if (!defaultBuyPrice) return;
    setCombinations((prev) =>
      prev.map((c) => ({ ...c, buy_price: defaultBuyPrice }))
    );
  }, [defaultBuyPrice]);

  // ─── إنشاء مجموعة التبديلات ────────────────────────────────
  const handleCreateVariantGroup = useCallback(async () => {
    if (!templateItem) {
      toast.error('اختر صنف القالب أولاً');
      return;
    }
    if (attributes.filter((a) => a.attribute.trim() && a.values.trim()).length === 0) {
      toast.error('أضف سمة واحدة على الأقل مع قيمها');
      return;
    }
    if (combinations.length === 0) {
      toast.error('لا توجد توليفات لإنشائها');
      return;
    }

    setCreating(true);
    try {
      // 1. إنشاء سمات العنصر (Item Attribute) إذا لم تكن موجودة
      for (const attr of attributes) {
        if (!attr.attribute.trim() || !attr.values.trim()) continue;
        const attrName = attr.attribute.trim();
        const attrValues = attr.values.split(',').map((v) => v.trim()).filter(Boolean);

        // محاولة إنشاء السمة (قد تكون موجودة مسبقاً)
        try {
          await apiCreateDoc('Item Attribute', {
            __newname: attrName,
            attribute_name: attrName,
            item_attribute_values: attrValues.map((v) => ({
              attribute_value: v,
              abbr: v.substring(0, 3).toUpperCase(),
            })),
          });
        } catch {
          // السمة قد تكون موجودة - نحاول تحديثها
          try {
            const existingAttr = await apiCallMethod('frappe.client.get', {
              doctype: 'Item Attribute',
              name: attrName,
            }) as ItemAttributeRow | null;
            if (existingAttr) {
              const existingValues = existingAttr.item_attribute_values || [];
              const newValues = attrValues.filter(
                (v) => !existingValues.some((ev) => ev.attribute_value === v)
              );
              if (newValues.length > 0) {
                await apiUpdateDoc('Item Attribute', attrName, {
                  item_attribute_values: [
                    ...existingValues,
                    ...newValues.map((v) => ({
                      attribute_value: v,
                      abbr: v.substring(0, 3).toUpperCase(),
                    })),
                  ],
                } as Record<string, unknown>);
              }
            }
          } catch {
            // تجاهل الأخطاء في التحديث
          }
        }
      }

      // 2. تحديث صنف القالب لتفعيل التبديلات
      try {
        await apiUpdateDoc('Item', templateItem, {
          has_variants: 1,
          variant_based_on: 'Item Attribute',
          attributes: attributes
            .filter((a) => a.attribute.trim() && a.values.trim())
            .map((a) => ({
              attribute: a.attribute.trim(),
            })),
        } as Record<string, unknown>);
      } catch (err) {
        toast.error('فشل تحديث صنف القالب', { description: String(err) });
      }

      // 3. إنشاء التبديلات
      const template = groups.find((g) => g.name === templateItem);
      const variantDocs = combinations.map((combo, idx) => {
        const attrEntries = Object.entries(combo.attributes);
        const variantDoc: Record<string, unknown> = {
          item_code: combo.item_code || `${templateItem}-${String(idx + 1).padStart(3, '0')}`,
          item_name: `${templateItem} - ${combo.label}`,
          variant_of: templateItem,
          has_variants: 0,
          is_stock_item: 1,
          item_group: template?.item_group,
          stock_uom: template?.stock_uom || 'Nos',
          standard_rate: Number(combo.sell_price) || 0,
          valuation_rate: Number(combo.buy_price) || 0,
          disabled: combo.enabled ? 0 : 1,
          attributes: attrEntries.map(([attr, val]) => ({
            attribute: attr,
            attribute_value: val,
          })),
        };
        if (combo.barcode) {
          variantDoc.barcode = combo.barcode;
        }
        return variantDoc;
      });

      try {
        await apiBulkCreate('Item', variantDocs);
        toast.success('تم إنشاء مجموعة التبديلات', { description: `تم إنشاء ${variantDocs.length} تبديل بنجاح` });
      } catch (bulkErr) {
        // محاولة إنشاء فردي
        let ok = 0;
        let fail = 0;
        for (const doc of variantDocs) {
          try {
            await apiCreateDoc('Item', doc);
            ok++;
          } catch {
            fail++;
          }
        }
        toast.success('تم إنشاء التبديلات', { description: `نجح ${ok}، فشل ${fail}` });
      }

      setCreateDialogOpen(false);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Item'] });
      void refetch();
    } catch (err) {
      toast.error('فشل إنشاء مجموعة التبديلات', { description: err instanceof Error ? err.message : 'خطأ غير معروف' });
    } finally {
      setCreating(false);
    }
  }, [templateItem, attributes, combinations, toast, queryClient, refetch]);

  // ─── إعادة تعيين النموذج ────────────────────────────────────
  const resetCreateForm = useCallback(() => {
    setTemplateItem('');
    setItemCodePrefix('');
    setAttributes([{ attribute: '', values: '' }]);
    setCombinations([]);
    setDefaultSellPrice('');
    setDefaultBuyPrice('');
    setAutoGenerateBarcodes(true);
    setActiveCreateTab('attributes');
  }, []);

  // ─── جلب تبديلات المجموعة ──────────────────────────────────
  const handleViewVariants = useCallback(async (group: TemplateItemRow) => {
    setViewingGroup(group);
    setViewVariantsOpen(true);
    setViewVariantsLoading(true);
    setViewVariants([]);
    try {
      const result = await apiCallMethod<VariantGroupRow[]>('frappe.client.get_list', {
        doctype: 'Item',
        fields: ['name', 'item_code', 'item_name', 'variant_of', 'barcode', 'standard_rate', 'valuation_rate', 'disabled', 'attributes'],
        filters: [['variant_of', '=', group.name]],
        limit_page_length: 500,
        order_by: 'item_code asc',
      });
      setViewVariants(Array.isArray(result) ? result : []);
    } catch {
      // محاولة بديلة عبر useDocList
      try {
        const resp = await fetch(`/api/data/Item?fields=${encodeURIComponent(JSON.stringify(['name', 'item_code', 'item_name', 'variant_of', 'barcode', 'standard_rate', 'valuation_rate', 'disabled']))}&filters=${encodeURIComponent(JSON.stringify([['variant_of', '=', group.name]]))}&limit=500`);
        const data = await resp.json();
        setViewVariants(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setViewVariants([]);
      }
    } finally {
      setViewVariantsLoading(false);
    }
  }, []);

  // ─── تعديل تبديل ────────────────────────────────────────────
  const handleEditVariant = useCallback((variant: VariantGroupRow) => {
    setEditingVariant(variant);
    setEditVariantSellPrice(String(variant.standard_rate || ''));
    setEditVariantBuyPrice(String(variant.valuation_rate || ''));
    setEditVariantBarcode(variant.barcode || '');
    setEditVariantEnabled(!isFlag(variant.disabled));
    setEditVariantOpen(true);
  }, []);

  const handleSaveVariant = useCallback(async () => {
    if (!editingVariant) return;
    try {
      await apiUpdateDoc('Item', editingVariant.name, {
        standard_rate: Number(editVariantSellPrice) || 0,
        valuation_rate: Number(editVariantBuyPrice) || 0,
        barcode: editVariantBarcode,
        disabled: editVariantEnabled ? 0 : 1,
      } as Record<string, unknown>);
      toast.success('تم تحديث التبديل');
      setEditVariantOpen(false);
      // إعادة تحميل التبديلات
      if (viewingGroup) {
        void handleViewVariants(viewingGroup);
      }
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Item'] });
      void refetch();
    } catch (err) {
      toast.error('فشل تحديث التبديل', { description: err instanceof Error ? err.message : 'خطأ غير معروف' });
    }
  }, [editingVariant, editVariantSellPrice, editVariantBuyPrice, editVariantBarcode, editVariantEnabled, viewingGroup, handleViewVariants, queryClient, refetch, toast]);

  // ─── تحديث أسعار جماعي ─────────────────────────────────────
  const handleBulkPriceUpdate = useCallback(async () => {
    if (!viewingGroup || !bulkPriceValue) return;
    setBulkPriceUpdating(true);
    try {
      const updates = viewVariants
        .filter((v) => selectedVariantIds.size === 0 || selectedVariantIds.has(v.name))
        .map((v) => ({
          name: v.name,
          doc: {
            [bulkPriceType === 'sell' ? 'standard_rate' : 'valuation_rate']: Number(bulkPriceValue) || 0,
          },
        }));

      let ok = 0;
      let fail = 0;
      for (const { name, doc } of updates) {
        try {
          await apiUpdateDoc('Item', name, doc as Record<string, unknown>);
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success('تم التحديث', { description: `نجح ${ok}، فشل ${fail}` });
      setBulkPriceDialogOpen(false);
      setBulkPriceValue('');
      setSelectedVariantIds(new Set());
      if (viewingGroup) void handleViewVariants(viewingGroup);
    } catch (err) {
      toast.error('فشل التحديث الجماعي');
    } finally {
      setBulkPriceUpdating(false);
    }
  }, [viewingGroup, bulkPriceValue, bulkPriceType, viewVariants, selectedVariantIds, handleViewVariants, toast]);

  // ─── تفعيل/تعطيل جماعي ─────────────────────────────────────
  const handleBulkToggle = useCallback(async (enable: boolean) => {
    if (!viewingGroup) return;
    try {
      const targets = viewVariants
        .filter((v) => selectedVariantIds.size === 0 || selectedVariantIds.has(v.name));
      let ok = 0;
      let fail = 0;
      for (const v of targets) {
        try {
          await apiUpdateDoc('Item', v.name, { disabled: enable ? 0 : 1 } as Record<string, unknown>);
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(enable ? 'تم التفعيل' : 'تم التعطيل', { description: `نجح ${ok}، فشل ${fail}` });
      if (viewingGroup) void handleViewVariants(viewingGroup);
    } catch {
      toast.error('فشلت العملية');
    }
  }, [viewingGroup, viewVariants, selectedVariantIds, handleViewVariants, toast]);

  // ─── حذف ────────────────────────────────────────────────────
  const deleteMutation = useDeleteDoc('Item');

  // ─── إحصائيات ───────────────────────────────────────────────
  const totalGroups = groups.length;
  const totalActiveGroups = groups.filter((g) => !isFlag(g.disabled)).length;
  const totalAttributes = allAttributes?.length || 0;


  // ─── عرض الصفحة ─────────────────────────────────────────────
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ─── رأس الصفحة ─── */}
      <PageHeader
        title="مجموعات البنود"
        description="إدارة مجموعات تبديلات الأصناف والسمات والأسعار — إنشاء تبديلات تلقائية من القوالب"
        iconify="solar:layers-bold-duotone"
        accent="warning"
        breadcrumbs={[
          { label: 'المخزون', href: '/inventory' },
          { label: 'مجموعات البنود' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                resetCreateForm();
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              مجموعة جديدة
            </Button>
          </div>
        }
      />

      {/* ─── بطاقات الإحصائيات ─── */}
      {/* ─── شريط البحث والفلاتر ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالمجموعة أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pe-8"
              />
            </div>
          </div>
          <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                <Filter className="h-3 w-3" /> فلاتر
                <ChevronDown className={cn('h-3 w-3 transition-transform', filterOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
                <div className="space-y-1">
                  <Label className="text-xs">الحالة</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'disabled')}>
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="disabled">معطّل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(statusFilter !== 'all' || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                    className="h-8 text-xs gap-1"
                  >
                    <X className="h-3 w-3" /> مسح الفلاتر
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* ─── جدول المجموعات ─── */}
      <PageShell className="space-y-4" padded={false}>
        <DataTable
          data={filteredGroups}
          columns={columns}
          searchable
          loading={templatesLoading}
          tableId="item-variants-groups"
          columnFilters
          selectable
          exportFileName="variant-groups.csv"
          getRowId={(row) => row.name}
          onView={(row) => void handleViewVariants(row)}

          onDelete={(row) => setDeleteName(row.name)}
          bulkActions={[
            {
              label: 'نسخ الأكواد',
              onClick: (rows) => {
                const text = rows.map((r) => r.item_code).join('\n');
                void navigator.clipboard.writeText(text);
                toast.success('تم النسخ', { description: `${rows.length} صنفاً` });
              },
            },
          ]}
        />
      </PageShell>

      {/* ─── حوار إنشاء مجموعة تبديلات ─── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-chart-2" />
              إنشاء مجموعة تبديلات جديدة
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeCreateTab} onValueChange={setActiveCreateTab} className="w-full">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="attributes" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                السمات
              </TabsTrigger>
              <TabsTrigger value="combinations" className="text-xs gap-1">
                <Grid3X3 className="h-3 w-3" />
                التوليفات ({combinations.length})
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs gap-1">
                <DollarSign className="h-3 w-3" />
                التسعير
              </TabsTrigger>
              <TabsTrigger value="codes" className="text-xs gap-1">
                <Barcode className="h-3 w-3" />
                الأكواد
              </TabsTrigger>
            </TabsList>

            {/* ─── تبويب السمات ─── */}
            <TabsContent value="attributes" className="space-y-4 mt-4 outline-none">
              {/* اختيار صنف القالب */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">صنف القالب *</Label>
                  <ErpLinkCombobox
                    doctype="Item"
                    value={templateItem}
                    onChange={setTemplateItem}
                    placeholder="اختر الصنف الأساسي..."
                    displayKey="item_name"
                  />
                  <p className="text-xs text-muted-foreground">
                    الصنف الذي ستُنشأ منه التبديلات (يجب أن يكون مُفعّلاً للتبديلات)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">بادئة كود التبديل</Label>
                  <Input
                    dir="ltr"
                    value={itemCodePrefix}
                    onChange={(e) => setItemCodePrefix(e.target.value)}
                    placeholder="مثال: TSHIRT"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    ستُضاف تلقائياً لكل كود تبديل (مثل: TSHIRT-001)
                  </p>
                </div>
              </div>

              <Separator className="my-2" />

              {/* اختيار سريع للسمات */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">اختيار سريع للسمات</Label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_ATTRIBUTES.map((preset, i) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => applyPreset(i)}
                    >
                      {preset.label === 'اللون' && <Palette className="h-3 w-3" />}
                      {preset.label === 'المقاس' && <Ruler className="h-3 w-3" />}
                      {preset.label === 'الحجم' && <Box className="h-3 w-3" />}
                      {preset.label === 'المادة' && <Layers className="h-3 w-3" />}
                      {!['اللون', 'المقاس', 'الحجم', 'المادة'].includes(preset.label) && <Tag className="h-3 w-3" />}
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              {/* قائمة السمات */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">السمات والقيم</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={addAttribute}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة سمة
                  </Button>
                </div>

                {attributes.map((attr, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">اسم السمة</Label>
                        {allAttributes && allAttributes.length > 0 ? (
                          <Select
                            value={attr.attribute}
                            onValueChange={(v) => updateAttribute(index, 'attribute', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="اختر أو اكتب..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allAttributes.map((a) => (
                                <SelectItem key={a.name} value={a.name}>
                                  {a.attribute_name || a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={attr.attribute}
                            onChange={(e) => updateAttribute(index, 'attribute', e.target.value)}
                            placeholder="مثال: اللون"
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">القيم (مفصولة بفاصلة)</Label>
                        <Input
                          value={attr.values}
                          onChange={(e) => updateAttribute(index, 'values', e.target.value)}
                          placeholder="مثال: أحمر, أزرق, أسود"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    {attributes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeAttribute(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* عدد التوليفات المتوقعة */}
              {combinations.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-2/5 dark:bg-chart-2/5 border border-chart-2/20">
                  <Sparkles className="h-4 w-4 text-chart-2" />
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    سيتم إنشاء {formatNumber(combinations.length)} توليفة (تبديل)
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[11px] text-chart-2"
                    onClick={() => setActiveCreateTab('combinations')}
                  >
                    عرض التوليفات ←
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ─── تبويب التوليفات ─── */}
            <TabsContent value="combinations" className="space-y-4 mt-4 outline-none">
              {combinations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Grid3X3 className="h-9 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">لم يتم تحديد سمات بعد</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    أضف سمات وقيم في تبويب «السمات» لعرض التوليفات
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1"
                    onClick={() => setActiveCreateTab('attributes')}
                  >
                    <Tag className="h-3 w-3" />
                    الذهاب للسمات
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      معاينة جميع التوليفات الممكنة ({formatNumber(combinations.length)} توليفة)
                    </p>
                  </div>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-1">
                      {combinations.map((combo, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-xs',
                            'border border-border/30 bg-muted/10',
                            !combo.enabled && 'opacity-50'
                          )}
                        >
                          <span className="w-8 shrink-0 text-muted-foreground font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {combo.item_code && (
                            <span className="font-mono text-primary shrink-0" dir="ltr">
                              {combo.item_code}
                            </span>
                          )}
                          <span className="font-medium flex-1">{combo.label}</span>
                          {combo.barcode && (
                            <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                              {combo.barcode}
                            </span>
                          )}
                          {combo.sell_price && (
                            <span className="shrink-0 text-primary dark:text-emerald-400">
                              {formatCurrency(Number(combo.sell_price))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            {/* ─── تبويب التسعير ─── */}
            <TabsContent value="pricing" className="space-y-4 mt-4 outline-none">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">سعر البيع الافتراضي</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      dir="ltr"
                      value={defaultSellPrice}
                      onChange={(e) => setDefaultSellPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 shrink-0"
                      onClick={copySellPriceToAll}
                      disabled={!defaultSellPrice}
                    >
                      <Copy className="h-3 w-3" />
                      نسخ للكل
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    يُطبّق على جميع التوليفات (يمكن تعديل كل تبديل لاحقاً)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">سعر الشراء الافتراضي</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      dir="ltr"
                      value={defaultBuyPrice}
                      onChange={(e) => setDefaultBuyPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 shrink-0"
                      onClick={copyBuyPriceToAll}
                      disabled={!defaultBuyPrice}
                    >
                      <Copy className="h-3 w-3" />
                      نسخ للكل
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تكلفة الشراء الافتراضية لجميع التوليفات
                  </p>
                </div>
              </div>

              <Separator className="my-2" />

              {/* أسعار التوليفات */}
              {combinations.length > 0 && (
                <ScrollArea className="max-h-72">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[2rem_1fr_6rem_6rem] gap-2 px-3 py-1 text-xs font-medium text-muted-foreground border-b">
                      <span>#</span>
                      <span>التوليفة</span>
                      <span>سعر الشراء</span>
                      <span>سعر البيع</span>
                    </div>
                    {combinations.map((combo, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[2rem_1fr_6rem_6rem] gap-2 items-center px-3 py-1.5 text-xs border-b border-border/20"
                      >
                        <span className="text-muted-foreground">{idx + 1}</span>
                        <span className="truncate">{combo.label}</span>
                        <Input
                          type="number"
                          dir="ltr"
                          value={combo.buy_price}
                          onChange={(e) =>
                            setCombinations((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, buy_price: e.target.value } : c))
                            )
                          }
                          className="h-7 text-[11px]"
                          placeholder="0"
                        />
                        <Input
                          type="number"
                          dir="ltr"
                          value={combo.sell_price}
                          onChange={(e) =>
                            setCombinations((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, sell_price: e.target.value } : c))
                            )
                          }
                          className="h-7 text-[11px]"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* ─── تبويب الأكواد ─── */}
            <TabsContent value="codes" className="space-y-4 mt-4 outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Barcode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">توليد الباركود تلقائياً</p>
                      <p className="text-xs text-muted-foreground">إنشاء باركود EAN-13 لكل تبديل</p>
                    </div>
                  </div>
                  <Switch
                    checked={autoGenerateBarcodes}
                    onCheckedChange={setAutoGenerateBarcodes}
                  />
                </div>
              </div>

              {/* معاينة الأكواد */}
              {combinations.length > 0 && (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {combinations.map((combo, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-xs border border-border/20"
                      >
                        <span className="w-8 shrink-0 text-muted-foreground font-mono">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 grid sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-xs text-muted-foreground">الكود: </span>
                            <span className="font-mono text-primary" dir="ltr">
                              {combo.item_code || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">الباركود: </span>
                            <span className="font-mono text-[11px]" dir="ltr">
                              {combo.barcode || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          {/* أزرار الحوار */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              className="flex-1 gap-1.5"
              onClick={handleCreateVariantGroup}
              disabled={creating || !templateItem || combinations.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  إنشاء {combinations.length} تبديل
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── حوار عرض تبديلات المجموعة ─── */}
      <Dialog open={viewVariantsOpen} onOpenChange={setViewVariantsOpen}>
        <DialogContent dir="rtl" className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4 text-chart-2" />
              تبديلات: {viewingGroup?.item_name || ''}
              <Badge variant="outline" className="text-xs font-mono">
                {viewingGroup?.item_code}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* أزرار الإجراءات الجماعية */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setBulkPriceDialogOpen(true)}
            >
              <DollarSign className="h-3 w-3" />
              تحديث أسعار
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-primary hover:text-green-700"
              onClick={() => void handleBulkToggle(true)}
            >
              <ToggleRight className="h-3 w-3" />
              تفعيل الكل
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-destructive hover:text-red-700"
              onClick={() => void handleBulkToggle(false)}
            >
              <ToggleLeft className="h-3 w-3" />
              تعطيل الكل
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => viewingGroup && void handleViewVariants(viewingGroup)}
            >
              <RefreshCw className="h-3 w-3" />
              تحديث
            </Button>
          </div>

          {/* جدول التبديلات */}
          <div className="flex-1 overflow-auto">
            {viewVariantsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="me-3 text-sm text-muted-foreground">جارٍ تحميل التبديلات...</span>
              </div>
            ) : viewVariants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-9 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">لا توجد تبديلات لهذه المجموعة</p>
                <p className="text-xs text-muted-foreground mt-1">
                  أنشئ تبديلات من خلال نافذة «مجموعة جديدة»
                </p>
              </div>
            ) : (
              <DataTable
                data={viewVariants}
                columns={variantColumns}
                searchable
                loading={viewVariantsLoading}
                tableId="variant-group-items"
                columnFilters
                selectable
                getRowId={(row) => row.name}
                onEdit={(row) => handleEditVariant(row)}
                onDelete={(row) => setDeleteName(row.name)}
                bulkActions={[
                  {
                    label: 'تفعيل المحدد',
                    onClick: (rows) => {
                      setSelectedVariantIds(new Set(rows.map((r) => r.name)));
                      void handleBulkToggle(true);
                    },
                  },
                  {
                    label: 'تعطيل المحدد',
                    variant: 'destructive',
                    onClick: (rows) => {
                      setSelectedVariantIds(new Set(rows.map((r) => r.name)));
                      void handleBulkToggle(false);
                    },
                  },
                ]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── حوار تعديل تبديل ─── */}
      <Dialog open={editVariantOpen} onOpenChange={setEditVariantOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4 text-primary" />
              تعديل التبديل
            </DialogTitle>
          </DialogHeader>
          {editingVariant && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground">كود التبديل</p>
                <p className="font-mono font-medium text-primary" dir="ltr">{editingVariant.item_code}</p>
                <p className="text-xs text-muted-foreground mt-1">اسم التبديل</p>
                <p className="text-sm font-medium">{editingVariant.item_name}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">سعر البيع</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={editVariantSellPrice}
                    onChange={(e) => setEditVariantSellPrice(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">سعر الشراء</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={editVariantBuyPrice}
                    onChange={(e) => setEditVariantBuyPrice(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">الباركود</Label>
                <div className="flex gap-2">
                  <Input
                    dir="ltr"
                    value={editVariantBarcode}
                    onChange={(e) => setEditVariantBarcode(e.target.value)}
                    className="h-9 font-mono"
                    placeholder="أدخل الباركود..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 shrink-0"
                    onClick={() => setEditVariantBarcode(generateBarcode())}
                  >
                    <Barcode className="h-3 w-3" />
                    توليد
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-xs font-medium">تفعيل التبديل</p>
                  <p className="text-xs text-muted-foreground">
                    عند التعطيل لن يظهر في القوائم والعمليات
                  </p>
                </div>
                <Switch
                  checked={editVariantEnabled}
                  onCheckedChange={setEditVariantEnabled}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button className="flex-1" onClick={handleSaveVariant}>
              حفظ التعديلات
            </Button>
            <Button variant="outline" onClick={() => setEditVariantOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── حوار تحديث الأسعار الجماعي ─── */}
      <Dialog open={bulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-chart-2" />
              تحديث الأسعار الجماعي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">نوع السعر</Label>
              <Select value={bulkPriceType} onValueChange={(v) => setBulkPriceType(v as 'sell' | 'buy')}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">سعر البيع</SelectItem>
                  <SelectItem value="buy">سعر الشراء</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">السعر الجديد</Label>
              <Input
                type="number"
                dir="ltr"
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                placeholder="0.00"
                className="h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم تحديث {selectedVariantIds.size > 0 ? `${selectedVariantIds.size} تبديل محدد` : 'جميع التبديلات'} في هذه المجموعة
            </p>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              className="flex-1"
              onClick={() => void handleBulkPriceUpdate()}
              disabled={bulkPriceUpdating || !bulkPriceValue}
            >
              {bulkPriceUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin me-1" />
                  جاري التحديث...
                </>
              ) : (
                'تحديث الأسعار'
              )}
            </Button>
            <Button variant="outline" onClick={() => setBulkPriceDialogOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── حوار تأكيد الحذف ─── */}
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصنف؟</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف الصنف وجميع بياناته نهائياً. هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => {
                    toast.success('تم الحذف');
                    setDeleteName(null);
                    void refetch();
                  },
                  onError: () =>
                    toast.error('تعذر الحذف — قد يكون الصنف مرتبطاً'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { UserPlus, Users, Loader2, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/core/helpers';
import type { POSCustomerInfoResponse } from '@/lib/core/types';
import { buildCustomerCreate } from '@/lib/erp/erpnext-payloads';
import { useCreateDoc } from '@/lib/client/hooks';
import { usePosSetCustomerInfo, type PosSetCustomerInfoField } from '@/lib/client/pos-hooks';
import { toast } from 'sonner';

type Props = {
  customer: string;
  onCustomerChange: (name: string) => void;
  customerInfo?: POSCustomerInfoResponse | null;
  customerInfoLoading?: boolean;
  customerInfoError?: boolean;
  /** حقل اختياري في ملف نقطة البيع (عميل افتراضي للكاشير) */
  profileDefaultCustomer?: string;
};

export function PosCustomerSelector({
  customer,
  onCustomerChange,
  customerInfo,
  customerInfoLoading,
  customerInfoError,
  profileDefaultCustomer,
}: Props) {
  const createMut = useCreateDoc<{ name?: string }>('Customer');
  const setCustomerMut = usePosSetCustomerInfo();
  const [quickOpen, setQuickOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [form, setForm] = useState({
    customer_name: '',
    customer_type: 'Individual' as 'Company' | 'Individual',
    customer_group: '',
    territory: '',
    mobile_no: '',
  });

  const defaultFromProfile = profileDefaultCustomer?.trim() ?? '';
  const showProfileDefault = Boolean(defaultFromProfile && defaultFromProfile !== customer.trim());

  useEffect(() => {
    queueMicrotask(() => setEditOpen(false));
  }, [customer]);

  useEffect(() => {
    if (!editOpen || !customerInfo) return;
    queueMicrotask(() => {
      setEditCustomerName(customerInfo.customer_name ?? '');
      setEditMobile(customerInfo.mobile_no ?? '');
      setEditEmail(customerInfo.email_id ?? '');
    });
  }, [editOpen, customerInfo]);

  const handleSaveCustomerFields = async () => {
    const key = customer.trim();
    if (!key || !customerInfo) return;
    const prevName = customerInfo.customer_name ?? '';
    const prevM = customerInfo.mobile_no ?? '';
    const prevE = customerInfo.email_id ?? '';
    const updates: PosSetCustomerInfoField[] = [];
    if (editCustomerName.trim() !== prevName.trim()) {
      updates.push({ customer: key, fieldname: 'customer_name', value: editCustomerName.trim() });
    }
    if (editMobile.trim() !== prevM.trim()) {
      updates.push({ customer: key, fieldname: 'mobile_no', value: editMobile.trim() });
    }
    if (editEmail.trim() !== prevE.trim()) {
      updates.push({ customer: key, fieldname: 'email_id', value: editEmail.trim() });
    }
    if (updates.length === 0) {
      setEditOpen(false);
      return;
    }
    try {
      await setCustomerMut.mutateAsync(updates);
      toast.success('تم تحديث بيانات العميل');
      setEditOpen(false);
    } catch (e) {
      toast.error('فشل التحديث', { description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleQuickCreate = async () => {
    if (!form.customer_name.trim()) {
      toast.error('أدخل اسم العميل');
      return;
    }
    if (!form.customer_group.trim() || !form.territory.trim()) {
      toast.error('بيانات ناقصة', { description: 'اختر مجموعة العملاء والمنطقة' });
      return;
    }
    try {
      const doc = buildCustomerCreate({
        customer_name: form.customer_name,
        customer_type: form.customer_type,
        customer_group: form.customer_group,
        territory: form.territory,
        mobile_no: form.mobile_no.trim() || undefined,
      });
      const created = await createMut.mutateAsync(doc);
      const name =
        created && typeof created === 'object' && created !== null && 'name' in created
          ? String((created as { name?: string }).name ?? '').trim()
          : '';
      if (name) {
        onCustomerChange(name);
        toast.success('تم إنشاء العميل', { description: name });
        setQuickOpen(false);
        setForm({
          customer_name: '',
          customer_type: 'Individual',
          customer_group: '',
          territory: '',
          mobile_no: '',
        });
      } else {
        toast.error('أُنشئ العميل لكن لم يُرجع الاسم');
      }
    } catch (e) {
      toast.error('فشل الإنشاء', { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs">عميل *</Label>
        <div className="flex flex-wrap items-center gap-1">
          {showProfileDefault && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => onCustomerChange(defaultFromProfile)}
            >
              عميل الملف
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setQuickOpen(true)}
          >
            <UserPlus className="h-3 w-3" />
            عميل جديد
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2" asChild>
            <Link href="/sales/customers">
              <Users className="h-3 w-3" />
              القائمة
            </Link>
          </Button>
          {customer.trim() && customerInfo && !customerInfoLoading && !customerInfoError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3 w-3" />
              تعديل بيانات
            </Button>
          )}
        </div>
      </div>
      <ErpLinkCombobox doctype="Customer" value={customer} onChange={onCustomerChange} displayKey="customer_name" />

      {customer.trim() && (
        <div className="rounded-md border bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground space-y-0.5">
          {customerInfoLoading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              جاري تحميل بيانات العميل…
            </span>
          ) : customerInfoError ? (
            <span className="text-destructive">تعذر عرض تفاصيل العميل</span>
          ) : customerInfo ? (
            <>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-between">
                <span className="font-medium text-foreground">{customerInfo.customer_name}</span>
                {customerInfo.outstanding_balance > 0.005 && (
                  <span className="text-amber-800 dark:text-amber-200 tabular-nums">
                    ذمة: {formatCurrency(customerInfo.outstanding_balance)}
                  </span>
                )}
              </div>
              {(customerInfo.territory || customerInfo.customer_group) && (
                <div className="text-[10px] text-muted-foreground">
                  {customerInfo.territory ? <span>المنطقة: {customerInfo.territory}</span> : null}
                  {customerInfo.territory && customerInfo.customer_group ? ' · ' : null}
                  {customerInfo.customer_group ? <span>المجموعة: {customerInfo.customer_group}</span> : null}
                </div>
              )}
              {(customerInfo.mobile_no || customerInfo.email_id) && (
                <div className="tabular-nums">
                  {[customerInfo.mobile_no, customerInfo.email_id].filter(Boolean).join(' · ')}
                </div>
              )}
              {customerInfo.outstanding_balance > 0.005 && (
                <p className="text-[10px] text-muted-foreground/90 leading-snug pt-0.5">
                  رصيد ذمم مفتوح — يشمل فواتير مبيعات ونقطة بيع مرحّلة. راجع سجل العميل من القائمة للتفصيل.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/70 leading-snug">
                برامج الولاء والنقاط: تظهر عند التفعيل؛ واجهة البيع تعرض الملخص المحاسبي الأساسي فقط.
              </p>
            </>
          ) : null}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
            <DialogDescription className="text-xs">
              يُرسل التحديث عبر أوامر نقطة البيع في النظام (جوال، بريد، الاسم الظاهر).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">اسم العرض</Label>
              <Input
                className="h-9 text-sm"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">جوال</Label>
              <Input
                dir="ltr"
                className="h-9 text-sm"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">البريد</Label>
              <Input
                dir="ltr"
                type="email"
                className="h-9 text-sm"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={setCustomerMut.isPending}
              onClick={() => void handleSaveCustomerFields()}
            >
              {setCustomerMut.isPending ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>عميل سريع</DialogTitle>
            <DialogDescription className="text-xs">
              إنشاء عميل في النظام ثم تعيينه للفاتورة الحالية. مجموعة العملاء والمنطقة مطلوبان كما في شاشة العملاء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">اسم العميل</Label>
              <Input
                className="h-9 text-sm"
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">النوع</Label>
              <Select
                dir="rtl"
                value={form.customer_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, customer_type: v as 'Company' | 'Individual' }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">فرد</SelectItem>
                  <SelectItem value="Company">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">مجموعة العملاء</Label>
              <ErpLinkCombobox
                doctype="Customer Group"
                value={form.customer_group}
                onChange={(v) => setForm((f) => ({ ...f, customer_group: v }))}
                filters={[['is_group', '=', '0']]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المنطقة</Label>
              <ErpLinkCombobox doctype="Territory" value={form.territory} onChange={(v) => setForm((f) => ({ ...f, territory: v }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">جوال (اختياري)</Label>
              <Input
                dir="ltr"
                className="h-9 text-sm"
                value={form.mobile_no}
                onChange={(e) => setForm((f) => ({ ...f, mobile_no: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setQuickOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={createMut.isPending}
              onClick={() => void handleQuickCreate()}
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
              حفظ واختيار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

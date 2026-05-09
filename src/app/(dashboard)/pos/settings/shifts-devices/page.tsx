'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Info, Loader2, Plus, Store, Sun } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildShiftTypeCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type ShiftTypeRow = { name: string; start_time?: string; end_time?: string };

type DeviceRow = {
  name: string;
  company?: string;
  warehouse?: string;
  selling_price_list?: string;
};

const shiftColumns: Column<ShiftTypeRow>[] = [
  {
    key: 'name',
    header: 'اسم الوردية',
    sortable: true,
    render: (v) => (
      <span className="font-medium text-primary flex items-center gap-1.5">
        <Sun className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        {String(v ?? '—')}
      </span>
    ),
  },
  {
    key: 'start_time',
    header: 'البداية',
    render: (v) => (
      <span dir="ltr" className="tabular-nums text-xs">
        {String(v ?? '').slice(0, 8)}
      </span>
    ),
  },
  {
    key: 'end_time',
    header: 'النهاية',
    render: (v) => (
      <span dir="ltr" className="tabular-nums text-xs">
        {String(v ?? '').slice(0, 8)}
      </span>
    ),
  },
];

const deviceColumns: Column<DeviceRow>[] = [
  {
    key: 'name',
    header: 'اسم الجهاز (ملف نقطة البيع)',
    sortable: true,
    render: (_, row) => (
      <Link
        href={`/pos/settings/profiles/${encodeURIComponent(row.name)}`}
        className="font-medium text-primary hover:underline"
      >
        {row.name}
      </Link>
    ),
  },
  { key: 'warehouse', header: 'المستودع', render: (v) => String(v ?? '—') },
  { key: 'selling_price_list', header: 'قائمة الأسعار', render: (v) => String(v ?? '—') },
];

export default function PosShiftsDevicesSettingsPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [shiftDialog, setShiftDialog] = useState(false);
  const [form, setForm] = useState({ name: '', start_time: '08:00', end_time: '16:00' });

  const {
    data: shifts = [],
    isLoading: shiftsLoading,
    isError: shiftsErr,
    error: shiftsError,
    refetch: refetchShifts,
  } = useDocList<ShiftTypeRow>('Shift Type', {
    fields: ['name', 'start_time', 'end_time'],
    limit: 200,
    order_by: 'name asc',
  });

  const {
    data: devices = [],
    isLoading: devLoading,
    isError: devErr,
    error: devError,
    refetch: refetchDevices,
  } = useDocList<DeviceRow>('POS Profile', {
    fields: ['name', 'company', 'warehouse', 'selling_price_list'],
    filters: defaultCompany?.trim() ? [['company', '=', defaultCompany.trim()]] : undefined,
    limit: 500,
    order_by: 'modified desc',
    enabled: Boolean(defaultCompany?.trim()),
  });

  const createShift = useCreateDoc<{ name?: string }>('Shift Type');

  const handleCreateShift = () => {
    if (!form.name.trim()) {
      toast.error('أدخل اسماً للوردية');
      return;
    }
    const mapped = buildShiftTypeCreate({
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    createShift.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => {
        toast.success('تم إنشاء نوع الوردية');
        setShiftDialog(false);
        setForm({ name: '', start_time: '08:00', end_time: '16:00' });
        void refetchShifts();
      },
      onError: (e) => {
        toast.error('تعذر الإنشاء', { description: e instanceof Error ? e.message : undefined });
      },
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الورديات والأجهزة"
        description="مطابقة §11.1: أسماء الورديات عبر أنواع الوردية (Shift Type)، والأجهزة عبر ملف نقطة البيع (POS Profile) لكل جهاز كاشير."
        iconify="solar:monitor-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الإعدادات', href: '/pos/settings' }, { label: 'الورديات والأجهزة' }]}
      />

      <Alert className="border-border/60 bg-muted/20">
        <Info className="h-4 w-4" />
        <AlertTitle>ملاحظة</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          يُمثَّل كل جهاز بملف نقطة البيع (اسم الجهاز، المستودع، قائمة الأسعار). أسماء الورديات (صباحية، مسائية…) تُعرَّف كنوع وردية وتُستخدم في التعيينات.
        </AlertDescription>
      </Alert>

      {!coLoading && !defaultCompany?.trim() ? (
        <p className="text-sm text-destructive">اضبط الشركة الافتراضية من الإعدادات العامة لعرض القوائم.</p>
      ) : null}

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">أسماء الورديات</CardTitle>
            <CardDescription>
              أنواع الوردية في النظام (Shift Type). للإدارة المتقدمة والتعيينات على الموظفين يمكن فتح شاشة الموارد
              البشرية.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/hr/shifts">إدارة الورديات (HR)</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={!defaultCompany?.trim()}
              onClick={() => setShiftDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              نوع وردية سريع
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ListQueryAlert error={shiftsErr ? shiftsError : null} onRetry={() => void refetchShifts()} />
          <DataTable data={shifts} columns={shiftColumns} searchable loading={shiftsLoading} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">أجهزة نقاط البيع</CardTitle>
            <CardDescription>
              ملفات نقطة البيع للشركة الحالية — كل صف يمثل جهازاً (كاشيراً) مع مستودعه وقائمة أسعاره.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" className="gap-1.5" asChild>
            <Link href="/pos/settings/profiles">
              <Store className="h-3.5 w-3.5" />
              قائمة الملفات
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ListQueryAlert error={devErr ? devError : null} onRetry={() => void refetchDevices()} />
          <DataTable data={devices} columns={deviceColumns} searchable loading={devLoading} />
        </CardContent>
      </Card>

      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>نوع وردية جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label className="text-xs">الاسم (مثلاً: صباحية، مسائية)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="اسم الوردية"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">بداية</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">نهاية</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShiftDialog(false)}>
              إلغاء
            </Button>
            <Button type="button" disabled={createShift.isPending} onClick={() => void handleCreateShift()}>
              {createShift.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

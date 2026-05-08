'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Plus } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';

type LPRow = { name: string };

/** ولاء العملاء — قوائم ERPNext + تقارير المركز + إنشاء برنامج أساسي (M-28). */
export default function CrmLoyaltyPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [openCreate, setOpenCreate] = useState(false);
  const [programName, setProgramName] = useState('');

  const { data = [], isLoading, isError, error, refetch } = useDocList<LPRow>('Loyalty Program', {
    fields: ['name'],
    limit: 100,
    order_by: 'modified desc',
  });

  const createLp = useCreateDoc('Loyalty Program');

  const columns: Column<LPRow>[] = useMemo(
    () => [{ key: 'name', header: 'البرنامج', filterable: true }],
    []
  );

  const today = new Date().toISOString().slice(0, 10);

  const handleCreateProgram = () => {
    if (!programName.trim()) {
      toast.error('اسم البرنامج مطلوب');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة من النظام');
      return;
    }
    createLp.mutate(
      {
        company: defaultCompany,
        loyalty_program_name: programName.trim(),
        from_date: today,
        collection_rules: [
          {
            tier_name: 'أساسي',
            min_amount: 0,
            collection_factor: 1,
          },
        ],
      } as Record<string, unknown>,
      {
        onSuccess: () => {
          toast.success('تم إنشاء برنامج الولاء — يمكنك متابعة التعديلات لاحقاً من قوائم المستندات عبر التطبيق عند توفر شاشة التفاصيل');
          setOpenCreate(false);
          setProgramName('');
          void refetch();
        },
        onError: () =>
          toast.error('فشل الإنشاء — تحقق من صلاحيات البيع ولحقول Loyalty Program على الخادم'),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="ولاء العملاء"
        description="عرض البرامج وإنشاء برنامج ولاء جديد من هذه الشاشة؛ التقرير التحليلي من مركز التقارير."
        iconify="solar:heart-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'الولاء' }]}
        actions={
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={coLoading}>
                <Plus className="h-4 w-4" />
                برنامج ولاء
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>برنامج ولاء جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs">اسم البرنامج</Label>
                  <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="مثال: ولاء عملاء التجزئة" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  يُنشئ صفاً بقاعدة نقاط افتراضية (مجموعة واحدة). مستويات إضافية تُضاف لاحقاً عبر واجهات التطبيق أو تحديث المستند من API عند توسيع الشاشة.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                  إلغاء
                </Button>
                <Button type="button" onClick={handleCreateProgram} disabled={createLp.isPending || coLoading}>
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-border/40">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">تقرير نقاط الولاء والحركة</p>
          <Button asChild size="sm" variant="secondary" className="gap-2">
            <Link href="/reports?openReport=crm-loyalty">
              <BarChart3 className="h-4 w-4" />
              فتح التقرير في المركز
            </Link>
          </Button>
        </CardContent>
      </Card>

      <DataTable
        data={data}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="crm-loyalty-programs"
        exportFileName="loyalty-programs.csv"
        printTitle="برامج الولاء"
      />
    </div>
  );
}

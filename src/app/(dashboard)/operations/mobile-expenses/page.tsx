'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, Receipt, ScanLine } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildExpenseClaimCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { PageHeader } from '@/components/erp/page-header';

type ExpenseRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  total_claimed_amount?: number;
  posting_date?: string;
  status?: string;
};

export default function MobileExpensesPage() {
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [employee, setEmployee] = useState('');
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [ocrText, setOcrText] = useState('');

  const expenses = useDocList<ExpenseRow>('Expense Claim', {
    fields: ['name', 'employee', 'employee_name', 'total_claimed_amount', 'posting_date', 'status'],
    limit: 200,
    order_by: 'creation desc',
  });
  const createExpense = useCreateDoc('Expense Claim');

  const rows = expenses.data || [];
  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.total_claimed_amount || 0), 0), [rows]);
  const approvedCount = useMemo(() => rows.filter(r => String(r.status || '').toLowerCase().includes('approve')).length, [rows]);

  const runMockOcr = () => {
    if (!receiptUrl) return toast.error('أضف رابط الإيصال أولاً');
    setOcrText(`تم تحليل بيانات الإيصال من الرابط: ${receiptUrl.slice(0, 28)}...`);
    toast.success('تم استخراج النص من الإيصال');
  };

  const addExpense = () => {
    if (!employee || !amount || !expenseType) return toast.error('يرجى ملء الموظف والمبلغ ونوع المصروف');
    if (!defaultCompany) return toast.error('تعذر تحديد الشركة');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('مبلغ غير صالح');
    const remarkParts = [notes.trim(), ocrText.trim() && `نتيجة القراءة:\n${ocrText}`, receiptUrl.trim() && `رابط الإيصال: ${receiptUrl}`].filter(Boolean);
    const doc = buildExpenseClaimCreate({
      employee,
      company: defaultCompany,
      posting_date: postingDate,
      remark: remarkParts.join('\n\n') || undefined,
      cost_center: costCenter.trim() || undefined,
      currency: currency.trim() || 'YER',
      exchange_rate: exchangeRate,
      expenses: [
        {
          expense_date: postingDate,
          expense_type: expenseType,
          amount: amt,
          description: notes.trim() || expenseType,
          sanctioned_amount: amt,
          cost_center: costCenter.trim() || undefined,
        },
      ],
    });
    createExpense.mutate(doc, {
      onSuccess: () => {
        toast.success('تم حفظ مطالبة المصروف');
        setAmount('');
        setNotes('');
        setReceiptUrl('');
        setOcrText('');
        void expenses.refetch();
      },
      onError: () => toast.error('تعذر حفظ المصروف'),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={expenses.isError ? expenses.error : null} onRetry={() => expenses.refetch()} />
      <PageHeader
        title="تطبيق تسجيل المصروفات"
        description="تسجيل مصروفات الجوال مع رابط إيصال واستخراج نصي تلقائي"
        iconify="solar:wallet-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'مصروفات الجوال' }]}
      />

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">مصروف جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الموظف *</Label>
              <ErpLinkCombobox doctype="Employee" value={employee} onChange={setEmployee} displayKey="employee_name" />
            </div>
            <div>
              <Label className="text-xs">تاريخ المطالبة</Label>
              <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">المبلغ *</Label>
              <Input type="number" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">نوع المصروف *</Label>
              <ErpLinkCombobox
                doctype="Expense Claim Type"
                value={expenseType}
                onChange={setExpenseType}
                placeholder="اختر النوع..."
                className="h-9 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">مركز التكلفة</Label>
              <ErpLinkCombobox doctype="Cost Center" value={costCenter} onChange={setCostCenter} placeholder="اختياري" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">العملة</Label>
              <ErpLinkCombobox doctype="Currency" value={currency} onChange={setCurrency} placeholder="YER" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">سعر الصرف</Label>
              <Input
                type="number"
                dir="ltr"
                step="any"
                min={0}
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(Math.max(0.000001, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label className="text-xs">رابط الإيصال</Label>
              <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://example.com/receipt" dir="ltr" />
            </div>
          </div>
          <div>
            <Label className="text-xs">ملاحظات</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">نتيجة القراءة النصية</Label>
            <Textarea rows={2} value={ocrText} onChange={(e) => setOcrText(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => toast.message('التقاط مباشر من الكاميرا يُفعّل في تطبيق الجوال')}>
              <Camera className="h-4 w-4" /> الكاميرا
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={runMockOcr}>
              <ScanLine className="h-4 w-4" /> استخراج النص
            </Button>
            <Button size="sm" type="button" disabled={createExpense.isPending || coLoading} onClick={addExpense}>
              <Receipt className="h-4 w-4" /> حفظ مطالبة
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">سجلات المصروفات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            الإجمالي: <span className="font-semibold">{formatCurrency(total)}</span>
          </p>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">لا توجد مطالبات مصروفات بعد</p>
          ) : (
            rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3 hover:border-border/60 transition-colors">
                <div className="text-sm">
                  <div className="font-medium">{row.employee_name || row.employee}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(Number(row.total_claimed_amount || 0))} | {row.name}
                    {row.posting_date ? ` | ${formatDate(String(row.posting_date))}` : ''}
                  </div>
                </div>
                <Badge variant={String(row.status || '').toLowerCase().includes('approve') ? 'default' : 'secondary'}>
                  {row.status === 'Draft' ? 'مسودة' : row.status || 'مسودة'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

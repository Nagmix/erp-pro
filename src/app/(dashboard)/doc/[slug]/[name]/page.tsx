'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BookMarked, FileText, Pencil, Printer } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/components/erp/data-table';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { useDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { docTypeFromSlug } from '@/lib/erp/doc-detail-routes';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { printDocument, printWithERPFormat } from '@/lib/ui/print-document';
import { VersionHistory } from '@/components/erp/version-history';
import { DocumentComments } from '@/components/erp/document-comments';

const DOCTYPE_AR: Record<string, string> = {
  'Sales Invoice': 'فاتورة مبيعات',
  'Purchase Invoice': 'فاتورة مشتريات',
  'Journal Entry': 'قيد يومية',
  'Payment Entry': 'سند دفع',
  'Expense Claim': 'مطالبة مصروفات',
  'Sales Order': 'أمر بيع',
  'Purchase Order': 'أمر شراء',
  'Contract': 'عقد',
  'Employee Contract': 'عقد موظف',
  'GL Entry': 'قيد دفتر الأستاذ',
  'Bank Transaction': 'حركة بنكية',
  'Mode of Payment': 'طريقة دفع',
  'Asset': 'أصل ثابت',
  'Auto Repeat': 'تكرار تلقائي',
  'Communication': 'تواصل',
  'Lead': 'عميل محتمل',
  'Customer': 'عميل',
  'Opportunity': 'فرصة',
};

type GlRow = {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  party_type?: string;
  party?: string;
  voucher_detail_no?: string;
};

function DraftEditCard({
  doctype,
  name,
  doc,
  onSaved,
}: {
  doctype: string;
  name: string;
  doc: Record<string, unknown>;
  onSaved: () => void;
}) {
  const updateMut = useUpdateDoc(doctype);
  const [title, setTitle] = useState('');
  const [userRemark, setUserRemark] = useState('');
  const [remark, setRemark] = useState('');
  const [terms, setTerms] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [postingDate, setPostingDate] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      setTitle(String(doc.title ?? ''));
      setUserRemark(String(doc.user_remark ?? ''));
      setRemark(String(doc.remark ?? ''));
      setTerms(String(doc.terms ?? ''));
      setReferenceNo(String(doc.reference_no ?? ''));
      const pd = doc.posting_date ?? doc.transaction_date;
      setPostingDate(typeof pd === 'string' ? pd.slice(0, 10) : '');
    });
  }, [doc]);

  const buildPatch = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    if (doctype === 'Journal Entry') {
      if (title !== String(doc.title ?? '')) patch.title = title;
      if (userRemark !== String(doc.user_remark ?? '')) patch.user_remark = userRemark;
      if (postingDate && postingDate !== String(doc.posting_date ?? '').slice(0, 10)) patch.posting_date = postingDate;
    } else if (doctype === 'Expense Claim') {
      if (remark !== String(doc.remark ?? '')) patch.remark = remark;
      if (postingDate && postingDate !== String(doc.posting_date ?? '').slice(0, 10)) patch.posting_date = postingDate;
    } else if (doctype === 'Payment Entry') {
      if (referenceNo !== String(doc.reference_no ?? '')) patch.reference_no = referenceNo;
      if (postingDate && postingDate !== String(doc.posting_date ?? '').slice(0, 10)) patch.posting_date = postingDate;
    } else if (doctype === 'Sales Invoice' || doctype === 'Purchase Invoice') {
      if (terms !== String(doc.terms ?? '')) patch.terms = terms;
    }
    return patch;
  };

  const save = () => {
    const patch = buildPatch();
    if (!Object.keys(patch).length) {
      toast.success('لا تغييرات');
      return;
    }
    updateMut.mutate(
      { name, doc: patch },
      {
        onSuccess: () => {
          toast.success('تم تحديث المسودة');
          onSaved();
        },
        onError: (e) =>
          toast.error('تعذر الحفظ', { description: (e as Error).message }),
      }
    );
  };

  const showJournal = doctype === 'Journal Entry';
  const showExpense = doctype === 'Expense Claim';
  const showPayment = doctype === 'Payment Entry';
  const showTerms = doctype === 'Sales Invoice' || doctype === 'Purchase Invoice';

  if (!showJournal && !showExpense && !showPayment && !showTerms) return null;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          تعديل المسودة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {showJournal && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">العنوان</Label>
              <Input className="h-9 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات المستخدم</Label>
              <Textarea className="text-sm min-h-[60px]" value={userRemark} onChange={(e) => setUserRemark(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ الترحيل</Label>
              <Input type="date" dir="ltr" className="h-9" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
          </>
        )}
        {showExpense && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea className="text-sm min-h-[60px]" value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ الترحيل</Label>
              <Input type="date" dir="ltr" className="h-9" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
          </>
        )}
        {showPayment && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">رقم المرجع</Label>
              <Input className="h-9 text-sm" dir="ltr" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ الترحيل</Label>
              <Input type="date" dir="ltr" className="h-9" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
          </>
        )}
        {showTerms && (
          <div className="space-y-1">
            <Label className="text-xs">الشروط والملاحظات</Label>
            <Textarea className="text-sm min-h-[80px]" value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        )}
        <Button type="button" size="sm" disabled={updateMut.isPending} onClick={save}>
          {updateMut.isPending ? 'جاري الحفظ…' : 'حفظ التعديلات'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DocDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const rawName = String(params.name ?? '');
  const [printing, setPrinting] = useState(false);
  const name = useMemo(() => {
    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  }, [rawName]);

  const doctype = docTypeFromSlug(slug);

  const doc = useDoc<Record<string, unknown>>(doctype ?? 'Sales Invoice', name, {
    enabled: Boolean(doctype && name),
  });
  const glEnabled = Boolean(doctype && name && Number(doc.data?.docstatus) === 1);
  const gl = useDocList<GlRow>('GL Entry', {
    fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'party_type', 'party', 'voucher_detail_no'],
    filters: [
      ['voucher_no', '=', name],
      ['voucher_type', '=', doctype || ''],
    ],
    limit: 200,
    order_by: 'creation asc',
    enabled: Boolean(doctype && name && glEnabled),
  });

  const glColumns: Column<GlRow>[] = useMemo(
    () => [
      { key: 'account', header: 'الحساب', width: 'w-36', render: (v) => <span className="font-mono text-[11px]" dir="ltr">{String(v)}</span> },
      { key: 'party', header: 'الطرف', render: (_v, r) => (r.party ? `${String(r.party_type || '')}: ${String(r.party)}` : '—') },
      {
        key: 'debit',
        header: 'مدين',
        render: (v) => <span className="tabular-nums text-blue-600 font-medium">{formatCurrency(Number(v ?? 0))}</span>,
      },
      {
        key: 'credit',
        header: 'دائن',
        render: (v) => <span className="tabular-nums text-orange-600 font-medium">{formatCurrency(Number(v ?? 0))}</span>,
      },
      { key: 'posting_date', header: 'التاريخ', render: (v) => formatDate(String(v ?? '')) },
    ],
    []
  );

  const handlePrint = async () => {
    if (!doctype || !name) return;
    setPrinting(true);
    try {
      await printDocument({ doctype, name });
    } catch {
      // Fallback: use window.print() with print CSS
      document.body.classList.add('erp-printing');
      window.print();
      document.body.classList.remove('erp-printing');
    } finally {
      setPrinting(false);
    }
  };

  if (!doctype) {
    return (
      <div className="erp-page-enter p-6" dir="rtl">
        <p className="text-sm text-muted-foreground">نوع المستند غير معروف.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/">العودة للوحة</Link>
        </Button>
      </div>
    );
  }

  const d = doc.data;
  const listBack =
    slug === 'sales-invoice'
      ? '/sales/sales-invoices'
      : slug === 'purchase-invoice'
        ? '/purchases/purchase-invoices'
        : slug === 'journal-entry'
          ? '/accounting/journal-entry'
          : slug === 'payment-entry'
            ? '/accounting/payment-entry'
            : slug === 'sales-order'
              ? '/sales/sales-orders'
              : slug === 'expense-claim'
                ? '/accounting/expenses'
                : slug === 'contract'
                  ? '/operations/rentals'
                  : '/purchases/purchase-orders';

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title={name}
        description={`${DOCTYPE_AR[doctype] || doctype} — عرض تفصيلي وقيود دفتر الأستاذ`}
        iconify="solar:documents-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'المستندات', href: listBack },
          { label: name },
        ]}
        actions={
          <div className="flex gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrint}
              disabled={printing}
            >
              <Printer className="h-3.5 w-3.5" />
              {printing ? 'جاري التحضير…' : 'طباعة'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={listBack}>
                <ArrowRight className="h-3.5 w-3.5" />
                القائمة
              </Link>
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={doc.isError ? (doc.error as Error) : null} onRetry={() => void doc.refetch()} />

      {doc.isLoading && <p className="text-sm text-muted-foreground">جاري تحميل المستند…</p>}

      {d && Number(d.docstatus) === 0 && doctype && (
        <DraftEditCard doctype={doctype} name={name} doc={d} onSaved={() => void doc.refetch()} />
      )}

      {d && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                رأس المستند
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">الحالة</span>
                {d.status != null ? <StatusBadge status={String(d.status)} /> : <DocStatusBadge docstatus={Number(d.docstatus) as 0 | 1 | 2} />}
              </div>
              {(d.posting_date != null || d.transaction_date != null) && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span dir="ltr">{formatDate(String(d.posting_date ?? d.transaction_date ?? ''))}</span>
                </div>
              )}
              {d.customer_name != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">العميل</span>
                  <span>{String(d.customer_name)}</span>
                </div>
              )}
              {d.supplier_name != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">المورد</span>
                  <span>{String(d.supplier_name)}</span>
                </div>
              )}
              {(d.party_name != null || d.party != null) && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الطرف</span>
                  <span className="text-start">
                    {String(d.party_name ?? d.party ?? '')}
                    {d.party_type != null ? (
                      <span className="text-muted-foreground me-1"> ({String(d.party_type)})</span>
                    ) : null}
                  </span>
                </div>
              )}
              {(d.start_date != null || d.end_date != null) && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">مدة العقد</span>
                  <span className="tabular-nums" dir="ltr">
                    {d.start_date != null ? String(d.start_date).slice(0, 10) : '—'} —{' '}
                    {d.end_date != null ? String(d.end_date).slice(0, 10) : '—'}
                  </span>
                </div>
              )}
              {(d.grand_total != null || d.base_grand_total != null) && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الإجمالي</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(Number(d.grand_total ?? d.base_grand_total ?? 0))}
                  </span>
                </div>
              )}
              {d.total_debit != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">مدين / دائن</span>
                  <span className="tabular-nums" dir="ltr">
                    {formatCurrency(Number(d.total_debit ?? 0))} / {formatCurrency(Number(d.total_credit ?? 0))}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">بنود</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px] pe-3">
                {Array.isArray(d.items) && (d.items as unknown[]).length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {(d.items as Record<string, unknown>[]).map((row, i) => (
                      <li key={i} className="rounded-lg border border-border/40 p-2">
                        <span className="font-medium">{String(row.item_code ?? row.item_name ?? '—')}</span>
                        <span className="text-muted-foreground mx-1">×</span>
                        <span className="tabular-nums">{Number(row.qty ?? 0)}</span>
                        {row.rate != null && (
                          <span className="text-muted-foreground me-2">@ {formatCurrency(Number(row.rate))}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">لا بنود جدولية أو المستند لا يحتوي `items`.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            قيود دفتر الأستاذ (GL)
            {!glEnabled && d && (
              <span className="text-xs font-normal text-muted-foreground">(تظهر بعد ترحيل المستند)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListQueryAlert error={gl.isError ? (gl.error as Error) : null} onRetry={() => void gl.refetch()} />
          <DataTable data={gl.data || []} columns={glColumns} loading={gl.isLoading} searchable pageSize={15} />
        </CardContent>
      </Card>

      {doctype && name && (
        <DocumentComments doctype={doctype} docname={name} />
      )}

      {doctype && name && (
        <VersionHistory doctype={doctype} docname={name} />
      )}
    </div>
  );
}

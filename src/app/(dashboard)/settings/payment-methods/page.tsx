'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, CreditCard, Banknote, Smartphone, Building2, Loader2, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useDoc } from '@/lib/client/hooks';
import { buildModeOfPaymentCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';

interface ModeOfPaymentAccountRow {
  company: string;
  default_account: string;
}

interface ModeOfPaymentRow {
  name: string;
  mode_of_payment: string;
  type: string;
  enabled: number | boolean;
}

interface ModeOfPaymentFullDoc {
  name: string;
  mode_of_payment: string;
  type: string;
  enabled: number | boolean;
  accounts: ModeOfPaymentAccountRow[];
}

const typeColorsAr: Record<string, string> = {
  'Cash': 'bg-green-500/10 text-green-600',
  'نقدي': 'bg-green-500/10 text-green-600',
  'Bank': 'bg-blue-500/10 text-blue-600',
  'بنكي': 'bg-blue-500/10 text-blue-600',
  'Electronic': 'bg-purple-500/10 text-purple-600',
  'إلكتروني': 'bg-purple-500/10 text-purple-600',
  'General': 'bg-amber-500/10 text-amber-600',
  'عام': 'bg-amber-500/10 text-amber-600',
};

const typeIconsAr: Record<string, React.ComponentType<{ className?: string }>> = {
  'Cash': Banknote,
  'نقدي': Banknote,
  'Bank': Building2,
  'بنكي': Building2,
  'Electronic': Smartphone,
  'إلكتروني': Smartphone,
  'General': CreditCard,
  'عام': CreditCard,
};

const typeLabelAr: Record<string, string> = {
  'Cash': 'نقدي',
  'Bank': 'بنكي',
  'Electronic': 'إلكتروني',
  'General': 'عام',
};

const emptyForm = { name: '', type: 'Cash' as string, enabled: true };

export default function PaymentMethodsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ModeOfPaymentRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { company: defaultCompany } = useDefaultCompanyName();

  /* ──── ERPNext data hooks ──── */
  const { data, isLoading, isError, error, refetch } = useDocList<ModeOfPaymentRow>('Mode of Payment', {
    fields: ['name', 'type', 'enabled'],
    limit: 200,
  });

  const createMutation = useCreateDoc('Mode of Payment');
  const updateMutation = useUpdateDoc('Mode of Payment');
  const deleteMutation = useDeleteDoc('Mode of Payment');

  /* ──── Full doc fetch for account linking dialog ──── */
  const { data: fullDoc, isLoading: fullDocLoading } = useDoc<ModeOfPaymentFullDoc>(
    'Mode of Payment',
    selected?.name || '',
    { enabled: accountsDialogOpen && Boolean(selected?.name) },
  );

  const [editedAccounts, setEditedAccounts] = useState<ModeOfPaymentAccountRow[] | null>(null);

  const methods = data || [];

  /* ──── Compute account rows from fullDoc ──── */
  const initialAccountRows = useMemo<ModeOfPaymentAccountRow[]>(() => {
    if (fullDoc && Array.isArray(fullDoc.accounts) && fullDoc.accounts.length > 0) {
      return fullDoc.accounts.map((a: ModeOfPaymentAccountRow) => ({
        company: a.company || '',
        default_account: a.default_account || '',
      }));
    }
    return [{ company: defaultCompany || '', default_account: '' }];
  }, [fullDoc, defaultCompany]);

  const accountRows = editedAccounts ?? initialAccountRows;

  /* ──── Create handler ──── */
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('خطأ', { description: 'يرجى إدخال اسم طريقة الدفع' });
      return;
    }
    try {
      const doc = buildModeOfPaymentCreate({
        mode_of_payment: formData.name.trim(),
        type: formData.type as 'Cash' | 'Bank' | 'Electronic' | 'General',
        enabled: formData.enabled,
      });
      await createMutation.mutateAsync(doc);
      toast.success('تم بنجاح', { description: 'تم إضافة طريقة الدفع بنجاح' });
      setDialogOpen(false);
      setFormData(emptyForm);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('خطأ', { description: msg });
    }
  };

  /* ──── Toggle enabled ──── */
  const handleToggleEnabled = async (row: ModeOfPaymentRow) => {
    try {
      const newVal = Boolean(row.enabled) ? 0 : 1;
      await updateMutation.mutateAsync({ name: row.name, doc: { enabled: newVal } });
      toast.success('تم بنجاح', { description: Boolean(row.enabled) ? 'تم تعطيل طريقة الدفع' : 'تم تفعيل طريقة الدفع' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('خطأ', { description: msg });
    }
  };

  /* ──── Delete handler ──── */
  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteMutation.mutateAsync(selected.name);
      toast.success('تم بنجاح', { description: 'تم حذف طريقة الدفع بنجاح' });
      setDeleteDialogOpen(false);
      setSelected(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('خطأ', { description: msg });
    }
  };

  /* ──── Account linking handlers ──── */
  const openAccountsDialog = (row: ModeOfPaymentRow) => {
    setSelected(row);
    setEditedAccounts(null);
    setAccountsDialogOpen(true);
  };

  const addAccountRow = () => {
    setEditedAccounts((prev) => [...(prev ?? accountRows), { company: '', default_account: '' }]);
  };

  const removeAccountRow = (index: number) => {
    setEditedAccounts((prev) => (prev ?? accountRows).filter((_, i) => i !== index));
  };

  const updateAccountRow = (index: number, field: keyof ModeOfPaymentAccountRow, value: string) => {
    setEditedAccounts((prev) => {
      const base = prev ?? accountRows;
      const updated = [...base];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const saveAccounts = async () => {
    if (!selected) return;
    const validRows = accountRows.filter((r) => r.company?.trim() && r.default_account?.trim());
    try {
      await updateMutation.mutateAsync({
        name: selected.name,
        doc: {
          accounts: validRows.map((r) => ({
            company: r.company.trim(),
            default_account: r.default_account.trim(),
          })),
        },
      });
      toast.success('تم بنجاح', { description: 'تم حفظ حسابات طريقة الدفع' });
      setAccountsDialogOpen(false);
      setSelected(null);
      setEditedAccounts(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('خطأ', { description: msg });
    }
  };

  /* ──── Stats ──── */
  const cashCount = methods.filter(m => m.type === 'Cash').length;
  const bankCount = methods.filter(m => m.type === 'Bank').length;
  const electronicCount = methods.filter(m => m.type === 'Electronic').length;

  /* ──── Columns ──── */
  const columns: Column<ModeOfPaymentRow>[] = [
    { key: 'name', header: 'طريقة الدفع', sortable: true, render: (_, row) => {
      const typeKey = row.type || 'Cash';
      const Icon = typeIconsAr[typeKey] || Banknote;
      return (
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium">{row.name}</span>
        </div>
      );
    }},
    { key: 'type', header: 'النوع', sortable: true, render: (value) => {
      const type = String(value);
      const Icon = typeIconsAr[type] || Banknote;
      const color = typeColorsAr[type] || 'bg-secondary';
      return <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 border-0 gap-1 ${color}`}><Icon className="h-3 w-3" />{typeLabelAr[type] || type}</Badge>;
    }},
    { key: 'enabled', header: 'الحالة', sortable: true, render: (value) => {
      const enabled = Boolean(value);
      return <Badge variant="outline" className={`text-[10px] border-0 ${enabled ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>{enabled ? 'مفعّل' : 'معطّل'}</Badge>;
    }},
  ];

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="طرق الدفع"
        description="إدارة طرق الدفع المتاحة في النظام"
        iconify="solar:card-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'طرق الدفع' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            طريقة دفع جديدة
          </Button>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><CreditCard className="h-4 w-4 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground">إجمالي الطرق</p><p className="text-sm font-bold mt-0.5">{methods.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"><Banknote className="h-4 w-4 text-green-600" /></div>
          <div><p className="text-[10px] text-muted-foreground">نقدي</p><p className="text-sm font-bold mt-0.5">{cashCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-blue-600" /></div>
          <div><p className="text-[10px] text-muted-foreground">بنكي</p><p className="text-sm font-bold mt-0.5">{bankCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"><Smartphone className="h-4 w-4 text-purple-600" /></div>
          <div><p className="text-[10px] text-muted-foreground">إلكتروني</p><p className="text-sm font-bold mt-0.5">{electronicCount}</p></div>
        </CardContent></Card>
      </div>

      <DataTable
        data={methods}
        columns={columns}
        searchable
        loading={isLoading}
        onView={(row) => openAccountsDialog(row)}
        onEdit={(row) => handleToggleEnabled(row)}
        onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة طريقة دفع جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">اسم طريقة الدفع *</Label>
              <Input placeholder="مثال: تحويل بنكي" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">النوع</Label>
              <Select value={formData.type} onValueChange={val => setFormData(prev => ({ ...prev, type: val }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">نقدي (Cash)</SelectItem>
                  <SelectItem value="Bank">بنكي (Bank)</SelectItem>
                  <SelectItem value="Electronic">إلكتروني (Electronic)</SelectItem>
                  <SelectItem value="General">عام (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pm-enabled"
                checked={formData.enabled}
                onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="pm-enabled" className="text-xs font-medium cursor-pointer">مفعّل</Label>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري الحفظ...</> : 'حفظ طريقة الدفع'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Linking Dialog */}
      <Dialog open={accountsDialogOpen} onOpenChange={setAccountsDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              ربط الحسابات — {selected?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              ربط حساب بنكي/نقدي بكل شركة لطريقة الدفع هذه. مطلوب لتشغيل نقاط البيع (POS).
            </p>

            {fullDocLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تحميل البيانات...
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-2 text-xs font-semibold">
                  <div className="col-span-5">الشركة</div>
                  <div className="col-span-5">الحساب الافتراضي</div>
                  <div className="col-span-2" />
                </div>
                {accountRows.map((row, idx) => (
                  <div key={idx} className="px-3 py-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b last:border-b-0">
                    <div className="md:col-span-5">
                      <ErpLinkCombobox
                        doctype="Company"
                        value={row.company}
                        onChange={(v) => updateAccountRow(idx, 'company', v)}
                        placeholder="اختر الشركة..."
                        className="h-8 text-xs"
                        showCreateShortcut={false}
                      />
                    </div>
                    <div className="md:col-span-5">
                      <ErpLinkCombobox
                        doctype="Account"
                        value={row.default_account}
                        onChange={(v) => updateAccountRow(idx, 'default_account', v)}
                        placeholder="اختر الحساب..."
                        className="h-8 text-xs"
                        showCreateShortcut={false}
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-center">
                      {accountRows.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeAccountRow(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2 flex justify-center">
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addAccountRow}>
                    <Plus className="h-3 w-3" />
                    إضافة شركة
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setAccountsDialogOpen(false)} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button onClick={saveAccounts} disabled={updateMutation.isPending || fullDocLoading} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...</> : <>
                <Link2 className="h-3.5 w-3.5" />
                حفظ الحسابات
              </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف طريقة الدفع &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

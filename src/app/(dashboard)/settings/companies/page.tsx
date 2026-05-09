'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Plus,
  Edit,
  Star,
  Globe,
  DollarSign,
  FileText,
  Phone,
  Mail,
  Calendar,
  Hash,
  Landmark,
  Loader2,
} from 'lucide-react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useUpdateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================
interface CompanyDoc {
  name: string;
  abbr?: string;
  country?: string;
  default_currency?: string;
  chart_of_accounts?: string;
  tax_id?: string;
  date_of_establishment?: string;
  company_email?: string;
  company_phone?: string;
  fax?: string;
  website?: string;
  letter_head?: string;
  terms_and_conditions?: string;
}

const COMPANY_FIELDS = [
  'name', 'abbr', 'country', 'default_currency', 'chart_of_accounts',
  'tax_id', 'date_of_establishment',
  'company_email', 'company_phone', 'fax', 'website',
  'letter_head', 'terms_and_conditions',
];

const COUNTRIES = [
  { value: 'Yemen', label: 'اليمن' },
  { value: 'Saudi Arabia', label: 'المملكة العربية السعودية' },
  { value: 'United Arab Emirates', label: 'الإمارات العربية المتحدة' },
  { value: 'Egypt', label: 'مصر' },
  { value: 'Jordan', label: 'الأردن' },
  { value: 'Kuwait', label: 'الكويت' },
  { value: 'Qatar', label: 'قطر' },
  { value: 'Bahrain', label: 'البحرين' },
  { value: 'Oman', label: 'عُمان' },
  { value: 'Iraq', label: 'العراق' },
];

const CURRENCIES = [
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'JOD', label: 'دينار أردني (JOD)' },
  { value: 'KWD', label: 'دينار كويتي (KWD)' },
  { value: 'QAR', label: 'ريال قطري (QAR)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
];

const CHART_OF_ACCOUNTS_OPTIONS = [
  { value: 'Standard', label: 'معيارية (Standard)' },
  { value: 'Standard with Numbers', label: 'معيارية مرقمة' },
];

// ============================================================
// Helpers
// ============================================================
function generateAbbr(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 5).toUpperCase();
}

function getDefaultCompanyFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem('erp_default_company');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
    }
  } catch { /* ignore */ }
  return '';
}

function setDefaultCompanyToStorage(name: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('erp_default_company', JSON.stringify(name));
}

// ============================================================
// Empty form
// ============================================================
const emptyForm = {
  company_name: '',
  abbr: '',
  country: 'Yemen',
  default_currency: 'YER',
  chart_of_accounts: 'Standard',
  tax_id: '',
  date_of_establishment: '',
  company_email: '',
  company_phone: '',
  fax: '',
  website: '',
  letter_head: '',
  terms_and_conditions: '',
};

type CompanyForm = typeof emptyForm;

// ============================================================
// Page Component
// ============================================================
export default function CompaniesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyForm>({ ...emptyForm });
  const [selectedCompany, setSelectedCompany] = useState<CompanyDoc | null>(null);
  const [defaultCompany, setDefaultCompany] = useState(() => getDefaultCompanyFromStorage());
  const [saving, setSaving] = useState(false);

  // ---- Data hooks ----
  const companiesQuery = useDocList<CompanyDoc>('Company', {
    fields: COMPANY_FIELDS,
    limit: 100,
    order_by: 'name asc',
  });
  const createMutation = useCreateDoc('Company');
  const updateMutation = useUpdateDoc('Company');

  const companies = companiesQuery.data || [];
  const isLoading = companiesQuery.isLoading;

  // ---- Resolved default company ----
  const resolvedDefault = useMemo(() => {
    if (defaultCompany && companies.some(c => c.name === defaultCompany)) return defaultCompany;
    if (companies.length > 0) return companies[0].name;
    return '';
  }, [defaultCompany, companies]);

  // ---- Stats ----
  const totalCompanies = companies.length;
  const countrySet = new Set(companies.map(c => c.country).filter(Boolean));
  const uniqueCountries = countrySet.size;

  // ---- Handlers ----
  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      company_name: value,
      abbr: generateAbbr(value),
    }));
  }, []);

  const handleSetDefault = useCallback((name: string) => {
    setDefaultCompany(name);
    setDefaultCompanyToStorage(name);
    toast.success('تم التحديث', { description: `تم تعيين "${name}" كشركة افتراضية` });
  }, [toast]);

  const handleOpenCreate = useCallback(() => {
    setFormData({ ...emptyForm });
    setCreateDialogOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formData.company_name.trim()) {
      toast.error('خطأ', { description: 'يرجى إدخال اسم الشركة' });
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        doctype: 'Company',
        company_name: formData.company_name,
        abbr: formData.abbr || generateAbbr(formData.company_name),
        country: formData.country,
        default_currency: formData.default_currency,
        chart_of_accounts: formData.chart_of_accounts,
        ...(formData.tax_id ? { tax_id: formData.tax_id } : {}),
        ...(formData.date_of_establishment ? { date_of_establishment: formData.date_of_establishment } : {}),
        ...(formData.company_email ? { company_email: formData.company_email } : {}),
        ...(formData.company_phone ? { company_phone: formData.company_phone } : {}),
        ...(formData.fax ? { fax: formData.fax } : {}),
        ...(formData.website ? { website: formData.website } : {}),
      });
      toast.success('تم بنجاح', { description: 'تم إنشاء الشركة بنجاح' });
      setCreateDialogOpen(false);
      setFormData({ ...emptyForm });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الشركة';
      toast.error('فشل', { description: msg });
    } finally {
      setSaving(false);
    }
  }, [formData, createMutation, toast]);

  const handleOpenEdit = useCallback((company: CompanyDoc) => {
    setSelectedCompany(company);
    setFormData({
      company_name: company.name,
      abbr: company.abbr || '',
      country: company.country || 'Yemen',
      default_currency: company.default_currency || 'YER',
      chart_of_accounts: company.chart_of_accounts || 'Standard',
      tax_id: company.tax_id || '',
      date_of_establishment: company.date_of_establishment || '',
      company_email: company.company_email || '',
      company_phone: company.company_phone || '',
      fax: company.fax || '',
      website: company.website || '',
      letter_head: company.letter_head || '',
      terms_and_conditions: company.terms_and_conditions || '',
    });
    setEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        name: selectedCompany.name,
        doc: {
          country: formData.country,
          default_currency: formData.default_currency,
          ...(formData.tax_id ? { tax_id: formData.tax_id } : {}),
          ...(formData.date_of_establishment ? { date_of_establishment: formData.date_of_establishment } : {}),
          ...(formData.company_email ? { company_email: formData.company_email } : {}),
          ...(formData.company_phone ? { company_phone: formData.company_phone } : {}),
          ...(formData.fax ? { fax: formData.fax } : {}),
          ...(formData.website ? { website: formData.website } : {}),
          ...(formData.terms_and_conditions ? { terms_and_conditions: formData.terms_and_conditions } : {}),
        },
      });
      toast.success('تم بنجاح', { description: 'تم تحديث بيانات الشركة' });
      setEditDialogOpen(false);
      setSelectedCompany(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الشركة';
      toast.error('فشل', { description: msg });
    } finally {
      setSaving(false);
    }
  }, [selectedCompany, formData, updateMutation, toast]);

  const handleViewDetails = useCallback((company: CompanyDoc) => {
    setSelectedCompany(company);
    setDetailDialogOpen(true);
  }, []);

  // ---- Render helpers ----
  const countryLabel = (val?: string) => {
    const found = COUNTRIES.find(c => c.value === val);
    return found ? found.label : val || '—';
  };
  const currencyLabel = (val?: string) => {
    const found = CURRENCIES.find(c => c.value === val);
    return found ? found.label : val || '—';
  };

  // ============================================================
  // Form fields (shared between create & edit dialogs)
  // ============================================================
  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-5">
      {/* Basic info */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">المعلومات الأساسية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">اسم الشركة *</Label>
            <Input
              placeholder="مثال: شركة الأمل التجارية"
              value={formData.company_name}
              onChange={e => isEdit ? setFormData(p => ({ ...p, company_name: e.target.value })) : handleNameChange(e.target.value)}
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">الاختصار</Label>
            <Input
              placeholder="مثال: أمل"
              value={formData.abbr}
              onChange={e => setFormData(p => ({ ...p, abbr: e.target.value }))}
              disabled={isEdit}
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">الدولة</Label>
            <Select value={formData.country} onValueChange={val => setFormData(p => ({ ...p, country: val }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">العملة الافتراضية</Label>
            <Select value={formData.default_currency} onValueChange={val => setFormData(p => ({ ...p, default_currency: val }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">شجرة الحسابات</Label>
            <Select value={formData.chart_of_accounts} onValueChange={val => setFormData(p => ({ ...p, chart_of_accounts: val }))} disabled={isEdit}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_OF_ACCOUNTS_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Registration */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">معلومات التسجيل</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">الرقم الضريبي</Label>
            <Input placeholder="رقم الضريبة" value={formData.tax_id} onChange={e => setFormData(p => ({ ...p, tax_id: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">رقم التسجيل</Label>
            <Input placeholder="رقم السجل التجاري" value={formData.tax_id} onChange={e => setFormData(p => ({ ...p, tax_id: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">تاريخ التأسيس</Label>
            <Input type="date" value={formData.date_of_establishment} onChange={e => setFormData(p => ({ ...p, date_of_establishment: e.target.value }))} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">معلومات الاتصال</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">البريد الإلكتروني</Label>
            <Input type="email" placeholder="info@example.com" dir="ltr" value={formData.company_email} onChange={e => setFormData(p => ({ ...p, company_email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">الهاتف</Label>
            <Input placeholder="01XXXXXXXX" dir="ltr" value={formData.company_phone} onChange={e => setFormData(p => ({ ...p, company_phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">الفاكس</Label>
            <Input placeholder="رقم الفاكس" dir="ltr" value={formData.fax} onChange={e => setFormData(p => ({ ...p, fax: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">الموقع الإلكتروني</Label>
            <Input placeholder="https://example.com" dir="ltr" value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Terms - only in edit */}
      {isEdit && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">الشروط والأحكام</h3>
            <div className="space-y-2">
              <Label className="text-xs font-medium">الشروط الافتراضية</Label>
              <Textarea
                placeholder="الشروط والأحكام الافتراضية للشركة..."
                rows={4}
                value={formData.terms_and_conditions}
                onChange={e => setFormData(p => ({ ...p, terms_and_conditions: e.target.value }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ============================================================
  // Render
  // ============================================================
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إدارة الشركات"
        description="إدارة سجلات الشركات في النظام — إنشاء وتعديل وتعيين الشركة الافتراضية"
        iconify="solar:buildings-3-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الشركات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            شركة جديدة
          </Button>
        }
      />

      {/* Stats KPIs */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي الشركات"
          value={totalCompanies}
          icon={Building2}
          accent="primary"
          compact
        />
        <KpiCard
          title="الشركة الافتراضية"
          value={resolvedDefault || '—'}
          icon={Star}
          accent="warning"
          compact
          description={resolvedDefault ? 'الشركة النشطة حالياً' : 'لم يتم تعيين شركة'}
        />
        <KpiCard
          title="الدول"
          value={uniqueCountries}
          icon={Globe}
          accent="info"
          compact
          description="عدد الدول المسجلة"
        />
      </KpiStrip>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">جاري تحميل بيانات الشركات...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && companies.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">لا توجد شركات</h3>
            <p className="text-sm text-muted-foreground mb-4">لم يتم إضافة أي شركة بعد. ابدأ بإنشاء شركتك الأولى.</p>
            <Button size="sm" className="gap-1.5" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" />
              شركة جديدة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Company Cards Grid */}
      {!isLoading && companies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map(company => {
            const isDefault = company.name === resolvedDefault;
            return (
              <Card
                key={company.name}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer group ${
                  isDefault
                    ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10 ring-1 ring-amber-400/30'
                    : 'border-border/50 hover:border-border'
                }`}
                onClick={() => handleViewDetails(company)}
              >
                {/* Default badge */}
                {isDefault && (
                  <div className="absolute top-0 start-0 end-0 h-1 bg-gradient-to-l from-amber-400 to-amber-500" />
                )}

                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDefault
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">{company.name}</CardTitle>
                        {company.abbr && (
                          <span className="text-[11px] text-muted-foreground font-mono">({company.abbr})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isDefault && (
                        <Badge variant="outline" className="text-[10px] border-amber-400/50 bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          الافتراضية
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 pt-0 space-y-2.5">
                  {/* Info rows */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span className="truncate">{countryLabel(company.country)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3 w-3 shrink-0" />
                      <span className="truncate">{company.default_currency || '—'}</span>
                    </div>
                    {company.chart_of_accounts && (
                      <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">شجرة الحسابات: {company.chart_of_accounts}</span>
                      </div>
                    )}
                    {company.tax_id && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="h-3 w-3 shrink-0" />
                        <span className="truncate" dir="ltr">{company.tax_id}</span>
                      </div>
                    )}
                    {company.company_phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate" dir="ltr">{company.company_phone}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="!my-2" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1 flex-1"
                      onClick={e => { e.stopPropagation(); handleOpenEdit(company); }}
                    >
                      <Edit className="h-3 w-3" />
                      تعديل
                    </Button>
                    {!isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1 flex-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        onClick={e => { e.stopPropagation(); handleSetDefault(company.name); }}
                      >
                        <Star className="h-3 w-3" />
                        تعيين كافتراضية
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== Create Dialog ========== */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              إنشاء شركة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderFormFields(false)}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              إنشاء الشركة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Edit Dialog ========== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Edit className="h-4 w-4 text-primary" />
              </div>
              تعديل بيانات الشركة
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderFormFields(true)}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Detail Dialog ========== */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              تفاصيل الشركة
            </DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="py-4 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedCompany.name === resolvedDefault
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCompany.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedCompany.abbr && (
                      <Badge variant="secondary" className="text-[11px] font-mono">{selectedCompany.abbr}</Badge>
                    )}
                    {selectedCompany.name === resolvedDefault && (
                      <Badge variant="outline" className="text-[11px] border-amber-400/50 bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        الشركة الافتراضية
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Basic info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-primary">المعلومات الأساسية</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailRow icon={Globe} label="الدولة" value={countryLabel(selectedCompany.country)} />
                  <DetailRow icon={DollarSign} label="العملة" value={currencyLabel(selectedCompany.default_currency)} />
                  <DetailRow icon={FileText} label="شجرة الحسابات" value={selectedCompany.chart_of_accounts} />
                  <DetailRow icon={Landmark} label="الرقم الضريبي" value={selectedCompany.tax_id} />
                  <DetailRow icon={Hash} label="رقم التسجيل" value={selectedCompany.tax_id} />
                  <DetailRow icon={Calendar} label="تاريخ التأسيس" value={selectedCompany.date_of_establishment} />
                </div>
              </div>

              <Separator />

              {/* Contact info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-primary">معلومات الاتصال</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailRow icon={Mail} label="البريد الإلكتروني" value={selectedCompany.company_email} dir="ltr" />
                  <DetailRow icon={Phone} label="الهاتف" value={selectedCompany.company_phone} dir="ltr" />
                  <DetailRow icon={Phone} label="الفاكس" value={selectedCompany.fax} dir="ltr" />
                  <DetailRow icon={Globe} label="الموقع" value={selectedCompany.website} dir="ltr" />
                </div>
              </div>

              {selectedCompany.terms_and_conditions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-primary">الشروط والأحكام</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                      {selectedCompany.terms_and_conditions}
                    </p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setDetailDialogOpen(false); handleOpenEdit(selectedCompany); }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                {selectedCompany.name !== resolvedDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-amber-600 border-amber-400/40 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={() => { handleSetDefault(selectedCompany.name); setDetailDialogOpen(false); }}
                  >
                    <Star className="h-3.5 w-3.5" />
                    تعيين كافتراضية
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Detail Row sub-component
// ============================================================
function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  dir?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate" dir={dir}>{value || '—'}</p>
      </div>
    </div>
  );
}

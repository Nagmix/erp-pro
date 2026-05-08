/**
 * إعدادات التطبيق الرئيسية — مزامنة مع ERPNext
 *
 * يربط مفاتيح واجهة المستخدم بحقول DocTypes في ERPNext:
 *   - عَام ← Company + System Settings
 *   - المحاسبة ← Accounts Settings + System Settings
 *   - المبيعات ← Selling Settings
 *   - المشتريات ← Buying Settings
 *   - المخزون ← Stock Settings
 *   - الموارد البشرية ← HR Settings
 *   - الطباعة ← Print Settings
 *
 * عند عدم توفر ERPNext يُستخدم ملف JSON محلي كاحتياطي.
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, getList, isBackendAvailable } from '@/lib/server/backend';

// ─── أنواع ────────────────────────────────────────────────────────

export type AppSettings = {
  // عَام
  companyName: string;
  currency: string;
  country: string;
  timezone: string;
  // المحاسبة
  defaultCompany: string;
  fiscalYear: string;
  autoAccountRouting: boolean;
  // المبيعات
  invoiceTemplate: string;
  posEnabled: boolean;
  posWarehouse: string;
  // المشتريات
  autoReceive: boolean;
  purchaseNumbering: string;
  // المخزون
  defaultWarehouse: string;
  valuationMethod: string;
  reorderLevel: string;
  // الموارد البشرية
  workingHours: string;
  overtimeRate: string;
  penaltyEnabled: boolean;
  // الطباعة
  printTemplate: string;
  paperSize: string;
};

export type AppSettingsSection = keyof typeof sectionDoctypeMap;

// ─── القيم الافتراضية ──────────────────────────────────────────────

export const defaultAppSettings: AppSettings = {
  companyName: 'شركة النور التجارية',
  currency: 'YER',
  country: 'YE',
  timezone: 'Asia/Aden',
  defaultCompany: 'شركة النور التجارية',
  fiscalYear: new Date().getFullYear().toString(),
  autoAccountRouting: true,
  invoiceTemplate: 'standard',
  posEnabled: true,
  posWarehouse: 'المستودع الرئيسي',
  autoReceive: true,
  purchaseNumbering: 'auto',
  defaultWarehouse: 'المستودع الرئيسي',
  valuationMethod: 'FIFO',
  reorderLevel: '10',
  workingHours: '8',
  overtimeRate: '1.5',
  penaltyEnabled: true,
  printTemplate: 'Standard',
  paperSize: 'A4',
};

// ─── خريطة الأقسام ↔ DocTypes ────────────────────────────────────

const sectionDoctypeMap = {
  general: ['System Settings', 'Company'] as const,
  accounting: ['Accounts Settings', 'System Settings'] as const,
  sales: ['Selling Settings'] as const,
  purchases: ['Buying Settings'] as const,
  inventory: ['Stock Settings'] as const,
  hr: ['HR Settings'] as const,
  printing: ['Print Settings'] as const,
};

// ─── خريطة مفتاح واجهة المستخدم → حقل ERPNext ──────────────────

type FieldMapping = {
  doctype: string;
  field: string;
  /** دالة تحويل قيمة ERPNext إلى قيمة الواجهة */
  fromErp: (v: unknown) => unknown;
  /** دالة تحويل قيمة الواجهة إلى قيمة ERPNext */
  toErp: (v: unknown) => unknown;
};

const boolFromErp = (v: unknown): boolean => v === 1 || v === true;
const boolToErp = (v: unknown): number => (v ? 1 : 0);
const strFromErp = (v: unknown): string => (v == null ? '' : String(v));
const strToErp = (v: unknown): string => String(v ?? '');

const fieldMappings: Record<keyof AppSettings, FieldMapping> = {
  // عَام
  companyName:   { doctype: 'Company',          field: 'company_name',    fromErp: strFromErp, toErp: strToErp },
  currency:      { doctype: 'Company',          field: 'default_currency', fromErp: strFromErp, toErp: strToErp },
  country:       { doctype: 'Company',          field: 'country',         fromErp: strFromErp, toErp: strToErp },
  timezone:      { doctype: 'System Settings',  field: 'time_zone',       fromErp: strFromErp, toErp: strToErp },
  // المحاسبة
  defaultCompany:     { doctype: 'System Settings',  field: 'default_company',          fromErp: strFromErp, toErp: strToErp },
  fiscalYear:         { doctype: '__fiscal_year__',   field: 'name',                    fromErp: strFromErp, toErp: strToErp },
  autoAccountRouting: { doctype: 'Accounts Settings', field: 'auto_accounting_for_stock', fromErp: boolFromErp, toErp: boolToErp },
  // المبيعات
  invoiceTemplate: { doctype: 'Selling Settings', field: 'cust_master_name', fromErp: strFromErp, toErp: strToErp },
  posEnabled:      { doctype: 'Selling Settings', field: 'allow_multiple_items', fromErp: boolFromErp, toErp: boolToErp },
  posWarehouse:    { doctype: 'Selling Settings', field: 'default_warehouse', fromErp: strFromErp, toErp: strToErp },
  // المشتريات
  autoReceive:      { doctype: 'Buying Settings', field: 'allow_multiple_items', fromErp: boolFromErp, toErp: boolToErp },
  purchaseNumbering:{ doctype: 'Buying Settings', field: 'supp_master_name',  fromErp: strFromErp, toErp: strToErp },
  // المخزون
  defaultWarehouse: { doctype: 'Stock Settings', field: 'default_warehouse',       fromErp: strFromErp, toErp: strToErp },
  valuationMethod:  { doctype: 'Stock Settings', field: 'default_valuation_method', fromErp: strFromErp, toErp: strToErp },
  reorderLevel:     { doctype: 'Stock Settings', field: 'default_reorder_level',    fromErp: (v) => (v == null ? '' : String(v)), toErp: strToErp },
  // الموارد البشرية
  workingHours:    { doctype: 'HR Settings', field: 'standard_working_hours', fromErp: (v) => (v == null ? '' : String(v)), toErp: strToErp },
  overtimeRate:    { doctype: 'HR Settings', field: 'overtime_rate',          fromErp: (v) => (v == null ? '' : String(v)), toErp: strToErp },
  penaltyEnabled:  { doctype: 'HR Settings', field: 'expense_approval',       fromErp: boolFromErp, toErp: boolToErp },
  // الطباعة
  printTemplate:   { doctype: 'Print Settings', field: 'print_style',   fromErp: strFromErp, toErp: strToErp },
  paperSize:       { doctype: 'Print Settings', field: 'pdf_page_size', fromErp: strFromErp, toErp: strToErp },
};

// ─── ملف JSON محلي (احتياطي) ─────────────────────────────────────

const LOCAL_FILE = 'app-settings.json';

function localFilePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, LOCAL_FILE);
}

function loadLocalSettings(): Partial<AppSettings> | null {
  try {
    const raw = fs.readFileSync(localFilePath(), 'utf8');
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    return null;
  }
}

function saveLocalSettings(settings: AppSettings): void {
  const fp = localFilePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(settings, null, 2), 'utf8');
}

// ─── قراءة من ERPNext ────────────────────────────────────────────

type ErpDocCache = Record<string, Record<string, unknown>>;

async function fetchSingletonDoc(doctype: string): Promise<Record<string, unknown> | null> {
  try {
    const doc = await getDoc(doctype, doctype) as Record<string, unknown> | null;
    return doc;
  } catch {
    return null;
  }
}

async function fetchCompanyDoc(companyName: string): Promise<Record<string, unknown> | null> {
  try {
    const doc = await getDoc('Company', companyName) as Record<string, unknown> | null;
    return doc;
  } catch {
    return null;
  }
}

async function fetchCurrentFiscalYear(): Promise<string> {
  try {
    const rows = await getList('Fiscal Year', {
      fields: ['name'],
      filters: [['disabled', '=', '0']],
      order_by: 'creation desc',
      limit: 1,
    }) as { name: string }[];
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.name) {
      return rows[0].name;
    }
  } catch {
    /* تجاهل */
  }
  return new Date().getFullYear().toString();
}

/** تحميل جميع الإعدادات من ERPNext مع دمجها */
export async function loadAppSettingsFromErp(): Promise<{
  settings: AppSettings;
  source: 'erpnext' | 'local' | 'defaults';
  error?: string;
}> {
  const isAvailable = await isBackendAvailable().catch(() => false);
  if (!isAvailable) {
    const local = loadLocalSettings();
    if (local) {
      return { settings: { ...defaultAppSettings, ...local }, source: 'local' };
    }
    return { settings: { ...defaultAppSettings }, source: 'defaults' };
  }

  try {
    // جلب جميع المستندات المفردة بالتوازي
    const [
      systemSettings,
      accountsSettings,
      sellingSettings,
      buyingSettings,
      stockSettings,
      hrSettings,
      printSettings,
    ] = await Promise.all([
      fetchSingletonDoc('System Settings'),
      fetchSingletonDoc('Accounts Settings'),
      fetchSingletonDoc('Selling Settings'),
      fetchSingletonDoc('Buying Settings'),
      fetchSingletonDoc('Stock Settings'),
      fetchSingletonDoc('HR Settings'),
      fetchSingletonDoc('Print Settings'),
    ]);

    // بناء ذاكرة تخزين مؤقت للمستندات
    const cache: ErpDocCache = {};
    if (systemSettings) cache['System Settings'] = systemSettings;
    if (accountsSettings) cache['Accounts Settings'] = accountsSettings;
    if (sellingSettings) cache['Selling Settings'] = sellingSettings;
    if (buyingSettings) cache['Buying Settings'] = buyingSettings;
    if (stockSettings) cache['Stock Settings'] = stockSettings;
    if (hrSettings) cache['HR Settings'] = hrSettings;
    if (printSettings) cache['Print Settings'] = printSettings;

    // جلب بيانات الشركة
    const defaultCompName = systemSettings?.default_company as string | undefined;
    if (defaultCompName) {
      const companyDoc = await fetchCompanyDoc(defaultCompName);
      if (companyDoc) cache['Company'] = companyDoc;
    }

    // جلب السنة المالية
    const fiscalYear = await fetchCurrentFiscalYear();

    // تحويل قيم ERPNext إلى قيم واجهة المستخدم
    const settings = { ...defaultAppSettings };

    for (const [key, mapping] of Object.entries(fieldMappings)) {
      if (mapping.doctype === '__fiscal_year__') {
        (settings as Record<string, unknown>)[key] = fiscalYear;
        continue;
      }

      const doc = cache[mapping.doctype];
      if (!doc) continue;

      const rawValue = doc[mapping.field];
      if (rawValue !== undefined && rawValue !== null) {
        (settings as Record<string, unknown>)[key] = mapping.fromErp(rawValue);
      }
    }

    // حفظ محلياً كذاكرة تخزين مؤقت
    saveLocalSettings(settings);

    return { settings, source: 'erpnext' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل تحميل الإعدادات من الخادم';
    const local = loadLocalSettings();
    if (local) {
      return { settings: { ...defaultAppSettings, ...local }, source: 'local', error: message };
    }
    return { settings: { ...defaultAppSettings }, source: 'defaults', error: message };
  }
}

// ─── كتابة إلى ERPNext ───────────────────────────────────────────

/** حفظ قسم واحد من الإعدادات */
export async function saveAppSettingsToErp(
  section: AppSettingsSection,
  values: Partial<AppSettings>,
): Promise<{ success: boolean; error?: string }> {
  // تحديد DocTypes المتأثرة بهذا القسم
  const doctypes = sectionDoctypeMap[section];
  if (!doctypes) {
    return { success: false, error: `قسم غير معروف: ${section}` };
  }

  // تجميع القيم حسب DocType
  const updatesByDoctype: Record<string, Record<string, unknown>> = {};
  for (const dt of doctypes) {
    updatesByDoctype[dt] = { doctype: dt, name: dt };
  }
  // إضافة Company إذا كانت القسم عَام
  if (section === 'general') {
    // سنحتاج اسم الشركة للتحديث
  }

  for (const [key, value] of Object.entries(values)) {
    const mapping = fieldMappings[key as keyof AppSettings];
    if (!mapping) continue;

    const dt = mapping.doctype;
    if (dt === '__fiscal_year__') continue; // السنة المالية لا تُحدَّث من هنا

    if (!updatesByDoctype[dt]) {
      updatesByDoctype[dt] = { doctype: dt, name: dt };
    }
    updatesByDoctype[dt]![mapping.field] = mapping.toErp(value);
  }

  // تحديث كل DocType
  try {
    for (const [dt, doc] of Object.entries(updatesByDoctype)) {
      if (dt === 'Company') {
        // Company يتطلب اسم الشركة كمعرف
        const companyName = values.companyName || values.defaultCompany;
        if (companyName) {
          await updateDoc('Company', String(companyName), doc);
        }
      } else {
        await updateDoc(dt, dt, doc);
      }
    }

    // تحديث الملف المحلي أيضاً
    const current = loadLocalSettings();
    const merged: AppSettings = { ...defaultAppSettings, ...current, ...values };
    saveLocalSettings(merged);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل حفظ الإعدادات في الخادم';

    // حفظ محلياً كاحتياطي
    const current = loadLocalSettings();
    const merged: AppSettings = { ...defaultAppSettings, ...current, ...values };
    saveLocalSettings(merged);

    return { success: false, error: message };
  }
}

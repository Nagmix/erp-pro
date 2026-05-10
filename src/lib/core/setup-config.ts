/**
 * إعدادات تهيئة النظام
 *
 * يُدير هذا الملف تكوين إعدادات تهيئة النظام المخزَّنة في localStorage.
 * يشمل ذلك الشركة الافتراضية، والوحدات النمطية، والعملة، والدولة، واللغة،
 * وبيانات العلامة التجارية للشركة.
 */

// ---------------------------------------------------------------------------
// الثوابت
// ---------------------------------------------------------------------------

/** مفتاح التخزين المحلي لإعدادات التهيئة */
const SETUP_CONFIG_KEY = 'erp_setup_config';

// ---------------------------------------------------------------------------
// الأنواع (Types)
// ---------------------------------------------------------------------------

/**
 * تكوين إعدادات تهيئة النظام
 *
 * يُعرِّف البنية الأساسية للإعدادات التي يتم تخزينها محلياً
 * وتُستخدم عبر تطبيق ERP Pro.
 */
export interface SetupConfig {
  /** اسم الشركة الافتراضية */
  defaultCompany: string;

  /** هل الفروع مفعلة — يُحفظ دائماً كـ false (نظام شركة واحدة) */
  branchesEnabled: boolean;

  /** الوحدات المفعلة - قائمة بأسماء الوحدات النمطية المُفعَّلة */
  enabledModules: string[];

  /** العملة (مثل: YER, USD, EUR) */
  currency: string;

  /** الدولة (مثل: السعودية، مصر، الأردن) */
  country: string;

  /** اللغة (مثل: ar, en) */
  language: string;

  /** شعار الشركة (base64) */
  companyLogo?: string;

  /** شعار الشركة / الوصف */
  companyTagline?: string;

  /** هاتف الشركة */
  companyPhone?: string;

  /** عنوان الشركة */
  companyAddress?: string;

  /** الرقم الضريبي */
  companyTaxId?: string;
}

// ---------------------------------------------------------------------------
// دوال القراءة والكتابة
// ---------------------------------------------------------------------------

/**
 * يُرجع تكوين إعدادات التهيئة المخزَّن في localStorage.
 *
 * إذا لم يتم العثور على إعدادات محفوظة، أو كانت البيانات
 * المخزَّنة تالفة، يتم إرجاع `null`.
 *
 * @returns كائن `SetupConfig` إذا وُجدت إعدادات صالحة، أو `null` إذا لم توجد
 *
 * @example
 * ```ts
 * const config = getSetupConfig();
 * if (config) {
 *   console.log(config.defaultCompany); // "شركة النور"
 * }
 * ```
 */
export function getSetupConfig(): SetupConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(SETUP_CONFIG_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    // التحقق من أن الكائن المُحلَّل صالح
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'defaultCompany' in parsed &&
      'enabledModules' in parsed &&
      'currency' in parsed &&
      'country' in parsed &&
      'language' in parsed
    ) {
      return parsed as SetupConfig;
    }

    // البيانات تالفة - أزلها وأرجع null
    localStorage.removeItem(SETUP_CONFIG_KEY);
    return null;
  } catch {
    // خطأ في تحليل JSON - أزل البيانات التالفة
    localStorage.removeItem(SETUP_CONFIG_KEY);
    return null;
  }
}

/**
 * يحفظ تكوين إعدادات التهيئة في localStorage.
 *
 * يتم استبدال أي إعدادات سابقة بالإعدادات الجديدة.
 *
 * @param config - كائن إعدادات التهيئة المراد حفظه
 *
 * @example
 * ```ts
 * setSetupConfig({
 *   defaultCompany: 'شركة النور',
 *   branchesEnabled: false,
 *   enabledModules: ['المحاسبة', 'المبيعات', 'المشتريات'],
 *   currency: 'YER',
 *   country: 'السعودية',
 *   language: 'ar',
 *   companyLogo: 'data:image/png;base64,...',
 *   companyTagline: 'الريادة في التجارة',
 *   companyPhone: '+966123456789',
 *   companyAddress: 'الرياض، المملكة العربية السعودية',
 *   companyTaxId: '300000000000003',
 * });
 * ```
 */
export function setSetupConfig(config: SetupConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETUP_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // فشل التخزين (مثل: تجاوز الحصة) - لا نريد رمي خطأ
    console.error('فشل حفظ إعدادات التهيئة في التخزين المحلي');
  }
}

// ---------------------------------------------------------------------------
// دوال مساعدة مُسهِّلة
// ---------------------------------------------------------------------------

/**
 * يتحقق مما إذا كانت الفروع مفعلة في إعدادات التهيئة.
 *
 * يُرجع `false` دائماً لأن النظام يدعم شركة واحدة فقط.
 *
 * @returns `true` إذا كانت الفروع مفعلة، `false` بخلاف ذلك
 */
export function isBranchesEnabled(): boolean {
  const config = getSetupConfig();
  return config?.branchesEnabled ?? false;
}

/**
 * يُرجع قائمة الوحدات النمطية المُفعَّلة من إعدادات التهيئة.
 *
 * يُرجع مصفوفة فارغة إذا لم تكن هناك إعدادات محفوظة.
 *
 * @returns مصفوفة بأسماء الوحدات النمطية المُفعَّلة
 *
 * @example
 * ```ts
 * const modules = getEnabledModules();
 * if (modules.includes('sales')) {
 *   // عرض قائمة المبيعات
 * }
 * ```
 */
export function getEnabledModules(): string[] {
  const config = getSetupConfig();
  return config?.enabledModules ?? [];
}

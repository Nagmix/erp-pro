import { buildAccountCreate } from '@/lib/erp/erpnext-payloads';

/**
 * إنشاء ثلاثة حسابات ضريبة قياسية في دليل الحسابات (مخرجات، مدخلات، صافي مستحق)
 * يُنشئ الحسابات تحت مجموعتين: مطلوبات (مخرجات + صافي) وأصول (مدخلات قابلة للاسترداد).
 */
export function buildTaxGlAccountCreates(params: {
  company: string;
  /** بادئة العرض، مثال: «ضريبة القيمة المضافة 15٪» */
  prefix: string;
  /** مجموعة تحت شجرة المطلوبات (مثل Duties and Taxes) */
  parentLiability: string;
  /** مجموعة تحت شجرة الأصول (مثل الأصول المتداولة) */
  parentAsset: string;
}): Record<string, unknown>[] {
  const p = params.prefix.trim();
  if (!p) throw new Error('أدخل اسماً أو بادئة للضريبة');
  return [
    buildAccountCreate({
      account_name: `${p} — مخرجات`,
      parent_account: params.parentLiability,
      is_group: false,
      company: params.company,
      root_type: 'Liability',
      account_type: 'Tax',
    }),
    buildAccountCreate({
      account_name: `${p} — مدخلات`,
      parent_account: params.parentAsset,
      is_group: false,
      company: params.company,
      root_type: 'Asset',
      account_type: 'Tax',
    }),
    buildAccountCreate({
      account_name: `${p} — صافي مستحق`,
      parent_account: params.parentLiability,
      is_group: false,
      company: params.company,
      root_type: 'Liability',
      account_type: 'Tax',
    }),
  ];
}

/**
 * إعداد ضريبة كامل في ERPNext عبر API التطبيق فقط:
 * تحديد/إنشاء مجموعات الأب، ثلاثة حسابات جارية، قالب مبيعات وقالب مشتريات.
 */

import { buildAccountCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { buildTaxGlAccountCreates } from '@/lib/erp/tax-gl-accounts';
import { callMethod, createDoc } from '@/lib/server/backend';

type AccountRow = { name: string; account_name: string };

function score(text: string, patterns: RegExp[]): number {
  const n = text.toLowerCase();
  let s = 0;
  for (const p of patterns) {
    if (p.test(n)) s += 12;
  }
  return s;
}

async function listAccountGroups(
  company: string,
  rootType: string,
  userSession?: string
): Promise<AccountRow[]> {
  const raw = await callMethod(
    'frappe.client.get_list',
    {
      doctype: 'Account',
      fields: ['name', 'account_name'],
      filters: [
        ['company', '=', company],
        ['is_group', '=', 1],
        ['root_type', '=', rootType],
      ],
      limit_page_length: 800,
    },
    userSession
  );
  return Array.isArray(raw) ? (raw as AccountRow[]) : [];
}

async function findGroupByExactNames(
  company: string,
  rootType: string,
  accountNames: string[],
  userSession?: string
): Promise<string | null> {
  for (const an of accountNames) {
    const raw = await callMethod(
      'frappe.client.get_list',
      {
        doctype: 'Account',
        fields: ['name'],
        filters: [
          ['company', '=', company],
          ['is_group', '=', 1],
          ['root_type', '=', rootType],
          ['account_name', '=', an],
        ],
        limit_page_length: 1,
      },
      userSession
    );
    const rows = Array.isArray(raw) ? (raw as { name: string }[]) : [];
    if (rows[0]?.name) return rows[0].name;
  }
  return null;
}

async function pickBestScoringGroup(
  rows: AccountRow[],
  patterns: RegExp[],
  skipGeneric?: RegExp[]
): Promise<string | null> {
  let best: { name: string; score: number } | null = null;
  for (const r of rows) {
    if (skipGeneric?.some((p) => p.test(r.account_name) || p.test(r.name))) continue;
    const sc = score(r.account_name, patterns) + score(r.name, patterns) * 0.4;
    if (sc > 0 && (!best || sc > best.score)) best = { name: r.name, score: sc };
  }
  return best?.name ?? null;
}

async function ensureChildGroupAccount(params: {
  company: string;
  parentFullName: string;
  localName: string;
  rootType: 'Liability' | 'Asset';
  userSession?: string;
}): Promise<string> {
  const raw = await callMethod(
    'frappe.client.get_list',
    {
      doctype: 'Account',
      fields: ['name'],
      filters: [
        ['company', '=', params.company],
        ['parent_account', '=', params.parentFullName],
        ['account_name', '=', params.localName],
      ],
      limit_page_length: 1,
    },
    params.userSession
  );
  const existing = Array.isArray(raw) ? (raw as { name: string }[]) : [];
  if (existing[0]?.name) return existing[0].name;

  const doc = buildAccountCreate({
    account_name: params.localName,
    parent_account: params.parentFullName,
    is_group: true,
    company: params.company,
    root_type: params.rootType,
    account_type: '',
  });
  const created = (await createDoc(
    'Account',
    prepareFrappeDocForCreate(doc),
    params.userSession
  )) as { name: string };
  if (!created?.name) throw new Error('فشل إنشاء مجموعة الحسابات');
  return created.name;
}

/**
 * تحديد مجموعة أب للمطلوبات (ضرائب/رسوم) وللأصول (ضريبة مدخلات)،
 * أو إنشاء مجموعات قياسية تحت «المطلوبات المتداولة» / «الأصول المتداولة».
 */
export async function ensureTaxParentGroups(
  company: string,
  userSession?: string
): Promise<{ liabilityParent: string; assetParent: string }> {
  const liabilityRows = await listAccountGroups(company, 'Liability', userSession);
  const assetRows = await listAccountGroups(company, 'Asset', userSession);

  const liabilityExact = await findGroupByExactNames(
    company,
    'Liability',
    ['Duties and Taxes', 'Indirect Taxes', 'Tax Payable', 'الضرائب والرسوم', 'ضرائب ورسوم'],
    userSession
  );

  let liabilityParent =
    liabilityExact ||
    (await pickBestScoringGroup(
      liabilityRows,
      [/duties/i, /indirect/i, /tax\s*pay/i, /ضريبة/, /رسوم/, /withhold/i],
      [/^current liabilities$/i, /^المطلوبات المتداولة$/]
    ));

  if (!liabilityParent) {
    const currentLiab =
      (await findGroupByExactNames(
        company,
        'Liability',
        ['Current Liabilities', 'المطلوبات المتداولة', 'المطلوبات قصيرة الأجل'],
        userSession
      )) ||
      (await pickBestScoringGroup(liabilityRows, [/current\s*liabilit/i, /متداول/, /قصيرة/i]));
    if (!currentLiab) {
      throw new Error(
        'لم يُعثر على «المطلوبات المتداولة» في دليل الحسابات. أنشئ مخططاً محاسبياً للشركة من شاشة الشركة في النظام ثم أعد المحاولة.'
      );
    }
    liabilityParent = await ensureChildGroupAccount({
      company,
      parentFullName: currentLiab,
      localName: 'ERP Pro — Duties and Taxes',
      rootType: 'Liability',
      userSession,
    });
  }

  const assetExact = await findGroupByExactNames(
    company,
    'Asset',
    [
      'VAT Receivable',
      'Input VAT',
      'Tax Assets',
      'Tax Recoverable',
      'ضريبة مدخلات',
      'ضريبة القيمة المضافة المستردة',
    ],
    userSession
  );

  let assetParent =
    assetExact ||
    (await pickBestScoringGroup(
      assetRows,
      [/receivable/i, /recover/i, /input\s*vat/i, /مدخلات/i, /vat/i],
      [/^current assets$/i, /^الأصول المتداولة$/]
    ));

  if (!assetParent) {
    const currentAssets =
      (await findGroupByExactNames(
        company,
        'Asset',
        ['Current Assets', 'الأصول المتداولة'],
        userSession
      )) ||
      (await pickBestScoringGroup(assetRows, [/current\s*asset/i, /متداول/i]));
    if (!currentAssets) {
      throw new Error(
        'لم يُعثر على «الأصول المتداولة» في دليل الحسابات. أنشئ مخططاً محاسبياً للشركة ثم أعد المحاولة.'
      );
    }
    assetParent = await ensureChildGroupAccount({
      company,
      parentFullName: currentAssets,
      localName: 'ERP Pro — VAT Recoverable',
      rootType: 'Asset',
      userSession,
    });
  }

  return { liabilityParent, assetParent };
}

export type SetupTaxPackageResult = {
  liabilityParent: string;
  assetParent: string;
  accounts: { role: 'output' | 'input' | 'net'; name: string }[];
  salesTaxTemplateTitle: string;
  purchaseTaxTemplateTitle: string;
  salesTaxTemplateName?: string;
  purchaseTaxTemplateName?: string;
  /** ما إذا وُجد مسبقاً في ERPNext ولم يُعاد إنشاؤه */
  reused?: {
    accounts: boolean[];
    salesTemplate: boolean;
    purchaseTemplate: boolean;
  };
};

function taxRow(rate: number, accountHead: string, description: string): Record<string, unknown> {
  return {
    charge_type: 'On Net Total',
    account_head: accountHead,
    rate,
    description,
  };
}

async function findAccountByDisplayName(
  company: string,
  accountName: string,
  userSession?: string
): Promise<string | null> {
  const raw = await callMethod(
    'frappe.client.get_list',
    {
      doctype: 'Account',
      fields: ['name'],
      filters: [
        ['company', '=', company],
        ['account_name', '=', accountName],
      ],
      limit_page_length: 1,
    },
    userSession
  );
  const rows = Array.isArray(raw) ? (raw as { name: string }[]) : [];
  return rows[0]?.name ?? null;
}

async function findTaxTemplateByTitle(
  doctype: 'Sales Taxes and Charges Template' | 'Purchase Taxes and Charges Template',
  company: string,
  title: string,
  userSession?: string
): Promise<string | null> {
  const raw = await callMethod(
    'frappe.client.get_list',
    {
      doctype,
      fields: ['name'],
      filters: [
        ['company', '=', company],
        ['title', '=', title],
      ],
      limit_page_length: 1,
    },
    userSession
  );
  const rows = Array.isArray(raw) ? (raw as { name: string }[]) : [];
  return rows[0]?.name ?? null;
}

/**
 * إنشاء الحسابات الثلاثة + قالب المبيعات + قالب المشتريات.
 * إن وُجدت أسماء الحسابات أو عناوين القوالب مسبقاً يُعاد استخدامها دون فشل مكرر.
 */
export async function setupTaxPackage(
  company: string,
  title: string,
  rate: number,
  userSession?: string
): Promise<SetupTaxPackageResult> {
  const t = title.trim();
  if (!company) throw new Error('الشركة مطلوبة');
  if (!t) throw new Error('عنوان الضريبة مطلوب');
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('النسبة يجب أن تكون بين 0 و 100');

  const { liabilityParent, assetParent } = await ensureTaxParentGroups(company, userSession);

  const payloads = buildTaxGlAccountCreates({
    company,
    prefix: t,
    parentLiability: liabilityParent,
    parentAsset: assetParent,
  });

  const roles: ('output' | 'input' | 'net')[] = ['output', 'input', 'net'];
  const accounts: { role: 'output' | 'input' | 'net'; name: string }[] = [];
  const reusedAccounts: boolean[] = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i]!;
    const displayName = String(payload.account_name ?? '').trim();
    const existingName = await findAccountByDisplayName(company, displayName, userSession);
    if (existingName) {
      accounts.push({ role: roles[i]!, name: existingName });
      reusedAccounts.push(true);
      continue;
    }
    const created = (await createDoc(
      'Account',
      prepareFrappeDocForCreate(payload),
      userSession
    )) as { name: string };
    if (!created?.name) throw new Error('فشل إنشاء أحد حسابات الضريبة');
    accounts.push({ role: roles[i]!, name: created.name });
    reusedAccounts.push(false);
  }

  const outputHead = accounts.find((a) => a.role === 'output')?.name;
  const inputHead = accounts.find((a) => a.role === 'input')?.name;
  if (!outputHead || !inputHead) throw new Error('بيانات الحسابات غير مكتملة');

  const salesTitle = `${t} — مبيعات`;
  const purchaseTitle = `${t} — مشتريات`;

  const salesDoc = {
    doctype: 'Sales Taxes and Charges Template',
    title: salesTitle,
    company,
    taxes: [taxRow(rate, outputHead, t)],
  };

  const purchaseDoc = {
    doctype: 'Purchase Taxes and Charges Template',
    title: purchaseTitle,
    company,
    taxes: [taxRow(rate, inputHead, t)],
  };

  let salesTaxTemplateName: string | undefined =
    (await findTaxTemplateByTitle(
      'Sales Taxes and Charges Template',
      company,
      salesTitle,
      userSession
    )) ?? undefined;
  let purchaseTaxTemplateName: string | undefined =
    (await findTaxTemplateByTitle(
      'Purchase Taxes and Charges Template',
      company,
      purchaseTitle,
      userSession
    )) ?? undefined;

  const reusedSales = Boolean(salesTaxTemplateName);
  const reusedPurchase = Boolean(purchaseTaxTemplateName);

  if (!salesTaxTemplateName) {
    const salesCreated = (await createDoc('Sales Taxes and Charges Template', salesDoc, userSession)) as {
      name?: string;
    };
    salesTaxTemplateName = salesCreated?.name;
  }
  if (!purchaseTaxTemplateName) {
    const purchaseCreated = (await createDoc(
      'Purchase Taxes and Charges Template',
      purchaseDoc,
      userSession
    )) as { name?: string };
    purchaseTaxTemplateName = purchaseCreated?.name;
  }

  return {
    liabilityParent,
    assetParent,
    accounts,
    salesTaxTemplateTitle: salesTitle,
    purchaseTaxTemplateTitle: purchaseTitle,
    salesTaxTemplateName,
    purchaseTaxTemplateName,
    reused: {
      accounts: reusedAccounts,
      salesTemplate: reusedSales,
      purchaseTemplate: reusedPurchase,
    },
  };
}

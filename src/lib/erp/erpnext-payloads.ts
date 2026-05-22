import {
  ERP_POS_DISCOUNT_AMOUNT,
  ERP_PURCHASE_INVOICE_ADDITIONAL_DISCOUNT,
  ERP_SALES_INVOICE_ADDITIONAL_DISCOUNT,
} from '@/lib/erp/field-name-conventions';

/**
 * Shapes for ERPNext document bodies (Frappe v14+ style).
 * Server validates; we send the minimum coherent structure.
 */

/**
 * result من `get_mapped_doc` / دوال `make_*` — إزالة اسم السجل وحقول Frappe المؤقتة قبل الإدراج.
 */
export function prepareFrappeDocForCreate(mapped: unknown): Record<string, unknown> {
  if (!mapped || typeof mapped !== 'object') {
    throw new Error('مستند غير صالح');
  }
  const o: Record<string, unknown> = { ...(mapped as Record<string, unknown>) };
  delete o.name;
  for (const k of Object.keys(o)) {
    if (k.startsWith('__') || k === 'owner' || k === 'creation' || k === 'modified' || k === 'modified_by') {
      delete o[k];
    }
  }
  return o;
}

export function buildAccountCreate(input: {
  account_name: string;
  account_number?: string;
  parent_account: string;
  is_group: boolean;
  company: string;
  root_type: string;
  account_type: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Account',
    account_name: input.account_name.trim(),
    is_group: input.is_group ? 1 : 0,
    company: input.company,
  };
  if (input.parent_account) d.parent_account = input.parent_account;
  if (input.account_number) d.account_number = input.account_number;
  if (input.account_type) d.account_type = input.account_type;
  d.root_type = input.root_type;
  return d;
}

export function buildAccountUpdate(input: {
  account_number?: string;
  account_name: string;
  parent_account: string;
  is_group: boolean;
  company: string;
  root_type: string;
  account_type: string;
}): Record<string, unknown> {
  return {
    account_name: input.account_name.trim(),
    account_number: input.account_number,
    parent_account: input.parent_account || undefined,
    is_group: input.is_group ? 1 : 0,
    company: input.company,
    root_type: input.root_type,
    account_type: input.account_type || undefined,
  };
}

export type JournalLineInput = {
  account: string;
  party_type: string;
  party: string;
  debit: number;
  credit: number;
  cost_center: string;
  remarks: string;
  /** سعر صرف عملة الحساب؛ 1 = العملة المحلية (لا يُفعّل multi_currency إلا عند ≠ 1) */
  exchange_rate?: number;
  /** معرف واجهة فقط — سحب وترتيب البنود (لا يُرسل لـ ERPNext) */
  _rid?: string;
};

export function buildJournalEntry(input: {
  company: string;
  posting_date: string;
  voucher_type: string;
  title: string;
  user_remark: string;
  /** تسلسل تسمية القيد (اختياري؛ إن وُجد يُمرَّر للخادم) */
  naming_series?: string;
  /** قيد افتتاحي */
  is_opening?: number;
  lines: JournalLineInput[];
}): Record<string, unknown> {
  let multiCurrency = false;
  const accounts = input.lines
    .filter((l) => l.account)
    .map((l, idx) => {
      const fx =
        l.exchange_rate != null && !Number.isNaN(Number(l.exchange_rate))
          ? Number(l.exchange_rate)
          : 1;
      if (fx !== 1) multiCurrency = true;
      const row: Record<string, unknown> = {
        idx: idx + 1,
        account: l.account,
        debit_in_account_currency: l.debit || 0,
        credit_in_account_currency: l.credit || 0,
      };
      if (l.party_type && l.party) {
        row.party_type = l.party_type;
        row.party = l.party;
      }
      if (l.cost_center) row.cost_center = l.cost_center;
      if (l.remarks) row.user_remark = l.remarks;
      if (fx !== 1) row.exchange_rate = fx;
      return row;
    });
  const doc: Record<string, unknown> = {
    doctype: 'Journal Entry',
    company: input.company,
    posting_date: input.posting_date,
    voucher_type: input.voucher_type,
    title: input.title,
    user_remark: input.user_remark || '',
    accounts,
  };
  if (input.naming_series?.trim()) {
    doc.naming_series = input.naming_series.trim();
  }
  if (input.is_opening) doc.is_opening = input.is_opening;
  if (multiCurrency) doc.multi_currency = 1;
  return doc;
}

export function buildCustomerCreate(input: {
  customer_name: string;
  customer_type: 'Company' | 'Individual';
  customer_group: string;
  territory: string;
  email_id?: string;
  mobile_no?: string;
  tax_id?: string;
}): Record<string, unknown> {
  // حماية من استخدام عقد جذرية (is_group=1) كمجموعة عملاء أو منطقة
  // ERPNext يرفض "All Customer Groups" و "All Territories" كقيم صالحة
  const safeCustomerGroup = input.customer_group &&
    !input.customer_group.startsWith('All ') &&
    input.customer_group !== 'All Customer Groups'
    ? input.customer_group
    : 'Individual'; // الافتراضي إذا كانت المجموعة غير صالحة

  const safeTerritory = input.territory &&
    !input.territory.startsWith('All ') &&
    input.territory !== 'All Territories'
    ? input.territory
    : 'Yemen'; // الافتراضي إذا كانت المنطقة غير صالحة

  return {
    doctype: 'Customer',
    customer_name: input.customer_name.trim(),
    customer_type: input.customer_type,
    customer_group: safeCustomerGroup,
    territory: safeTerritory,
    email_id: input.email_id || undefined,
    mobile_no: input.mobile_no || undefined,
    tax_id: input.tax_id || undefined,
  };
}

export function buildSupplierCreate(input: {
  supplier_name: string;
  supplier_type: 'Company' | 'Individual';
  supplier_group: string;
  country: string;
  email_id?: string;
  mobile_no?: string;
  tax_id?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Supplier',
    supplier_name: input.supplier_name.trim(),
    supplier_type: input.supplier_type,
    supplier_group: input.supplier_group,
    country: input.country,
    email_id: input.email_id || undefined,
    mobile_no: input.mobile_no || undefined,
    tax_id: input.tax_id || undefined,
  };
}

/**
 * Quotation (ERPNext: party_type=Customer, party=اسم سجل Customer).
 */
export function buildQuotation(input: {
  company: string;
  customer: string;
  transaction_date: string;
  valid_till: string;
  cost_center?: string;
  terms?: string;
  currency?: string;
  conversion_rate?: number;
  price_list_currency?: string;
  plc_conversion_rate?: number;
  items: { item_code: string; qty: number; rate: number; amount: number }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => {
      const row: Record<string, unknown> = {
        item_code: i.item_code,
        qty: i.qty,
        rate: i.rate,
      };
      if (input.cost_center) row.cost_center = input.cost_center;
      return row;
    });
  const cur = input.currency?.trim() || 'YER';
  const conv = input.conversion_rate ?? 1;
  return {
    doctype: 'Quotation',
    company: input.company,
    party_type: 'Customer',
    party: input.customer,
    transaction_date: input.transaction_date,
    valid_till: input.valid_till,
    terms: input.terms,
    currency: cur,
    conversion_rate: conv,
    price_list_currency: input.price_list_currency?.trim() || cur,
    plc_conversion_rate: input.plc_conversion_rate ?? conv,
    items,
  };
}

export function buildSalesOrder(input: {
  company: string;
  customer: string;
  transaction_date: string;
  delivery_date: string;
  cost_center?: string;
  terms?: string;
  currency?: string;
  conversion_rate?: number;
  price_list_currency?: string;
  plc_conversion_rate?: number;
  items: { item_code: string; qty: number; rate: number; amount: number; warehouse: string }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      cost_center: input.cost_center || undefined,
    }));
  const cur = input.currency?.trim() || 'YER';
  const conv = input.conversion_rate ?? 1;
  return {
    doctype: 'Sales Order',
    company: input.company,
    customer: input.customer,
    transaction_date: input.transaction_date,
    delivery_date: input.delivery_date,
    terms: input.terms,
    currency: cur,
    conversion_rate: conv,
    price_list_currency: input.price_list_currency?.trim() || cur,
    plc_conversion_rate: input.plc_conversion_rate ?? conv,
    items,
  };
}

export function buildDeliveryNote(input: {
  company: string;
  customer: string;
  posting_date: string;
  cost_center?: string;
  terms?: string;
  items: { item_code: string; qty: number; rate: number; amount: number; warehouse: string }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      cost_center: input.cost_center || undefined,
    }));
  return {
    doctype: 'Delivery Note',
    company: input.company,
    customer: input.customer,
    posting_date: input.posting_date,
    terms: input.terms,
    items,
  };
}

export function buildPurchaseOrder(input: {
  company: string;
  supplier: string;
  transaction_date: string;
  cost_center?: string;
  terms?: string;
  currency?: string;
  /** ERPNext Purchase Order: conversion_rate مقابل عملة الشركة */
  conversion_rate?: number;
  items: { item_code: string; qty: number; rate: number; amount: number; warehouse: string }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      cost_center: input.cost_center || undefined,
    }));
  return {
    doctype: 'Purchase Order',
    company: input.company,
    supplier: input.supplier,
    transaction_date: input.transaction_date,
    terms: input.terms,
    currency: input.currency?.trim() || 'YER',
    conversion_rate: input.conversion_rate ?? 1,
    items,
  };
}

export function buildSalesInvoice(input: {
  company: string;
  customer: string;
  posting_date: string;
  due_date: string;
  cost_center: string;
  terms?: string;
  /** تسلسل تسمية فاتورة المبيعات (اختياري؛ إن وُجد يُمرَّر للخادم) */
  naming_series?: string;
  /** قالب ضريبة المبيعات (حقل taxes_and_charges في ERPNext) */
  taxes_and_charges?: string;
  items: {
    item_code: string;
    description?: string;
    qty: number;
    rate: number;
    amount: number;
    warehouse: string;
    /** إقران إيرادات مؤجلة (فترة الخدمة) — متكامل مع Process Deferred Accounting */
    enable_deferred_revenue?: boolean;
    service_start_date?: string;
    service_end_date?: string;
    deferred_revenue_account?: string;
  }[];
  /** فاتورة نقاط بيع */
  is_pos?: boolean;
  pos_profile?: string;
  /** خصم المخزون عند الترحيل (فاتورة عادية؛ يُجبر مع is_pos) */
  update_stock?: boolean;
  /** تخفيضات إضافية على المستوى */
  additional_discount_amount?: number;
  /** تعدد العملات (اختياري؛ افتراضي YER/1) */
  currency?: string;
  conversion_rate?: number;
  price_list_currency?: string;
  plc_conversion_rate?: number;
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i, idx) => {
      const row: Record<string, unknown> = {
        idx: idx + 1,
        item_code: i.item_code,
        qty: i.qty,
        rate: i.rate,
        amount: i.amount,
        warehouse: i.warehouse,
      };
      if (i.description?.trim()) row.description = i.description.trim();
      if (input.cost_center) row.cost_center = input.cost_center;
      if (i.enable_deferred_revenue) {
        row.enable_deferred_revenue = 1;
        if (i.service_start_date?.trim()) row.service_start_date = i.service_start_date.trim();
        if (i.service_end_date?.trim()) row.service_end_date = i.service_end_date.trim();
        if (i.deferred_revenue_account?.trim()) row.deferred_revenue_account = i.deferred_revenue_account.trim();
      }
      return row;
    });
  const d: Record<string, unknown> = {
    doctype: 'Sales Invoice',
    company: input.company,
    customer: input.customer,
    posting_date: input.posting_date,
    due_date: input.due_date,
    terms: input.terms,
    items,
    currency: input.currency?.trim() || 'YER',
    conversion_rate: input.conversion_rate ?? 1,
    price_list_currency: input.price_list_currency?.trim() || input.currency?.trim() || 'YER',
    plc_conversion_rate: input.plc_conversion_rate ?? input.conversion_rate ?? 1,
  };
  if (input.naming_series?.trim()) {
    d.naming_series = input.naming_series.trim();
  }
  if (input.taxes_and_charges?.trim()) {
    d.taxes_and_charges = input.taxes_and_charges.trim();
  }
  if (input.is_pos) {
    d.is_pos = 1;
    d.update_stock = 1;
    /** لـ POS Closing عندما يكون POS Settings → نوع الفاتورة = Sales Invoice */
    d.is_created_using_pos = 1;
    if (input.pos_profile) d.pos_profile = input.pos_profile;
  } else if (input.update_stock) {
    d.update_stock = 1;
  }
  if (input.additional_discount_amount != null && input.additional_discount_amount > 0) {
    d[ERP_SALES_INVOICE_ADDITIONAL_DISCOUNT] = input.additional_discount_amount;
  }
  return d;
}

/**
 * فاتورة نقطة بيع احترافية (DocType **POS Invoice**).
 * يتطلب ERPNext: **POS Settings** → نوع الفاتورة = **POS Invoice** (وليس Sales Invoice).
 * جدول `payments` إلزامي؛ المبالغ يجب أن تطابق الإجمالي بعد احتساب الضرائب في الخادم قدر الإمكان.
 */
export function buildPosInvoice(input: {
  naming_series?: string;
  company: string;
  customer: string;
  posting_date: string;
  posting_time?: string;
  due_date: string;
  pos_profile: string;
  cost_center: string;
  currency: string;
  selling_price_list: string;
  price_list_currency: string;
  conversion_rate?: number;
  plc_conversion_rate?: number;
  taxes_and_charges?: string;
  account_for_change_amount?: string;
  update_stock?: 0 | 1;
  items: { item_code: string; qty: number; rate: number; amount: number; warehouse: string; cost_center?: string }[];
  /** صفوف Sales Invoice Payment — على الأقل سطر واحد */
  payments: { mode_of_payment: string; amount: number }[];
  /** خصم على مستوى المستند (حقل discount_amount في POS Invoice) */
  discount_amount?: number;
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      cost_center: i.cost_center || input.cost_center || undefined,
    }));
  const d: Record<string, unknown> = {
    doctype: 'POS Invoice',
    naming_series: input.naming_series ?? 'ACC-PSINV-.YYYY.-',
    company: input.company,
    customer: input.customer,
    posting_date: input.posting_date,
    due_date: input.due_date,
    pos_profile: input.pos_profile,
    cost_center: input.cost_center,
    currency: input.currency,
    conversion_rate: input.conversion_rate ?? 1,
    selling_price_list: input.selling_price_list,
    price_list_currency: input.price_list_currency,
    plc_conversion_rate: input.plc_conversion_rate ?? 1,
    is_pos: 1,
    update_stock: input.update_stock ?? 1,
    items,
    payments: input.payments.map((p) => ({
      mode_of_payment: p.mode_of_payment,
      amount: p.amount,
    })),
  };
  if (input.posting_time) d.posting_time = input.posting_time;
  /** لا تُمرَّر من واجهة POS — تُرك للقواعد/الصنف في ERPNext */
  if (input.taxes_and_charges) d.taxes_and_charges = input.taxes_and_charges;
  if (input.account_for_change_amount) d.account_for_change_amount = input.account_for_change_amount;
  if (input.discount_amount != null && input.discount_amount > 0) {
    d[ERP_POS_DISCOUNT_AMOUNT] = input.discount_amount;
    d.apply_discount_on = 'Grand Total';
  }
  return d;
}

/** خيارات مرتجع جزئي وتوزيع الاسترداد على وسائل الدفع (§9). */
export type BuildPosInvoiceReturnOpts = {
  /**
   * كمية الإرجاع لكل فهرس بند في جدول `items` للفاتورة الأصلية (بالموجب).
   * إن وُجد المفتاح لكن القيمة 0 يُستبعد البند؛ إن غُيّب المفتاح يُرجع البند بالكامل (ما لم يُمرَّر السجل فارغاً صراحةً — انظر `partialMode`).
   */
  returnQtyByIndex?: Record<number, number>;
  /** عند true يُفترض أن `returnQtyByIndex` يحدد كل البنود صراحة — الصفوف غير المذكورة = لا إرجاع لها. */
  explicitPartial?: boolean;
  /**
   * `scaled_original`: نسبة من مدفوعات الفاتورة الأصلية حسب قيمة البنود المرتجعة.
   * `single_mode`: كامل المبلغ المسترد على وسيلة واحدة (سالب).
   */
  refundSplit?: 'scaled_original' | 'single_mode';
  /** مع `single_mode` — يجب أن تطابق وسيلة دفع مفعّلة في الفاتورة أو الملف */
  singleRefundMode?: string;
};

/** مرتجع POS Invoice — كميات سالبة ومدفوعات بمبالغ سالبة (متطلبات ERPNext). */
export function buildPosInvoiceReturn(
  source: Record<string, unknown>,
  postingDate: string,
  opts?: BuildPosInvoiceReturnOpts
): Record<string, unknown> {
  const itemsRaw = (source.items as Record<string, unknown>[]) || [];
  const partialExplicit = Boolean(opts?.explicitPartial && opts?.returnQtyByIndex);

  let origLineValue = 0;
  for (let i = 0; i < itemsRaw.length; i++) {
    const r = itemsRaw[i];
    if (!r || !r.item_code) continue;
    const q = Math.abs(Number(r.qty) || 0);
    const amt = Number(r.amount);
    const lineVal = Number.isFinite(amt) && amt !== 0 ? Math.abs(amt) : q * Math.abs(Number(r.rate) || 0);
    origLineValue += lineVal;
  }

  const items: Record<string, unknown>[] = [];
  let retLineValue = 0;

  for (let i = 0; i < itemsRaw.length; i++) {
    const r = itemsRaw[i];
    if (!r || !r.item_code) continue;
    const origQty = Math.abs(Number(r.qty) || 0);
    let retQty: number;
    if (partialExplicit) {
      const req = opts!.returnQtyByIndex?.[i];
      retQty =
        req === undefined ? 0 : Math.min(origQty, Math.max(0, Number(req) || 0));
    } else if (opts?.returnQtyByIndex && opts.returnQtyByIndex[i] !== undefined) {
      retQty = Math.min(origQty, Math.max(0, Number(opts.returnQtyByIndex[i]) || 0));
    } else {
      retQty = origQty;
    }
    if (retQty <= 0) continue;

    const amtFull = Number(r.amount);
    const lineValFull = Number.isFinite(amtFull) && amtFull !== 0 ? Math.abs(amtFull) : origQty * Math.abs(Number(r.rate) || 0);
    const portion = origQty > 0.0001 ? retQty / origQty : 0;
    retLineValue += lineValFull * portion;

    items.push({
      item_code: r.item_code,
      qty: -retQty,
      rate: r.rate,
      uom: r.uom,
      warehouse: r.warehouse,
      cost_center: r.cost_center,
    });
  }

  const payRaw = (source.payments as Record<string, unknown>[]) || [];
  const modes = payRaw.filter((p) => p.mode_of_payment);
  const gtAbs = Math.abs(Number(source.rounded_total ?? source.grand_total ?? 0));

  const ratio =
    origLineValue > 0.0001 ? Math.min(1, Math.max(0, retLineValue / origLineValue)) : retLineValue > 0 ? 1 : 0;

  let payments: { mode_of_payment: unknown; amount: number }[];

  if (opts?.refundSplit === 'single_mode' && opts.singleRefundMode?.trim()) {
    const mode = opts.singleRefundMode.trim();
    const sumOrigAbs = modes.reduce((s, p) => s + Math.abs(Number(p.amount) || 0), 0);
    const targetAbs = sumOrigAbs > 0 ? sumOrigAbs * ratio : gtAbs * ratio;
    payments = [{ mode_of_payment: mode, amount: targetAbs > 0 ? -targetAbs : 0 }];
  } else {
    payments = modes.map((p) => ({
      mode_of_payment: p.mode_of_payment,
      amount: -Math.abs(Number(p.amount) || 0) * ratio,
    }));
    const sumPay = payments.reduce((s, p) => s + Math.abs(Number(p.amount) || 0), 0);
    if (modes.length && gtAbs > 0 && (payments.length === 0 || sumPay < 0.0001)) {
      payments = [{ mode_of_payment: String(modes[0]!.mode_of_payment), amount: -gtAbs * ratio }];
    }
  }

  const sumPayFinal = payments.reduce((s, p) => s + Math.abs(Number(p.amount) || 0), 0);
  if (modes.length && gtAbs > 0 && (payments.length === 0 || sumPayFinal < 0.0001)) {
    payments = [{ mode_of_payment: String(modes[0]!.mode_of_payment), amount: -gtAbs * ratio }];
  }

  return {
    doctype: 'POS Invoice',
    naming_series: (source.naming_series as string) || 'ACC-PSINV-.YYYY.-',
    company: source.company,
    customer: source.customer,
    posting_date: postingDate,
    due_date: postingDate,
    pos_profile: source.pos_profile,
    is_pos: 1,
    is_return: 1,
    return_against: source.name,
    cost_center: source.cost_center,
    currency: source.currency,
    conversion_rate: source.conversion_rate ?? 1,
    selling_price_list: source.selling_price_list,
    price_list_currency: source.price_list_currency,
    plc_conversion_rate: source.plc_conversion_rate ?? 1,
    taxes_and_charges: source.taxes_and_charges || undefined,
    update_stock: 1,
    items,
    payments,
  };
}

/**
 * فاتورة مشتريات — عند تعيين `taxes_and_charges` يحمّل ERPNext بنود الضريبة من القالب ويُرحّل VAT عند الترحيل (لا تُضف ضريبة يدوية هنا).
 */
export function buildPurchaseInvoice(input: {
  company: string;
  supplier: string;
  posting_date: string;
  due_date: string;
  cost_center: string;
  terms?: string;
  naming_series?: string;
  /** تحديث المخزون عند ترحيل فاتورة الشراء */
  update_stock?: boolean;
  /** قالب Purchase Taxes and Charges Template — حقل taxes_and_charges في ERPNext */
  taxes_and_charges?: string;
  /** رقم فاتورة المورد — حقل bill_no */
  bill_no?: string;
  additional_discount_amount?: number;
  /** تعدد العملات (اختياري؛ افتراضي YER/1) */
  currency?: string;
  exchange_rate?: number;
  items: {
    item_code: string;
    description?: string;
    qty: number;
    rate: number;
    amount: number;
    warehouse: string;
  }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      ...(i.description?.trim() ? { description: i.description.trim() } : {}),
      qty: i.qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      cost_center: input.cost_center || undefined,
    }));
  const d: Record<string, unknown> = {
    doctype: 'Purchase Invoice',
    company: input.company,
    supplier: input.supplier,
    posting_date: input.posting_date,
    due_date: input.due_date,
    terms: input.terms,
    currency: input.currency?.trim() || 'YER',
    exchange_rate: input.exchange_rate ?? 1,
    items,
  };
  if (input.naming_series?.trim()) {
    d.naming_series = input.naming_series.trim();
  }
  if (input.update_stock) {
    d.update_stock = 1;
  }
  if (input.taxes_and_charges?.trim()) {
    d.taxes_and_charges = input.taxes_and_charges.trim();
  }
  if (input.bill_no?.trim()) {
    d.bill_no = input.bill_no.trim();
  }
  if (input.additional_discount_amount != null && input.additional_discount_amount > 0) {
    d[ERP_PURCHASE_INVOICE_ADDITIONAL_DISCOUNT] = input.additional_discount_amount;
  }
  return d;
}

/**
 * مطالبة مصروفات — Expense Claim (HRMS).
 * يطابق الحقول القياسية: naming_series، employee، company، posting_date، remark، cost_center، expenses.
 *
 * ⚠️ لا نحدد naming_series افتراضياً — ندع ERPNext/HRMS يستخدم الإعداد الافتراضي
 * لتجنب أخطاء "naming series not found" أو تعارض الأرقام.
 * يمكن تمرير naming_series صراحة إن عُرفت من الخادم.
 */
export function buildExpenseClaimCreate(input: {
  naming_series?: string;
  employee: string;
  company: string;
  posting_date: string;
  remark?: string;
  cost_center?: string;
  /** عملة الموظف/الشركة — افتراضي YER إن لم يُمرَّر */
  currency?: string;
  exchange_rate?: number;
  expenses: {
    expense_date: string;
    expense_type: string;
    amount: number;
    description?: string;
    sanctioned_amount?: number;
    cost_center?: string;
  }[];
}): Record<string, unknown> {
  const currency = input.currency?.trim() || 'YER';
  const exchange_rate = input.exchange_rate ?? 1;
  const expenses = input.expenses
    .filter((e) => e.expense_type?.trim())
    .map((e) => {
      const amount = Number(e.amount) || 0;
      const sanctioned =
        e.sanctioned_amount != null && !Number.isNaN(Number(e.sanctioned_amount))
          ? Number(e.sanctioned_amount)
          : amount;
      return {
        expense_date: e.expense_date,
        expense_type: e.expense_type.trim(),
        amount,
        sanctioned_amount: sanctioned,
        ...(e.description?.trim() ? { description: e.description.trim() } : {}),
        ...(e.cost_center?.trim() ? { cost_center: e.cost_center.trim() } : {}),
      };
    });
  const doc: Record<string, unknown> = {
    doctype: 'Expense Claim',
    // لا نحدد naming_series تلقائياً — ندع ERPNext/HRMS يستخدم الإعداد الافتراضي
    // لتجنب أخطاء "naming series not found" أو تعارض الأرقام
    // يُضاف فقط إن تم تمريره صراحة من NamingSeriesSelect
    ...(input.naming_series?.trim() ? { naming_series: input.naming_series.trim() } : {}),
    employee: input.employee,
    company: input.company,
    posting_date: input.posting_date,
    currency,
    exchange_rate,
    expenses,
  };
  if (input.remark?.trim()) doc.remark = input.remark.trim();
  if (input.cost_center?.trim()) doc.cost_center = input.cost_center.trim();
  return doc;
}

/** طلب مواد (شراء داخلي) — Material Request */
export function buildMaterialRequest(input: {
  company: string;
  transaction_date: string;
  schedule_date?: string;
  material_request_type?: 'Purchase' | 'Material Transfer' | 'Material Issue' | 'Manufacture' | 'Customer Provided';
  set_warehouse?: string;
  items: { item_code: string; qty: number; schedule_date?: string; warehouse?: string }[];
}): Record<string, unknown> {
  const sched = input.schedule_date || input.transaction_date;
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      schedule_date: i.schedule_date || sched,
      warehouse: i.warehouse || input.set_warehouse || undefined,
    }));
  return {
    doctype: 'Material Request',
    company: input.company,
    material_request_type: input.material_request_type ?? 'Purchase',
    transaction_date: input.transaction_date,
    schedule_date: sched,
    set_warehouse: input.set_warehouse || undefined,
    items,
  };
}

/** عرض سعر مورد */
export function buildSupplierQuotation(input: {
  company: string;
  supplier: string;
  transaction_date: string;
  valid_till: string;
  items: { item_code: string; qty: number; rate: number; warehouse?: string }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
      amount: i.qty * i.rate,
      warehouse: i.warehouse || undefined,
    }));
  return {
    doctype: 'Supplier Quotation',
    company: input.company,
    supplier: input.supplier,
    transaction_date: input.transaction_date,
    valid_till: input.valid_till,
    items,
  };
}

/** استلام مشتريات */
export function buildPurchaseReceipt(input: {
  company: string;
  supplier: string;
  posting_date: string;
  items: { item_code: string; qty: number; rate?: number; warehouse: string; purchase_order?: string }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      received_qty: i.qty,
      rate: i.rate || 0,
      warehouse: i.warehouse,
      purchase_order: i.purchase_order || undefined,
    }));
  return {
    doctype: 'Purchase Receipt',
    company: input.company,
    supplier: input.supplier,
    posting_date: input.posting_date,
    items,
  };
}

/** طلب عروض أسعار من موردين (RFQ) — يتطلب تسلسلاً وموضوعاً وبنوداً مع UOM */
export function buildRequestForQuotation(input: {
  naming_series?: string;
  company: string;
  transaction_date: string;
  schedule_date?: string;
  subject?: string;
  message_for_supplier?: string;
  suppliers: string[];
  items: { item_code: string; qty: number; uom: string; schedule_date?: string; warehouse?: string }[];
}): Record<string, unknown> {
  const msg = input.message_for_supplier?.trim() || 'يرجى تقديم عروض أسعار للبنود المذكورة.';
  return {
    doctype: 'Request for Quotation',
    naming_series: input.naming_series ?? 'PUR-RFQ-.YYYY.-',
    company: input.company,
    transaction_date: input.transaction_date,
    schedule_date: input.schedule_date || input.transaction_date,
    subject: (input.subject || 'طلب عروض أسعار').trim(),
    message_for_supplier: msg,
    suppliers: input.suppliers.filter(Boolean).map((supplier) => ({ supplier })),
    items: input.items
      .filter((i) => i.item_code && i.uom)
      .map((i) => ({
        item_code: i.item_code,
        qty: i.qty,
        schedule_date: i.schedule_date || input.schedule_date || input.transaction_date,
        uom: i.uom,
        stock_uom: i.uom,
        conversion_factor: 1,
        warehouse: i.warehouse || undefined,
      })),
  };
}

/** حركة مخزون — إدخال / إخراج / تحويل / تصنيع */
export function buildStockEntry(input: {
  company: string;
  purpose: string;
  posting_date: string;
  from_warehouse?: string;
  to_warehouse?: string;
  items: { item_code: string; qty: number; s_warehouse?: string; t_warehouse?: string; basic_rate?: number }[];
}): Record<string, unknown> {
  const st = input.purpose;
  const items = input.items
    .filter((i) => i.item_code)
    .map((i, idx) => {
      const row: Record<string, unknown> = {
        idx: idx + 1,
        item_code: i.item_code,
        qty: i.qty,
      };
      if (st === 'Material Receipt') {
        row.t_warehouse = i.t_warehouse || input.to_warehouse;
        if (i.basic_rate != null && i.basic_rate > 0) row.basic_rate = i.basic_rate;
      } else if (st === 'Material Issue') {
        row.s_warehouse = i.s_warehouse || input.from_warehouse;
      } else {
        row.s_warehouse = i.s_warehouse || input.from_warehouse;
        row.t_warehouse = i.t_warehouse || input.to_warehouse;
      }
      return row;
    });
  return {
    doctype: 'Stock Entry',
    company: input.company,
    stock_entry_type: st,
    purpose: st,
    posting_date: input.posting_date,
    ...(st !== 'Material Receipt' && input.from_warehouse ? { from_warehouse: input.from_warehouse } : {}),
    ...(st !== 'Material Issue' && input.to_warehouse ? { to_warehouse: input.to_warehouse } : {}),
    items,
  };
}

/** صنف جديد */
export function buildItemCreate(input: {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  is_stock_item: boolean;
  company?: string;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
  standard_rate?: number;
  description?: string;
  brand?: string;
  /** مطابق لحقل الصنف في ERPNext — تمكين الإيراد المؤجل على مستوى الصنف */
  enable_deferred_revenue?: boolean;
  /** عدد الأشهر الافتراضي للصنف عند تمكين الإيراد المؤجل */
  no_of_months?: number;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Item',
    item_code: input.item_code.trim(),
    item_name: input.item_name.trim(),
    item_group: input.item_group,
    stock_uom: input.stock_uom,
    is_stock_item: input.is_stock_item ? 1 : 0,
    has_batch_no: input.has_batch_no ? 1 : 0,
    has_serial_no: input.has_serial_no ? 1 : 0,
  };
  if (input.description) d.description = input.description;
  if (input.brand) d.brand = input.brand;
  if (input.standard_rate != null && input.standard_rate >= 0) d.standard_rate = input.standard_rate;
  if (input.company) {
    d.item_defaults = [{ company: input.company }];
  }
  if (input.enable_deferred_revenue) {
    d.enable_deferred_revenue = 1;
    const m = Math.max(1, Math.min(600, Math.round(Number(input.no_of_months) || 12)));
    d.no_of_months = m;
  }
  return d;
}

/** مستودع */
export function buildWarehouseCreate(input: {
  warehouse_name: string;
  company: string;
  parent_warehouse?: string;
  is_group?: boolean;
}): Record<string, unknown> {
  return {
    doctype: 'Warehouse',
    warehouse_name: input.warehouse_name.trim(),
    company: input.company,
    parent_warehouse: input.parent_warehouse || undefined,
    is_group: input.is_group ? 1 : 0,
  };
}

/** قائمة مواد BOM */
export function buildBom(input: {
  company: string;
  item: string;
  quantity: number;
  uom: string;
  items: { item_code: string; qty: number; uom?: string }[];
  operations?: { operation: string; workstation?: string; time_in_mins?: number; hourly_rate?: number }[];
}): Record<string, unknown> {
  const items = input.items
    .filter((i) => i.item_code)
    .map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      uom: i.uom || input.uom,
    }));
  const operations = (input.operations || [])
    .filter((o) => o.operation)
    .map((o) => ({
      operation: o.operation,
      workstation: o.workstation || undefined,
      time_in_mins: o.time_in_mins ?? 0,
      hourly_rate: o.hourly_rate ?? 0,
    }));
  const d: Record<string, unknown> = {
    doctype: 'BOM',
    company: input.company,
    item: input.item,
    quantity: input.quantity,
    uom: input.uom,
    items,
  };
  if (operations.length) d.operations = operations;
  return d;
}

/** أمر عمل تصنيع */
export function buildWorkOrder(input: {
  company: string;
  production_item: string;
  bom_no: string;
  qty: number;
  fg_warehouse: string;
  wip_warehouse?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Work Order',
    company: input.company,
    production_item: input.production_item,
    bom_no: input.bom_no,
    qty: input.qty,
    fg_warehouse: input.fg_warehouse,
    wip_warehouse: input.wip_warehouse || undefined,
  };
}

/** خطة إنتاج — صفوف po_items (Production Plan Item) */
export function buildProductionPlan(input: {
  company: string;
  naming_series?: string;
  posting_date: string;
  from_date: string;
  to_date: string;
  po_items: {
    item_code: string;
    bom_no: string;
    planned_qty: number;
    warehouse: string;
    stock_uom: string;
    planned_start_date?: string;
  }[];
}): Record<string, unknown> {
  return {
    doctype: 'Production Plan',
    naming_series: input.naming_series ?? 'MFG-PP-.YYYY.-',
    company: input.company,
    posting_date: input.posting_date,
    from_date: input.from_date,
    to_date: input.to_date,
    po_items: input.po_items
      .filter((p) => p.item_code && p.bom_no && p.stock_uom)
      .map((p) => ({
        item_code: p.item_code,
        bom_no: p.bom_no,
        planned_qty: p.planned_qty,
        warehouse: p.warehouse,
        stock_uom: p.stock_uom,
        planned_start_date: p.planned_start_date || `${input.from_date} 08:00:00`,
      })),
  };
}

/** محطة عمل */
export function buildWorkstation(input: {
  workstation_name: string;
  warehouse?: string;
  hour_rate?: number;
  production_capacity?: number;
}): Record<string, unknown> {
  return {
    doctype: 'Workstation',
    workstation_name: input.workstation_name.trim(),
    warehouse: input.warehouse || undefined,
    hour_rate: input.hour_rate ?? 0,
    production_capacity: input.production_capacity ?? 0,
  };
}

/** جرد مخزون — Stock Reconciliation */
export function buildStockReconciliation(input: {
  company: string;
  posting_date: string;
  purpose?: string;
  expense_account?: string;
  cost_center?: string;
  items: { item_code: string; warehouse: string; qty: number; valuation_rate?: number }[];
}): Record<string, unknown> {
  return {
    doctype: 'Stock Reconciliation',
    company: input.company,
    posting_date: input.posting_date,
    purpose: input.purpose ?? 'Stock Reconciliation',
    expense_account: input.expense_account || undefined,
    cost_center: input.cost_center || undefined,
    items: input.items
      .filter((i) => i.item_code && i.warehouse)
      .map((i) => ({
        item_code: i.item_code,
        warehouse: i.warehouse,
        qty: i.qty,
        valuation_rate: i.valuation_rate,
      })),
  };
}

/** قائمة أسعار رأسية */
export function buildPriceList(input: {
  price_list_name: string;
  currency: string;
  buying: boolean;
  selling: boolean;
  company?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Price List',
    price_list_name: input.price_list_name.trim(),
    currency: input.currency,
    buying: input.buying ? 1 : 0,
    selling: input.selling ? 1 : 0,
    enabled: 1,
    company: input.company || undefined,
  };
}

/** سعر صنف ضمن قائمة (DocType منفصل في ERPNext — يملأ العملة وشراء/بيع من القائمة) */
export function buildItemPrice(input: {
  item_code: string;
  uom: string;
  price_list: string;
  price_list_rate: number;
}): Record<string, unknown> {
  return {
    doctype: 'Item Price',
    item_code: input.item_code.trim(),
    uom: input.uom.trim(),
    price_list: input.price_list.trim(),
    price_list_rate: input.price_list_rate,
  };
}

/** تكلفة إضافية — Landed Cost Voucher (صف ضريبة/مصروف واحد على الأقل) */
export function buildLandedCostVoucher(input: {
  company: string;
  posting_date: string;
  distribute_charges_based_on: 'Amount' | 'Quantity';
  expense_account: string;
  charge_amount: number;
  description?: string;
  purchase_receipts: { receipt_document: string; applicable_charges: number }[];
}): Record<string, unknown> {
  return {
    doctype: 'Landed Cost Voucher',
    company: input.company,
    posting_date: input.posting_date,
    distribute_charges_based_on: input.distribute_charges_based_on,
    purchase_receipts: input.purchase_receipts
      .filter((r) => r.receipt_document)
      .map((r) => ({
        receipt_document_type: 'Purchase Receipt',
        receipt_document: r.receipt_document,
        applicable_charges: r.applicable_charges,
      })),
    taxes: [
      {
        expense_account: input.expense_account,
        description: (input.description || 'Landed cost').trim(),
        amount: input.charge_amount,
      },
    ],
  };
}

export type PaymentReferenceInput = {
  /** e.g. Sales Invoice, Purchase Invoice, Journal Entry */
  reference_doctype: string;
  reference_name: string;
  allocated_amount: number;
};

/**
 * Payment Entry — with optional `references` for allocation against invoices.
 */
export function buildPaymentEntry(input: {
  company: string;
  payment_type: 'Receive' | 'Pay' | 'Internal Transfer';
  party_type: string;
  party: string;
  posting_date: string;
  mode_of_payment: string;
  paid_from: string;
  paid_to: string;
  paid_amount: number;
  received_amount: number;
  reference_no?: string;
  reference_date?: string;
  references?: PaymentReferenceInput[];
  /** تسلسل تسمية قيد الدفع (اختياري؛ إن وُجد يُمرَّر للخادم) */
  naming_series?: string;
  /** ERPNext: سعر صرف الحساب المدفوع منه / إليه عند تعدد العملات */
  source_exchange_rate?: number;
  target_exchange_rate?: number;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Payment Entry',
    naming_series: input.naming_series?.trim() || 'ACC-PE-.YYYY.-',
    company: input.company,
    payment_type: input.payment_type,
    posting_date: input.posting_date,
    mode_of_payment: input.mode_of_payment,
    paid_amount: input.paid_amount,
    received_amount: input.received_amount,
  };
  if (input.payment_type !== 'Internal Transfer') {
    // ضمان تعيين party_type — ERPNext يرفض الترحيل بدونه
    const pt = input.party_type?.trim() || (
      input.payment_type === 'Receive' ? 'Customer' : input.payment_type === 'Pay' ? 'Supplier' : 'Customer'
    );
    d.party_type = pt;
    d.party = input.party || '';
  }
  if (input.paid_from) d.paid_from = input.paid_from;
  if (input.paid_to) d.paid_to = input.paid_to;
  const ser =
    input.source_exchange_rate != null && !Number.isNaN(Number(input.source_exchange_rate))
      ? Number(input.source_exchange_rate)
      : undefined;
  const ter =
    input.target_exchange_rate != null && !Number.isNaN(Number(input.target_exchange_rate))
      ? Number(input.target_exchange_rate)
      : undefined;
  if (ser != null && ser !== 1) d.source_exchange_rate = ser;
  if (ter != null && ter !== 1) d.target_exchange_rate = ter;
  if (input.reference_no) d.reference_no = input.reference_no;
  if (input.reference_date) d.reference_date = input.reference_date;
  if (input.references?.length) {
    d.references = input.references
      .filter((r) => r.reference_name && r.allocated_amount > 0)
      .map((r) => ({
        reference_doctype: r.reference_doctype,
        reference_name: r.reference_name,
        allocated_amount: r.allocated_amount,
      }));
  }
  return d;
}

/**
 * مرتجع/إشعار دائن — يحتاج بنوداً مأخوذة من فاتورة الأصل (من useDoc / apiGetDoc).
 */
export function buildSalesInvoiceReturn(
  source: Record<string, unknown>,
  postingDate: string
): Record<string, unknown> {
  const itemsRaw = (source.items as Record<string, unknown>[]) || [];
  const items = itemsRaw
    .filter((r) => r && r.item_code)
    .map((r) => ({
      item_code: r.item_code,
      qty: Math.abs(Number(r.qty) || 0),
      rate: r.rate,
      uom: r.uom,
      amount: r.amount,
      warehouse: r.warehouse,
      cost_center: r.cost_center,
    }));
  const d: Record<string, unknown> = {
    doctype: 'Sales Invoice',
    company: source.company,
    is_return: 1,
    return_against: source.name,
    customer: source.customer,
    posting_date: postingDate,
    due_date: postingDate,
    items: items,
  };
  const tac = typeof source.taxes_and_charges === 'string' ? source.taxes_and_charges.trim() : '';
  if (tac) d.taxes_and_charges = tac;
  return d;
}

export function buildPurchaseInvoiceReturn(
  source: Record<string, unknown>,
  postingDate: string
): Record<string, unknown> {
  const itemsRaw = (source.items as Record<string, unknown>[]) || [];
  const items = itemsRaw
    .filter((r) => r && r.item_code)
    .map((r) => ({
      item_code: r.item_code,
      qty: Math.abs(Number(r.qty) || 0),
      rate: r.rate,
      uom: r.uom,
      amount: r.amount,
      warehouse: r.warehouse,
      cost_center: r.cost_center,
    }));
  const d: Record<string, unknown> = {
    doctype: 'Purchase Invoice',
    company: source.company,
    is_return: 1,
    return_against: source.name,
    supplier: source.supplier,
    posting_date: postingDate,
    due_date: postingDate,
    items: items,
  };
  const tac = typeof source.taxes_and_charges === 'string' ? source.taxes_and_charges.trim() : '';
  if (tac) d.taxes_and_charges = tac;
  return d;
}

/**
 * سطر لاستيراد/تسجيل حركة من كشف (قبل/أثناء التسوية في ERPNext).
 */
export function buildBankTransaction(input: {
  date: string;
  bank_account: string;
  deposit: number;
  withdrawal: number;
  description: string;
  reference_number: string;
}): Record<string, unknown> {
  return {
    doctype: 'Bank Transaction',
    date: input.date,
    bank_account: input.bank_account,
    deposit: input.deposit,
    withdrawal: input.withdrawal,
    description: input.description,
    reference_number: input.reference_number,
    status: 'Pending',
  };
}

/**
 * تشغيل إقران الإيرادات المؤجلة في ERPNext (IFRS 15 — النموذج القياسي في النظام).
 * عند التقديم يستدعي الخلفية `convert_deferred_revenue_to_income` وينشئ قيود الإقران للفترة.
 */
export function buildProcessDeferredAccounting(input: {
  company: string;
  type: 'Income' | 'Expense';
  posting_date: string;
  start_date: string;
  end_date: string;
  /** تصفية حساب إيراد مؤجل/مصروف مؤجل محدد (اختياري) */
  account?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Process Deferred Accounting',
    company: input.company.trim(),
    type: input.type,
    posting_date: input.posting_date,
    start_date: input.start_date,
    end_date: input.end_date,
  };
  if (input.account?.trim()) d.account = input.account.trim();
  return d;
}

export function buildCostCenterCreate(input: {
  cost_center_name: string;
  parent_cost_center?: string;
  is_group?: boolean;
  company: string;
}): Record<string, unknown> {
  return {
    doctype: 'Cost Center',
    cost_center_name: input.cost_center_name.trim(),
    parent_cost_center: input.parent_cost_center || undefined,
    is_group: input.is_group ? 1 : 0,
    company: input.company,
  };
}

export function buildFiscalYear(input: {
  year: string;
  year_start_date: string;
  year_end_date: string;
  company?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Fiscal Year',
    year: input.year.trim(),
    year_start_date: input.year_start_date,
    year_end_date: input.year_end_date,
  };
  if (input.company) {
    d.companies = [{ company: input.company }];
  }
  return d;
}

/**
 * إقفال فترة — ينقل أرباح/خسائر الفترة إلى حساب الإقفال عند الترحيل (حسب إعدادات ERPNext).
 * الحقول مطابقة لـ `Period Closing Voucher` في erpnext (موديول الحسابات).
 */
export function buildPeriodClosingVoucher(input: {
  company: string;
  fiscal_year: string;
  transaction_date: string;
  period_start_date: string;
  period_end_date: string;
  closing_account_head: string;
  remarks: string;
}): Record<string, unknown> {
  return {
    doctype: 'Period Closing Voucher',
    company: input.company,
    fiscal_year: input.fiscal_year,
    transaction_date: input.transaction_date,
    period_start_date: input.period_start_date,
    period_end_date: input.period_end_date,
    closing_account_head: input.closing_account_head,
    remarks: input.remarks.trim() || 'إقفال فترة',
  };
}

export function buildAssetCreate(input: {
  asset_name: string;
  asset_category: string;
  company: string;
  available_for_use_date: string;
  purchase_amount: number;
  location?: string;
  is_existing_asset: boolean;
  /** صنف مرتبط بالأصل — مطلوب في إصدارات ERPNext الحديثة غالباً */
  item_code?: string;
  custodian?: string;
  calculate_depreciation?: boolean;
  /** قيم Select في ERPNext: Straight Line، Double Declining Balance، … */
  depreciation_method?: string;
  /** عمر إنتاجي بالسنوات — يُشتق منه total_number_of_depreciations مع frequency_of_depreciation */
  useful_life_years?: number;
  /** شهور بين جداول الإهلاك (افتراضي 12 = سنوي) */
  frequency_of_depreciation_months?: number;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Asset',
    asset_name: input.asset_name.trim(),
    asset_category: input.asset_category,
    company: input.company,
    is_existing_asset: input.is_existing_asset ? 1 : 0,
    available_for_use_date: input.available_for_use_date,
    purchase_amount: input.purchase_amount,
  };
  if (input.location?.trim()) d.location = input.location.trim();
  if (input.item_code?.trim()) d.item_code = input.item_code.trim();
  if (input.custodian?.trim()) d.custodian = input.custodian.trim();
  if (input.calculate_depreciation) {
    d.calculate_depreciation = 1;
  }
  if (input.depreciation_method?.trim()) {
    d.depreciation_method = input.depreciation_method.trim();
  }
  const years = Number(input.useful_life_years);
  const freq = Math.max(1, Math.round(Number(input.frequency_of_depreciation_months) || 12));
  if (years > 0) {
    d.total_number_of_depreciations = Math.max(1, Math.round((years * 12) / freq));
    d.frequency_of_depreciation = freq;
  }
  return d;
}

/** ملف نقطة بيع أدنى — يُنشأ فقط عند توفر مستودع وقائمة أسعار وطريقة دفع مرتبطة بالشركة. */
export function buildMinimalPosProfile(input: {
  company: string;
  warehouse: string;
  selling_price_list: string;
  currency: string;
  payments: { mode_of_payment: string }[];
}): Record<string, unknown> {
  return {
    doctype: 'POS Profile',
    company: input.company,
    warehouse: input.warehouse,
    selling_price_list: input.selling_price_list,
    currency: input.currency,
    payments: input.payments.map((p) => ({
      mode_of_payment: p.mode_of_payment,
    })),
  };
}

/** رصيد افتتاحي للوردية — يُرحَّل ليصبح status = Open */
export function buildPosOpeningEntry(input: {
  company: string;
  pos_profile: string;
  user: string;
  posting_date: string;
  period_start_date: string;
  balance_details: { mode_of_payment: string; opening_amount: number }[];
}): Record<string, unknown> {
  return {
    doctype: 'POS Opening Entry',
    company: input.company,
    pos_profile: input.pos_profile,
    user: input.user,
    posting_date: input.posting_date,
    period_start_date: input.period_start_date,
    balance_details: input.balance_details.map((r) => ({
      mode_of_payment: r.mode_of_payment,
      opening_amount: r.opening_amount,
    })),
  };
}

/**
 * بناء مسودة POS Closing Entry من ناتج `get_invoices` (نفس منطق ERPNext Python تقريباً).
 */
export function buildPosClosingEntryFromInvoiceApi(input: {
  pos_opening_entry: string;
  period_start_date: string;
  period_end_date: string;
  posting_date: string;
  posting_time: string;
  company: string;
  pos_profile: string;
  user: string;
  data: {
    invoices?: Record<string, unknown>[];
    payments?: Record<string, unknown>[];
    taxes?: Record<string, unknown>[];
  };
}): Record<string, unknown> {
  const inv = input.data.invoices ?? [];
  const pay = input.data.payments ?? [];
  const taxRows = input.data.taxes ?? [];

  let grand_total = 0;
  let net_total = 0;
  let total_quantity = 0;
  let total_taxes_and_charges = 0;

  const pos_invoices: Record<string, unknown>[] = [];
  const sales_invoices: Record<string, unknown>[] = [];

  for (const d of inv) {
    const gt = Number(d.grand_total ?? 0);
    const nt = Number(d.net_total ?? 0);
    const tq = Number(d.total_qty ?? 0);
    const tt = Number(d.total_taxes_and_charges ?? 0);
    grand_total += gt;
    net_total += nt;
    total_quantity += tq;
    total_taxes_and_charges += tt;

    const nm = String(d.name ?? '');
    const cust = String(d.customer ?? '');
    const pd = String(d.posting_date ?? '').includes(' ')
      ? String(d.posting_date ?? '').split(' ')[0]!
      : String(d.posting_date ?? '');
    const isRet = Number(d.is_return ?? 0) ? 1 : 0;
    const retAg = d.return_against ? String(d.return_against) : '';

    const rowBase = {
      posting_date: pd || input.posting_date,
      grand_total: gt,
      customer: cust,
      is_return: isRet,
      ...(retAg ? { return_against: retAg } : {}),
    };

    if (String(d.doctype) === 'POS Invoice') {
      pos_invoices.push({ pos_invoice: nm, ...rowBase });
    } else {
      sales_invoices.push({ sales_invoice: nm, ...rowBase });
    }
  }

  const payment_reconciliation = pay.map((p) => {
    const mode = String(p.mode_of_payment ?? '');
    const amt = Number(p.amount ?? 0);
    return {
      mode_of_payment: mode,
      opening_amount: 0,
      expected_amount: amt,
      closing_amount: amt,
      difference: 0,
    };
  });

  const taxes = taxRows.map((t) => ({
    account_head: String(t.account_head ?? ''),
    amount: Number((t as { tax_amount?: unknown }).tax_amount ?? t.amount ?? 0),
  }));

  return {
    doctype: 'POS Closing Entry',
    pos_opening_entry: input.pos_opening_entry,
    period_start_date: input.period_start_date,
    period_end_date: input.period_end_date,
    posting_date: input.posting_date,
    posting_time: input.posting_time,
    company: input.company,
    pos_profile: input.pos_profile,
    user: input.user,
    grand_total,
    net_total,
    total_quantity,
    total_taxes_and_charges,
    pos_invoices,
    sales_invoices,
    payment_reconciliation,
    taxes,
  };
}

/** وقت HH:MM → HH:MM:SS لحقول Time في ERPNext */
export function toErpTime(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  return v.length === 5 && /^\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
}

export function buildEmployeeCreate(input: {
  first_name: string;
  last_name?: string;
  company: string;
  gender?: string;
  date_of_joining?: string;
  status?: string;
  department?: string;
  designation?: string;
  cell_number?: string;
  company_email?: string;
  personal_email?: string;
  user_id?: string;
  date_of_birth?: string;
  branch?: string;
  employment_type?: string;
  naming_series?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Employee',
    // لا نحدد naming_series — ندع ERPNext/HRMS يستخدم الإعداد الافتراضي
    // لتجنب أخطاء "naming series not found" أو تعارض الأرقام
    first_name: input.first_name.trim(),
    ...(input.last_name ? { last_name: input.last_name.trim() } : {}),
    company: input.company,
    gender: input.gender || 'Male',
    date_of_joining: input.date_of_joining || undefined,
    status: input.status || 'Active',
    // في HRMS v16، لا يجب إرسال تاريخ ميلاد وهمي — أرسله فقط إن وُجد
    ...(input.date_of_birth ? { date_of_birth: input.date_of_birth } : {}),
    ...(input.department ? { department: input.department } : {}),
    ...(input.designation ? { designation: input.designation } : {}),
    ...(input.cell_number ? { cell_number: input.cell_number.trim() } : {}),
    ...(input.company_email ? { company_email: input.company_email.trim() } : {}),
    ...(input.personal_email ? { personal_email: input.personal_email.trim() } : {}),
    // في HRMS v16، يجب تعيين create_user=0 عند عدم وجود user_id
    // لتجنب أخطاء إنشاء مستخدم تلقائي
    create_user: 0,
    ...(input.user_id ? { user_id: input.user_id, create_user: 1 } : {}),
    ...(input.branch ? { branch: input.branch } : {}),
    ...(input.employment_type ? { employment_type: input.employment_type } : {}),
  };
}

/** عقد موظف — في HRMS v16 يُستخدم Contract مع party_type=Employee */
export function buildEmployeeContractCreate(input: {
  employee: string;
  company: string;
  contract_start_date: string;
  contract_end_date: string;
  salary_structure?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Contract',
    party_type: 'Employee',
    party_name: input.employee,
    company: input.company,
    start_date: input.contract_start_date,
    end_date: input.contract_end_date,
  };
  if (input.salary_structure) d.salary_structure = input.salary_structure;
  return d;
}

export function buildAttendanceCreate(input: {
  employee: string;
  attendance_date: string;
  status: string;
  in_time?: string;
  out_time?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Attendance',
    employee: input.employee,
    attendance_date: input.attendance_date,
    status: input.status,
  };
  const it = input.in_time ? toErpTime(input.in_time) : undefined;
  const ot = input.out_time ? toErpTime(input.out_time) : undefined;
  if (it) d.in_time = it;
  if (ot) d.out_time = ot;
  return d;
}

export function buildLeaveApplicationCreate(input: {
  naming_series?: string;
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  description?: string;
  half_day?: boolean;
  half_day_date?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Leave Application',
    naming_series: input.naming_series ?? 'HR-LAP-.YYYY.-',
    employee: input.employee,
    leave_type: input.leave_type,
    from_date: input.from_date,
    to_date: input.to_date,
    ...(input.description ? { description: input.description } : {}),
    half_day: input.half_day ? 1 : 0,
    ...(input.half_day && input.half_day_date ? { half_day_date: input.half_day_date } : {}),
  };
}

export function buildLeaveTypeCreate(input: {
  leave_type_name: string;
  max_leaves_allowed?: number;
  is_carry_forward?: boolean;
  is_lwp?: boolean;
  include_holiday?: boolean;
}): Record<string, unknown> {
  return {
    doctype: 'Leave Type',
    leave_type_name: input.leave_type_name.trim(),
    max_leaves_allowed: input.max_leaves_allowed ?? 0,
    is_carry_forward: input.is_carry_forward ? 1 : 0,
    is_lwp: input.is_lwp ? 1 : 0,
    include_holiday: input.include_holiday ? 1 : 0,
  };
}

export function buildHolidayListCreate(input: {
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  holidays: { holiday_date: string; description: string }[];
}): Record<string, unknown> {
  return {
    doctype: 'Holiday List',
    holiday_list_name: input.holiday_list_name.trim(),
    from_date: input.from_date,
    to_date: input.to_date,
    holidays: input.holidays.map((h) => ({
      doctype: 'Holiday',
      holiday_date: h.holiday_date,
      description: h.description || 'Holiday',
    })),
  };
}

export function buildShiftTypeCreate(input: {
  name: string;
  start_time: string;
  end_time: string;
}): Record<string, unknown> {
  return {
    doctype: 'Shift Type',
    name: input.name.trim(),
    start_time: toErpTime(input.start_time) ?? '08:00:00',
    end_time: toErpTime(input.end_time) ?? '17:00:00',
  };
}

export function buildShiftAssignmentCreate(input: {
  employee: string;
  company: string;
  shift_type: string;
  start_date: string;
  end_date?: string;
  status?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Shift Assignment',
    employee: input.employee,
    company: input.company,
    shift_type: input.shift_type,
    start_date: input.start_date,
    status: input.status ?? 'Active',
  };
  if (input.end_date) d.end_date = input.end_date;
  return d;
}

/** طلب حضور (عمل عن بُعد / مهمة خارجية) — DocType قياسي في Frappe HRMS */
export function buildAttendanceRequestCreate(input: {
  employee: string;
  company: string;
  from_date: string;
  to_date: string;
  reason: 'Work From Home' | 'On Duty';
  explanation?: string;
  half_day?: boolean;
  half_day_date?: string;
  shift?: string;
  include_holidays?: boolean;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Attendance Request',
    employee: input.employee,
    company: input.company,
    from_date: input.from_date,
    to_date: input.to_date,
    reason: input.reason,
    half_day: input.half_day ? 1 : 0,
    include_holidays: input.include_holidays ? 1 : 0,
  };
  if (input.explanation) d.explanation = input.explanation;
  if (input.half_day && input.half_day_date) d.half_day_date = input.half_day_date;
  if (input.shift) d.shift = input.shift;
  return d;
}

export function buildSalaryStructureCreate(input: {
  name: string;
  company: string;
  currency: string;
  payroll_frequency?: string;
  is_active?: 'Yes' | 'No';
  earnings: { salary_component: string; amount: number }[];
  deductions?: { salary_component: string; amount: number }[];
}): Record<string, unknown> {
  const earnings = input.earnings.map((e) => ({
    doctype: 'Salary Detail',
    salary_component: e.salary_component,
    amount: e.amount,
  }));
  const deductions = (input.deductions ?? []).map((e) => ({
    doctype: 'Salary Detail',
    salary_component: e.salary_component,
    amount: e.amount,
  }));
  return {
    doctype: 'Salary Structure',
    // في HRMS v16، استخدم title بدلاً من name — الاسم يُولّد تلقائياً
    title: input.name.trim(),
    company: input.company,
    currency: input.currency,
    payroll_frequency: input.payroll_frequency ?? 'Monthly',
    is_active: input.is_active ?? 'Yes',
    earnings,
    deductions,
  };
}

export function buildSalaryStructureAssignmentCreate(input: {
  employee: string;
  salary_structure: string;
  company: string;
  from_date: string;
  currency?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Salary Structure Assignment',
    employee: input.employee,
    salary_structure: input.salary_structure,
    company: input.company,
    from_date: input.from_date,
    ...(input.currency ? { currency: input.currency } : {}),
  };
}

export function buildLeadCreate(input: {
  naming_series?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  status?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  company?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Lead',
    naming_series: input.naming_series ?? 'CRM-LEAD-.YYYY.-',
    status: input.status ?? 'Lead',
  };
  if (input.first_name) d.first_name = input.first_name.trim();
  if (input.last_name) d.last_name = input.last_name.trim();
  if (input.company_name) d.company_name = input.company_name.trim();
  if (input.email_id) d.email_id = input.email_id.trim();
  if (input.mobile_no) d.mobile_no = input.mobile_no.trim();
  if (input.phone) d.phone = input.phone.trim();
  if (input.company) d.company = input.company;
  return d;
}

export function buildOpportunityCreate(input: {
  naming_series?: string;
  opportunity_from: string;
  party_name: string;
  company: string;
  transaction_date?: string;
  status?: string;
  expected_closing?: string;
  opportunity_amount?: number;
  currency?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Opportunity',
    naming_series: input.naming_series ?? 'CRM-OPP-.YYYY.-',
    opportunity_from: input.opportunity_from,
    party_name: input.party_name,
    company: input.company,
    transaction_date: input.transaction_date ?? new Date().toISOString().slice(0, 10),
    status: input.status ?? 'Open',
    ...(input.expected_closing ? { expected_closing: input.expected_closing } : {}),
    ...(input.opportunity_amount != null ? { opportunity_amount: input.opportunity_amount } : {}),
    ...(input.currency ? { currency: input.currency } : {}),
  };
}

export function buildCommunicationCreate(input: {
  subject: string;
  communication_medium: 'Phone' | 'Email' | 'Meeting' | 'Visit' | 'SMS' | 'Other' | 'Chat' | 'Event';
  content?: string;
  status?: string;
  sent_or_received?: 'Sent' | 'Received';
  reference_doctype?: string;
  reference_name?: string;
  phone_no?: string;
}): Record<string, unknown> {
  const content =
    input.content?.trim() ||
    `<p>${input.subject}</p>`;
  return {
    doctype: 'Communication',
    subject: input.subject.trim(),
    communication_medium: input.communication_medium,
    content,
    communication_type: 'Communication',
    status: input.status ?? 'Open',
    sent_or_received: input.sent_or_received ?? 'Sent',
    ...(input.reference_doctype && input.reference_name
      ? { reference_doctype: input.reference_doctype, reference_name: input.reference_name }
      : {}),
    ...(input.phone_no ? { phone_no: input.phone_no } : {}),
  };
}

export function buildEventCreate(input: {
  subject: string;
  starts_on: string;
  ends_on?: string;
  event_type?: 'Private' | 'Public';
  event_category?: string;
  description?: string;
  status?: string;
  reference_doctype?: string;
  reference_docname?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Event',
    subject: input.subject.trim(),
    starts_on: input.starts_on,
    event_type: input.event_type ?? 'Private',
    event_category: input.event_category ?? 'Meeting',
    status: input.status ?? 'Open',
    all_day: 0,
  };
  if (input.ends_on) d.ends_on = input.ends_on;
  if (input.description) d.description = input.description;
  if (input.reference_doctype && input.reference_docname) {
    d.reference_doctype = input.reference_doctype;
    d.reference_docname = input.reference_docname;
  }
  return d;
}

export function buildToDoCreate(input: {
  description: string;
  date?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: string;
  reference_type?: string;
  reference_name?: string;
  allocated_to?: string;
}): Record<string, unknown> {
  const desc = input.description.trim();
  const html = desc.startsWith('<') ? desc : `<p>${desc}</p>`;
  return {
    doctype: 'ToDo',
    description: html,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    priority: input.priority ?? 'Medium',
    status: input.status ?? 'Open',
    ...(input.reference_type && input.reference_name
      ? { reference_type: input.reference_type, reference_name: input.reference_name }
      : {}),
    ...(input.allocated_to ? { allocated_to: input.allocated_to } : {}),
  };
}

export function buildEmployeeCheckinCreate(input: {
  employee: string;
  time: string;
  log_type?: 'IN' | 'OUT';
  skip_auto_attendance?: boolean;
}): Record<string, unknown> {
  return {
    doctype: 'Employee Checkin',
    employee: input.employee,
    time: input.time,
    log_type: input.log_type ?? 'IN',
    skip_auto_attendance: input.skip_auto_attendance ? 1 : 0,
  };
}

export function buildLeavePolicyCreate(input: {
  title: string;
  company: string;
  leave_type?: string;
  annual_allocation?: number;
  is_active?: boolean;
  // تفاصيل سياسة الإجازة — جدول فرعي في HRMS
  leave_policy_details?: { leave_type: string; annual_allocation: number }[];
}): Record<string, unknown> {
  // في HRMS v16، يجب إرسال leave_policy_details كجدول فرعي
  const details = input.leave_policy_details
    ?? (input.leave_type && input.annual_allocation != null
      ? [{ leave_type: input.leave_type, annual_allocation: input.annual_allocation }]
      : []);

  return {
    doctype: 'Leave Policy',
    title: input.title.trim(),
    company: input.company,
    leave_policy_details: details.map((d) => ({
      doctype: 'Leave Policy Detail',
      leave_type: d.leave_type,
      annual_allocation: d.annual_allocation,
    })),
    is_active: input.is_active === false ? 0 : 1,
  };
}

export function buildLeaveAllocationCreate(input: {
  employee: string;
  leave_type: string;
  company: string;
  from_date: string;
  to_date: string;
  new_leaves_allocated: number;
}): Record<string, unknown> {
  return {
    doctype: 'Leave Allocation',
    employee: input.employee,
    leave_type: input.leave_type,
    company: input.company,
    from_date: input.from_date,
    to_date: input.to_date,
    new_leaves_allocated: input.new_leaves_allocated,
  };
}

export function buildPayrollEntryCreate(input: {
  company: string;
  start_date: string;
  end_date: string;
  posting_date?: string;
  payroll_frequency?: 'Monthly' | 'Fortnightly' | 'Weekly' | 'Daily';
  cost_center?: string;
  branch?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Payroll Entry',
    company: input.company,
    start_date: input.start_date,
    end_date: input.end_date,
    posting_date: input.posting_date ?? new Date().toISOString().slice(0, 10),
    payroll_frequency: input.payroll_frequency ?? 'Monthly',
    ...(input.cost_center ? { cost_center: input.cost_center } : {}),
    ...(input.branch ? { branch: input.branch } : {}),
  };
}

export function buildEmployeeAdvanceCreate(input: {
  employee: string;
  company: string;
  posting_date?: string;
  advance_amount: number;
  purpose?: string;
  mode_of_payment?: string;
}): Record<string, unknown> {
  return {
    doctype: 'Employee Advance',
    employee: input.employee,
    company: input.company,
    posting_date: input.posting_date ?? new Date().toISOString().slice(0, 10),
    advance_amount: input.advance_amount,
    ...(input.purpose ? { purpose: input.purpose } : {}),
    ...(input.mode_of_payment ? { mode_of_payment: input.mode_of_payment } : {}),
  };
}

export function buildLoanCreate(input: {
  applicant: string;
  company: string;
  loan_type: string;
  loan_amount: number;
  posting_date?: string;
  repayment_start_date?: string;
  repayment_method?: 'Repay Over Number of Periods' | 'Repay Fixed Amount per Period';
  repayment_periods?: number;
  monthly_repayment_amount?: number;
}): Record<string, unknown> {
  return {
    doctype: 'Loan',
    applicant_type: 'Employee',
    applicant: input.applicant,
    company: input.company,
    loan_type: input.loan_type,
    loan_amount: input.loan_amount,
    posting_date: input.posting_date ?? new Date().toISOString().slice(0, 10),
    ...(input.repayment_start_date ? { repayment_start_date: input.repayment_start_date } : {}),
    ...(input.repayment_method ? { repayment_method: input.repayment_method } : {}),
    ...(input.repayment_periods != null ? { repayment_periods: input.repayment_periods } : {}),
    ...(input.monthly_repayment_amount != null ? { monthly_repayment_amount: input.monthly_repayment_amount } : {}),
  };
}

export function buildSubscriptionPlanCreate(input: {
  plan_name: string;
  cost: number;
  currency: string;
  billing_interval_count?: number;
  billing_interval?: 'Day' | 'Week' | 'Month' | 'Year';
}): Record<string, unknown> {
  return {
    doctype: 'Subscription Plan',
    plan_name: input.plan_name.trim(),
    cost: input.cost,
    currency: input.currency,
    billing_interval_count: input.billing_interval_count ?? 1,
    billing_interval: input.billing_interval ?? 'Month',
  };
}

export function buildSubscriptionCreate(input: {
  party_type: 'Customer';
  party: string;
  start_date?: string;
  plan: string;
}): Record<string, unknown> {
  return {
    doctype: 'Subscription',
    party_type: input.party_type,
    party: input.party,
    start_date: input.start_date ?? new Date().toISOString().slice(0, 10),
    plans: [{ plan: input.plan }],
  };
}

/** طريقة دفع — Mode of Payment مع جدول حسابات الشركة (Mode of Payment Account) */
export function buildModeOfPaymentCreate(input: {
  mode_of_payment: string;
  type: 'Cash' | 'Bank' | 'Electronic' | 'General';
  enabled?: boolean;
  accounts?: { company: string; default_account: string }[];
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Mode of Payment',
    mode_of_payment: input.mode_of_payment.trim(),
    type: input.type,
    enabled: input.enabled !== false ? 1 : 0,
  };
  if (input.accounts && input.accounts.length > 0) {
    d.accounts = input.accounts
      .filter((a) => a.company?.trim() && a.default_account?.trim())
      .map((a) => ({
        company: a.company.trim(),
        default_account: a.default_account.trim(),
      }));
  }
  return d;
}

/** سجل وقت — Timesheet (ERPNext HRMS) مع جدول time_logs الفرعي */
export function buildTimesheetCreate(input: {
  employee: string;
  company?: string;
  start_date?: string;
  note?: string;
  time_logs: {
    from_time: string;
    to_time?: string;
    hours?: number;
    activity_type?: string;
    project?: string;
    task?: string;
    is_billable?: boolean;
    billing_hours?: number;
  }[];
}): Record<string, unknown> {
  const time_logs = input.time_logs
    .filter((tl) => tl.from_time)
    .map((tl, idx) => {
      const row: Record<string, unknown> = {
        idx: idx + 1,
        from_time: tl.from_time,
      };
      if (tl.to_time) row.to_time = tl.to_time;
      if (tl.hours != null && tl.hours > 0) row.hours = tl.hours;
      if (tl.activity_type) row.activity_type = tl.activity_type;
      if (tl.project) row.project = tl.project;
      if (tl.task) row.task = tl.task;
      if (tl.is_billable) {
        row.is_billable = 1;
        if (tl.billing_hours != null && tl.billing_hours > 0) row.billing_hours = tl.billing_hours;
      }
      return row;
    });
  const d: Record<string, unknown> = {
    doctype: 'Timesheet',
    employee: input.employee,
    time_logs,
  };
  if (input.company) d.company = input.company;
  if (input.start_date) d.start_date = input.start_date;
  if (input.note?.trim()) d.note = input.note.trim();
  return d;
}

/** تحديث سجل وقت — تحديث time_logs في Timesheet موجود (مثل إيقاف المؤقت) */
export function buildTimesheetUpdate(input: {
  time_logs: {
    from_time: string;
    to_time?: string;
    hours?: number;
    activity_type?: string;
    project?: string;
    task?: string;
    is_billable?: boolean;
    billing_hours?: number;
  }[];
  note?: string;
}): Record<string, unknown> {
  const time_logs = input.time_logs
    .filter((tl) => tl.from_time)
    .map((tl, idx) => {
      const row: Record<string, unknown> = {
        idx: idx + 1,
        from_time: tl.from_time,
      };
      if (tl.to_time) row.to_time = tl.to_time;
      if (tl.hours != null && tl.hours > 0) row.hours = tl.hours;
      if (tl.activity_type) row.activity_type = tl.activity_type;
      if (tl.project) row.project = tl.project;
      if (tl.task) row.task = tl.task;
      if (tl.is_billable) {
        row.is_billable = 1;
        if (tl.billing_hours != null && tl.billing_hours > 0) row.billing_hours = tl.billing_hours;
      }
      return row;
    });
  const d: Record<string, unknown> = {
    time_logs,
  };
  if (input.note?.trim()) d.note = input.note.trim();
  return d;
}

/** شركة جديدة — Company */

/** شركة جديدة — Company */
export function buildCompanyCreate(input: {
  company_name: string;
  abbr?: string;
  default_currency?: string;
  country?: string;
  language?: string;
  chart_of_accounts?: string;
}): Record<string, unknown> {
  const d: Record<string, unknown> = {
    doctype: 'Company',
    company_name: input.company_name.trim(),
  };
  if (input.abbr?.trim()) d.abbr = input.abbr.trim();
  if (input.default_currency) d.default_currency = input.default_currency;
  if (input.country) d.country = input.country;
  if (input.language) d.language = input.language;
  if (input.chart_of_accounts) d.chart_of_accounts = input.chart_of_accounts;
  return d;
}

/** سنة مالية — Fiscal Year */
export function buildFiscalYearCreate(input: {
  year: string;
  year_start_date: string;
  year_end_date: string;
}): Record<string, unknown> {
  return {
    doctype: 'Fiscal Year',
    year: input.year.trim(),
    year_start_date: input.year_start_date,
    year_end_date: input.year_end_date,
  };
}

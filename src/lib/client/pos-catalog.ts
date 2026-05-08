/** صف أصناف موحّد: قائمة Item أو ناتج `get_items` من نقطة البيع. */
export type PosSellCatalogRow = {
  name: string;
  item_name: string;
  item_code: string;
  item_group: string;
  disabled?: number;
  price_list_rate?: number;
  actual_qty?: number;
  item_image?: string;
  currency?: string;
  uom?: string;
  /** قالب له متغيرات (من ERPNext Item.has_variants) */
  has_variants?: boolean | number | string;
  /** صنف فرعي مرتبط بقالب — إن وُجد لا يُعامَل كقالب */
  variant_of?: string;
  /** اسم مستند الصنف في ERPNext (غالبًا name === item_code) — للتصفية variant_of */
  item_doc_name?: string;
};

/** صنف قائمة لعرض المتغيرات — يطابق حقول Item المطلوبة */
export type PosVariantListRow = {
  name: string;
  item_name: string;
  item_code: string;
  item_image?: string;
};

export function isPosTemplateItem(row: PosSellCatalogRow): boolean {
  if (row.variant_of?.trim()) return false;
  const hv = row.has_variants;
  if (hv === true || hv === 1) return true;
  if (typeof hv === 'string') return hv === '1' || hv.toLowerCase() === 'true';
  return false;
}

/** اسم مستند القالب لاستخدامه في `variant_of = …` */
export function posTemplateDocName(row: PosSellCatalogRow): string {
  return (row.item_doc_name ?? row.name ?? row.item_code).trim();
}

function mapApiRow(r: Record<string, unknown>): PosSellCatalogRow | null {
  const frappeName =
    typeof r.name === 'string' && r.name.trim() ? String(r.name).trim() : null;
  const codeRaw = r.item_code ?? r.name;
  const code = typeof codeRaw === 'string' && codeRaw.trim() ? codeRaw.trim() : null;
  if (!code) return null;
  const item_name =
    typeof r.item_name === 'string' && r.item_name.trim()
      ? r.item_name.trim()
      : typeof r.description === 'string' && r.description.trim()
        ? r.description.trim()
        : code;
  const ig =
    typeof r.item_group === 'string' && r.item_group.trim() ? String(r.item_group).trim() : '';
  const rate =
    typeof r.price_list_rate === 'number'
      ? r.price_list_rate
      : typeof r.price_list_rate === 'string'
        ? Number(r.price_list_rate)
        : undefined;
  const qty =
    typeof r.actual_qty === 'number'
      ? r.actual_qty
      : typeof r.actual_qty === 'string'
        ? Number(r.actual_qty)
        : undefined;
  const hv = r.has_variants;
  const hasVariants =
    hv === 1 ||
    hv === true ||
    hv === '1' ||
    (typeof hv === 'string' && hv.toLowerCase() === 'true');
  const voRaw = r.variant_of;
  const variant_of =
    typeof voRaw === 'string' && voRaw.trim() ? voRaw.trim() : undefined;
  return {
    name: code,
    item_code: code,
    item_name,
    item_group: ig,
    price_list_rate: Number.isFinite(rate) ? rate : undefined,
    actual_qty: Number.isFinite(qty) ? qty : undefined,
    item_image: typeof r.item_image === 'string' ? r.item_image : undefined,
    currency: typeof r.currency === 'string' ? r.currency : undefined,
    uom: typeof r.uom === 'string' ? r.uom : undefined,
    has_variants: hasVariants,
    variant_of,
    item_doc_name: frappeName ?? code,
  };
}

/** يستخرج مصفوفة الأصناف من ناتج `get_items` (أو غلاف message). */
export function normalizePosCatalogPayload(data: unknown): PosSellCatalogRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data
      .map((x) => (typeof x === 'object' && x !== null ? mapApiRow(x as Record<string, unknown>) : null))
      .filter((x): x is PosSellCatalogRow => x !== null);
  }
  if (typeof data === 'object' && data !== null && 'message' in data) {
    return normalizePosCatalogPayload((data as { message: unknown }).message);
  }
  if (typeof data === 'object' && data !== null && 'items' in data) {
    const items = (data as { items: unknown }).items;
    return normalizePosCatalogPayload(items);
  }
  return [];
}

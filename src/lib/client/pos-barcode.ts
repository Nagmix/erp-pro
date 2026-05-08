/**
 * استخراج كود الصنف من ناتج `search_for_serial_or_batch_or_barcode_number` في ERPNext
 * (قد يكون الجسم مباشرة أو داخل `message`).
 */
export function extractBarcodeHit(data: unknown): { item_code: string; item_name?: string } | null {
  if (data == null) return null;
  if (typeof data === 'object' && data !== null && 'message' in data) {
    return extractBarcodeHit((data as { message: unknown }).message);
  }
  if (typeof data !== 'object' || data === null) return null;
  const o = data as Record<string, unknown>;
  const codeRaw = o.item_code ?? o.itemCode;
  if (typeof codeRaw !== 'string' || !codeRaw.trim()) return null;
  const item_code = codeRaw.trim();
  const item_name = typeof o.item_name === 'string' && o.item_name.trim() ? o.item_name.trim() : undefined;
  return { item_code, item_name };
}

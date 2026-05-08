/**
 * مسارات شاشات الإضافة في ERP Pro لكل DocType (للربط من قوائم الاختيار).
 * يُضاف query ‎`create=1`‎ لفتح حوار الإنشاء تلقائياً عند الوصول من قائمة منسدلة.
 */
const ROUTES: Record<string, { href: string; label: string }> = {
  'POS Profile': { href: '/pos/settings/profiles?create=1', label: 'إضافة ملف نقطة بيع' },
  Customer: { href: '/sales/customers?create=1', label: 'إضافة عميل' },
  Item: { href: '/inventory/items?create=1', label: 'إضافة صنف' },
  Warehouse: { href: '/inventory/warehouses?create=1', label: 'إضافة مستودع' },
  'Cost Center': { href: '/accounting/cost-centers?create=1', label: 'إضافة مركز تكلفة' },
};

export function getErpDocCreateShortcut(doctype: string): { href: string; label: string } | null {
  return ROUTES[doctype] ?? null;
}

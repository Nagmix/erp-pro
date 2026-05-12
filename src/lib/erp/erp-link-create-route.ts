/**
 * مسارات شاشات الإضافة في ERP Pro لكل DocType (للربط من قوائم الاختيار).
 * يُضاف query ‎`create=1`‎ لفتح حوار الإنشاء تلقائياً عند الوصول من قائمة منسدلة.
 */
const ROUTES: Record<string, { href: string; label: string }> = {
  'POS Profile': { href: '/pos/settings/profiles?create=1', label: 'إضافة ملف نقطة بيع' },
  Customer: { href: '/sales/customers?create=1', label: 'إضافة عميل جديد' },
  Supplier: { href: '/purchases/suppliers?create=1', label: 'إضافة مورد جديد' },
  Employee: { href: '/hr/employees?create=1', label: 'إضافة موظف جديد' },
  Item: { href: '/inventory/items?create=1', label: 'إضافة صنف' },
  Warehouse: { href: '/inventory/warehouses?create=1', label: 'إضافة مستودع' },
  'Cost Center': { href: '/accounting/cost-centers?create=1', label: 'إضافة مركز تكلفة' },
  Account: { href: '/accounting/chart-of-accounts?create=1', label: 'إضافة حساب' },
  'Mode of Payment': { href: '/accounting/settings?tab=payment-methods&create=1', label: 'إضافة طريقة دفع' },
  'Expense Claim Type': { href: '/accounting/settings?tab=expense-types&create=1', label: 'إضافة نوع مصروف' },
};

export function getErpDocCreateShortcut(doctype: string): { href: string; label: string } | null {
  return ROUTES[doctype] ?? null;
}

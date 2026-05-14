/**
 * Route ↔ role checks (DEVELOPMENT_PLAN 2.4). Used by edge proxy + optional UI filtering.
 * ERPNext role names vary; we match substrings / common titles + demo accounts.
 */

function normRoles(roles: string[]): string[] {
  return roles.map(r => (r && typeof r === 'string') ? r.toLowerCase() : '').filter(Boolean);
}

function isSuperAdmin(roles: string[]): boolean {
  return roles.some(r => r && typeof r === 'string' && /system manager|administrator|مدير النظام/i.test(r));
}

type Rule = { prefix: string; test: (roles: string[]) => boolean };

const RULES: Rule[] = [
  {
    prefix: '/settings',
    test: r => isSuperAdmin(r) || r.some(x => /settings|setup/i.test(x)),
  },
  {
    prefix: '/audit-log',
    test: r => isSuperAdmin(r) || r.some(x => /audit|مراجعة/i.test(x)),
  },
  {
    prefix: '/accounting',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /account|محاسب|مالي|finance|purchase master|sales user/i.test(x)),
  },
  {
    prefix: '/pos',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /sales|بيع|customer|عميل|دعم|crm|cashier|كاشير|pos|point of sale/i.test(x)),
  },
  {
    prefix: '/sales',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /sales|بيع|customer|عميل|دعم|crm/i.test(x)),
  },
  {
    prefix: '/purchases',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /purchase|مشتريات|مورد|supplier|procurement/i.test(x)),
  },
  {
    prefix: '/inventory',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /stock|item|مخزون|صنف|warehouse|manufacturing user/i.test(x)),
  },
  {
    prefix: '/manufacturing',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /manufactur|تصنيع|bom|work order|production/i.test(x)),
  },
  {
    prefix: '/hr',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /hr|موارد بشرية|employee|payroll|leave|attendance/i.test(x)),
  },
  {
    prefix: '/crm',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /crm|sales|lead|opportunit|فرص|عميل/i.test(x)),
  },
  {
    prefix: '/reports',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /report|تقرير|account|sales|manager/i.test(x)),
  },
  {
    prefix: '/operations',
    test: r =>
      isSuperAdmin(r) ||
      r.some(x => /operations|عمليات|time|workflow|rental|developer/i.test(x)),
  },
];

const SORTED = [...RULES].sort((a, b) => b.prefix.length - a.prefix.length);

/** Longest-prefix match: first matching rule wins; no match → allowed (e.g. `/`). */
export function canAccessPath(pathname: string, roles: string[]): boolean {
  const r = normRoles(roles);
  for (const rule of SORTED) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.test(roles);
    }
  }
  return true;
}

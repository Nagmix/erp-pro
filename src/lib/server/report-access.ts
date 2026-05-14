import { getReportDef } from '@/lib/reports/catalog';

export function ensureReportAllowed(reportId: string, roles: string[]): { ok: boolean; reason?: string } {
  const def = getReportDef(reportId);
  if (!def) return { ok: false, reason: 'التقرير غير معروف' };
  const norm = roles.map((r) => (r && typeof r === 'string') ? r.toLowerCase() : '').filter(Boolean);
  const allowed = def.allowedRoles.some((x) => {
    const key = x.toLowerCase();
    return norm.some((r) => r.includes(key) || key.includes(r));
  });
  if (!allowed && !norm.some((r) => r.includes('system manager') || r.includes('administrator'))) {
    return { ok: false, reason: 'ليست لديك صلاحية على هذا التقرير' };
  }
  return { ok: true };
}

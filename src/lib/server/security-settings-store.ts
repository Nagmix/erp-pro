/**
 * تفضيلات واجهة الأمان (طبقة ERP Pro) — ليست بديل System Settings في Frappe.
 * المسار: data/security-ui-settings.json
 */
import fs from 'fs';
import path from 'path';

const FILE = 'security-ui-settings.json';

export type SecurityUiSettings = {
  /** سياسة كلمات المرور */
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  /** إعدادات الجلسة */
  sessionHours: number;
  simultaneousSessions: number;
  forcePasswordReset: boolean;
  forcePasswordResetDays: number;
  /** المصادقة الثنائية */
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  /** تحديد محاولات الدخول */
  maxLoginAttempts: number;
  lockoutDuration: number;
  /** تقييد IP */
  ipRestriction: boolean;
  allowedIps: string;
  updatedAt?: string;
};

const defaults: SecurityUiSettings = {
  minPasswordLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false,
  sessionHours: 8,
  simultaneousSessions: 3,
  forcePasswordReset: false,
  forcePasswordResetDays: 90,
  twoFactorEnabled: false,
  twoFactorMethod: 'OTP App',
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  ipRestriction: false,
  allowedIps: '',
};

function fp(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

export function loadSecurityUiSettings(): SecurityUiSettings {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as Partial<SecurityUiSettings>;
    return { ...defaults, ...j };
  } catch {
    return { ...defaults };
  }
}

export function saveSecurityUiSettings(partial: Partial<SecurityUiSettings>): SecurityUiSettings {
  const next = { ...loadSecurityUiSettings(), ...partial, updatedAt: new Date().toISOString() };
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

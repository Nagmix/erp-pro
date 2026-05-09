/**
 * تفضيلات واجهة الأمان (طبقة ERP Pro) — ليست بديل System Settings في Frappe.
 * المسار: data/security-ui-settings.json
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE = 'security-ui-settings.json';

const ERPNEXT_DOCTYPE = 'Security Settings';
const ERPNEXT_DOC_NAME = 'Config';

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

/** Load from local JSON only (sync, for internal use) */
function loadSecurityUiSettingsLocal(): SecurityUiSettings {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as Partial<SecurityUiSettings>;
    return { ...defaults, ...j };
  } catch {
    return { ...defaults };
  }
}

async function syncToErpnext(data: SecurityUiSettings, sid?: string) {
  try {
    const existing = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid).catch(() => null);
    const jsonStr = JSON.stringify(data);
    if (existing) {
      await updateDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, { config_json: jsonStr }, sid);
    } else {
      await createDoc(ERPNEXT_DOCTYPE, {
        doctype: ERPNEXT_DOCTYPE,
        name: ERPNEXT_DOC_NAME,
        __newname: ERPNEXT_DOC_NAME,
        config_json: jsonStr,
      }, sid);
    }
  } catch (err) {
    console.error('[security-settings] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<SecurityUiSettings | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const parsed = JSON.parse(doc.config_json as string) as Partial<SecurityUiSettings>;
      return { ...defaults, ...parsed };
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadSecurityUiSettings(sid?: string): Promise<SecurityUiSettings> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadSecurityUiSettingsLocal();
}

export async function saveSecurityUiSettings(partial: Partial<SecurityUiSettings>, sid?: string): Promise<SecurityUiSettings> {
  const current = loadSecurityUiSettingsLocal();
  const next = { ...current, ...partial, updatedAt: new Date().toISOString() };
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(next, sid).catch(() => {});
  return next;
}

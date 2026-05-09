/**
 * إعدادات رسائل CRM — ملف JSON تحت مجلد data
 * يتبع نفس نمط smtp-config-store.ts و security-settings-store.ts
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE_NAME = 'crm-messaging.json';

const ERPNEXT_DOCTYPE = 'CRM Messaging Settings';
const ERPNEXT_DOC_NAME = 'Config';

export type CrmMessagingSettings = {
  sms_provider: string;
  sms_api_key: string;
  wa_provider: string;
  wa_api_key: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  auto_reply_template: string;
  rule_invoice: boolean;
  rule_due: boolean;
  rule_renew: boolean;
  rule_appointment: boolean;
  updatedAt?: string;
};

const MASK = '••••••••';

const defaults = (): CrmMessagingSettings => ({
  sms_provider: '',
  sms_api_key: '',
  wa_provider: '',
  wa_api_key: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  auto_reply_template: 'مرحباً {{customer_name}}، تذكير بفاتورتك {{invoice_no}}',
  rule_invoice: true,
  rule_due: true,
  rule_renew: true,
  rule_appointment: true,
});

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

/** Load from local JSON only (sync, for internal use) */
function loadCrmMessagingSettingsLocal(): CrmMessagingSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const data = JSON.parse(raw) as Partial<CrmMessagingSettings>;
    return { ...defaults(), ...data };
  } catch {
    return defaults();
  }
}

async function syncToErpnext(data: CrmMessagingSettings, sid?: string) {
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
    console.error('[crm-messaging] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<CrmMessagingSettings | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const parsed = JSON.parse(doc.config_json as string) as Partial<CrmMessagingSettings>;
      return { ...defaults(), ...parsed };
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

/** تحميل الإعدادات — يجرّب ERPNext أولاً ثم يعود للملف المحلي */
export async function loadCrmMessagingSettings(sid?: string): Promise<CrmMessagingSettings> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadCrmMessagingSettingsLocal();
}

/** حفظ الإعدادات مع دمج القيم السابقة (يحافظ على كلمات المرور إذا لم تُرسَل) */
export function saveCrmMessagingSettings(
  partial: Partial<CrmMessagingSettings>,
  sid?: string,
): CrmMessagingSettings {
  const prev = loadCrmMessagingSettingsLocal();
  const merged: CrmMessagingSettings = {
    ...prev,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  // إذا أُرسل قناع بدل كلمة المرور، نحتفظ بالقيمة السابقة
  if (merged.sms_api_key === MASK) merged.sms_api_key = prev.sms_api_key;
  if (merged.wa_api_key === MASK) merged.wa_api_key = prev.wa_api_key;
  if (merged.smtp_password === MASK) merged.smtp_password = prev.smtp_password;

  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(merged, sid).catch(() => {});
  return merged;
}

/** إرجاع نسخة مع قناع على الحقول الحساسة (لـ GET) */
export function maskSensitive(
  s: CrmMessagingSettings,
): Omit<CrmMessagingSettings, 'sms_api_key' | 'wa_api_key' | 'smtp_password'> & {
    sms_api_key: string;
    wa_api_key: string;
    smtp_password: string;
  } {
  return {
    ...s,
    sms_api_key: s.sms_api_key ? MASK : '',
    wa_api_key: s.wa_api_key ? MASK : '',
    smtp_password: s.smtp_password ? MASK : '',
  };
}

/** حالة اتصال كل قناة */
export type ChannelStatus = {
  sms: 'connected' | 'disconnected';
  whatsapp: 'connected' | 'disconnected';
  smtp: 'connected' | 'disconnected';
};

export function getChannelStatus(s: CrmMessagingSettings): ChannelStatus {
  return {
    sms: s.sms_provider && s.sms_api_key ? 'connected' : 'disconnected',
    whatsapp: s.wa_provider && s.wa_api_key ? 'connected' : 'disconnected',
    smtp: s.smtp_host && s.smtp_user && s.smtp_password ? 'connected' : 'disconnected',
  };
}

/** التحقق من صحة الإعدادات قبل الحفظ — يُرجع قائمة الأخطاء */
export function validateCrmMessagingSettings(
  s: Partial<CrmMessagingSettings>,
): string[] {
  const errors: string[] = [];

  // إذا تم تحديد مزود SMS يجب إدخال مفتاح API
  if (s.sms_provider?.trim() && !s.sms_api_key?.trim() && s.sms_api_key !== MASK) {
    errors.push('مفتاح API لـ SMS مطلوب عند تحديد مزود SMS');
  }

  // إذا تم تحديد مزود واتساب يجب إدخال مفتاح API
  if (s.wa_provider?.trim() && !s.wa_api_key?.trim() && s.wa_api_key !== MASK) {
    errors.push('مفتاح API لواتساب مطلوب عند تحديد مزود واتساب');
  }

  // إذا تم تحديد خادم بريد يجب إدخال المستخدم وكلمة المرور
  if (s.smtp_host?.trim()) {
    if (!s.smtp_user?.trim()) {
      errors.push('مستخدم البريد مطلوب عند تحديد خادم بريد');
    }
    if (!s.smtp_password?.trim() && s.smtp_password !== MASK) {
      errors.push('كلمة مرور البريد مطلوبة عند تحديد خادم بريد');
    }
    const port = Number(s.smtp_port);
    if (s.smtp_port && (isNaN(port) || port < 1 || port > 65535)) {
      errors.push('منفذ البريد يجب أن يكون رقمًا بين 1 و 65535');
    }
  }

  // قالب الرد التلقائي
  if (s.auto_reply_template !== undefined && s.auto_reply_template.trim().length === 0) {
    errors.push('قالب الرد التلقائي لا يمكن أن يكون فارغًا');
  }

  return errors;
}

/**
 * إعدادات SMTP المحلية للاختبار — ملف JSON تحت مجلد data (مثل بوابة المطور).
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE_NAME = 'smtp-config.json';

const ERPNEXT_DOCTYPE = 'SMTP Settings';
const ERPNEXT_DOC_NAME = 'Config';

export type SmtpConfigPersisted = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** كلمة مرور التطبيق — تُخزَّن محلياً فقط */
  pass: string;
  fromEmail: string;
  fromName?: string;
  updatedAt?: string;
};

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

async function syncToErpnext(data: SmtpConfigPersisted, sid?: string) {
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
    console.error('[smtp-config] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<SmtpConfigPersisted | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const parsed = JSON.parse(doc.config_json as string) as SmtpConfigPersisted;
      if (parsed && typeof parsed.host === 'string') return parsed;
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadSmtpConfig(sid?: string): Promise<SmtpConfigPersisted | null> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;

  const fp = filePath();
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const data = JSON.parse(raw) as SmtpConfigPersisted;
    if (!data || typeof data.host !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSmtpConfig(next: Omit<SmtpConfigPersisted, 'updatedAt'>, sid?: string): SmtpConfigPersisted {
  const fp = filePath();
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  const payload: SmtpConfigPersisted = {
    ...next,
    port: Math.max(1, Math.min(65535, Number(next.port) || 587)),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(payload, sid).catch(() => {});
  return payload;
}

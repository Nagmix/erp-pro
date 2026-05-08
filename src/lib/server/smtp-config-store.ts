/**
 * إعدادات SMTP المحلية للاختبار — ملف JSON تحت مجلد data (مثل بوابة المطور).
 */
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'smtp-config.json';

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

export function loadSmtpConfig(): SmtpConfigPersisted | null {
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

export function saveSmtpConfig(next: Omit<SmtpConfigPersisted, 'updatedAt'>): SmtpConfigPersisted {
  const fp = filePath();
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  const payload: SmtpConfigPersisted = {
    ...next,
    port: Math.max(1, Math.min(65535, Number(next.port) || 587)),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

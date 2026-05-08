#!/usr/bin/env node
/**
 * تسجيل دخول إلى Frappe/ERPNext وتوليد مفاتيح API وحفظها في data/frappe-backend.json
 * للاستخدام بدون فتح Desk (بعد تشغيل bench محلياً).
 *
 * مثال:
 *   FRAPPE_HOST=http://127.0.0.1:8000 FRAPPE_USER=Administrator FRAPPE_PASSWORD=secret node scripts/frappe-bootstrap-keys.mjs
 *
 * [v16 compat] يدعم ERPNext v15 و v16:
 *   - يستخدم BACKEND_VERSION للإشارة إلى الإصدار (الافتراضي: v16)
 *   - يحفظ الإصدار في frappe-backend.json لاستخدامه لاحقاً
 *   - في v16، قد يتغير مسار توليد المفاتيح — مع استرجات آمنة
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outFile = path.join(root, 'data', 'frappe-backend.json');

const host = (process.env.FRAPPE_HOST || process.env.BACKEND_HOST || 'http://127.0.0.1:8000').replace(/\/$/, '');
const usr = process.env.FRAPPE_USER || process.env.BACKEND_ADMIN_USER || 'Administrator';
const pwd = process.env.FRAPPE_PASSWORD || process.env.BACKEND_ADMIN_PASSWORD || '';
const keyUser = process.env.FRAPPE_KEY_USER || usr;
// [v16 compat] Backend version — defaults to v16, can be overridden via BACKEND_VERSION env var
const backendVersion = process.env.BACKEND_VERSION || 'v16';

if (!pwd) {
  console.error('ضع FRAPPE_PASSWORD أو BACKEND_ADMIN_PASSWORD');
  process.exit(1);
}

function parseKeys(msg) {
  if (msg == null) return null;
  if (Array.isArray(msg) && msg.length >= 2 && typeof msg[0] === 'string' && typeof msg[1] === 'string') {
    return { apiKey: msg[0], apiSecret: msg[1] };
  }
  if (typeof msg === 'object') {
    const k = msg.api_key ?? msg.apiKey;
    const s = msg.api_secret ?? msg.apiSecret;
    if (typeof k === 'string' && typeof s === 'string') return { apiKey: k, apiSecret: s };
  }
  return null;
}

const loginRes = await fetch(`${host}/api/method/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ usr, pwd }),
});
const sid = loginRes.headers.get('set-cookie')?.match(/sid=([^;]+)/)?.[1];
if (!loginRes.ok || !sid) {
  const t = await loginRes.text();
  console.error('فشل login:', loginRes.status, t);
  process.exit(1);
}

/**
 * [v16 compat] توليد مفاتيح API — يجرب مسارات v16 ثم v15.
 * v15: frappe.core.doctype.user.user.generate_keys
 * v16: may move to frappe.auth.doctype.user.user.generate_keys
 */
const generateKeyPaths = [
  'frappe.core.doctype.user.user.generate_keys',
  'frappe.auth.doctype.user.user.generate_keys',
];

let genRes = null;
let usedPath = '';
for (const keyPath of generateKeyPaths) {
  try {
    genRes = await fetch(`${host}/api/method/${keyPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: JSON.stringify({ user: keyUser }),
    });
    if (genRes.ok) {
      usedPath = keyPath;
      break;
    }
    // If not ok but not 404, it's a real error — stop trying
    const status = genRes.status;
    if (status !== 404 && status !== 403) {
      const errText = await genRes.text();
      console.error(`فشل generate_keys (${keyPath}):`, status, errText);
      process.exit(1);
    }
    genRes = null;
  } catch (err) {
    console.log(`[v16 compat] ${keyPath} not available, trying next...`);
    genRes = null;
  }
}

if (!genRes) {
  console.error('فشل توليد مفاتيح API: جميع المسارات فشلت');
  process.exit(1);
}

const genJson = await genRes.json().catch(() => ({}));
if (!genRes.ok) {
  console.error('فشل generate_keys:', genRes.status, genJson);
  process.exit(1);
}
const pair = parseKeys(genJson.message);
if (!pair) {
  console.error('استجابة غير متوقعة:', genJson);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const payload = {
  backendHost: host,
  apiKey: pair.apiKey,
  apiSecret: pair.apiSecret,
  // [v16 compat] Store the backend version for use by the Next.js app
  backendVersion: backendVersion,
  updatedAt: new Date().toISOString(),
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
console.log('تم الكتابة إلى', outFile);
console.log('إصدار ERPNext:', backendVersion, usedPath ? `(استخدم ${usedPath})` : '');
console.log('أضف في .env إن رغبت:');
console.log(`BACKEND_HOST=${host}`);
console.log(`BACKEND_API_KEY=${pair.apiKey}`);
console.log(`BACKEND_API_SECRET=${pair.apiSecret}`);
console.log(`BACKEND_VERSION=${backendVersion}`);

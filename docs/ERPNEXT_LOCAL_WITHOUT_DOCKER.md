# تشغيل ERPNext محلياً بدون Docker (مؤقت) وربطه بـ ERP Pro

## السياق

- **Docker** هو المسار الموصى به في المستودع (`docker-compose.yml` + `./erp-pro.sh setup`).
- إذا أردت **تجربة بدون Docker** (مؤقتاً)، فـ **ERPNext الرسمي** يعمل عبر **bench** على **Linux** (أو **WSL2** على Windows). لا يوجد مسار دعم رسمي لـ bench على Windows الأصلي.
- واجهة **ERP Pro** (`Next.js`) تتصل بـ ERPNext عبر `BACKEND_HOST` وإما **جلسة sid** (تسجيل دخول) أو **مفاتيح API** (`Authorization: token api_key:api_secret`) — انظر `src/lib/server/backend.ts` و`src/lib/server/frappe-connection-store.ts`.

## إخفاء واجهة ERPNext (Desk) عن المستخدمين

1. **لا تنشر** منفذ Frappe (مثلاً `8000`) على الإنترنت؛ اجعله يستمع على `127.0.0.1` فقط أو شبكة داخلية.
2. **المستخدمون يفتحون فقط** `http://localhost:3000` (واجهة ERP Pro). عنوان ERPNext يُقرأ **من خادم Next** فقط (`BACKEND_HOST` أو `data/frappe-backend.json`).
3. **التهيئة والمفاتيح** من صفحة المشروع: **`/settings/erp-backend`** (ربط تلقائي أو لصق مفاتيح + حفظ في `data/frappe-backend.json`).
4. لاحقاً يمكن وضع **Nginx** أمام Frappe لحظر مسار `/app` للعامة والإبقاء على `/api` فقط — خارج نطاق هذا الملف.

## متغيرات بيئة مفيدة (`Next.js`)

| المتغير | الوصف |
|---------|--------|
| `BACKEND_HOST` | عنوان قاعدة ERPNext، مثل `http://127.0.0.1:8000` |
| `BACKEND_API_KEY` / `BACKEND_API_SECRET` | مفاتيح API (بديل لملف `data/frappe-backend.json`) |
| `BACKEND_ADMIN_USER` / `BACKEND_ADMIN_PASSWORD` | تسجيل دخول المسؤول لجلسة النظام عندما **لا** تُضبط مفاتيح API |
| `FRAPPE_BACKEND_SETUP_SECRET` | سر اختياري؛ يُرسل من الواجهة في الرأس `x-frappe-setup-secret` لأول تهيئة قبل وجود JWT بصلاحية System Manager |

## المسار الموصى به على Windows: WSL2 + bench

1. ثبّت **WSL2** وتوزيعة **Ubuntu**.
2. داخل Ubuntu، اتبع دليل Frappe لـ **bench** و**ERPNext v15** (Python، MariaDB، Redis، Node، wkhtmltopdf حسب الوثائق الرسمية).
3. أنشئ موقعاً مثلاً `bench new-site ...` ثم `bench --site ... install-app erpnext`.
4. شغّل: `bench start` (أو `bench serve` حسب إعدادك) بحيث يكون الـ API على `http://127.0.0.1:8000`.
5. من **Windows** شغّل Next مع:
   - `BACKEND_HOST=http://127.0.0.1:8000`
   - أو احفظ العنوان من **`/settings/erp-backend`** (يُكتب في `data/frappe-backend.json`).

> ملاحظة: إن كان Next يعمل على Windows وـ bench داخل WSL، قد تحتاج إلى عنوان IP الخاص بـ WSL (مثل `http://172.x.x.x:8000`) بدل `127.0.0.1` حسب إعداد الشبكة.

## ربط مفاتيح API تلقائياً

### من واجهة ERP Pro

1. سجّل دخولاً يمنح JWT بدور **System Manager** (أو عيّن `FRAPPE_BACKEND_SETUP_SECRET` في بيئة Next واستخدمه في الصفحة).
2. افتح **`/settings/erp-backend`**.
3. أدخل عنوان ERPNext وكلمة مرور المدير ثم **«توليد المفاتيح وحفظها تلقائياً»**.
4. يُستدعى `login` ثم `generate_keys` ويُحفظ الملف **`data/frappe-backend.json`** (مُستبعد من Git).

### من سطر الأوامر (بدون فتح Desk)

```bash
node scripts/frappe-bootstrap-keys.mjs
```

يُقرأ العنوان وكلمة المرور من المتغيرات البيئية (انظر تعليقات أعلى السكربت).

## بعد التهيئة

- أعد تشغيل `npm run dev` إن لزم (لإعادة قراءة الملف بعد أول إنشاء).
- جرّب تسجيل الدخول في ERP Pro بحساب موجود في ERPNext (مع `ERPNEXT_TRY_LOGIN=true` إن كنت تدمج `sid` من Frappe — انظر `docs/WORK_MECHANISM.md`).

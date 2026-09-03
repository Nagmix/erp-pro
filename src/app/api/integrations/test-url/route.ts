import { NextRequest, NextResponse } from 'next/server';
import { assertSafeExternalUrl } from '@/lib/server/ssrf-guard';
import { getUserRolesFromRequest, isSystemManager } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

/**
 * F-03/F-04 (تدقيق 2026-09): فحص اتصال حقيقي لرابط يوفره المستخدم
 * (بوابة دفع / منصة متجر) — بدل محاكاة "نجح الاتصال" بعد 1.5 ثانية.
 *
 * - بوابة إدارية: مدير نظام فقط.
 * - حرس SSRF: منع النطاقات الداخلية بعد حل DNS + منافذ قياسية فقط.
 * - محاولة HEAD ثم GET عند الرفض، بمهلة 5 ثوانٍ، مع قياس زمن الاستجابة.
 */
export async function POST(request: NextRequest) {
  if (!isSystemManager(getUserRolesFromRequest(request))) {
    return NextResponse.json(
      { success: false, error: 'اختبار الاتصال يتطلب صلاحية مدير النظام' },
      { status: 403 }
    );
  }

  let url = '';
  try {
    const body = (await request.json()) as { url?: string };
    url = typeof body.url === 'string' ? body.url.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'JSON غير صالح' }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ success: false, error: 'الرابط مطلوب' }, { status: 400 });
  }

  try {
    const safeUrl = await assertSafeExternalUrl(url);
    const t0 = Date.now();
    let status = 0;
    let ok = false;
    try {
      const res = await fetch(safeUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      status = res.status;
      ok = res.ok;
    } catch {
      // بعض الخوادم ترفض HEAD — جرّب GET كحل أخير
      try {
        const res = await fetch(safeUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        });
        status = res.status;
        ok = res.ok;
      } catch (e2) {
        return NextResponse.json({
          success: true,
          data: {
            reachable: false,
            error: e2 instanceof Error ? e2.message : 'تعذر الوصول للرابط',
            ms: Date.now() - t0,
          },
        });
      }
    }
    return NextResponse.json({
      success: true,
      data: { reachable: true, ok, status, ms: Date.now() - t0 },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'رابط غير صالح' },
      { status: 400 }
    );
  }
}

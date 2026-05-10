/**
 * API Route — إعدادات التطبيق الرئيسية (GET/POST)
 *
 * GET:  تحميل الإعدادات من ERPNext (أو ملف محلي كاحتياطي)
 * POST: حفظ قسم من الإعدادات في ERPNext
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  loadAppSettingsFromErp,
  saveAppSettingsToErp,
  type AppSettings,
  type AppSettingsSection,
} from '@/lib/server/app-settings-store';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const result = await loadAppSettingsFromErp();
    return NextResponse.json({
      success: true,
      data: result.settings,
      source: result.source,
      error: result.error || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل تحميل الإعدادات';
    return NextResponse.json(
      { success: false, error: message, data: null, source: 'defaults' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      section: AppSettingsSection;
      values: Partial<AppSettings>;
    };

    const { section, values } = body;

    if (!section || !values) {
      return NextResponse.json(
        { success: false, error: 'القسم والقيم مطلوبان' },
        { status: 400 },
      );
    }

    // التحقق من أن القسم صالح
    const validSections: AppSettingsSection[] = [
      'general', 'accounting', 'sales', 'purchases',
      'inventory', 'hr', 'printing',
    ];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { success: false, error: `قسم غير صالح: ${section}` },
        { status: 400 },
      );
    }

    // تصفية القيم المسموحة فقط
    const sanitized: Partial<AppSettings> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val !== undefined) {
        (sanitized as Record<string, unknown>)[key] = val;
      }
    }

    // حفظ في ERPNext
    const result = await saveAppSettingsToErp(section, sanitized);

    // سجل المراجعة
    void appendAppAuditLog(`app_settings_saved:${section}`, 'settings', {
      section,
      keys: Object.keys(sanitized),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'فشل حفظ الإعدادات في الخادم',
          savedLocally: true,
        },
        { status: 207 }, // Multi-Status: saved locally but ERPNext failed
      );
    }

    // إعادة تحميل الإعدادات بعد الحفظ لإرجاع أحدث قيم
    const reloadResult = await loadAppSettingsFromErp();

    return NextResponse.json({
      success: true,
      data: reloadResult.settings,
      source: reloadResult.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعدادات';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

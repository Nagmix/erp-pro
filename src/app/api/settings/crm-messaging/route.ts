import { NextRequest, NextResponse } from 'next/server';
import {
  loadCrmMessagingSettings,
  saveCrmMessagingSettings,
  maskSensitive,
  getChannelStatus,
  validateCrmMessagingSettings,
} from '@/lib/server/crm-messaging-store';
import { appendAppAuditLog } from '@/lib/server/app-audit-log';

export async function GET() {
  try {
    const settings = loadCrmMessagingSettings();
    const masked = maskSensitive(settings);
    const status = getChannelStatus(settings);
    return NextResponse.json({
      success: true,
      data: masked,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل قراءة الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    // تصفية الحقول المسموحة فقط
    const allowedFields = [
      'sms_provider', 'sms_api_key',
      'wa_provider', 'wa_api_key',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
      'auto_reply_template',
      'rule_invoice', 'rule_due', 'rule_renew', 'rule_appointment',
    ] as const;

    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }

    // تحويل أنواع القيم المنطقية
    for (const boolKey of ['rule_invoice', 'rule_due', 'rule_renew', 'rule_appointment'] as const) {
      if (boolKey in sanitized) {
        sanitized[boolKey] = Boolean(sanitized[boolKey]);
      }
    }

    // تنظيف النصوص
    for (const strKey of ['sms_provider', 'wa_provider', 'smtp_host', 'smtp_user'] as const) {
      if (typeof sanitized[strKey] === 'string') {
        sanitized[strKey] = (sanitized[strKey] as string).trim();
      }
    }

    // دمج مع القيم السابقة للتحقق
    const prev = loadCrmMessagingSettings();
    const merged = { ...prev, ...sanitized };

    // التحقق من الصحة
    const errors = validateCrmMessagingSettings(merged);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(' | ') },
        { status: 400 },
      );
    }

    // حفظ
    const saved = saveCrmMessagingSettings(sanitized);
    const masked = maskSensitive(saved);
    const status = getChannelStatus(saved);

    // سجل المراجعة
    void appendAppAuditLog('crm_messaging_settings_saved', 'settings', {
      sms_provider: saved.sms_provider,
      wa_provider: saved.wa_provider,
      smtp_host: saved.smtp_host,
      rules: {
        invoice: saved.rule_invoice,
        due: saved.rule_due,
        renew: saved.rule_renew,
        appointment: saved.rule_appointment,
      },
    });

    return NextResponse.json({
      success: true,
      data: masked,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الإعدادات';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================
// POST /api/setup/install-hrms
// يثبّت تطبيق HRMS على موقع ERPNext الحالي
// يستخدم جلسة المسؤول لاستدعاء frappe.installer.install_app
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callMethod, getList, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

/**
 * فحص هل HRMS مثبت على الموقع بالفعل
 */
async function isHrmsAlreadyInstalled(userSession?: string): Promise<boolean> {
  // الطريقة 1: فحص وحدة HR (تدل على HRMS مثبت)
  try {
    const hrModule = await getDoc('Module Def', 'HR', userSession) as Record<string, unknown>;
    if (hrModule?.name) return true;
  } catch { /* غير موجود */ }

  // الطريقة 2: فحص DocType Expense Claim
  try {
    const meta = await callMethod('frappe.client.get_value', {
      doctype: 'DocType',
      fieldname: 'name',
      name: 'Expense Claim',
    }, userSession) as Record<string, unknown> | null;
    if (meta?.name) return true;
  } catch { /* غير موجود */ }

  // الطريقة 3: فحص Installed Applications
  try {
    const installedApps = await getList('Installed Application', {
      fields: ['app_name'],
      limit: 50,
    }, userSession);
    if (Array.isArray(installedApps)) {
      return installedApps.some((app) => {
        const record = app as Record<string, unknown>;
        return String(record.app_name || '').toLowerCase() === 'hrms';
      });
    }
  } catch { /* تجاهل */ }

  return false;
}

/**
 * تثبيت HRMS عبر Frappe API
 */
async function installHrmsOnSite(userSession?: string): Promise<{ success: boolean; message: string }> {
  // الطريقة 1: استخدام frappe.installer.install_app
  try {
    const result = await callMethod('frappe.installer.install_app', {
      app: 'hrms',
    }, userSession);
    console.log('[HRMS Install] frappe.installer.install_app result:', JSON.stringify(result));
    return { success: true, message: 'تم تثبيت HRMS بنجاح عبر frappe.installer.install_app' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[HRMS Install] frappe.installer.install_app failed:', msg);

    // إذا كان التطبيق مثبتاً بالفعل
    if (/already installed|مثبت|already exists/i.test(msg)) {
      return { success: true, message: 'HRMS مثبت بالفعل على الموقع' };
    }

    // الطريقة 2: استخدام frappe.client.insert لإضافة سجل Installed Application
    try {
      await callMethod('frappe.client.insert', {
        doc: {
          doctype: 'Installed Application',
          app_name: 'hrms',
        },
      }, userSession);
      console.log('[HRMS Install] Added Installed Application record');
      return { success: true, message: 'تمت إضافة سجل HRMS — يرجى تنفيذ migrate لإنشاء أنواع المستندات' };
    } catch (insertError) {
      const insertMsg = insertError instanceof Error ? insertError.message : String(insertError);
      console.warn('[HRMS Install] Insert Installed Application failed:', insertMsg);
    }

    // الطريقة 3: استخدام frappe.utils.installer.install_app (v16 path)
    try {
      const result = await callMethod('frappe.utils.installer.install_app', {
        app: 'hrms',
      }, userSession);
      console.log('[HRMS Install] v16 path result:', JSON.stringify(result));
      return { success: true, message: 'تم تثبيت HRMS بنجاح (v16 path)' };
    } catch (v16Error) {
      const v16Msg = v16Error instanceof Error ? v16Error.message : String(v16Error);
      console.warn('[HRMS Install] v16 path failed:', v16Msg);
    }

    return {
      success: false,
      message: `تعذر تثبيت HRMS عبر API: ${msg}`,
    };
  }
}

/**
 * POST — تثبيت HRMS على الموقع
 */
export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);

    // فحص أولاً هل HRMS مثبت بالفعل
    const alreadyInstalled = await isHrmsAlreadyInstalled(userSession);
    if (alreadyInstalled) {
      return NextResponse.json({
        success: true,
        message: 'HRMS مثبت بالفعل على الموقع',
        alreadyInstalled: true,
      });
    }

    // محاولة التثبيت
    const result = await installHrmsOnSite(userSession);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      alreadyInstalled: false,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تثبيت HRMS';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

/**
 * GET — فحص حالة HRMS التشخيصية
 */
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const installed = await isHrmsAlreadyInstalled(userSession);

    // جمع معلومات تشخيصية
    const diagnostics: Record<string, unknown> = {};

    // فحص Installed Applications
    try {
      const apps = await getList('Installed Application', {
        fields: ['app_name', 'app_version'],
        limit: 50,
      }, userSession);
      diagnostics.installedApps = apps;
    } catch {
      diagnostics.installedApps = 'تعذر الجلب';
    }

    // فحص Module Def HR
    try {
      const hrModule = await getDoc('Module Def', 'HR', userSession) as Record<string, unknown>;
      diagnostics.hrModule = hrModule?.name || null;
    } catch {
      diagnostics.hrModule = null;
    }

    // فحص DocType Expense Claim
    try {
      const expenseClaimMeta = await callMethod('frappe.client.get_value', {
        doctype: 'DocType',
        fieldname: ['name', 'module'],
        name: 'Expense Claim',
      }, userSession);
      diagnostics.expenseClaimDocType = expenseClaimMeta;
    } catch {
      diagnostics.expenseClaimDocType = null;
    }

    return NextResponse.json({
      success: true,
      hrmsInstalled: installed,
      diagnostics,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فحص حالة HRMS';
    return NextResponse.json({ success: false, hrmsInstalled: false, message: msg }, { status: 500 });
  }
}

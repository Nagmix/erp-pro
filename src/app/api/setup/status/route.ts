import { NextResponse } from 'next/server';
import { getCount, isBackendAvailable } from '@/lib/server/backend';
import fs from 'fs';
import path from 'path';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


/** ملف علامة اكتمال الإعداد */
function setupFlagPath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, 'app-config.json');
}

function isSetupFlagSet(): boolean {
  try {
    const raw = fs.readFileSync(setupFlagPath(), 'utf8');
    const config = JSON.parse(raw) as { setupComplete?: boolean };
    return config.setupComplete === true;
  } catch {
    return false;
  }
}

/**
 * GET /api/setup/status
 * التحقق من حالة إعداد النظام — هل الشركة والسنة المالية ومركز التكلفة موجودة؟
 */
export async function GET() {
  try {
    const available = await isBackendAvailable().catch(() => false);

    if (!available) {
      // الخادم غير متاح — نُبلغ أن الإعداد مطلوب
      return NextResponse.json({
        success: true,
        data: {
          configured: false,
          steps: { company: false, fiscalYear: false, costCenter: false },
          backendAvailable: false,
        },
      });
    }

    // التحقق من علامة الإعداد المحلية أولاً
    if (isSetupFlagSet()) {
      return NextResponse.json({
        success: true,
        data: {
          configured: true,
          steps: { company: true, fiscalYear: true, costCenter: true },
          backendAvailable: true,
        },
      });
    }

    // فحص ERPNext مباشرة
    const [companyCount, fiscalYearCount, costCenterCount] = await Promise.all([
      getCount('Company').catch(() => 0),
      getCount('Fiscal Year', [['disabled', '=', '0']] as string[][]).catch(() => 0),
      getCount('Cost Center', [['is_group', '=', '0']] as string[][]).catch(() => 0),
    ]);

    const company = companyCount > 0;
    const fiscalYear = fiscalYearCount > 0;
    const costCenter = costCenterCount > 0;
    const configured = company && fiscalYear && costCenter;

    return NextResponse.json({
      success: true,
      data: {
        configured,
        steps: { company, fiscalYear, costCenter },
        backendAvailable: true,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل التحقق من حالة الإعداد';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

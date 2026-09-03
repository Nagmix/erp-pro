import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getUserRolesFromRequest, isSystemManager } from '@/lib/server/request-session';

// Prevent static analysis during build — this route needs a live database
export const dynamic = 'force-dynamic';

// MED-08: سجل التدقيق حساس — قراءة للمدراء فقط (كان مكشوفاً لأي مستخدم مسجل)
export async function GET(request: NextRequest) {
  const roles = getUserRolesFromRequest(request);
  if (!isSystemManager(roles)) {
    return NextResponse.json(
      { success: false, error: 'قراءة سجل التدقيق تتطلب صلاحية مدير النظام' },
      { status: 403 }
    );
  }
  try {
    const rows = await prisma.appAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 150,
      select: { id: true, action: true, subject: true, payload: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    // MED-08: فشل صاخب بدل إرجاع قائمة فارغة بصمت (كان يوهم أن السجل خالٍ)
    console.error('[audit-log] فشل قراءة سجل التدقيق:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر قراءة سجل التدقيق — تحقق من قاعدة البيانات المحلية' },
      { status: 500 }
    );
  }
}

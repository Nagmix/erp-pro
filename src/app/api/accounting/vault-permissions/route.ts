import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounting/vault-permissions — list all
export async function GET() {
  try {
    const permissions = await db.vaultPermission.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل الصلاحيات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/vault-permissions — save all (replace entire set)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const perms: { employeeId: string; vaultId: string; canDeposit: boolean; canWithdraw: boolean; canView: boolean }[] = body.permissions;

    if (!Array.isArray(perms)) {
      return NextResponse.json({ success: false, error: 'بيانات الصلاحيات غير صالحة' }, { status: 400 });
    }

    // Use a transaction to replace all permissions
    await db.$transaction(async (tx) => {
      // Delete all existing
      await tx.vaultPermission.deleteMany();

      // Insert new ones
      if (perms.length > 0) {
        await tx.vaultPermission.createMany({
          data: perms.map((p) => ({
            employeeId: p.employeeId,
            vaultId: p.vaultId,
            canDeposit: Boolean(p.canDeposit),
            canWithdraw: Boolean(p.canWithdraw),
            canView: Boolean(p.canView),
          })),
        });
      }
    });

    const result = await db.vaultPermission.findMany();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حفظ الصلاحيات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/accounting/vault-permissions — upsert single permission
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, vaultId, canDeposit, canWithdraw, canView } = body;

    if (!employeeId || !vaultId) {
      return NextResponse.json({ success: false, error: 'معرف الموظف والخزينة مطلوبان' }, { status: 400 });
    }

    const perm = await db.vaultPermission.upsert({
      where: {
        employeeId_vaultId: { employeeId, vaultId },
      },
      create: {
        employeeId,
        vaultId,
        canDeposit: Boolean(canDeposit ?? false),
        canWithdraw: Boolean(canWithdraw ?? false),
        canView: Boolean(canView ?? false),
      },
      update: {
        ...(canDeposit !== undefined && { canDeposit: Boolean(canDeposit) }),
        ...(canWithdraw !== undefined && { canWithdraw: Boolean(canWithdraw) }),
        ...(canView !== undefined && { canView: Boolean(canView) }),
      },
    });

    return NextResponse.json({ success: true, data: perm });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الصلاحية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/accounting/vault-permissions — delete single permission
export async function DELETE(request: NextRequest) {
  try {
    const employeeId = request.nextUrl.searchParams.get('employeeId');
    const vaultId = request.nextUrl.searchParams.get('vaultId');

    if (!employeeId || !vaultId) {
      return NextResponse.json({ success: false, error: 'معرف الموظف والخزينة مطلوبان' }, { status: 400 });
    }

    await db.vaultPermission.delete({
      where: { employeeId_vaultId: { employeeId, vaultId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف الصلاحية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

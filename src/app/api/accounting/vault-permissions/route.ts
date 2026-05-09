import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, updateDoc, deleteDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

const DOCTYPE = 'Vault Permission';

// GET /api/accounting/vault-permissions — list all
export async function GET(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    const data = await getList(DOCTYPE, {
      fields: ['name', 'employee', 'employee_id', 'vault', 'vault_id', 'can_deposit', 'can_withdraw', 'can_view', 'creation', 'modified'],
      limit: 500,
      order_by: 'creation desc',
    }, sid);
    return NextResponse.json({ success: true, data });
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

    const sid = getFrappeSidFromRequest(request);
    
    // Get existing permissions
    const existing = await getList(DOCTYPE, { fields: ['name'], limit: 500 }, sid);
    
    // Delete all existing
    for (const item of (existing || [])) {
      try { await deleteDoc(DOCTYPE, (item as { name: string }).name, sid); } catch {}
    }
    
    // Create new ones
    const created: Record<string, unknown>[] = [];
    for (const p of perms) {
      try {
        const doc = await createDoc(DOCTYPE, {
          doctype: DOCTYPE,
          employee_id: p.employeeId,
          vault_id: p.vaultId,
          can_deposit: Boolean(p.canDeposit) ? 1 : 0,
          can_withdraw: Boolean(p.canWithdraw) ? 1 : 0,
          can_view: Boolean(p.canView) ? 1 : 0,
        }, sid);
        created.push(doc as Record<string, unknown>);
      } catch {}
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حفظ الصلاحيات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/accounting/vault-permissions — upsert single permission
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, employeeId, vaultId, canDeposit, canWithdraw, canView } = body;
    const sid = getFrappeSidFromRequest(request);
    
    if (name) {
      // Update existing
      const doc = await updateDoc(DOCTYPE, String(name), {
        ...(employeeId !== undefined && { employee_id: String(employeeId) }),
        ...(vaultId !== undefined && { vault_id: String(vaultId) }),
        ...(canDeposit !== undefined && { can_deposit: Boolean(canDeposit) ? 1 : 0 }),
        ...(canWithdraw !== undefined && { can_withdraw: Boolean(canWithdraw) ? 1 : 0 }),
        ...(canView !== undefined && { can_view: Boolean(canView) ? 1 : 0 }),
      }, sid);
      return NextResponse.json({ success: true, data: doc });
    } else {
      // Create new
      if (!employeeId || !vaultId) {
        return NextResponse.json({ success: false, error: 'معرف الموظف والخزينة مطلوبان' }, { status: 400 });
      }
      const doc = await createDoc(DOCTYPE, {
        doctype: DOCTYPE,
        employee_id: String(employeeId),
        vault_id: String(vaultId),
        can_deposit: Boolean(canDeposit) ? 1 : 0,
        can_withdraw: Boolean(canWithdraw) ? 1 : 0,
        can_view: Boolean(canView) ? 1 : 0,
      }, sid);
      return NextResponse.json({ success: true, data: doc }, { status: 201 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الصلاحية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/accounting/vault-permissions — delete single permission
export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الصلاحية مطلوب' }, { status: 400 });
    }
    const sid = getFrappeSidFromRequest(request);
    await deleteDoc(DOCTYPE, String(name), sid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل حذف الصلاحية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

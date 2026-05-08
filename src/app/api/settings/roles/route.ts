// GET /api/settings/roles - Fetch ERPNext roles with user counts
// PUT /api/settings/roles - Update a role's properties

import { NextRequest, NextResponse } from 'next/server';
import { getList, getCount, getDoc, updateDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

type RoleRow = {
  name: string;
  desk_access: number;
  search_bar: number;
  two_factor_auth: number;
  disabled: number;
};

type HasRoleRow = {
  role: string;
  parent: string;
};

type EnrichedRole = {
  name: string;
  desk_access: boolean;
  search_bar: boolean;
  two_factor_auth: boolean;
  disabled: boolean;
  users: number;
};

// GET - List all roles with user counts
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);

    // Fetch roles and Has Role child-table entries in parallel
    const [rawRoles, rawHasRoles] = await Promise.all([
      getList('Role', {
        fields: ['name', 'desk_access', 'search_bar', 'two_factor_auth', 'disabled'],
        limit: 500,
        order_by: 'name asc',
      }, userSession).catch(() => []) as Promise<RoleRow[]>,
      getList('Has Role', {
        fields: ['role', 'parent'],
        filters: [['parenttype', '=', 'User']],
        limit: 5000,
      }, userSession).catch(() => []) as Promise<HasRoleRow[]>,
    ]);

    // Count unique users per role
    const usersPerRole = new Map<string, Set<string>>();
    for (const hr of rawHasRoles) {
      if (!hr.role || !hr.parent) continue;
      if (!usersPerRole.has(hr.role)) {
        usersPerRole.set(hr.role, new Set());
      }
      usersPerRole.get(hr.role)!.add(hr.parent);
    }

    const roles: EnrichedRole[] = (rawRoles || []).map((r) => ({
      name: r.name,
      desk_access: !!r.desk_access,
      search_bar: !!r.search_bar,
      two_factor_auth: !!r.two_factor_auth,
      disabled: !!r.disabled,
      users: usersPerRole.get(r.name)?.size || 0,
    }));

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل الأدوار';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT - Update a single role
export async function PUT(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json();
    const { name, ...fields } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الدور مطلوب' }, { status: 400 });
    }

    // Build update payload with only valid Role fields
    const updateData: Record<string, unknown> = {};
    if (typeof fields.desk_access === 'boolean') updateData.desk_access = fields.desk_access ? 1 : 0;
    if (typeof fields.search_bar === 'boolean') updateData.search_bar = fields.search_bar ? 1 : 0;
    if (typeof fields.two_factor_auth === 'boolean') updateData.two_factor_auth = fields.two_factor_auth ? 1 : 0;
    if (typeof fields.disabled === 'boolean') updateData.disabled = fields.disabled ? 1 : 0;

    const data = await updateDoc('Role', String(name), updateData, userSession);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الدور';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

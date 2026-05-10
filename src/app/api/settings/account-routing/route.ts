import { NextRequest, NextResponse } from 'next/server';
import {
  loadAccountRoutingRules,
  addAccountRoutingRule,
  updateAccountRoutingRule,
  deleteAccountRoutingRule,
  type AccountRoutingRule,
} from '@/lib/server/account-routing-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET() {
  const rules = loadAccountRoutingRules();
  return NextResponse.json({ success: true, data: rules });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<AccountRoutingRule> & { _action?: string };
  const action = body._action;

  if (action === 'delete') {
    if (!body.id) return NextResponse.json({ success: false, error: 'معرف القاعدة مطلوب' }, { status: 400 });
    const ok = deleteAccountRoutingRule(body.id);
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, error: 'القاعدة غير موجودة' }, { status: 404 });
  }

  if (action === 'update') {
    if (!body.id) return NextResponse.json({ success: false, error: 'معرف القاعدة مطلوب' }, { status: 400 });
    const result = updateAccountRoutingRule(body.id, {
      document_type: body.document_type,
      default_account: body.default_account,
      company: body.company,
    });
    return result
      ? NextResponse.json({ success: true, data: result })
      : NextResponse.json({ success: false, error: 'القاعدة غير موجودة' }, { status: 404 });
  }

  // Create
  if (!body.document_type || !body.default_account || !body.company) {
    return NextResponse.json({ success: false, error: 'جميع الحقول مطلوبة' }, { status: 400 });
  }
  const rule = addAccountRoutingRule({
    document_type: body.document_type,
    default_account: body.default_account,
    company: body.company,
  });
  return NextResponse.json({ success: true, data: rule }, { status: 201 });
}

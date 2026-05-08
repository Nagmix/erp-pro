import { NextRequest, NextResponse } from 'next/server';
import { authenticatePosRequest } from '@/lib/server/pos-api-auth';
import { posApplyMinimalSetup, posCheckReadiness } from '@/lib/server/pos-service';

/**
 * تهيئة خفيفة + تقرير جاهزية — لا يُنشئ شركة أو مخطط حسابات كاملاً.
 * الخيارات: POS Settings، ربط Cash بحساب الشركة، إنشاء ملف POS أدنى عند توفر الشروط.
 */
export async function POST(request: NextRequest) {
  const auth = authenticatePosRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      company?: string;
      apply_minimal_pos_settings?: boolean;
      ensure_cash_mode_account?: boolean;
      create_default_pos_profile_if_missing?: boolean;
    };

    const company = body.company?.trim();
    if (!company) {
      return NextResponse.json({ success: false, error: 'company مطلوب' }, { status: 400 });
    }

    const readiness = await posCheckReadiness(company, auth.sid);

    let setup_actions: string[] = [];
    const runSetup =
      body.apply_minimal_pos_settings ||
      body.ensure_cash_mode_account ||
      body.create_default_pos_profile_if_missing;
    if (runSetup) {
      const r = await posApplyMinimalSetup(auth.sid, {
        company,
        ensure_cash_mode_account: Boolean(body.ensure_cash_mode_account),
        create_default_pos_profile_if_missing: Boolean(body.create_default_pos_profile_if_missing),
      });
      setup_actions = r.actions;
    }

    return NextResponse.json({
      success: true,
      data: {
        readiness,
        setup_actions,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل التهيئة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

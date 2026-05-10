import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc, createDoc } from '@/lib/server/backend';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calculation_name, pay_method = 'salary' } = body;

    if (!calculation_name) {
      return NextResponse.json({ success: false, error: 'اسم الحساب مطلوب' }, { status: 400 });
    }

    if (pay_method === 'salary') {
      await updateDoc('Commission Calculation', calculation_name, {
        status: 'Added to Salary',
        pay_method: 'Salary',
      });
      return NextResponse.json({ success: true, data: { status: 'Added to Salary' } });
    } else {
      const calc = (await getDoc('Commission Calculation', calculation_name)) as Record<string, unknown>;

      await createDoc('Payment Entry', {
        payment_type: 'Pay',
        party_type: 'Employee',
        party: calc.employee,
        paid_amount: calc.commission_amount || 0,
        received_amount: calc.commission_amount || 0,
        reference_no: `COMM-${calculation_name}`,
        reference_date: new Date().toISOString().split('T')[0],
        remarks: `عمولة مبيعات - ${calculation_name}`,
      });

      await updateDoc('Commission Calculation', calculation_name, {
        status: 'Paid',
        pay_method: 'Expense Voucher',
      });

      return NextResponse.json({ success: true, data: { status: 'Paid' } });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

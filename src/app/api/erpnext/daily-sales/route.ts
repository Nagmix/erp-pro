import { NextRequest, NextResponse } from 'next/server';
import { getList } from '@/lib/server/backend';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const company = searchParams.get('company');

  if (!date) {
    return NextResponse.json({ success: false, error: 'التاريخ مطلوب' }, { status: 400 });
  }

  try {
    const filters: string[][] = [
      ['posting_date', '=', date],
      ['docstatus', '=', '1'],
    ];
    if (company) filters.push(['company', '=', company]);

    const invoices = await getList('Sales Invoice', {
      fields: [
        'name', 'posting_date', 'posting_time', 'customer', 'customer_name',
        'base_grand_total', 'base_net_total', 'outstanding_amount',
        'is_return', 'sales_partner', 'owner',
      ],
      filters,
      limit: 5000,
      order_by: 'posting_time asc',
    }) as Record<string, unknown>[];

    const returnFilters: string[][] = [
      ['posting_date', '=', date],
      ['docstatus', '=', '1'],
      ['is_return', '=', '1'],
    ];
    if (company) returnFilters.push(['company', '=', company]);

    const returns = await getList('Sales Invoice', {
      fields: ['base_grand_total'],
      filters: returnFilters,
      limit: 5000,
    }) as Record<string, unknown>[];

    const invoiceNames = invoices.map((inv) => String(inv.name));

    let items: Record<string, unknown>[] = [];
    if (invoiceNames.length > 0) {
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < invoiceNames.length; i += batchSize) {
        batches.push(invoiceNames.slice(i, i + batchSize));
      }
      const itemResults = await Promise.all(
        batches.map((batch) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const itemFilters: any[][] = [['parent', 'in', batch], ['docstatus', '=', '1']];
          return getList('Sales Invoice Item', {
            fields: ['item_code', 'item_name', 'qty', 'base_amount', 'parent', 'item_group'],
            filters: itemFilters,
            limit: 5000,
          }).catch(() => []) as Promise<Record<string, unknown>[]>;
        })
      );
      items = itemResults.flat();
    }

    // Payment entries for the day
    let payments: Record<string, unknown>[] = [];
    try {
      const peFilters: string[][] = [
        ['posting_date', '=', date],
        ['docstatus', '=', '1'],
        ['payment_type', '=', 'Receive'],
      ];
      if (company) peFilters.push(['company', '=', company]);
      payments = await getList('Payment Entry', {
        fields: ['name', 'mode_of_payment', 'base_paid_amount', 'posting_date'],
        filters: peFilters,
        limit: 5000,
      }) as Record<string, unknown>[];
    } catch { /* ignore */ }

    // GL entries for payment method analysis
    let glEntries: Record<string, unknown>[] = [];
    try {
      if (invoiceNames.length > 0) {
        const batchSize = 50;
        const batches: string[][] = [];
        for (let i = 0; i < invoiceNames.length; i += batchSize) {
          batches.push(invoiceNames.slice(i, i + batchSize));
        }
        const glResults = await Promise.all(
          batches.map((batch) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const glFilters: any[][] = [
              ['voucher_no', 'in', batch],
              ['docstatus', '=', '1'],
            ];
            return getList('GL Entry', {
              fields: ['account', 'debit', 'credit', 'voucher_no'],
              filters: glFilters,
              limit: 5000,
            }).catch(() => []) as Promise<Record<string, unknown>[]>;
          })
        );
        glEntries = glResults.flat();
      }
    } catch { /* ignore */ }

    const totalSales = invoices
      .filter((inv) => inv.is_return !== 1 && inv.is_return !== true)
      .reduce((sum, inv) => sum + Number(inv.base_grand_total || 0), 0);

    const totalReturns = returns.reduce((sum, inv) => sum + Math.abs(Number(inv.base_grand_total || 0)), 0);

    const netSales = totalSales - totalReturns;

    const totalCashReceived = payments.reduce((sum, p) => sum + Number(p.base_paid_amount || 0), 0);
    const totalCredit = netSales - totalCashReceived;

    const avgInvoiceValue = invoices.length > 0 ? netSales / invoices.length : 0;

    // Hourly breakdown
    const hourlyData: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyData[h] = 0;
    invoices.forEach((inv) => {
      if (inv.is_return === 1 || inv.is_return === true) return;
      const time = String(inv.posting_time || '');
      if (time) {
        const hour = parseInt(time.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hourlyData[hour] += Number(inv.base_grand_total || 0);
        }
      }
    });

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, number> = {};
    payments.forEach((p) => {
      const method = String(p.mode_of_payment || 'أخرى');
      paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + Number(p.base_paid_amount || 0);
    });

    // Top selling products
    const productSales: Record<string, { name: string; qty: number; revenue: number; group: string }> = {};
    items.forEach((item) => {
      const code = String(item.item_code || '');
      if (!code) return;
      if (!productSales[code]) {
        productSales[code] = { name: String(item.item_name || code), qty: 0, revenue: 0, group: String(item.item_group || '') };
      }
      productSales[code].qty += Number(item.qty || 0);
      productSales[code].revenue += Number(item.base_amount || 0);
    });
    const topProducts = Object.entries(productSales)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Sales by rep (owner)
    const salesByRep: Record<string, { name: string; count: number; total: number }> = {};
    invoices.forEach((inv) => {
      if (inv.is_return === 1 || inv.is_return === true) return;
      const owner = String(inv.owner || 'غير محدد');
      if (!salesByRep[owner]) {
        salesByRep[owner] = { name: owner, count: 0, total: 0 };
      }
      salesByRep[owner].count += 1;
      salesByRep[owner].total += Number(inv.base_grand_total || 0);
    });
    const salesByRepList = Object.values(salesByRep).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      data: {
        date,
        summary: {
          totalSales,
          totalReturns,
          netSales,
          totalCashReceived,
          totalCredit: Math.max(0, totalCredit),
          avgInvoiceValue,
          invoiceCount: invoices.length,
          returnCount: returns.length,
        },
        hourlyData: Object.entries(hourlyData).map(([hour, amount]) => ({
          hour: parseInt(hour, 10),
          amount,
        })),
        paymentMethods: Object.entries(paymentMethodBreakdown).map(([method, amount]) => ({
          method,
          amount,
        })),
        topProducts,
        salesByRep: salesByRepList,
        invoices: invoices.map((inv) => ({
          name: inv.name,
          customer: inv.customer_name || inv.customer,
          total: Number(inv.base_grand_total || 0),
          isReturn: inv.is_return === 1 || inv.is_return === true,
          outstanding: Number(inv.outstanding_amount || 0),
          time: String(inv.posting_time || ''),
          owner: String(inv.owner || ''),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'فشل تحميل بيانات المبيعات اليومية' },
      { status: 500 }
    );
  }
}

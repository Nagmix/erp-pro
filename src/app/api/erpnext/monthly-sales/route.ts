import { NextRequest, NextResponse } from 'next/server';
import { getList } from '@/lib/server/backend';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // format: YYYY-MM
  const company = searchParams.get('company');

  if (!month) {
    return NextResponse.json({ success: false, error: 'الشهر مطلوب (صيغة YYYY-MM)' }, { status: 400 });
  }

  try {
    const [year, mon] = month.split('-').map(Number);
    if (!year || !mon || mon < 1 || mon > 12) {
      return NextResponse.json({ success: false, error: 'صيغة الشهر غير صحيحة' }, { status: 400 });
    }

    const fromDate = `${year}-${String(mon).padStart(2, '0')}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const toDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Previous month boundaries
    const prevMonthDate = new Date(year, mon - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMon = prevMonthDate.getMonth() + 1;
    const prevFromDate = `${prevYear}-${String(prevMon).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMon, 0).getDate();
    const prevToDate = `${prevYear}-${String(prevMon).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

    const baseFilters: string[][] = [
      ['posting_date', '>=', fromDate],
      ['posting_date', '<=', toDate],
      ['docstatus', '=', '1'],
    ];
    if (company) baseFilters.push(['company', '=', company]);

    const invoices = await getList('Sales Invoice', {
      fields: [
        'name', 'posting_date', 'customer', 'customer_name',
        'base_grand_total', 'base_net_total', 'outstanding_amount',
        'is_return', 'owner', 'sales_partner',
      ],
      filters: baseFilters,
      limit: 5000,
      order_by: 'posting_date asc',
    }) as Record<string, unknown>[];

    // Previous month invoices for comparison
    const prevFilters: string[][] = [
      ['posting_date', '>=', prevFromDate],
      ['posting_date', '<=', prevToDate],
      ['docstatus', '=', '1'],
    ];
    if (company) prevFilters.push(['company', '=', company]);

    const prevInvoices = await getList('Sales Invoice', {
      fields: ['base_grand_total', 'is_return'],
      filters: prevFilters,
      limit: 5000,
    }).catch(() => []) as Record<string, unknown>[];

    // Payment entries
    let payments: Record<string, unknown>[] = [];
    try {
      const peFilters: string[][] = [
        ['posting_date', '>=', fromDate],
        ['posting_date', '<=', toDate],
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

    // Items for category analysis
    const invoiceNames = invoices.map((inv) => String(inv.name));
    let items: Record<string, unknown>[] = [];
    if (invoiceNames.length > 0) {
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < invoiceNames.length; i += batchSize) {
        batches.push(invoiceNames.slice(i, i + batchSize));
      }
      const itemResults = await Promise.all(
        batches.map((batch) =>
          getList('Sales Invoice Item', {
            fields: ['item_code', 'item_name', 'qty', 'base_amount', 'base_net_rate', 'parent', 'item_group'],
            filters: [['parent', 'in', batch] as any[], ['docstatus', '=', '1']],
            limit: 5000,
          }).catch(() => []) as Promise<Record<string, unknown>[]>
        )
      );
      items = itemResults.flat();
    }

    // Calculate totals
    const totalSales = invoices
      .filter((inv) => inv.is_return !== 1 && inv.is_return !== true)
      .reduce((sum, inv) => sum + Number(inv.base_grand_total || 0), 0);

    const totalReturns = invoices
      .filter((inv) => inv.is_return === 1 || inv.is_return === true)
      .reduce((sum, inv) => sum + Math.abs(Number(inv.base_grand_total || 0)), 0);

    const netSales = totalSales - totalReturns;
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.base_paid_amount || 0), 0);
    const outstanding = Math.max(0, netSales - totalCollected);

    const prevTotalSales = prevInvoices
      .filter((inv) => inv.is_return !== 1 && inv.is_return !== true)
      .reduce((sum, inv) => sum + Number(inv.base_grand_total || 0), 0);
    const prevTotalReturns = prevInvoices
      .filter((inv) => inv.is_return === 1 || inv.is_return === true)
      .reduce((sum, inv) => sum + Math.abs(Number(inv.base_grand_total || 0)), 0);
    const prevNetSales = prevTotalSales - prevTotalReturns;

    const growthPercent = prevNetSales > 0 ? ((netSales - prevNetSales) / prevNetSales) * 100 : 0;

    // Daily trend
    const dailyData: Record<string, number> = {};
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyData[dateStr] = 0;
    }
    invoices.forEach((inv) => {
      if (inv.is_return === 1 || inv.is_return === true) return;
      const date = String(inv.posting_date || '');
      if (date in dailyData) {
        dailyData[date] += Number(inv.base_grand_total || 0);
      }
    });

    // Week-over-week comparison
    const weeklyData: { week: number; total: number }[] = [];
    for (let w = 0; w < 5; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, lastDay);
      if (startDay > lastDay) break;
      let weekTotal = 0;
      for (let d = startDay; d <= endDay; d++) {
        const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        weekTotal += dailyData[dateStr] || 0;
      }
      weeklyData.push({ week: w + 1, total: weekTotal });
    }

    // Sales by category
    const categorySales: Record<string, number> = {};
    items.forEach((item) => {
      const group = String(item.item_group || 'أخرى');
      categorySales[group] = (categorySales[group] || 0) + Number(item.base_amount || 0);
    });

    // Top 10 customers
    const customerSales: Record<string, { name: string; total: number }> = {};
    invoices.forEach((inv) => {
      if (inv.is_return === 1 || inv.is_return === true) return;
      const cust = String(inv.customer || '');
      if (!customerSales[cust]) {
        customerSales[cust] = { name: String(inv.customer_name || cust), total: 0 };
      }
      customerSales[cust].total += Number(inv.base_grand_total || 0);
    });
    const topCustomers = Object.entries(customerSales)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Top 10 products by revenue
    const productSales: Record<string, { name: string; revenue: number; qty: number }> = {};
    items.forEach((item) => {
      const code = String(item.item_code || '');
      if (!code) return;
      if (!productSales[code]) {
        productSales[code] = { name: String(item.item_name || code), revenue: 0, qty: 0 };
      }
      productSales[code].revenue += Number(item.base_amount || 0);
      productSales[code].qty += Number(item.qty || 0);
    });
    const topProducts = Object.entries(productSales)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Sales by rep with commission preview
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
    const salesByRepList = Object.values(salesByRep)
      .sort((a, b) => b.total - a.total)
      .map((rep) => ({ ...rep, commissionPreview: rep.total * 0.05 })); // 5% commission preview

    // Previous month comparison
    const prevDailyData: Record<string, number> = {};
    for (let d = 1; d <= new Date(prevYear, prevMon, 0).getDate(); d++) {
      const dateStr = `${prevYear}-${String(prevMon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      prevDailyData[dateStr] = 0;
    }
    prevInvoices.forEach((inv) => {
      if (inv.is_return === 1 || inv.is_return === true) return;
      const date = String(inv.posting_date || '');
      if (date in prevDailyData) {
        prevDailyData[date] += Number(inv.base_grand_total || 0);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        month,
        fromDate,
        toDate,
        summary: {
          totalSales,
          totalReturns,
          netSales,
          totalCollected,
          outstanding,
          growthPercent: Math.round(growthPercent * 100) / 100,
          invoiceCount: invoices.filter((inv) => inv.is_return !== 1 && inv.is_return !== true).length,
          returnCount: invoices.filter((inv) => inv.is_return === 1 || inv.is_return === true).length,
        },
        dailyTrend: Object.entries(dailyData).map(([date, amount]) => ({ date, amount })),
        weeklyComparison: weeklyData,
        categorySales: Object.entries(categorySales).map(([category, amount]) => ({ category, amount })),
        topCustomers,
        topProducts,
        salesByRep: salesByRepList,
        previousMonth: {
          month: `${prevYear}-${String(prevMon).padStart(2, '0')}`,
          netSales: prevNetSales,
          dailyTrend: Object.entries(prevDailyData).map(([date, amount]) => ({ date, amount })),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'فشل تحميل بيانات المبيعات الشهرية' },
      { status: 500 }
    );
  }
}

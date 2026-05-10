import { NextRequest, NextResponse } from 'next/server';
import { getList } from '@/lib/server/backend';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');
  const company = searchParams.get('company');
  const category = searchParams.get('category');

  if (!fromDate || !toDate) {
    return NextResponse.json({ success: false, error: 'فترة التاريخ مطلوبة' }, { status: 400 });
  }

  try {
    const filters: string[][] = [
      ['posting_date', '>=', fromDate],
      ['posting_date', '<=', toDate],
      ['docstatus', '=', '1'],
    ];
    if (company) filters.push(['company', '=', company]);

    const invoices = await getList('Sales Invoice', {
      fields: ['name', 'base_grand_total', 'is_return'],
      filters,
      limit: 5000,
      order_by: 'posting_date asc',
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
        batches.map((batch) =>
          getList('Sales Invoice Item', {
            fields: [
              'item_code', 'item_name', 'item_group', 'qty',
              'base_amount', 'base_net_rate', 'valuation_rate',
              'parent', 'base_net_amount',
            ],
            filters: [['parent', 'in', batch] as any[], ['docstatus', '=', '1']],
            limit: 5000,
          }).catch(() => []) as Promise<Record<string, unknown>[]>
        )
      );
      items = itemResults.flat();
    }

    // Get cost data from Purchase Receipt or Stock Entry
    // For products with valuation_rate, we use that as cost
    // Otherwise we try to get from Purchase Invoice Item
    const productData: Record<string, {
      code: string;
      name: string;
      category: string;
      qtySold: number;
      revenue: number;
      cost: number;
    }> = {};

    items.forEach((item) => {
      const code = String(item.item_code || '');
      if (!code) return;

      if (category) {
        const group = String(item.item_group || '');
        if (group !== category) return;
      }

      if (!productData[code]) {
        productData[code] = {
          code,
          name: String(item.item_name || code),
          category: String(item.item_group || 'أخرى'),
          qtySold: 0,
          revenue: 0,
          cost: 0,
        };
      }

      const qty = Number(item.qty || 0);
      const revenue = Number(item.base_amount || 0);
      const valuationRate = Number(item.valuation_rate || 0);
      const cost = valuationRate > 0 ? valuationRate * qty : Number(item.base_net_amount || 0) * 0.7; // estimate if no valuation

      productData[code].qtySold += qty;
      productData[code].revenue += revenue;
      productData[code].cost += cost;
    });

    const productRows = Object.values(productData).map((p) => {
      const profit = p.revenue - p.cost;
      const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
      const avgSellingPrice = p.qtySold > 0 ? p.revenue / p.qtySold : 0;
      return {
        ...p,
        profit,
        margin: Math.round(margin * 100) / 100,
        avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
      };
    });

    // Summary
    const totalRevenue = productRows.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = productRows.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Profit by category
    const categoryProfit: Record<string, { revenue: number; cost: number; profit: number }> = {};
    productRows.forEach((p) => {
      if (!categoryProfit[p.category]) {
        categoryProfit[p.category] = { revenue: 0, cost: 0, profit: 0 };
      }
      categoryProfit[p.category].revenue += p.revenue;
      categoryProfit[p.category].cost += p.cost;
      categoryProfit[p.category].profit += p.profit;
    });

    // Margin distribution
    const marginBuckets: { range: string; count: number }[] = [
      { range: 'أقل من 0%', count: 0 },
      { range: '0% - 10%', count: 0 },
      { range: '10% - 20%', count: 0 },
      { range: '20% - 30%', count: 0 },
      { range: '30% - 50%', count: 0 },
      { range: 'أكثر من 50%', count: 0 },
    ];
    productRows.forEach((p) => {
      if (p.margin < 0) marginBuckets[0].count++;
      else if (p.margin < 10) marginBuckets[1].count++;
      else if (p.margin < 20) marginBuckets[2].count++;
      else if (p.margin < 30) marginBuckets[3].count++;
      else if (p.margin < 50) marginBuckets[4].count++;
      else marginBuckets[5].count++;
    });

    // Available categories for filter
    const categories = [...new Set(productRows.map((p) => p.category))].sort();

    return NextResponse.json({
      success: true,
      data: {
        fromDate,
        toDate,
        summary: {
          totalRevenue,
          totalCost,
          totalProfit,
          avgMargin: Math.round(avgMargin * 100) / 100,
          productCount: productRows.length,
        },
        products: productRows,
        categoryProfit: Object.entries(categoryProfit).map(([category, data]) => ({ category, ...data })),
        marginDistribution: marginBuckets,
        categories,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'فشل تحميل بيانات أرباح المنتجات' },
      { status: 500 }
    );
  }
}

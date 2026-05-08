/** يُزامن مع `getDashboardKPIs` في `lib/server/backend.ts` */

export type DashboardKPIs = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  totalEmployees: number;
  openSalesOrders: number;
  openPurchaseOrders: number;
  lowStockItems: number;
  monthlyRevenueExpenses: { month: string; revenue: number; expenses: number }[];
  salesByModule: { name: string; value: number; color: string }[];
  monthlyOrderCounts: { month: string; sales: number; purchases: number }[];
  revenueSparkline: number[];
  expensesSparkline: number[];
  receivablesSparkline: number[];
  payablesSparkline: number[];
};

export const DEFAULT_DASHBOARD_KPIS: DashboardKPIs = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  outstandingReceivables: 0,
  outstandingPayables: 0,
  totalCustomers: 0,
  totalSuppliers: 0,
  totalItems: 0,
  totalEmployees: 0,
  openSalesOrders: 0,
  openPurchaseOrders: 0,
  lowStockItems: 0,
  monthlyRevenueExpenses: [],
  salesByModule: [],
  monthlyOrderCounts: [],
  revenueSparkline: [],
  expensesSparkline: [],
  receivablesSparkline: [],
  payablesSparkline: [],
};

import type { SystemModule } from './types';

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'accounting',
    name: 'Accounting',
    nameAr: 'المحاسبة والمالية',
    icon: 'Calculator',
    path: '/accounting',
    color: 'blue',
    subModules: [
      { id: 'chart-of-accounts', name: 'Chart of Accounts', nameAr: 'دليل الحسابات', path: '/accounting/chart-of-accounts', doctype: 'Account' },
      { id: 'journal-entry', name: 'Journal Entry', nameAr: 'القيود اليومية', path: '/accounting/journal-entry', doctype: 'Journal Entry' },
      { id: 'payment-entry', name: 'Payment Entry', nameAr: 'سندات القبض والصرف', path: '/accounting/payment-entry', doctype: 'Payment Entry' },
      { id: 'treasuries', name: 'Treasuries', nameAr: 'الخزائن', path: '/accounting/treasuries', doctype: 'Account' },
      { id: 'bank-accounts', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', path: '/accounting/bank-accounts', doctype: 'Bank Account' },
      { id: 'cheques', name: 'Cheques', nameAr: 'الشيكات', path: '/accounting/cheques', doctype: 'Payment Entry' },
      { id: 'expenses', name: 'Expenses', nameAr: 'المصروفات', path: '/accounting/expenses', doctype: 'Expense Claim' },
      { id: 'cost-centers', name: 'Cost Centers', nameAr: 'مراكز التكلفة', path: '/accounting/cost-centers', doctype: 'Cost Center' },
      { id: 'assets', name: 'Assets', nameAr: 'الأصول الثابتة', path: '/accounting/assets', doctype: 'Asset' },
      { id: 'asset-disposal', name: 'Asset Disposal', nameAr: 'التصرّف في الأصول', path: '/accounting/asset-disposal', doctype: 'Asset' },
      { id: 'depreciation-run', name: 'Depreciation Run', nameAr: 'تشغيل الإهلاك', path: '/accounting/depreciation-run' },
      { id: 'tax-declaration', name: 'Tax Declaration', nameAr: 'الإقرار الضريبي', path: '/accounting/tax-declaration' },
      { id: 'cheque-workflow', name: 'Cheque Workflow', nameAr: 'دورة حياة الشيكات', path: '/accounting/cheque-workflow', doctype: 'Payment Entry' },
      { id: 'vault-permissions', name: 'Vault Permissions', nameAr: 'صلاحيات الخزائن', path: '/accounting/vault-permissions' },
      { id: 'financial-register', name: 'Financial Register', nameAr: 'السجل المالي الموحد', path: '/accounting/financial-register' },
      { id: 'financial-statements', name: 'Financial Statements', nameAr: 'القوائم المالية', path: '/accounting/financial-statements', doctype: 'GL Entry' },
      { id: 'cash-flow', name: 'Cash Flow', nameAr: 'التدفقات النقدية', path: '/accounting/cash-flow' },
      { id: 'advanced-reports', name: 'Advanced Reports', nameAr: 'التقارير المحاسبية', path: '/accounting/advanced-reports', doctype: 'GL Entry' },
      { id: 'accounting-dashboard', name: 'Accounting Dashboard', nameAr: 'لوحة التحكم', path: '/accounting/dashboard' },
      { id: 'trial-balance', name: 'Trial Balance', nameAr: 'ميزان المراجعة', path: '/accounting/trial-balance' },
      { id: 'aging-report', name: 'Aging Report', nameAr: 'أعمار الذمم', path: '/accounting/aging-report' },
      { id: 'profit-loss-monthly', name: 'Profit & Loss Monthly', nameAr: 'الأرباح والخسائر الشهرية', path: '/accounting/profit-loss-monthly' },
      { id: 'tax-report', name: 'Tax Report', nameAr: 'التقرير الضريبي', path: '/accounting/tax-report' },
      { id: 'budgets', name: 'Budgets', nameAr: 'إدارة الميزانيات', path: '/accounting/budgets', doctype: 'Budget' },
      { id: 'multi-currency', name: 'Multi Currency', nameAr: 'متعدد العملات', path: '/accounting/multi-currency' },
      { id: 'opening-balances', name: 'Opening Balances', nameAr: 'الأرصدة الافتتاحية', path: '/accounting/opening-balances' },
      { id: 'period-closing-v2', name: 'Period Closing V2', nameAr: 'إقفال الفترات', path: '/accounting/period-closing-v2' },
      { id: 'expenses-by-period', name: 'Expenses By Period', nameAr: 'المصروفات بالمدة الزمنية', path: '/accounting/expenses-by-period' },
    ],
    settingsGroups: [
      {
        id: 'accounting-operations',
        nameAr: 'عمليات المحاسبة',
        items: [
          { id: 'op-treasury-transfer', nameAr: 'التحويل بين الخزائن', path: '/accounting/treasury-transfer' },
          { id: 'op-daily-expenses', nameAr: 'المصاريف اليومية', path: '/accounting/daily-expenses' },
          { id: 'op-treasury-closing', nameAr: 'الإغلاق اليومي للخزنة', path: '/accounting/treasury-closing' },
          { id: 'op-period-closing', nameAr: 'إقفال الفترة', path: '/accounting/period-closing' },
          { id: 'op-bank-reconciliation', nameAr: 'التسوية البنكية', path: '/accounting/bank-reconciliation' },
          { id: 'op-recurring-entries', nameAr: 'القيود المتكررة', path: '/accounting/recurring-entries' },
          { id: 'op-vault-permissions', nameAr: 'صلاحيات الخزائن', path: '/accounting/vault-permissions' },
          { id: 'op-trial-balance', nameAr: 'ميزان المراجعة التفصيلي', path: '/accounting/trial-balance' },
          { id: 'op-aging-report', nameAr: 'أعمار الذمم', path: '/accounting/aging-report' },
          { id: 'op-profit-loss-monthly', nameAr: 'أرباح وخسائر شهرية', path: '/accounting/profit-loss-monthly' },
          { id: 'op-tax-report', nameAr: 'التقرير الضريبي', path: '/accounting/tax-report' },
        ],
      },
      {
        id: 'accounting-settings',
        nameAr: 'إعدادات المحاسبة',
        path: '/settings/module-settings/accounts',
        items: [
          { id: 'set-account-routing', nameAr: 'توجيه الحسابات', path: '/settings/account-routing' },
          { id: 'set-fiscal-year', nameAr: 'السنوات المالية', path: '/accounting/fiscal-year' },
          { id: 'set-deferred-revenue', nameAr: 'الإيرادات المؤجلة', path: '/accounting/deferred-revenue' },
          { id: 'set-tax-rates', nameAr: 'معدلات الضريبة', path: '/settings/tax-rates' },
          { id: 'set-notification-rules', nameAr: 'قواعد الإرسال الآلي', path: '/settings/notification-rules' },
          { id: 'set-email-smtp', nameAr: 'إعدادات البريد SMTP', path: '/settings/email-smtp' },
        ],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    nameAr: 'المبيعات',
    icon: 'ShoppingCart',
    path: '/sales',
    color: 'green',
    subModules: [
      { id: 'sales-dashboard', name: 'Sales Dashboard', nameAr: 'لوحة التحكم', path: '/sales/dashboard' },
      { id: 'sales-invoices', name: 'Sales Invoices', nameAr: 'فواتير المبيعات', path: '/sales/sales-invoices', doctype: 'Sales Invoice' },
      { id: 'customers', name: 'Customers', nameAr: 'العملاء', path: '/sales/customers', doctype: 'Customer' },
      { id: 'quotations', name: 'Quotations', nameAr: 'عروض الأسعار', path: '/sales/quotations', doctype: 'Quotation' },
      { id: 'sales-orders', name: 'Sales Orders', nameAr: 'أوامر البيع', path: '/sales/sales-orders', doctype: 'Sales Order' },
      { id: 'delivery-notes', name: 'Delivery Notes', nameAr: 'إشعارات التسليم', path: '/sales/delivery-notes', doctype: 'Delivery Note' },
      { id: 'sales-reports', name: 'Sales Reports', nameAr: 'تقارير المبيعات', path: '/sales/reports', doctype: 'Sales Invoice' },
      { id: 'shipping', name: 'Shipping', nameAr: 'الشحن والتوصيل', path: '/sales/shipping' },
      { id: 'recurring-invoices', name: 'Recurring Invoices', nameAr: 'الفواتير الدورية', path: '/sales/recurring-invoices' },
      { id: 'commissions', name: 'Commissions', nameAr: 'عمولات المبيعات', path: '/sales/commissions' },
      { id: 'daily-sales', name: 'Daily Sales', nameAr: 'تقرير المبيعات اليومي', path: '/sales/daily-sales' },
      { id: 'monthly-sales', name: 'Monthly Sales', nameAr: 'تقرير المبيعات الشهري', path: '/sales/monthly-sales' },
      { id: 'product-profits', name: 'Product Profits', nameAr: 'أرباح مبيعات الأصناف', path: '/sales/product-profits' },
    ],
    settingsGroups: [
      {
        id: 'sales-promotions',
        nameAr: 'العروض الترويجية',
        items: [
          { id: 'set-pricing-rules', nameAr: 'قواعد التسعير', path: '/sales/pricing-rules' },
          { id: 'set-coupon-codes', nameAr: 'أكواد الخصم', path: '/sales/coupon-codes' },
        ],
      },
      {
        id: 'sales-settings',
        nameAr: 'إعدادات المبيعات',
        path: '/settings/module-settings/selling',
        items: [
          { id: 'set-customer-groups', nameAr: 'مجموعات العملاء', path: '/sales/customer-groups' },
          { id: 'set-payment-methods', nameAr: 'طرق الدفع', path: '/settings/payment-methods' },
          { id: 'set-payment-gateways', nameAr: 'بوابات الدفع الإلكترونية', path: '/settings/payment-gateways' },
          { id: 'set-ecommerce', nameAr: 'ربط المتاجر الإلكترونية', path: '/settings/ecommerce-integration' },
          { id: 'set-terms', nameAr: 'الشروط والأحكام', path: '/settings/terms-and-conditions' },
          { id: 'set-print-templates', nameAr: 'قوالب الطباعة', path: '/settings/print-templates' },
          { id: 'set-sales-integrations', nameAr: 'تكاملات المبيعات', path: '/sales/integrations' },
        ],
      },
    ],
  },
  {
    id: 'pos',
    name: 'Point of Sale',
    nameAr: 'نقاط البيع',
    icon: 'Store',
    path: '/pos',
    color: 'emerald',
    subModules: [
      { id: 'pos-sell', name: 'POS Sell', nameAr: 'بدء البيع', path: '/pos/sell', doctype: 'POS Invoice' },
      { id: 'pos-sessions', name: 'POS Sessions', nameAr: 'إدارة الورديات', path: '/pos/sessions', doctype: 'POS Opening Entry' },
      { id: 'pos-invoices', name: 'POS Invoices', nameAr: 'فواتير نقطة البيع', path: '/pos/invoices', doctype: 'POS Invoice' },
      { id: 'pos-settings', name: 'POS Settings', nameAr: 'إعدادات نقاط البيع', path: '/pos/settings', doctype: 'POS Profile' },
      { id: 'pos-returns', name: 'POS Returns', nameAr: 'المرتجعات', path: '/pos/returns' },
      { id: 'pos-past-orders', name: 'Past Orders', nameAr: 'طلبات سابقة', path: '/pos/past-orders' },
      { id: 'pos-reports', name: 'POS Reports', nameAr: 'تقارير', path: '/pos/reports' },
    ],
    settingsGroups: [
      {
        id: 'pos-setup-group',
        nameAr: 'إعداد تلقائي',
        items: [
          { id: 'set-pos-setup-wizard', nameAr: 'معالج الإعداد', path: '/pos/setup-wizard' },
        ],
      },
      {
        id: 'pos-settings-group',
        nameAr: 'إعدادات نقاط البيع',
        items: [
          { id: 'set-selling-pos', nameAr: 'إعدادات المبيعات', path: '/settings/module-settings/selling' },
          { id: 'set-payment-methods-pos', nameAr: 'طرق الدفع', path: '/settings/payment-methods' },
        ],
      },
    ],
  },
  {
    id: 'purchases',
    name: 'Purchases',
    nameAr: 'المشتريات',
    icon: 'Truck',
    path: '/purchases',
    color: 'amber',
    subModules: [
      { id: 'purchases-dashboard', name: 'Purchases Dashboard', nameAr: 'لوحة التحكم', path: '/purchases/dashboard' },
      { id: 'purchase-invoices', name: 'Purchase Invoices', nameAr: 'فواتير المشتريات', path: '/purchases/purchase-invoices', doctype: 'Purchase Invoice' },
      { id: 'purchase-suppliers', name: 'Suppliers', nameAr: 'الموردون', path: '/purchases/suppliers', doctype: 'Supplier' },
      { id: 'purchase-orders-p', name: 'Purchase Orders', nameAr: 'أوامر الشراء', path: '/purchases/purchase-orders', doctype: 'Purchase Order' },
      { id: 'purchase-receipts', name: 'Purchase Receipts', nameAr: 'استلام المشتريات', path: '/purchases/purchase-receipts', doctype: 'Purchase Receipt' },
      { id: 'request-for-quotation', name: 'RFQ', nameAr: 'طلب عروض أسعار', path: '/purchases/request-for-quotation', doctype: 'Request for Quotation' },
      { id: 'supplier-quotations', name: 'Supplier Quotations', nameAr: 'عروض أسعار الموردين', path: '/purchases/supplier-quotations', doctype: 'Supplier Quotation' },
      { id: 'purchase-requests', name: 'Purchase Requests', nameAr: 'طلبات الشراء', path: '/purchases/purchase-requests', doctype: 'Material Request' },
      { id: 'purchase-reports', name: 'Purchase Reports', nameAr: 'تقارير المشتريات', path: '/purchases/reports', doctype: 'Purchase Invoice' },
      { id: 'supplier-statements', name: 'Supplier Statements', nameAr: 'كشف حساب المورد', path: '/purchases/supplier-statements' },
    ],
    settingsGroups: [
      {
        id: 'purchases-settings',
        nameAr: 'إعدادات المشتريات',
        path: '/settings/module-settings/buying',
        items: [
          { id: 'set-supplier-groups', nameAr: 'مجموعات الموردين', path: '/purchases/supplier-groups' },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    nameAr: 'المخزون',
    icon: 'Package',
    path: '/inventory',
    color: 'orange',
    subModules: [
      { id: 'inventory-dashboard', name: 'Inventory Dashboard', nameAr: 'لوحة التحكم', path: '/inventory/dashboard' },
      { id: 'items', name: 'Items', nameAr: 'الأصناف', path: '/inventory/items', doctype: 'Item' },
      { id: 'warehouses', name: 'Warehouses', nameAr: 'المستودعات', path: '/inventory/warehouses', doctype: 'Warehouse' },
      { id: 'stock-entry', name: 'Stock Entry', nameAr: 'حركة المخزون', path: '/inventory/stock-entry', doctype: 'Stock Entry' },
      { id: 'stock-levels', name: 'Stock Levels', nameAr: 'مستويات المخزون', path: '/inventory/stock-levels', doctype: 'Bin' },
      { id: 'price-lists', name: 'Price Lists', nameAr: 'قوائم الأسعار', path: '/inventory/price-lists', doctype: 'Price List' },
      { id: 'stock-count', name: 'Stock Count', nameAr: 'جرد المخزون', path: '/inventory/stock-count', doctype: 'Stock Reconciliation' },
      { id: 'serial-numbers', name: 'Serial Numbers', nameAr: 'الأرقام التسلسلية', path: '/inventory/serial-numbers', doctype: 'Serial No' },
      { id: 'batches', name: 'Batches', nameAr: 'الدفعات', path: '/inventory/batches', doctype: 'Batch' },
      { id: 'inventory-reports', name: 'Inventory Reports', nameAr: 'تقارير المخزون', path: '/inventory/reports', doctype: 'Stock Ledger' },
      { id: 'permits', name: 'Permits', nameAr: 'الأذون المخزنية', path: '/inventory/permits' },
      { id: 'item-variants', name: 'Item Variants', nameAr: 'متغيرات المنتج', path: '/inventory/item-variants' },
    ],
    settingsGroups: [
      {
        id: 'inventory-settings',
        nameAr: 'إعدادات المخزون',
        path: '/settings/module-settings/stock',
        items: [
          { id: 'set-item-groups', nameAr: 'مجموعات الأصناف', path: '/inventory/item-groups' },
          { id: 'set-inter-branch', nameAr: 'تحويل بين الفروع', path: '/inventory/inter-branch-transfer' },
          { id: 'set-product-ext', nameAr: 'امتدادات المنتج', path: '/settings/product-extensions' },
        ],
      },
    ],
  },
  {
    id: 'hr',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    icon: 'Users',
    path: '/hr',
    color: 'purple',
    subModules: [
      { id: 'hr-dashboard', name: 'HR Dashboard', nameAr: 'لوحة التحكم', path: '/hr/dashboard' },
      { id: 'employees', name: 'Employees', nameAr: 'الموظفين', path: '/hr/employees', doctype: 'Employee' },
      { id: 'attendance', name: 'Attendance', nameAr: 'الحضور والانصراف', path: '/hr/attendance', doctype: 'Attendance' },
      { id: 'leave-applications', name: 'Leave Applications', nameAr: 'طلبات الإجازة', path: '/hr/leave-applications', doctype: 'Leave Application' },
      { id: 'salary-slips', name: 'Salary Slips', nameAr: 'كشوف الرواتب', path: '/hr/salary-slips', doctype: 'Salary Slip' },
      { id: 'payroll-entry', name: 'Payroll Entry', nameAr: 'مسير الرواتب', path: '/hr/payroll-entry', doctype: 'Payroll Entry' },
      { id: 'hr-reports', name: 'HR Reports', nameAr: 'تقارير الموارد البشرية', path: '/hr/reports', doctype: 'Employee' },
      { id: 'attendance-summary', name: 'Attendance Summary', nameAr: 'ملخص الحضور', path: '/hr/attendance-summary' },
    ],
    settingsGroups: [
      {
        id: 'hr-payroll-engine',
        nameAr: 'محرك الرواتب',
        items: [
          { id: 'set-salary-components', nameAr: 'مكوّنات الراتب', path: '/hr/salary-components' },
          { id: 'set-salary-structures', nameAr: 'هياكل الرواتب', path: '/hr/salary-structures' },
          { id: 'set-bank-disbursement', nameAr: 'صرف البنكي', path: '/hr/bank-disbursement' },
        ],
      },
      {
        id: 'hr-settings',
        nameAr: 'إعدادات الموارد البشرية',
        path: '/settings/module-settings/hr',
        items: [
          { id: 'set-leave-types', nameAr: 'أنواع الإجازات', path: '/hr/leave-types' },
          { id: 'set-leave-policies', nameAr: 'سياسات الإجازات', path: '/hr/leave-policies' },
          { id: 'set-shifts', nameAr: 'الورديات', path: '/hr/shifts' },
          { id: 'set-contracts', nameAr: 'العقود', path: '/hr/contracts' },
          { id: 'set-holidays', nameAr: 'العطلات', path: '/hr/holidays' },
          { id: 'set-advances', nameAr: 'سلف الموظفين', path: '/hr/advances' },
          { id: 'set-loans', nameAr: 'قروض الموظفين', path: '/hr/loans' },
          { id: 'set-employee-documents', nameAr: 'مستندات الموظفين', path: '/hr/employee-documents' },
          { id: 'set-employee-requests', nameAr: 'طلبات الموظفين', path: '/hr/employee-requests' },
          { id: 'set-org-chart', nameAr: 'الهيكل التنظيمي', path: '/hr/org-chart' },
        ],
      },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    nameAr: 'التصنيع',
    icon: 'Factory',
    path: '/manufacturing',
    color: 'teal',
    subModules: [
      { id: 'bom', name: 'Bill of Materials', nameAr: 'قوائم المواد', path: '/manufacturing/bom', doctype: 'BOM' },
      { id: 'production-plans', name: 'Production Plans', nameAr: 'خطط الإنتاج', path: '/manufacturing/production-plans', doctype: 'Production Plan' },
      { id: 'work-orders-mfg', name: 'Work Orders', nameAr: 'أوامر العمل', path: '/manufacturing/work-orders', doctype: 'Work Order' },
    ],
    settingsGroups: [
      {
        id: 'mfg-settings',
        nameAr: 'إعدادات التصنيع',
        path: '/settings/module-settings/stock',
        items: [
          { id: 'set-workstations', nameAr: 'محطات العمل', path: '/manufacturing/workstations' },
          { id: 'set-landed-cost', nameAr: 'تكاليف إضافية', path: '/manufacturing/landed-cost-voucher' },
        ],
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    nameAr: 'التشغيل والعمليات',
    icon: 'Cog',
    path: '/operations',
    color: 'slate',
    subModules: [
      { id: 'workflow-studio', name: 'Workflow Studio', nameAr: 'منشئ سير العمل', path: '/operations/workflow-studio', doctype: 'Workflow' },
      { id: 'time-tracking', name: 'Time Tracking', nameAr: 'تتبع الوقت', path: '/operations/time-tracking' },
      { id: 'auto-repeat', name: 'Auto Repeat', nameAr: 'الجدولة التلقائية', path: '/operations/auto-repeat' },
      { id: 'mobile-expenses', name: 'Mobile Expenses', nameAr: 'مصروفات الموبايل', path: '/operations/mobile-expenses' },
      { id: 'travel-bookings', name: 'Travel Bookings', nameAr: 'حجوزات السفر', path: '/operations/travel-bookings' },
      { id: 'projects', name: 'Projects', nameAr: 'إدارة المشاريع', path: '/operations/projects', doctype: 'Project' },
      { id: 'fleet', name: 'Fleet', nameAr: 'إدارة الأسطول', path: '/operations/fleet' },
      { id: 'approvals', name: 'Approvals', nameAr: 'سير الموافقات', path: '/operations/approvals' },
      { id: 'work-orders-ops', name: 'Work Orders', nameAr: 'أوامر الشغل', path: '/operations/work-orders-ops' },
    ],
    settingsGroups: [
      {
        id: 'operations-developer',
        nameAr: 'أدوات المطور',
        items: [
          { id: 'set-developer-api', nameAr: 'واجهة برمجة التطبيقات', path: '/operations/developer-api' },
        ],
      },
      {
        id: 'rental-setup',
        nameAr: 'إدارة الإيجارات',
        items: [
          { id: 'set-rental-dashboard', nameAr: 'لوحة الإيجارات', path: '/operations/rentals' },
          { id: 'set-rental-units', nameAr: 'وحدات الإيجار', path: '/operations/rentals/units' },
          { id: 'set-rental-bookings', nameAr: 'أوامر الحجز', path: '/operations/rentals/bookings' },
          { id: 'set-rental-contracts', nameAr: 'عقود الإيجار', path: '/operations/rentals/contracts' },
          { id: 'set-unit-types', nameAr: 'أنواع الوحدات', path: '/operations/rentals/unit-types' },
        ],
      },
    ],
  },
  {
    id: 'rentals',
    name: 'Rentals',
    nameAr: 'إدارة الإيجارات',
    icon: 'Building2',
    path: '/operations/rentals',
    color: 'cyan',
    subModules: [
      { id: 'rental-units', name: 'Rental Units', nameAr: 'وحدات الإيجار', path: '/operations/rentals/units', doctype: 'Item' },
      { id: 'rental-bookings', name: 'Booking Orders', nameAr: 'أوامر الحجز', path: '/operations/rentals/bookings', doctype: 'Quotation' },
      { id: 'rental-contracts', name: 'Rental Contracts', nameAr: 'عقود الإيجار', path: '/operations/rentals/contracts', doctype: 'Contract' },
    ],
    settingsGroups: [
      {
        id: 'rental-setup',
        nameAr: 'إعدادات الإيجارات',
        items: [
          { id: 'set-unit-types', nameAr: 'أنواع الوحدات', path: '/operations/rentals/unit-types' },
          { id: 'set-rental-pricing', nameAr: 'قواعد التسعير', path: '/operations/rentals/pricing-rules' },
        ],
      },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    nameAr: 'إدارة العملاء',
    icon: 'Heart',
    path: '/crm',
    color: 'pink',
    subModules: [
      { id: 'leads', name: 'Leads', nameAr: 'العملاء المحتملون', path: '/crm/leads', doctype: 'Lead' },
      { id: 'opportunities', name: 'Opportunities', nameAr: 'الفرص', path: '/crm/opportunities', doctype: 'Opportunity' },
      { id: 'activities', name: 'Activities', nameAr: 'الأنشطة', path: '/crm/activities', doctype: 'Communication' },
      { id: 'crm-messages', name: 'Messages', nameAr: 'الرسائل', path: '/crm/messages', doctype: 'Notification Log' },
      { id: 'account-statements', name: 'Account Statements', nameAr: 'كشف حساب العميل', path: '/crm/account-statements' },
    ],
    settingsGroups: [
      {
        id: 'crm-portal-group',
        nameAr: 'بوابة العملاء',
        items: [
          { id: 'set-crm-portal', nameAr: 'بوابة العميل الداخلية', path: '/crm/portal' },
          { id: 'set-portal-external', nameAr: 'البوابة الإلكترونية', path: '/portal' },
        ],
      },
      {
        id: 'crm-settings',
        nameAr: 'إعدادات إدارة العملاء',
        items: [
          { id: 'set-appointments', nameAr: 'المواعيد', path: '/crm/appointments' },
          { id: 'set-follow-ups', nameAr: 'المتابعة', path: '/crm/follow-ups' },
          { id: 'set-crm-subscriptions', nameAr: 'الاشتراكات', path: '/crm/subscriptions' },
          { id: 'set-crm-loyalty', nameAr: 'ولاء العملاء', path: '/crm/loyalty' },
          { id: 'set-crm-credits', nameAr: 'النقاط والأرصدة', path: '/crm/credits' },
          { id: 'set-crm-timeline', nameAr: 'سجل التفاعلات', path: '/crm/timeline' },
          { id: 'set-rich-templates', nameAr: 'محرر القوالب', path: '/settings/rich-templates' },
          { id: 'set-custom-fields', nameAr: 'حقول مخصصة', path: '/settings/custom-fields' },
          { id: 'set-sms-gateway', nameAr: 'الرسائل النصية', path: '/settings/sms-gateway' },
          { id: 'set-email-templates', nameAr: 'قوالب البريد', path: '/settings/email-templates' },
          { id: 'set-excel-import', nameAr: 'استيراد البيانات', path: '/settings/excel-import' },
        ],
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    nameAr: 'التقارير والتحليلات',
    icon: 'BarChart3',
    path: '/reports',
    color: 'indigo',
    subModules: [
      { id: 'reports-dashboard', name: 'Reports Dashboard', nameAr: 'لوحة التقارير المتقدمة', path: '/reports/dashboard' },
      { id: 'reports-hub', name: 'Reports Hub', nameAr: 'مركز التقارير', path: '/reports' },
    ],
    settingsGroups: [],
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  Draft: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'مسودة' },
  Submitted: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'مُقدّم' },
  Cancelled: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'ملغي' },
  Approved: { bg: 'bg-success', text: 'text-success-foreground', label: 'مُوافق' },
  Rejected: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مرفوض' },
  Open: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'مفتوح' },
  Active: { bg: 'bg-success', text: 'text-success-foreground', label: 'نشط' },
  Inactive: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'غير نشط' },
  Paid: { bg: 'bg-success', text: 'text-success-foreground', label: 'مدفوع' },
  Unpaid: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'غير مدفوع' },
  Overdue: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'متأخر' },
  'Partly Paid': { bg: 'bg-info', text: 'text-info-foreground', label: 'مدفوع جزئياً' },
  Present: { bg: 'bg-success', text: 'text-success-foreground', label: 'حاضر' },
  Absent: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'غائب' },
  'On Leave': { bg: 'bg-info', text: 'text-info-foreground', label: 'في إجازة' },
  'Half Day': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'نصف يوم' },
  Left: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'مغادر' },
  'In Process': { bg: 'bg-info', text: 'text-info-foreground', label: 'قيد التنفيذ' },
  Completed: { bg: 'bg-success', text: 'text-success-foreground', label: 'مكتمل' },
  Stopped: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'متوقف' },
  'Not Started': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'لم يبدأ' },
  Ordered: { bg: 'bg-info', text: 'text-info-foreground', label: 'تم الطلب' },
  Expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'منتهي' },
  Lost: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مفقود' },
  'To Deliver and Bill': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'تسليم وفوترة' },
  'To Deliver': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار التسليم' },
  'To Bill': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار الفوترة' },
  'To Receive and Bill': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'استلام وفوترة' },
  'To Receive': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار الاستلام' },
  Issued: { bg: 'bg-info', text: 'text-info-foreground', label: 'مصدر' },
  Received: { bg: 'bg-success', text: 'text-success-foreground', label: 'مستلم' },
  Cleared: { bg: 'bg-success', text: 'text-success-foreground', label: 'مقاص' },
  Bounced: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مرتجع' },
  Sent: { bg: 'bg-info', text: 'text-info-foreground', label: 'مُرسل' },
  Accepted: { bg: 'bg-success', text: 'text-success-foreground', label: 'مقبول' },
  'Return': { bg: 'bg-info', text: 'text-info-foreground', label: 'مرتجع' },
  'Credit Note': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'إشعار دائن' },
  'Debit Note': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'إشعار مدين' },
  'Internal Transfer': { bg: 'bg-info', text: 'text-info-foreground', label: 'تحويل داخلي' },
  'Receive': { bg: 'bg-success', text: 'text-success-foreground', label: 'استلام' },
  'Pay': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'صرف' },
  High: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'عالي' },
  Medium: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'متوسط' },
  Low: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'منخفض' },
  'ساري': { bg: 'bg-success', text: 'text-success-foreground', label: 'ساري' },
  'منتهي': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'منتهي' },
  'قيد التجديد': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'قيد التجديد' },
  Terminated: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'منهي' },
  Sold: { bg: 'bg-info', text: 'text-info-foreground', label: 'مباع' },
  Scrapped: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'مستهلك' },
  Unsigned: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'غير موقّع' },
  Signed: { bg: 'bg-success', text: 'text-success-foreground', label: 'موقّع' },
  Disabled: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'معطّل' },
};

export function getDocStatusLabel(docstatus: number): string {
  switch (docstatus) {
    case 0: return 'مسودة';
    case 1: return 'مُقدّم';
    case 2: return 'ملغي';
    default: return 'غير معروف';
  }
}

export function getDocStatusColor(docstatus: number): { bg: string; text: string } {
  switch (docstatus) {
    case 0: return { bg: 'bg-secondary', text: 'text-secondary-foreground' };
    case 1: return { bg: 'bg-success', text: 'text-success-foreground' };
    case 2: return { bg: 'bg-destructive', text: 'text-destructive-foreground' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
}

/** أول مسار لوحة تحكم يطابق DocType (للانتقال من إشعار Notification Log). */
export function getDashboardPathForDocType(doctype: string | null | undefined): string | null {
  const dt = doctype?.trim();
  if (!dt) return null;
  for (const mod of SYSTEM_MODULES) {
    for (const sub of mod.subModules) {
      if (sub.doctype === dt) return sub.path;
    }
  }
  return null;
}

export function formatCurrency(amount: number, currency: string = 'YER'): string {
  return new Intl.NumberFormat('ar-YE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-YE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-YE').format(num);
}

// ============================================================
// Core Type Definitions for the ERP System
// These types represent the system's data model.
// No reference to any external system.
// ============================================================

// Base document interface
export interface BaseDocument {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: 0 | 1 | 2; // 0=Draft, 1=Submitted, 2=Cancelled
  idx: number;
}

// Company
export interface Company extends BaseDocument {
  company_name: string;
  abbr: string;
  default_currency: string;
  country: string;
  tax_id: string;
}

// Customer
export interface Customer extends BaseDocument {
  customer_name: string;
  customer_type: 'Company' | 'Individual';
  customer_group: string;
  territory: string;
  email_id: string;
  mobile_no: string;
  tax_id: string;
  credit_limit: number;
}

// Supplier
export interface Supplier extends BaseDocument {
  supplier_name: string;
  supplier_type: 'Company' | 'Individual';
  supplier_group: string;
  country: string;
  email_id: string;
  mobile_no: string;
  tax_id: string;
}

// Item
export interface Item extends BaseDocument {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  standard_rate: number;
  valuation_rate: number;
  is_stock_item: 0 | 1;
  has_batch_no: 0 | 1;
  has_serial_no: 0 | 1;
  brand: string;
  description: string;
  image: string;
}

// Account
export interface Account extends BaseDocument {
  account_name: string;
  account_number: string;
  account_type: string;
  root_type: 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';
  is_group: 0 | 1;
  parent_account: string;
  company: string;
  balance: number;
}

// Sales Invoice
export interface SalesInvoice extends BaseDocument {
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  items: SalesInvoiceItem[];
  total_qty: number;
  base_total: number;
  base_total_taxes_and_charges: number;
  base_grand_total: number;
  outstanding_amount: number;
  status: string;
  currency: string;
  taxes: TaxDetail[];
}

export interface SalesInvoiceItem {
  name: string;
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
}

// Purchase Invoice
export interface PurchaseInvoice extends BaseDocument {
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date: string;
  items: PurchaseInvoiceItem[];
  total_qty: number;
  base_total: number;
  base_grand_total: number;
  outstanding_amount: number;
  status: string;
  currency: string;
  taxes: TaxDetail[];
}

export interface PurchaseInvoiceItem {
  name: string;
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string;
}

// Journal Entry
export interface JournalEntry extends BaseDocument {
  voucher_type: string;
  posting_date: string;
  accounts: JournalEntryAccount[];
  total_debit: number;
  total_credit: number;
  difference: number;
  user_remark: string;
  title: string;
}

export interface JournalEntryAccount {
  account: string;
  party_type?: string;
  party?: string;
  debit: number;
  credit: number;
  against_account: string;
  remarks: string;
}

// Payment Entry
export interface PaymentEntry extends BaseDocument {
  payment_type: 'Receive' | 'Pay' | 'Internal Transfer';
  posting_date: string;
  mode_of_payment: string;
  party_type: string;
  party: string;
  party_name: string;
  paid_from: string;
  paid_to: string;
  paid_amount: number;
  received_amount: number;
  reference_no: string;
  reference_date: string;
  references: PaymentEntryReference[];
}

export interface PaymentEntryReference {
  reference_doctype: string;
  reference_name: string;
  total_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
}

// Sales Order
export interface SalesOrder extends BaseDocument {
  customer: string;
  customer_name: string;
  transaction_date: string;
  delivery_date: string;
  items: SalesOrderItem[];
  total_qty: number;
  base_grand_total: number;
  status: string;
  per_billed: number;
  per_delivered: number;
}

export interface SalesOrderItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  delivered_qty: number;
  billed_amt: number;
  warehouse: string;
}

// Purchase Order
export interface PurchaseOrder extends BaseDocument {
  supplier: string;
  supplier_name: string;
  transaction_date: string;
  schedule_date: string;
  items: PurchaseOrderItem[];
  total_qty: number;
  base_grand_total: number;
  status: string;
  per_billed: number;
  per_received: number;
}

export interface PurchaseOrderItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  received_qty: number;
  billed_amt: number;
  warehouse: string;
}

// Quotation
export interface Quotation extends BaseDocument {
  quotation_to: string;
  party_name: string;
  customer_name: string;
  transaction_date: string;
  valid_till: string;
  items: QuotationItem[];
  total_qty: number;
  base_grand_total: number;
  status: string;
}

export interface QuotationItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
}

// Warehouse
export interface Warehouse extends BaseDocument {
  warehouse_name: string;
  warehouse_type: string;
  company: string;
  is_group: 0 | 1;
  parent_warehouse: string;
  account: string;
}

// Stock Entry
export interface StockEntry extends BaseDocument {
  stock_entry_type: string;
  posting_date: string;
  posting_time: string;
  items: StockEntryItem[];
  total_amount: number;
  from_warehouse: string;
  to_warehouse: string;
}

export interface StockEntryItem {
  name: string;
  item_code: string;
  item_name: string;
  qty: number;
  basic_rate: number;
  amount: number;
  s_warehouse?: string;
  t_warehouse?: string;
  uom: string;
}

// Employee
export interface Employee extends BaseDocument {
  employee_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_joining: string;
  department: string;
  designation: string;
  company: string;
  status: 'Active' | 'Left' | 'Inactive';
  cell_number: string;
  company_email: string;
}

// Attendance
export interface Attendance extends BaseDocument {
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave';
  working_hours: number;
  late_entry: 0 | 1;
  early_exit: 0 | 1;
}

// Leave Application
export interface LeaveApplication extends BaseDocument {
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: 'Open' | 'Approved' | 'Rejected';
  description: string;
}

// Salary Slip
export interface SalarySlip extends BaseDocument {
  employee: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  payment_days: number;
  absent_days: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
}

export interface SalaryComponent {
  salary_component: string;
  amount: number;
}

// BOM
export interface BOM extends BaseDocument {
  item: string;
  item_name: string;
  quantity: number;
  uom: string;
  company: string;
  items: BOMItem[];
  total_cost: number;
  status: string;
}

export interface BOMItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
}

// Work Order
export interface WorkOrder extends BaseDocument {
  production_item: string;
  qty: number;
  produced_qty: number;
  bom_no: string;
  company: string;
  planned_start_date: string;
  planned_end_date: string;
  status: string;
}

// Tax Detail
export interface TaxDetail {
  charge_type: string;
  account_head: string;
  description: string;
  rate: number;
  tax_amount: number;
  total: number;
}

// User
export interface User {
  id: string;
  name: string;
  fullName: string;
  email: string;
  roles: string[];
  image?: string;
}

// Cost Center
export interface CostCenter extends BaseDocument {
  cost_center_name: string;
  parent_cost_center: string;
  is_group: 0 | 1;
  company: string;
}

// Fiscal Year
export interface FiscalYear extends BaseDocument {
  year: string;
  year_start_date: string;
  year_end_date: string;
  disabled: 0 | 1;
}

// Mode of Payment
export interface ModeOfPayment extends BaseDocument {
  mode_of_payment: string;
  type: 'Cash' | 'Bank' | 'General';
}

// Branch
export interface Branch extends BaseDocument {
  branch: string;
  company: string;
}

// Asset
export interface Asset extends BaseDocument {
  asset_name: string;
  asset_category: string;
  company: string;
  purchase_date: string;
  purchase_amount: number;
  gross_purchase_amount: number;
  accumulated_depreciation: number;
  asset_value: number;
  status: string;
}

// Salary Structure
export interface SalaryStructure extends BaseDocument {
  name: string;
  employee: string;
  company: string;
  from_date: string;
  to_date?: string;
  base: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
}

// Leave Type
export interface LeaveType extends BaseDocument {
  leave_type_name: string;
  max_leaves_allowed: number;
  is_carry_forward: 0 | 1;
  is_lwp: 0 | 1;
  is_ppl: 0 | 1;
}

// Holiday List
export interface HolidayList extends BaseDocument {
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  holidays: { holiday_date: string; description: string }[];
}

// Shift Type
export interface ShiftType extends BaseDocument {
  shift_type: string;
  start_time: string;
  end_time: string;
}

// Price List
export interface PriceList extends BaseDocument {
  price_list_name: string;
  currency: string;
  enabled: 0 | 1;
}

// Item Price
export interface ItemPrice extends BaseDocument {
  item_code: string;
  item_name: string;
  price_list: string;
  price_list_rate: number;
  currency: string;
}

// Stock Ledger Entry
export interface StockLedgerEntry extends BaseDocument {
  item_code: string;
  warehouse: string;
  posting_date: string;
  posting_time: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate: number;
  stock_value: number;
  voucher_type: string;
  voucher_no: string;
}

// Production Plan
export interface ProductionPlan extends BaseDocument {
  company: string;
  from_date: string;
  to_date: string;
  status: string;
  items: { item_code: string; item_name: string; qty: number; warehouse: string }[];
}

// Workstation
export interface Workstation extends BaseDocument {
  workstation_name: string;
  production_capacity: number;
  hour_rate: number;
  company: string;
}

// Email Account
export interface EmailAccount extends BaseDocument {
  email_account_name: string;
  email_id: string;
  password: string;
  enable_incoming: 0 | 1;
  enable_outgoing: 0 | 1;
  smtp_server: string;
  smtp_port: number;
}

// Notification
export interface ERPNotification extends BaseDocument {
  subject: string;
  document_type: string;
  document_name: string;
  for_user: string;
  read: 0 | 1;
}

// Activity Log
export interface ActivityLog extends BaseDocument {
  user: string;
  subject: string;
  operation: string;
  reference_doctype: string;
  reference_name: string;
  status: string;
}

// ============================================================
// POS / نقاط البيع — أنواع مستندات الوردية والفاتورة والإعدادات للواجهة والـ API
// ============================================================

/** صف طرق الدفع في ملف نقطة البيع (جدول فرعي). */
export interface POSProfilePaymentsRow {
  mode_of_payment?: string;
  default?: 0 | 1;
}

/** ملف نقطة البيع — الحقول الشائعة للدمج مع الخادم (لا غرض مطابقة ERPNext حرفياً). */
export interface POSProfile extends BaseDocument {
  company: string;
  warehouse?: string;
  selling_price_list?: string;
  currency?: string;
  disabled?: 0 | 1;
  payments?: POSProfilePaymentsRow[];
}

/** مستند POS Settings (عادة اسم السجل الثابت «POS Settings»). */
export interface POSSettings extends BaseDocument {
  invoice_type?: string;
  /** حقول إضافية حسب الإصدار — تُستخدم كـ Record عند الحاجة */
}

/** فتح وردية — مطابق تقريباً لواجهات الجلسات والـ API. */
export interface POSOpeningEntry extends BaseDocument {
  company: string;
  pos_profile: string;
  user: string;
  period_start_date: string;
  posting_date?: string;
  status?: string;
  balance_details?: POSOpeningEntryBalanceDetail[];
}

/** إغلاق وردية — الحقول الأساسية للعرض والربط مع فتح الوردية. */
export interface POSClosingEntry extends BaseDocument {
  company: string;
  pos_opening_entry?: string;
  pos_profile?: string;
  period_start_date?: string;
  period_end_date?: string;
  posting_date?: string;
  payment_reconciliation?: POSClosingPaymentReconciliation[];
}

/** فاتورة نقطة البيع — شكل مبسّط للعميل؛ التوسعة الكاملة حسب الحقول المرحّلة من الخادم. */
export interface POSInvoice extends BaseDocument {
  company: string;
  customer?: string;
  pos_profile?: string;
  selling_price_list?: string;
  posting_date?: string;
  items?: POSInvoiceItemRow[];
  payments?: POSInvoicePaymentRow[];
  grand_total?: number;
  rounded_total?: number;
  total_taxes_and_charges?: number;
}

export interface POSOpeningEntryBalanceDetail {
  mode_of_payment: string;
  opening_amount: number;
}

export interface POSOpeningEntrySummary {
  name: string;
  company: string;
  pos_profile: string;
  user: string;
  period_start_date: string;
  posting_date?: string;
  status?: string;
  balance_details?: POSOpeningEntryBalanceDetail[];
}

export interface POSClosingPaymentReconciliation {
  mode_of_payment: string;
  opening_amount?: number;
  expected_amount?: number;
  closing_amount?: number;
  difference?: number;
}

export interface POSInvoicePaymentRow {
  mode_of_payment?: string;
  amount?: number;
  base_amount?: number;
  account?: string;
  type?: string;
  default?: 0 | 1;
}

export interface POSInvoiceItemRow {
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  amount?: number;
  warehouse?: string;
  uom?: string;
}

/** استجابة `/api/pos/check-opening` */
export interface POSCheckOpeningResponse {
  has_open_entry: boolean;
  open_entry?: {
    name: string;
    pos_profile: string;
    company: string;
    user: string;
    period_start_date: string;
    status?: string;
  };
}

/** رموز موحّدة لفحص الجاهزية (واجهات + إصلاح تلقائي آمن). */
export type PosReadinessIssueCode =
  | 'no_active_pos_profile'
  | 'no_company_warehouse'
  | 'mode_of_payment_missing_company_account'
  | 'pos_profile_missing_warehouse'
  | 'pos_profile_missing_price_list'
  | 'pos_profile_no_payment_rows'
  | 'pos_settings_invoice_type';

export interface PosReadinessIssueDetail {
  code: PosReadinessIssueCode;
  /** blocking = يمنع البيع؛ warning = تنبيه فقط */
  severity: 'blocking' | 'warning';
  message: string;
  /** مثلاً اسم ملف POS أو طريقة الدفع */
  context?: string;
}

/** استجابة `/api/pos/check-readiness` و`POST /api/pos/setup` (جزء readiness) */
export interface POSReadinessResponse {
  ready: boolean;
  /** أسباب منع الجاهزية (blocking) — للتوافق مع العملاء القدامى */
  issues: string[];
  /** تنبيهات لا تُسقط الجاهزية وحدها */
  warnings?: string[];
  details?: PosReadinessIssueDetail[];
}

/** استجابة `POST /api/pos/setup` */
export interface POSSetupResponseData {
  readiness: POSReadinessResponse;
  setup_actions: string[];
}

/** استجابة `POST /api/pos/create-invoice` بعد الإنشاء والترحيل */
export interface POSCreateInvoiceResponse {
  name: string;
  rounded_total: number;
  total_taxes_and_charges: number;
  /** مُرجع من الخادم عند الحفظ كمسودة (دفع جزئي) */
  draft?: boolean;
}

/** استجابة `GET /api/pos/customer-info` */
export interface POSCustomerInfoResponse {
  name: string;
  customer_name: string;
  mobile_no?: string;
  email_id?: string;
  territory?: string;
  customer_group?: string;
  outstanding_balance: number;
}

/** استجابة `GET /api/pos/session-summary` */
export interface POSSessionSummaryResponse {
  pos_opening_entry: string;
  period_start_date: string;
  period_end: string;
  company: string;
  pos_profile: string;
  user: string;
  invoice_count: number;
  sales_invoice_count: number;
  return_invoice_count: number;
  grand_total_sum: number;
  tax_sum: number;
  payments_by_mode: Record<string, number>;
  opening_amounts_by_mode: Record<string, number>;
  invoices: {
    name: string;
    grand_total: number;
    posting_date?: string;
    customer_name?: string;
  }[];
}

/** عنصر في `GET /api/pos/past-orders` */
export interface POSPastOrderRow {
  name: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  pos_profile?: string;
}

// Settings group — collapsible sub-section within a module's sidebar
export interface SettingsGroup {
  id: string;
  nameAr: string;
  /** Optional path - if provided, clicking the group itself navigates here */
  path?: string;
  /** Nested items within this settings group */
  items: {
    id: string;
    nameAr: string;
    path: string;
  }[];
}

// Module definition
export interface SystemModule {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  path: string;
  color: string;
  subModules: {
    id: string;
    name: string;
    nameAr: string;
    path: string;
    doctype?: string;
  }[];
  /** Settings groups - each group is collapsible in sidebar */
  settingsGroups?: SettingsGroup[];
  /** @deprecated - replaced by settingsGroups */
  settingsLinks?: {
    id: string;
    nameAr: string;
    path: string;
  }[];
}

/** أنواع إعدادات امتدادات المنتج — آمن للاستيراد من العميل والخادم */

export type ReportScheduleRow = {
  id: string;
  reportKey: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hourUtc: number;
};

export type ProductExtensionsSettings = {
  sms: { enabled: boolean; provider: string; apiKey: string; senderId: string };
  ecommerce: {
    salla: { enabled: boolean; webhookSecret: string };
    zid: { enabled: boolean; apiToken: string };
    shopify: { enabled: boolean; shopDomain: string; accessToken: string };
  };
  reportSchedules: ReportScheduleRow[];
  workflowStudioUrl: string;
  updatedAt?: string;
};

export const PRODUCT_EXTENSIONS_DEFAULTS: ProductExtensionsSettings = {
  sms: { enabled: false, provider: 'twilio', apiKey: '', senderId: '' },
  ecommerce: {
    salla: { enabled: false, webhookSecret: '' },
    zid: { enabled: false, apiToken: '' },
    shopify: { enabled: false, shopDomain: '', accessToken: '' },
  },
  reportSchedules: [],
  workflowStudioUrl: '/operations/workflow-studio',
};

export function newReportScheduleRow(): ReportScheduleRow {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `rs-${Date.now()}`,
    reportKey: 'general-ledger',
    frequency: 'daily',
    hourUtc: 6,
  };
}

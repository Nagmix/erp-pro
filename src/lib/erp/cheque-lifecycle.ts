/** حقل مخصص على Payment Entry لدورة الشيك (H-12) — يُنشأ عبر API عند الطلب. */
export const CHEQUE_LIFECYCLE_FIELD = 'cheque_lifecycle_stage';

export const CHEQUE_LIFECYCLE_OPTIONS = ['Issued', 'Deposited', 'Cleared', 'Bounced'] as const;
export type ChequeLifecycleStage = (typeof CHEQUE_LIFECYCLE_OPTIONS)[number];

export const CHEQUE_LIFECYCLE_LABEL_AR: Record<string, string> = {
  Issued: 'إصدار',
  Deposited: 'إيداع',
  Cleared: 'مقاصة',
  Bounced: 'ارتداد',
};

export function chequeLifecycleLabel(stage: string | null | undefined): string {
  if (!stage) return '—';
  return CHEQUE_LIFECYCLE_LABEL_AR[stage] ?? stage;
}

import { toast as sonnerToast } from 'sonner';

/** إشعار مع إجراء تراجع بسيط (المرحلة 12.2 — سجل إجراءات / تراجع خفيف). */
export function toastWithUndo(message: string, onUndo: () => void) {
  sonnerToast.message(message, {
    action: {
      label: 'تراجع',
      onClick: () => {
        onUndo();
        sonnerToast.success('تم التراجع');
      },
    },
  });
}

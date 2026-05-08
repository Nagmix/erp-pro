/**
 * إنشاء حقل مخصص لمراحل الشيك على Payment Entry في ERPNext/Frappe عند غيابه.
 */

import { createDoc, getList } from '@/lib/server/backend';
import { CHEQUE_LIFECYCLE_FIELD } from '@/lib/erp/cheque-lifecycle';

const OPTIONS_LINES = 'Issued\nDeposited\nCleared\nBounced';

/** حقول إدراج شائعة إن اختلف ترتيب النموذج بين إصدارات ERPNext */
const INSERT_AFTER_CANDIDATES = ['reference_date', 'reference_no', 'mode_of_payment', 'party'];

export type EnsureChequeLifecycleFieldResult = {
  created: boolean;
  customFieldName?: string;
  insertAfter?: string;
};

export async function ensureChequeLifecycleField(userSession?: string): Promise<EnsureChequeLifecycleFieldResult> {
  const existing = await getList(
    'Custom Field',
    {
      fields: ['name'],
      filters: [
        ['dt', '=', 'Payment Entry'],
        ['fieldname', '=', CHEQUE_LIFECYCLE_FIELD],
      ],
      limit: 1,
    },
    userSession
  );
  const rows = Array.isArray(existing) ? (existing as { name: string }[]) : [];
  if (rows[0]?.name) {
    return { created: false, customFieldName: rows[0].name };
  }

  let lastErr: Error | null = null;
  for (const insert_after of INSERT_AFTER_CANDIDATES) {
    try {
      const doc = (await createDoc(
        'Custom Field',
        {
          dt: 'Payment Entry',
          fieldname: CHEQUE_LIFECYCLE_FIELD,
          label: 'Cheque lifecycle',
          fieldtype: 'Select',
          options: OPTIONS_LINES,
          insert_after,
          in_list_view: 1,
          allow_on_submit: 1,
        },
        userSession
      )) as { name?: string };
      return { created: true, customFieldName: doc?.name, insertAfter: insert_after };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error('تعذر إنشاء حقل دورة الشيك');
}

export async function chequeLifecycleFieldExists(userSession?: string): Promise<boolean> {
  const existing = await getList(
    'Custom Field',
    {
      fields: ['name'],
      filters: [
        ['dt', '=', 'Payment Entry'],
        ['fieldname', '=', CHEQUE_LIFECYCLE_FIELD],
      ],
      limit: 1,
    },
    userSession
  );
  const rows = Array.isArray(existing) ? existing : [];
  return rows.length > 0;
}

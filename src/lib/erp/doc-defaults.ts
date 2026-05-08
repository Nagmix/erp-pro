/**
 * قيم افتراضية لمستندات تُنشأ من الواجهة.
 * غيّر التسلسل هنا إن كان مخطط شركتك يستخدم تسمية مختلفة لفاتورة المبيعات.
 */
export const DEFAULT_SALES_INVOICE_NAMING_SERIES = 'ACC-SINV-.YYYY.-';

/** تسلسل افتراضي لفاتورة المشتريات — عدّله إن كان مخطط شركتك مختلفاً. */
export const DEFAULT_PURCHASE_INVOICE_NAMING_SERIES = 'ACC-PINV-.YYYY.-';

/** تلميح تسلسل القيود اليومية (يُضبط في ERPNext حسب مخطط الشركة). */
export const DEFAULT_JOURNAL_NAMING_SERIES = 'ACC-JV-.YYYY.-';

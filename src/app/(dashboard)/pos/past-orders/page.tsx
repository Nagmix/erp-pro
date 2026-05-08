'use client';

import { PosPastOrders } from '@/components/pos/pos-past-orders';
import { PageHeader } from '@/components/erp/page-header';

export default function PosPastOrdersPage() {
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="طلبات سابقة"
        description="آخر فواتير نقطة البيع المرحّلة؛ يمكن تقييد القائمة بملف نقطة بيع أو شركة."
        iconify="solar:history-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'طلبات سابقة' }]}
      />

      <PosPastOrders />
    </div>
  );
}

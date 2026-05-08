"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * إعادة توجيه من /accounting/sales-invoice إلى /sales/sales-invoices
 * صفحة فواتير المبيعات الآن تحت قسم المبيعات
 */
export default function SalesInvoiceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales/sales-invoices");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جاري التحويل إلى فواتير المبيعات...</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * إعادة توجيه من /accounting/purchase-invoice/new إلى /purchases/purchase-invoices/new
 * إنشاء فاتورة مشتريات جديدة الآن تحت قسم المشتريات
 */
export default function PurchaseInvoiceNewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/purchases/purchase-invoices/new");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جاري التحويل إلى إنشاء فاتورة مشتريات...</p>
      </div>
    </div>
  );
}

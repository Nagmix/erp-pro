'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'erp_budgets';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

type Budget = {
  id: string;
  name: string;
  costCenter: string;
  fiscalYear: string;
  period: 'سنوي' | 'نصف سنوي' | 'ربعي' | 'شهري';
  allocatedAmount: number;
  actualSpent: number;
  status: 'مسودة' | 'نشط' | 'مغلق' | 'متجاوز';
  distribution: { account: string; accountName: string; amount: number; spent: number }[];
  createdAt: string;
};

export default function NewBudgetRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const existing: Budget[] = raw ? JSON.parse(raw) : [];

      const newBudget: Budget = {
        id: uid(),
        name: 'ميزانية جديدة',
        costCenter: 'الإدارة العامة',
        fiscalYear: new Date().getFullYear().toString(),
        period: 'سنوي',
        allocatedAmount: 0,
        actualSpent: 0,
        status: 'مسودة',
        distribution: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };

      const updated = [newBudget, ...existing];
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
    } catch {
      // silent fail — redirect anyway
    }

    router.replace('/accounting/budgets');
  }, [router]);

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-[40vh]">
      <p className="text-sm text-muted-foreground">جاري إنشاء ميزانية جديدة وإعادة التوجيه...</p>
    </div>
  );
}

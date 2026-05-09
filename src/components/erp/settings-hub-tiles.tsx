'use client';

import Link from 'next/link';
import {
  Building2,
  Printer,
  FileText,
  Plug,
  Shield,
  FormInput,
  Percent,
  CreditCard,
  LayoutGrid,
  Server,
  Route,
  LayoutDashboard,
  Puzzle,
  PenLine,
  Bell,
  Mail,
  ClipboardList,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tiles = [
  { href: '/settings/erp-backend', label: 'إعداد الخادم', desc: 'عنوان الخادم ومفاتيح الواجهة البرمجية', icon: Server, color: 'bg-slate-500/10 text-slate-800 dark:text-slate-200' },
  { href: '/settings/module-settings', label: 'إعدادات الوحدات', desc: 'بيع / شراء / مخزون / محاسبة', icon: LayoutDashboard, color: 'bg-sky-500/10 text-sky-800 dark:text-sky-200' },
  { href: '/settings/naming-series', label: 'الترقيم المتسلسل', desc: 'بادئات وأرقام المستندات', icon: Hash, color: 'bg-purple-500/10 text-purple-800 dark:text-purple-200' },
  { href: '/settings/account-routing', label: 'توجيه الحسابات', desc: 'الحسابات الافتراضية للشركة', icon: Route, color: 'bg-teal-500/10 text-teal-800 dark:text-teal-200' },
  { href: '/settings/branches', label: 'الفروع', desc: 'إدارة الفروع', icon: Building2, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { href: '/settings/print-templates', label: 'قوالب الطباعة', desc: 'تنسيقات الطباعة', icon: Printer, color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  { href: '/settings/rich-templates', label: 'محرر القوالب المرئية', desc: 'تحرير نصوص غني مع معاينة', icon: PenLine, color: 'bg-sky-500/10 text-sky-800 dark:text-sky-200' },
  { href: '/settings/terms-and-conditions', label: 'الشروط والأحكام', desc: 'إدارة الشروط', icon: FileText, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { href: '/settings/integrations', label: 'التكاملات', desc: 'موصلات', icon: Plug, color: 'bg-amber-500/10 text-amber-800 dark:text-amber-200' },
  { href: '/settings/product-extensions', label: 'امتدادات المنتج', desc: 'SMS، متاجر، جداول', icon: Puzzle, color: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-200' },
  { href: '/settings/security', label: 'الأمان', desc: 'سياسات وسجل', icon: Shield, color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  { href: '/settings/custom-fields', label: 'حقول مخصصة', desc: 'إدارة الحقول الإضافية', icon: FormInput, color: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200' },
  { href: '/settings/notification-rules', label: 'قواعد الإرسال', desc: 'بريد وSMS عند أحداث المستندات', icon: Bell, color: 'bg-amber-500/10 text-amber-900 dark:text-amber-100' },
  { href: '/settings/email-smtp', label: 'بريد SMTP', desc: 'إرسال واختبار من التطبيق', icon: Mail, color: 'bg-sky-500/10 text-sky-800 dark:text-sky-200' },
  { href: '/settings/local-audit-log', label: 'سجل تدقيق محلي', desc: 'أحداث إعدادات عند SQLite', icon: ClipboardList, color: 'bg-muted text-foreground' },
  { href: '/settings/tax-rates', label: 'الضرائب', desc: 'معدلات وقواعد الضريبة', icon: Percent, color: 'bg-orange-500/10 text-orange-800 dark:text-orange-200' },
  { href: '/settings/payment-methods', label: 'طرق الدفع', desc: 'إدارة وسائل الدفع', icon: CreditCard, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
];

/** بطاقات إعدادات مستوحاة من دفترة (المرحلة 12.1 — Tile-based Settings). */
export function SettingsHubTiles() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3 hover:border-border/60">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <span>وصول سريع للإعدادات</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'group flex flex-col gap-1 rounded-lg border border-border/40 bg-card p-3 shadow-sm',
                'transition-all duration-200 hover:border-border/60 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
                'min-h-[88px] touch-manipulation'
              )}
            >
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', t.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold leading-tight group-hover:text-primary transition-colors">{t.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

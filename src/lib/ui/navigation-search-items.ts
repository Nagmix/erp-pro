import { SYSTEM_MODULES } from '@/lib/core/helpers';
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Settings,
  Calculator,
  ShoppingCart,
  Package,
  Users,
  Factory,
  Truck,
  Wrench,
  Heart,
  Bell,
  FolderOpen,
  Shield,
  type LucideIcon,
} from 'lucide-react';

const MODULE_ICON_BY_NAME: Record<string, LucideIcon> = {
  Calculator,
  ShoppingCart,
  Package,
  Users,
  Factory,
  Truck,
  Wrench,
  Heart,
};

export type NavigationSearchItem = {
  id: string;
  label: string;
  description: string;
  path: string;
  group: string;
  /** Value passed to cmdk for fuzzy match */
  searchValue: string;
  icon: LucideIcon;
};

const STATIC_ITEMS: NavigationSearchItem[] = [
  {
    id: 'nav-root',
    label: 'لوحة التحكم',
    description: 'نظرة عامة ومؤشرات',
    path: '/',
    group: 'عام',
    searchValue: 'dashboard لوحة التحكم home',
    icon: LayoutDashboard,
  },
  {
    id: 'nav-reports',
    label: 'التقارير',
    description: 'تقارير النظام والتحليلات',
    path: '/reports',
    group: 'عام',
    searchValue: 'reports تقارير تحليلات',
    icon: BarChart3,
  },
  {
    id: 'nav-notifications',
    label: 'مركز الإشعارات',
    description: 'إشعارات النظام والتنبيهات',
    path: '/notifications',
    group: 'عام',
    searchValue: 'notifications إشعارات تنبيهات bell',
    icon: Bell,
  },
  {
    id: 'nav-doc-management',
    label: 'إدارة المستندات',
    description: 'أرشفة المستندات والملفات',
    path: '/doc-management',
    group: 'عام',
    searchValue: 'documents مستندات ملفات أرشيف',
    icon: FolderOpen,
  },
  {
    id: 'nav-role-permissions',
    label: 'صلاحيات الأدوار',
    description: 'إدارة الأدوار والصلاحيات',
    path: '/settings/role-permissions',
    group: 'الإعدادات',
    searchValue: 'roles permissions صلاحيات أدوار',
    icon: Shield,
  },
  {
    id: 'nav-audit',
    label: 'سجل التدقيق',
    description: 'سجل النشاط والتغييرات',
    path: '/audit-log',
    group: 'عام',
    searchValue: 'audit log تدقيق نشاط',
    icon: ClipboardList,
  },
  {
    id: 'nav-settings',
    label: 'الإعدادات العامة',
    description: 'إعدادات النظام والشركة',
    path: '/settings',
    group: 'الإعدادات',
    searchValue: 'settings إعدادات',
    icon: Settings,
  },
  {
    id: 'nav-settings-branches',
    label: 'الفروع',
    description: 'إعدادات الفروع',
    path: '/settings/branches',
    group: 'الإعدادات',
    searchValue: 'فروع branch',
    icon: Settings,
  },
  {
    id: 'nav-settings-print',
    label: 'قوالب الطباعة',
    description: 'قوالب وتنسيقات الطباعة',
    path: '/settings/print-templates',
    group: 'الإعدادات',
    searchValue: 'طباعة قوالب print',
    icon: Settings,
  },
  {
    id: 'nav-settings-notification-rules',
    label: 'قواعد الإرسال الآلي',
    description: 'إشعارات بريد وSMS',
    path: '/settings/notification-rules',
    group: 'الإعدادات',
    searchValue: 'notification قواعد إرسال sms بريد',
    icon: Settings,
  },
  {
    id: 'nav-settings-security',
    label: 'الأمان',
    description: 'سياسات وسجل الدخول',
    path: '/settings/security',
    group: 'الإعدادات',
    searchValue: 'أمان security',
    icon: Settings,
  },
  {
    id: 'nav-settings-sms-templates',
    label: 'قوالب الرسائل',
    description: 'قوالب رسائل SMS',
    path: '/settings/sms-templates',
    group: 'الإعدادات',
    searchValue: 'sms templates قوالب رسائل',
    icon: Settings,
  },
  {
    id: 'nav-settings-sms-rules',
    label: 'قواعد SMS الآلية',
    description: 'قواعد إرسال SMS تلقائية',
    path: '/settings/sms-rules',
    group: 'الإعدادات',
    searchValue: 'sms rules قواعد آلية',
    icon: Settings,
  },
  {
    id: 'nav-settings-email-rules',
    label: 'قواعد البريد الآلي',
    description: 'قواعد إرسال بريد تلقائية',
    path: '/settings/email-rules',
    group: 'الإعدادات',
    searchValue: 'email rules قواعد بريد آلي',
    icon: Settings,
  },
  {
    id: 'nav-settings-tax-rules',
    label: 'قواعد الضرائب',
    description: 'قواعد وإعدادات الضرائب',
    path: '/settings/tax-rules',
    group: 'الإعدادات',
    searchValue: 'tax rules قواعد ضرائب',
    icon: Settings,
  },
  {
    id: 'nav-settings-integrations',
    label: 'التكاملات',
    description: 'موصلات خارجية',
    path: '/settings/integrations',
    group: 'الإعدادات',
    searchValue: 'تكاملات integrations',
    icon: Settings,
  },
  {
    id: 'nav-settings-erp-backend',
    label: 'إعداد الخادم',
    description: 'إعداد الاتصال ومفاتيح API',
    path: '/settings/erp-backend',
    group: 'الإعدادات',
    searchValue: 'erpnext frappe backend api',
    icon: Settings,
  },
];

function moduleIcon(iconName: string): LucideIcon {
  return MODULE_ICON_BY_NAME[iconName] ?? LayoutDashboard;
}

/** عناصر بحث حقيقية مبنية على `SYSTEM_MODULES` + مسارات إعدادات وتقارير (المرحلة 12). */
export function getNavigationSearchItems(): NavigationSearchItem[] {
  const fromModules: NavigationSearchItem[] = [];
  for (const mod of SYSTEM_MODULES) {
    const Icon = moduleIcon(mod.icon);
    for (const sub of mod.subModules) {
      fromModules.push({
        id: `nav-${sub.id}`,
        label: sub.nameAr,
        description: sub.doctype ? `${sub.doctype} · ${mod.nameAr}` : mod.nameAr,
        path: sub.path,
        group: mod.nameAr,
        searchValue: `${sub.name} ${sub.nameAr} ${sub.path} ${sub.doctype ?? ''}`.trim(),
        icon: Icon,
      });
    }
  }
  return [...STATIC_ITEMS, ...fromModules];
}

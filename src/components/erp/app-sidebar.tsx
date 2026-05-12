'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SYSTEM_MODULES } from '@/lib/core/helpers';
import type { SystemModule, SettingsGroup } from '@/lib/core/types';
import { canAccessPath } from '@/lib/auth/route-access';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModernIcon } from '@/components/ui/modern-icon';

const iconMap: Record<string, string> = {
  Calculator: 'solar:calculator-minimalistic-bold-duotone',
  ShoppingCart: 'solar:cart-large-3-bold-duotone',
  Store: 'solar:shop-bold-duotone',
  Package: 'solar:box-bold-duotone',
  Users: 'solar:users-group-two-rounded-bold-duotone',
  Factory: 'solar:buildings-2-bold-duotone',
  Truck: 'solar:delivery-bold-duotone',
  Cog: 'solar:cog-bold-duotone',
  Heart: 'solar:heart-bold-duotone',
  BarChart3: 'solar:chart-2-bold-duotone',
};

function SidebarSectionLabel({ collapsed, label }: { collapsed: boolean; label: string }) {
  if (collapsed) return null;
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">
      {label}
    </p>
  );
}

function SidebarNavLeaf({
  collapsed,
  href,
  iconify,
  label,
  active,
  LucideIcon,
}: {
  collapsed: boolean;
  href: string;
  iconify?: string;
  label: string;
  active: boolean;
  LucideIcon?: ComponentType<{ className?: string }>;
}) {
  const content = (
    <Link
      href={href}
      data-active={active ? 'true' : 'false'}
      className={cn(
        'erp-nav-item',
        collapsed && 'justify-center px-2'
      )}
    >
      {iconify ? (
        <ModernIcon iconify={iconify} className="h-[18px] w-[18px] shrink-0" />
      ) : LucideIcon ? (
        <LucideIcon className="h-[18px] w-[18px] shrink-0" />
      ) : null}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="left" sideOffset={10} className="text-xs font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

/** Renders nested, collapsible settings groups inside a module's sidebar section. */
function SettingsGroupsRenderer({ groups, pathname }: { groups: SettingsGroup[]; pathname: string }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <>
      {groups.map((group) => {
        const hasItems = group.items.length > 0;
        const isGroupActive =
          (group.path && (pathname === group.path || pathname.startsWith(`${group.path}/`))) ||
          group.items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
        const isOpen = openGroups[group.id] ?? isGroupActive;

        return (
          <div key={group.id} className="mt-1">
            {/* Group label — clickable: navigates if path, or just toggles */}
            {group.path ? (
              <Link
                href={group.path}
                data-active={isGroupActive ? 'true' : 'false'}
                className="erp-nav-sub w-full flex items-center gap-1"
                onClick={() => { if (hasItems) toggleGroup(group.id); }}
              >
                <span className="me-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden />
                <span className="flex-1 truncate text-[11px] font-semibold text-primary/80">{group.nameAr}</span>
                {hasItems && (
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-200 opacity-50',
                      isOpen && 'rotate-180'
                    )}
                  />
                )}
              </Link>
            ) : (
              <button
                type="button"
                className="erp-nav-sub w-full flex items-center gap-1"
                onClick={() => { if (hasItems) toggleGroup(group.id); }}
              >
                <span className="me-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden />
                <span className="flex-1 truncate text-start text-[11px] font-semibold text-primary/80">{group.nameAr}</span>
                {hasItems && (
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-200 opacity-50',
                      isOpen && 'rotate-180'
                    )}
                  />
                )}
              </button>
            )}

            {/* Nested items */}
            {hasItems && isOpen && (
              <div className="me-2 mt-0.5 space-y-0.5 ps-4 border-s border-[color:var(--sidebar-border)]">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.path}
                    data-active={
                      pathname === item.path || pathname.startsWith(`${item.path}/`) ? 'true' : 'false'
                    }
                    className="erp-nav-sub"
                  >
                    <span
                      className="me-2 inline-block h-1 w-1 rounded-full bg-primary/40"
                      aria-hidden
                    />
                    <span className="truncate text-[11px]">{item.nameAr}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const roles = user?.roles ?? [];
  const visibleModules = useMemo(
    () => SYSTEM_MODULES.filter((m) => canAccessPath(m.path, roles)),
    [roles]
  );
  const showAudit = canAccessPath('/audit-log', roles);
  const showSettingsBlock = canAccessPath('/settings', roles);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebar);
  const [mobileAnimating, setMobileAnimating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const isModuleActive = (mod: SystemModule) => {
    if (pathname.startsWith(mod.path)) return true;
    // Check settingsGroups items
    if (mod.settingsGroups?.some((g) =>
      (g.path && (pathname === g.path || pathname.startsWith(`${g.path}/`))) ||
      g.items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    )) return true;
    return false;
  };
  const isSubModuleActive = (subPath: string) => pathname === subPath;

  const openMobile = () => {
    setMobileOpen(true);
    setMobileAnimating(true);
  };
  const closeMobile = () => {
    setMobileAnimating(false);
    setTimeout(() => setMobileOpen(false), 300);
  };

  const sidebarContent = (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] relative">
        {/* Brand Header */}
        <div className="relative flex h-16 items-center gap-2 border-b border-[color:var(--sidebar-border)] px-3 shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-9 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] bg-[color:var(--sidebar-primary)] ring-1 ring-white/15">
              <ModernIcon iconify="solar:layers-bold-duotone" className="relative h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold tracking-tight text-white">
                  ERP <span className="erp-brand-text">Pro</span>
                </span>
                <span className="truncate text-[10px] text-sidebar-muted">نظام موارد عربي حديث</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'hidden lg:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              'border border-white/12 bg-white/[0.06] text-[color:var(--sidebar-foreground)]',
              'hover:bg-[color:var(--sidebar-soft)] hover:border-white/18'
            )}
            title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
            aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 shrink-0 text-[color:var(--sidebar-foreground)] hover:bg-[color:var(--sidebar-soft)]"
            onClick={closeMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body — تمرير بخط عمودي على يمين المنطقة (حاوية ltr) */}
        <div
          data-sidebar-scroll
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3"
          dir="ltr"
        >
          <div dir="rtl">
          <SidebarSectionLabel collapsed={collapsed} label="عام" />
          <div className="px-1 space-y-0.5">
            <SidebarNavLeaf
              collapsed={collapsed}
              href="/"
              iconify="solar:widget-2-bold-duotone"
              label="لوحة التحكم"
              active={pathname === '/'}
            />
            <SidebarNavLeaf
              collapsed={collapsed}
              href="/calendar"
              iconify="solar:calendar-bold-duotone"
              label="التقويم"
              active={pathname === '/calendar'}
            />
          </div>

          <SidebarSectionLabel collapsed={collapsed} label="الوحدات" />
          <div className="px-1 space-y-0.5 pb-2">
            {visibleModules.map((module) => {
              const iconify = iconMap[module.icon] ?? 'solar:box-bold-duotone';
              const isActive = isModuleActive(module);
              const isOpen = openModules[module.id] ?? isActive;

              if (collapsed) {
                return (
                  <Tooltip key={module.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={module.path}
                        data-active={isActive ? 'true' : 'false'}
                        className="erp-nav-item justify-center px-2"
                      >
                        <ModernIcon iconify={iconify} className="h-[18px] w-[18px] shrink-0" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="left" sideOffset={10} className="text-xs font-medium">
                      {module.nameAr}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Collapsible key={module.id} open={isOpen} onOpenChange={() => toggleModule(module.id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      data-active={isActive ? 'true' : 'false'}
                      className="erp-nav-item w-full"
                    >
                      <ModernIcon iconify={iconify} className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 text-start truncate">{module.nameAr}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-200 opacity-70',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                    <div className="me-3 mt-0.5 space-y-0.5 ps-3 border-s border-[color:var(--sidebar-border)]">
                      {module.subModules.map((sub) => (
                        <Link
                          key={sub.id}
                          href={sub.path}
                          data-active={isSubModuleActive(sub.path) ? 'true' : 'false'}
                          className="erp-nav-sub"
                        >
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          <span className="truncate">{sub.nameAr}</span>
                        </Link>
                      ))}
                      {/* Settings groups (nested, collapsible) */}
                      {module.settingsGroups && module.settingsGroups.length > 0 && (
                        <SettingsGroupsRenderer groups={module.settingsGroups} pathname={pathname} />
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {(showAudit || showSettingsBlock) && (
            <>
              <SidebarSectionLabel collapsed={collapsed} label="الإدارة" />
              <div className="px-1 space-y-0.5">
                {showAudit && (
                  <SidebarNavLeaf
                    collapsed={collapsed}
                    href="/audit-log"
                    iconify="solar:clipboard-list-bold-duotone"
                    label="سجل العمليات"
                    active={pathname === '/audit-log'}
                  />
                )}
                {showSettingsBlock && !collapsed && (
                  <Collapsible open={settingsOpen} onOpenChange={() => setSettingsOpen(!settingsOpen)}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        data-active={pathname.startsWith('/settings') ? 'true' : 'false'}
                        className="erp-nav-item w-full"
                      >
                        <ModernIcon iconify="solar:settings-bold-duotone" className="h-[18px] w-[18px] shrink-0" />
                        <span className="flex-1 text-start truncate">الإعدادات</span>
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform duration-200 opacity-70', settingsOpen && 'rotate-180')}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="me-3 mt-0.5 space-y-0.5 ps-3 border-s border-[color:var(--sidebar-border)]">
                        <Link href="/settings" className="erp-nav-sub" data-active={pathname === '/settings' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          عام
                        </Link>
                        <Link href="/settings/naming-series" className="erp-nav-sub" data-active={pathname === '/settings/naming-series' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          الترقيم المتسلسل
                        </Link>
                        <Link href="/settings/companies" className="erp-nav-sub" data-active={pathname === '/settings/companies' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          الشركات
                        </Link>
                        <Link href="/settings/branches" className="erp-nav-sub" data-active={pathname === '/settings/branches' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          الفروع
                        </Link>
                        <Link href="/settings/users" className="erp-nav-sub" data-active={pathname === '/settings/users' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          المستخدمين
                        </Link>
                        <Link href="/settings/role-permissions" className="erp-nav-sub" data-active={pathname === '/settings/role-permissions' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          صلاحيات الأدوار
                        </Link>
                        <Link href="/settings/security" className="erp-nav-sub" data-active={pathname === '/settings/security' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          الأمان
                        </Link>
                        <Link href="/settings/erp-backend" className="erp-nav-sub" data-active={pathname === '/settings/erp-backend' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          إعداد الخادم
                        </Link>
                        <Link href="/settings/backup" className="erp-nav-sub" data-active={pathname === '/settings/backup' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          النسخ الاحتياطي
                        </Link>
                        <Link href="/settings/integrations" className="erp-nav-sub" data-active={pathname === '/settings/integrations' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          التكاملات
                        </Link>
                        <Link href="/settings/print-format-builder" className="erp-nav-sub" data-active={pathname === '/settings/print-format-builder' ? 'true' : 'false'}>
                          <span className="me-2 inline-block h-1 w-1 rounded-full bg-[color:var(--sidebar-muted)]" aria-hidden />
                          منشئ التنسيقات
                        </Link>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                {showSettingsBlock && collapsed && (
                  <SidebarNavLeaf
                    collapsed={collapsed}
                    href="/settings"
                    iconify="solar:settings-bold-duotone"
                    label="الإعدادات"
                    active={pathname.startsWith('/settings')}
                  />
                )}
              </div>
            </>
          )}
          </div>
        </div>

        {/* User Section */}
        <div className="border-t border-[color:var(--sidebar-border)] p-3 shrink-0 relative">
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-200',
                  'hover:bg-[color:var(--sidebar-soft)] focus-visible:bg-[color:var(--sidebar-soft)]',
                  collapsed && 'justify-center'
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                  <AvatarFallback className="bg-[color:var(--sidebar-primary)] text-white text-xs font-semibold">
                    {user?.name?.charAt(0) || 'م'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-start overflow-hidden">
                      <p className="text-xs font-semibold truncate text-[color:var(--sidebar-foreground)]">{user?.name || 'مستخدم'}</p>
                      <p className="text-[10px] truncate text-sidebar-muted">{user?.email || 'admin'}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showSettingsBlock && (
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer gap-2">
                    <ModernIcon iconify="solar:settings-bold-duotone" className="h-4 w-4" />
                    الإعدادات
                  </Link>
                </DropdownMenuItem>
              )}
              {showSettingsBlock && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive focus:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 start-3 z-50 lg:hidden bg-card/90 backdrop-blur-md border-border/60"
        onClick={openMobile}
      >
        <ModernIcon iconify="solar:hamburger-menu-bold-duotone" className="h-5 w-5" />
      </Button>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 z-30 no-print transition-all duration-300 ease-in-out',
          'bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)]',
          'border-s border-[color:var(--sidebar-border)]',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={cn(
              'fixed inset-0 bg-black/35 backdrop-blur-sm transition-opacity duration-300',
              mobileAnimating ? 'opacity-100' : 'opacity-0'
            )}
            onClick={closeMobile}
          />
          <aside
            className={cn(
              'fixed inset-y-0 start-0 w-72 border-s border-[color:var(--sidebar-border)] transition-transform duration-300 ease-in-out',
              mobileAnimating ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

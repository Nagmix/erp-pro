'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Users,
  ChevronDown,
  ChevronLeft,
  Search,
  Filter,
  X,
  Mail,
  Briefcase,
  Network,
  UserCircle,
  Loader2,
} from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────
type Emp = {
  name: string;
  employee_name?: string;
  reports_to?: string;
  designation?: string;
  department?: string;
  company_email?: string;
  image?: string;
};

type TreeNode = Emp & { children: TreeNode[] };

// ── Department Color Map ─────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  'إدارة': 'bg-chart-5',
  'المبيعات': 'bg-chart-3',
  'المشتريات': 'bg-chart-2',
  'المحاسبة': 'bg-chart-1',
  'الموارد البشرية': 'bg-chart-5',
  'تقنية المعلومات': 'bg-chart-1',
  'التصنيع': 'bg-chart-4',
  'المخزون': 'bg-chart-3',
  'التسويق': 'bg-destructive',
  'الدعم الفني': 'bg-chart-2',
  'البحث والتطوير': 'bg-chart-5',
  'الشؤون القانونية': 'bg-slate-500',
};

function getDeptColor(dept?: string): string {
  if (!dept) return 'bg-gray-400';
  if (DEPT_COLORS[dept]) return DEPT_COLORS[dept];
  // Generate a consistent color from the department name
  let hash = 0;
  for (let i = 0; i < dept.length; i++) {
    hash = dept.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    'bg-chart-5', 'bg-chart-3', 'bg-chart-2', 'bg-chart-1',
    'bg-chart-5', 'bg-chart-1', 'bg-chart-4', 'bg-chart-3',
    'bg-destructive', 'bg-chart-2', 'bg-chart-5', 'bg-chart-1',
  ];
  return palette[Math.abs(hash) % palette.length];
}

function getDeptBgLight(dept?: string): string {
  if (!dept) return 'bg-gray-100 dark:bg-gray-800/40';
  const color = getDeptColor(dept);
  return color.replace('bg-', 'bg-').replace(/-500/g, '-100 dark:bg-$&-900/30').replace('bg-', 'bg-');
}

function getDeptTextColor(dept?: string): string {
  if (!dept) return 'text-gray-600 dark:text-gray-400';
  const color = getDeptColor(dept);
  // Map 500 to 700 for text
  return color.replace(/-500$/, '-700 dark:text-$&-300').replace('bg-', 'text-');
}

// ── Org Node Component ───────────────────────────────────────
function OrgNode({
  node,
  level = 0,
  onCardClick,
  deptFilter,
  searchQuery,
}: {
  node: TreeNode;
  level?: number;
  onCardClick: (emp: TreeNode) => void;
  deptFilter: string;
  searchQuery: string;
}) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const nm = node.employee_name || node.name;
  const initials = nm.slice(0, 2);
  const deptColor = getDeptColor(node.department);

  // Check if any descendant matches filter
  const hasMatchingDescendant = useMemo(() => {
    if (!deptFilter && !searchQuery) return true;
    const matches = (n: TreeNode): boolean => {
      const deptOk = !deptFilter || n.department === deptFilter;
      const searchOk = !searchQuery || (n.employee_name || n.name).toLowerCase().includes(searchQuery.toLowerCase());
      if (deptOk && searchOk) return true;
      return n.children.some(matches);
    };
    return matches(node);
  }, [node, deptFilter, searchQuery]);

  // Check if this node itself matches
  const selfMatches = useMemo(() => {
    const deptOk = !deptFilter || node.department === deptFilter;
    const searchOk = !searchQuery || (node.employee_name || node.name).toLowerCase().includes(searchQuery.toLowerCase());
    return deptOk && searchOk;
  }, [node, deptFilter, searchQuery]);

  if (!hasMatchingDescendant) return null;

  const highlight = searchQuery && selfMatches;

  return (
    <div dir="rtl" className={cn(level > 0 && 'me-5 border-s-2 border-dashed pe-4 pt-1', level > 0 ? getDeptBgLight(node.department) : '')}
      style={{ borderRightColor: level > 0 ? undefined : undefined }}
    >
      <div className="flex items-center gap-2 py-1.5">
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/30 hover:bg-muted/60 transition-colors"
            aria-label={open ? 'طي' : 'توسيع'}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        {/* Employee Card */}
        <Card
          className={cn(
            'flex-1 cursor-pointer transition-all duration-200 border hover:shadow-md hover:border-border',
            highlight && 'ring-2 ring-primary/40 border-primary/30 shadow-md',
            selfMatches ? 'opacity-100' : 'opacity-50',
          )}
          onClick={() => onCardClick(node)}
        >
          <CardContent className="p-3 flex items-center gap-3">
            {/* Department color indicator */}
            <div className={cn('w-1 self-stretch rounded-full shrink-0', deptColor)} />

            {/* Avatar */}
            <Avatar className="h-10 w-10 shrink-0 border border-border/40">
              {node.image ? (
                <AvatarImage src={node.image} alt={nm} />
              ) : null}
              <AvatarFallback className={cn('text-xs font-medium', getDeptTextColor(node.department), getDeptBgLight(node.department))}>
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate">{nm}</span>
                {node.department && (
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border-0 font-medium', getDeptBgLight(node.department), getDeptTextColor(node.department))}>
                    {node.department}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {node.designation && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {node.designation}
                  </span>
                )}
                {node.company_email && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate" dir="ltr">
                    <Mail className="h-3 w-3 shrink-0" />
                    {node.company_email}
                  </span>
                )}
              </div>
            </div>

            {/* Children count badge */}
            {hasChildren && (
              <Badge variant="secondary" className="text-xs shrink-0 tabular-nums">
                {node.children.length}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Children nodes */}
      {open && hasChildren && (
        <div className="space-y-1 mt-1">
          {node.children.map((c) => (
            <OrgNode
              key={c.name}
              node={c}
              level={level + 1}
              onCardClick={onCardClick}
              deptFilter={deptFilter}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Employee Detail Dialog ───────────────────────────────────
function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: TreeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!employee) return null;
  const nm = employee.employee_name || employee.name;
  const initials = nm.slice(0, 2);
  const deptColor = getDeptColor(employee.department);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            تفاصيل الموظف
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Profile section */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
            <Avatar className="h-16 w-16 shrink-0 border-2 border-border/40">
              {employee.image ? (
                <AvatarImage src={employee.image} alt={nm} />
              ) : null}
              <AvatarFallback className={cn('text-lg font-semibold', getDeptTextColor(employee.department), getDeptBgLight(employee.department))}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-base font-semibold truncate">{nm}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{employee.name}</p>
              {employee.department && (
                <Badge variant="outline" className={cn('text-xs px-2 py-0.5 mt-1.5 border-0 font-medium', getDeptBgLight(employee.department), getDeptTextColor(employee.department))}>
                  {employee.department}
                </Badge>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-3">
            {employee.designation && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المسمى الوظيفي</p>
                  <p className="text-sm font-medium">{employee.designation}</p>
                </div>
              </div>
            )}
            {employee.department && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card">
                <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', deptColor, 'bg-opacity-15')}>
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="text-sm font-medium">{employee.department}</p>
                </div>
              </div>
            )}
            {employee.company_email && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card">
                <div className="h-8 w-8 rounded-md bg-chart-1/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="text-sm font-medium" dir="ltr">{employee.company_email}</p>
                </div>
              </div>
            )}
            {employee.reports_to && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card">
                <div className="h-8 w-8 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                  <Network className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المدير المباشر</p>
                  <p className="text-sm font-medium">{employee.reports_to}</p>
                </div>
              </div>
            )}
            {employee.children.length > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المرؤوسون المباشرون</p>
                  <p className="text-sm font-medium">{employee.children.length} موظف</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page Component ──────────────────────────────────────
export default function OrgChartPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TreeNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useDocList<Emp>('Employee', {
    fields: ['name', 'employee_name', 'reports_to', 'designation', 'department', 'company_email', 'image'],
    filters: [['status', '=', 'Active']],
    limit: 500,
  });

  // Build the tree
  const tree = useMemo(() => {
    const list = data || [];
    const map = new Map<string, TreeNode>();
    list.forEach((e) => map.set(e.name, { ...e, children: [] }));
    const roots: TreeNode[] = [];
    list.forEach((e) => {
      const node = map.get(e.name)!;
      const parentId = e.reports_to && String(e.reports_to);
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [data]);

  // Departments and designations for filters
  const departments = useMemo(() => {
    const s = new Set<string>();
    (data || []).forEach((e) => { if (e.department) s.add(e.department); });
    return Array.from(s).sort();
  }, [data]);

  const designations = useMemo(() => {
    const s = new Set<string>();
    (data || []).forEach((e) => { if (e.designation) s.add(e.designation); });
    return Array.from(s).sort();
  }, [data]);

  // Stats
  const totalEmployees = (data || []).length;
  const totalRoots = tree.length;
  const departmentsCount = departments.length;
  const unmatchedCount = useMemo(() => {
    const list = data || [];
    return list.filter((e) => {
      const parentId = e.reports_to && String(e.reports_to);
      return !parentId || !list.some((p) => p.name === parentId);
    }).length;
  }, [data]);

  // Filtered tree (apply designation filter at data level)
  const filteredTree = useMemo(() => {
    if (!desigFilter) return tree;

    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((n) => {
          const filteredChildren = filterTree(n.children);
          const selfMatch = n.designation === desigFilter;
          if (selfMatch || filteredChildren.length > 0) {
            return { ...n, children: filteredChildren };
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterTree(tree);
  }, [tree, desigFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('');
    setDesigFilter('');
    setFiltersOpen(false);
  };

  const hasActiveFilters = searchQuery || deptFilter || desigFilter;

  const handleCardClick = (emp: TreeNode) => {
    setSelectedEmployee(emp);
    setDetailOpen(true);
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="الهيكل التنظيمي"
        description="شجرة العلاقات الإدارية بين الموظفين بناءً على حقل المدير المباشر"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الهيكل التنظيمي' }]}
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="موظفون نشطون"
          value={totalEmployees}
          icon={Users}
          accent="primary"
          compact
        />
        <KpiCard
          title="جذور تنظيمية"
          value={totalRoots}
          icon={Network}
          accent="success"
          compact
        />
        <KpiCard
          title="الأقسام"
          value={departmentsCount}
          icon={Building2}
          accent="info"
          compact
        />
        <KpiCard
          title="بدون مدير مباشر"
          value={unmatchedCount}
          icon={UserCircle}
          accent="warning"
          compact
          description="موظفون لم يحدد لهم مدير مباشر"
        />
      </KpiStrip>

      {/* ── Search & Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث باسم الموظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pe-8 text-xs"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1">
              <X className="h-3 w-3" />
              مسح الفلاتر
            </Button>
          )}
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" />
                فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">القسم</Label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9 text-xs w-48">
                    <SelectValue placeholder="كل الأقسام" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل الأقسام</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">المسمى الوظيفي</Label>
                <Select value={desigFilter} onValueChange={setDesigFilter}>
                  <SelectTrigger className="h-9 text-xs w-48">
                    <SelectValue placeholder="كل المسميات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل المسميات</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Department Color Legend ── */}
      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">الأقسام:</span>
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setDeptFilter(deptFilter === dept ? '' : dept)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all border',
                deptFilter === dept
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20 font-semibold'
                  : 'border-border/30 bg-muted/20 hover:bg-muted/40',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', getDeptColor(dept))} />
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* ── Org Tree ── */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جارٍ تحميل الهيكل التنظيمي...</p>
          </CardContent>
        </Card>
      ) : filteredTree.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
            <Network className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'لا يوجد هيكل تنظيمي بعد'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs gap-1">
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-2">
                {filteredTree.map((n) => (
                  <OrgNode
                    key={n.name}
                    node={n}
                    onCardClick={handleCardClick}
                    deptFilter={deptFilter === '__all__' ? '' : deptFilter}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── Employee Detail Dialog ── */}
      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

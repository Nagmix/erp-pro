'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Users, ChevronDown, ChevronLeft } from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';

type Emp = {
  name: string;
  employee_name?: string;
  reports_to?: string;
  designation?: string;
  department?: string;
};

type TreeNode = Emp & { children: TreeNode[] };

function OrgNode({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const nm = node.employee_name || node.name;
  const initials = nm.slice(0, 2);
  return (
    <div dir="rtl" className={level > 0 ? 'me-6 border-s border-dashed border-muted pe-4' : ''}>
      <div
        className="flex items-center gap-2 py-2 cursor-pointer select-none"
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />) : <span className="w-4" />}
        <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
        <div>
          <div className="text-sm font-medium">{nm}</div>
          <div className="text-[10px] text-muted-foreground">{node.designation || '—'}{node.department ? ` · ${node.department}` : ''}</div>
        </div>
      </div>
      {open && hasChildren && (
        <div className="space-y-1">
          {node.children.map((c) => (
            <OrgNode key={c.name} node={c} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data, isLoading, isError, error, refetch } = useDocList<Emp>('Employee', {
    fields: ['name', 'employee_name', 'reports_to', 'designation', 'department'],
    filters: [['status', '=', 'Active']],
    limit: 500,
  });

  const tree = useMemo(() => {
    const list = data || [];
    const map = new Map<string, TreeNode>();
    list.forEach((e) => map.set(e.name, { ...e, children: [] }));
    const roots: TreeNode[] = [];
    list.forEach((e) => {
      const node = map.get(e.name)!;
      const parentId = e.reports_to && String(e.reports_to);
      if (parentId && map.has(parentId)) map.get(parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }, [data]);

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

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-primary" /></div><div><p className="text-[10px] text-muted-foreground">موظفون نشطون</p><p className="text-sm font-bold tabular-nums">{(data || []).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-green-600" /></div><div><p className="text-[10px] text-muted-foreground">جذور تنظيمية</p><p className="text-sm font-bold text-green-600 tabular-nums">{tree.length}</p></div></CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <Card><CardContent className="p-4 space-y-2">{tree.map((n) => <OrgNode key={n.name} node={n} />)}</CardContent></Card>
      )}
    </div>
  );
}

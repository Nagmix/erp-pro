'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ExportButton } from '@/components/erp/export-button';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Plus, Pencil, Trash2, LogIn, Filter, Send, XCircle, Activity, Inbox, RotateCcw } from 'lucide-react';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';

type ActionType = 'create' | 'edit' | 'delete' | 'submit' | 'cancel' | 'login';

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  actionType: ActionType;
  actionLabel: string;
  documentType: string;
  documentName: string;
  details: string;
}

const actionConfig: Record<ActionType, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  create: { label: 'إنشاء', color: 'text-primary', bg: 'bg-primary/10', icon: Plus },
  edit: { label: 'تعديل', color: 'text-chart-1', bg: 'bg-chart-1/10', icon: Pencil },
  delete: { label: 'حذف', color: 'text-destructive', bg: 'bg-destructive/10', icon: Trash2 },
  submit: { label: 'ترحيل', color: 'text-chart-5', bg: 'bg-chart-5/10', icon: Send },
  cancel: { label: 'إلغاء', color: 'text-chart-4', bg: 'bg-chart-4/10', icon: XCircle },
  login: { label: 'تسجيل دخول', color: 'text-gray-600', bg: 'bg-gray-500/10', icon: LogIn },
};

const columns: Column<AuditEntry>[] = [
  {
    key: 'timestamp',
    header: 'التاريخ والوقت',
    sortable: true,
    width: 'w-36',
    render: (value) => <span className="text-xs font-mono text-muted-foreground">{String(value)}</span>,
  },
  {
    key: 'user',
    header: 'المستخدم',
    sortable: true,
    width: 'w-28',
    render: (value) => <span className="font-medium text-xs">{String(value)}</span>,
  },
  {
    key: 'actionType',
    header: 'الإجراء',
    sortable: true,
    width: 'w-28',
    render: (value) => {
      const type = String(value) as ActionType;
      const config = actionConfig[type] ?? actionConfig.create;
      const Icon = config.icon;
      return (
        <Badge variant="outline" className={`gap-1 text-xs ${config.color} border-current/20`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  },
  {
    key: 'documentType',
    header: 'نوع المستند',
    sortable: true,
    width: 'w-32',
  },
  {
    key: 'documentName',
    header: 'رقم المستند',
    sortable: true,
    width: 'w-24',
    render: (value) => {
      const ref = String(value);
      return ref === '-' ? <span className="text-muted-foreground">—</span> : <span className="font-mono text-xs text-primary">{ref}</span>;
    },
  },
  {
    key: 'details',
    header: 'التفاصيل',
    render: (value) => <span className="text-xs text-muted-foreground line-clamp-1">{String(value)}</span>,
  },
];

const exportColumns = [
  { key: 'timestamp', header: 'التاريخ والوقت' },
  { key: 'user', header: 'المستخدم' },
  { key: 'actionLabel', header: 'الإجراء' },
  { key: 'documentType', header: 'نوع المستند' },
  { key: 'documentName', header: 'رقم المستند' },
  { key: 'details', header: 'التفاصيل' },
];

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [doctypeFilter, setDoctypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const liveLogs = useDocList<Record<string, unknown>>('Activity Log', {
    fields: ['name', 'creation', 'user', 'operation', 'subject', 'reference_doctype', 'reference_name', 'status'],
    limit: 500,
    order_by: 'creation desc',
  });

  const normalizedLive: AuditEntry[] = useMemo(() =>
    ((liveLogs.data || []) as Record<string, unknown>[]).map((r, i) => ({
      id: String(r.name || `LOG-LIVE-${i}`),
      timestamp: String(r.creation || ''),
      user: String(r.user || 'غير معروف'),
      actionType:
        String(r.operation || '').toLowerCase().includes('delete') ? 'delete'
          : String(r.operation || '').toLowerCase().includes('submit') ? 'submit'
            : String(r.operation || '').toLowerCase().includes('cancel') ? 'cancel'
              : String(r.operation || '').toLowerCase().includes('create') ? 'create'
                : 'edit',
      actionLabel: String(r.operation || 'update'),
      documentType: String(r.reference_doctype || 'Activity'),
      documentName: String(r.reference_name || '-'),
      details: String(r.subject || ''),
    })),
    [liveLogs.data]
  );

  const uniqueUsers = useMemo(() => Array.from(new Set(normalizedLive.map(e => e.user))), [normalizedLive]);
  const uniqueDoctypes = useMemo(() => Array.from(new Set(normalizedLive.map(e => e.documentType))).filter(d => d !== 'Activity'), [normalizedLive]);

  const today = new Date().toISOString().split('T')[0];
  const todayCount = normalizedLive.filter(e => e.timestamp.startsWith(today)).length;

  const filteredData = useMemo(() => normalizedLive.filter((entry) => {
    if (actionFilter !== 'all' && entry.actionType !== actionFilter) return false;
    if (userFilter !== 'all' && entry.user !== userFilter) return false;
    if (doctypeFilter !== 'all' && entry.documentType !== doctypeFilter) return false;
    if (dateFrom) {
      const entryDate = entry.timestamp.split(' ')[0];
      if (entryDate < dateFrom) return false;
    }
    if (dateTo) {
      const entryDate = entry.timestamp.split(' ')[0];
      if (entryDate > dateTo) return false;
    }
    return true;
  }), [normalizedLive, actionFilter, userFilter, doctypeFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setActionFilter('all');
    setUserFilter('all');
    setDoctypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const actionCounts = useMemo(() => ({
    create: normalizedLive.filter(e => e.actionType === 'create').length,
    edit: normalizedLive.filter(e => e.actionType === 'edit').length,
    delete: normalizedLive.filter(e => e.actionType === 'delete').length,
    submit: normalizedLive.filter(e => e.actionType === 'submit').length,
    cancel: normalizedLive.filter(e => e.actionType === 'cancel').length,
  }), [normalizedLive]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل العمليات"
        description="تتبع جميع الأنشطة والعمليات في النظام"
        iconify="solar:clipboard-list-bold-duotone"
        accent="info"
        actions={
          normalizedLive.length > 0 ? (
            <ExportButton
              data={filteredData as unknown as Record<string, unknown>[]}
              filename="سجل العمليات"
              columns={exportColumns}
            />
          ) : undefined
        }
      />

      <ListQueryAlert error={liveLogs.isError ? liveLogs.error : null} onRetry={() => liveLogs.refetch()} />

      
      {/* Empty State */}
      {normalizedLive.length === 0 && !liveLogs.isLoading && !liveLogs.isError ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-6">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">لا توجد سجلات نشاط</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
              لم يتم العثور على سجلات نشاط. تظهر السجلات هنا تلقائياً عند إنشاء أو تعديل أو حذف أي مستند في النظام.
            </p>
            <Button variant="outline" onClick={() => liveLogs.refetch()} className="gap-2">
              <Activity className="h-4 w-4" />
              إعادة تحميل السجلات
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-md-ui)] border border-border/40 bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              تصفية
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المستخدم</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الإجراء</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="create">إنشاء</SelectItem>
                  <SelectItem value="edit">تعديل</SelectItem>
                  <SelectItem value="delete">حذف</SelectItem>
                  <SelectItem value="submit">ترحيل</SelectItem>
                  <SelectItem value="cancel">إلغاء</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع المستند</Label>
              <Select value={doctypeFilter} onValueChange={setDoctypeFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueDoctypes.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" dir="ltr" className="h-8 w-36 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" dir="ltr" className="h-8 w-36 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
              <RotateCcw className="h-3 w-3" />
              مسح التصفية
            </Button>
            <div className="me-auto text-xs text-muted-foreground">{filteredData.length} سجل</div>
          </div>

          {/* Data Table */}
          <DataTable
            data={filteredData}
            columns={columns}
            searchable
            loading={liveLogs.isLoading}
            pageSize={10}
          />
        </>
      )}
    </div>
  );
}

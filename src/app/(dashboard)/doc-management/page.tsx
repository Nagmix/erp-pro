'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDocList, useDeleteDoc } from '@/lib/client/hooks';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  Plus,
  Trash2,
  Eye,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Clock,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  X,
  ExternalLink,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';

/* ───────────────────────── ERPNext File Type ───────────────────────── */

interface ERPFile {
  name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  is_private: number | string;
  folder: string;
  attached_to_doctype: string;
  attached_to_name: string;
  owner: string;
  creation: string;
  modified: string;
}

/* ───────────────────────── Helpers ───────────────────────── */

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileTypeCategory(fileType: string): string {
  if (!fileType) return 'أخرى';
  const ext = fileType.toLowerCase();
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx', 'odt'].includes(ext)) return 'Word';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'Excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'صورة';
  return 'أخرى';
}

function getFileTypeInfo(fileType: string) {
  const category = getFileTypeCategory(fileType);
  switch (category) {
    case 'PDF':
      return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900/50', label: 'PDF' };
    case 'Word':
      return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/50', label: 'Word' };
    case 'Excel':
      return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/50', label: 'Excel' };
    case 'صورة':
      return { icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/50', label: 'صورة' };
    default:
      return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-900/50', label: 'أخرى' };
  }
}

/* ───────────────────────── Component ───────────────────────── */

export default function DocManagementPage() {
  const { toast } = useToast();

  /* ── State ── */
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPrivacy, setFilterPrivacy] = useState<string>('all');

  /* Dialogs */
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ERPFile | null>(null);

  /* ── جلب الملفات من ERPNext ── */
  const {
    data: files = [],
    isLoading,
    error,
    refetch,
  } = useDocList<ERPFile>('File', {
    fields: ['name', 'file_name', 'file_type', 'file_size', 'file_url', 'is_private', 'folder', 'attached_to_doctype', 'attached_to_name', 'owner', 'creation', 'modified'],
    order_by: 'creation desc',
    limit: 500,
  });

  const deleteMutation = useDeleteDoc('File');

  /* ── Build folder structure from file data ── */
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    for (const f of files) {
      if (f.folder) {
        // Build all parent folders
        const parts = f.folder.split('/');
        let path = '';
        for (const part of parts) {
          if (!part) continue;
          path = path ? `${path}/${part}` : part;
          folderSet.add(path);
        }
      }
    }
    return Array.from(folderSet).sort();
  }, [files]);

  const folderDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) {
      if (f.folder) {
        counts[f.folder] = (counts[f.folder] || 0) + 1;
      }
    }
    return counts;
  }, [files]);

  /* ── Available file types for filter ── */
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const f of files) {
      if (f.file_type) types.add(f.file_type.toLowerCase());
    }
    return Array.from(types).sort();
  }, [files]);

  /* ── Computed values ── */
  const filteredFiles = useMemo(() => {
    let result = files;
    if (selectedFolder) {
      result = result.filter((f) => f.folder === selectedFolder);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (f) =>
          (f.file_name || '').toLowerCase().includes(q) ||
          (f.attached_to_name || '').toLowerCase().includes(q) ||
          (f.owner || '').toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') {
      result = result.filter((f) => getFileTypeCategory(f.file_type) === filterType);
    }
    if (filterPrivacy !== 'all') {
      const isPrivate = filterPrivacy === 'private' ? 1 : 0;
      result = result.filter((f) => Number(f.is_private) === isPrivate);
    }
    return result;
  }, [files, selectedFolder, searchQuery, filterType, filterPrivacy]);

  /* ── KPI values ── */
  const kpiTotal = files.length;
  const kpiThisMonth = files.filter((f) => {
    if (!f.creation) return false;
    const date = new Date(f.creation);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const kpiStorage = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (Number(f.file_size) || 0), 0);
    return formatFileSize(totalBytes);
  }, [files]);
  const kpiPrivate = files.filter((f) => Number(f.is_private) === 1).length;

  /* ── Document detail ── */
  const openDetail = (file: ERPFile) => {
    setSelectedFile(file);
    setDetailDialogOpen(true);
  };

  /* ── Delete file ── */
  const deleteFile = (file: ERPFile) => {
    deleteMutation.mutate(file.name, {
      onSuccess: () => {
        toast({ title: 'تم حذف الملف', description: file.file_name });
        if (selectedFile?.name === file.name) {
          setDetailDialogOpen(false);
          setSelectedFile(null);
        }
      },
      onError: () => {
        toast({ title: 'فشل حذف الملف', variant: 'destructive' });
      },
    });
  };

  /* ── DataTable columns ── */
  const tableColumns: Column<ERPFile>[] = useMemo(
    () => [
      {
        key: 'file_name',
        header: 'الاسم',
        sortable: true,
        filterable: true,
        render: (_val: unknown, row: ERPFile) => {
          const info = getFileTypeInfo(row.file_type);
          const Icon = info.icon;
          return (
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${info.bg} ${info.border} border`}>
                <Icon className={`h-4 w-4 ${info.color}`} />
              </div>
              <span className="truncate font-medium">{row.file_name || row.name}</span>
            </div>
          );
        },
      },
      {
        key: 'file_type',
        header: 'النوع',
        sortable: true,
        filterable: true,
        render: (_val: unknown, row: ERPFile) => (
          <Badge variant="outline" className="text-[11px] border-0 font-medium">
            {getFileTypeCategory(row.file_type)}
          </Badge>
        ),
      },
      {
        key: 'file_size',
        header: 'الحجم',
        sortable: true,
        render: (val: unknown) => (
          <span className="text-muted-foreground tabular-nums">{formatFileSize(Number(val) || 0)}</span>
        ),
      },
      {
        key: 'creation',
        header: 'تاريخ الرفع',
        sortable: true,
        render: (val: unknown) => (
          <span className="text-muted-foreground">{formatDate(String(val))}</span>
        ),
      },
      {
        key: 'owner',
        header: 'بواسطة',
        sortable: true,
        filterable: true,
      },
      {
        key: 'is_private',
        header: 'الخصوصية',
        sortable: true,
        render: (_val: unknown, row: ERPFile) => (
          Number(row.is_private) === 1 ? (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" />
              خاص
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Globe className="h-2.5 w-2.5" />
              عام
            </Badge>
          )
        ),
      },
    ],
    []
  );

  /* ── Selected folder display name ── */
  const selectedFolderName = useMemo(() => {
    if (!selectedFolder) return null;
    // Get the last segment of the path
    const parts = selectedFolder.split('/');
    return parts[parts.length - 1] || selectedFolder;
  }, [selectedFolder]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div dir="rtl" className="flex flex-col gap-5 p-4 lg:p-6">
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 h-96 rounded-xl bg-muted animate-pulse" />
          <div className="lg:col-span-9 h-96 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-5 p-4 lg:p-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="إدارة المستندات"
        iconify="solar:folder-with-files-bold-duotone"
        accent="info"
        description="إدارة وتنظيم جميع المستندات والملفات في النظام"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                toast({ title: 'رفع الملفات', description: 'يمكنك رفع الملفات من خلال واجهة ERPNext مباشرة' });
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              رفع مستند
            </Button>
          </div>
        }
      />

      {/* ── Error Alert ── */}
      <ListQueryAlert error={error} onRetry={() => refetch()} />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الملفات"
          value={kpiTotal}
          icon={FileText}
          accent="info"
        />
        <KpiCard
          title="الملفات هذا الشهر"
          value={kpiThisMonth}
          icon={Clock}
          accent="success"
        />
        <KpiCard
          title="سعة التخزين المستخدمة"
          value={kpiStorage}
          icon={HardDrive}
          accent="warning"
          description="إجمالي حجم الملفات"
        />
        <KpiCard
          title="ملفات خاصة"
          value={kpiPrivate}
          icon={Folder}
          accent="destructive"
        />
      </KpiStrip>

      {/* ── Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Folder Tree ── */}
        <Card className="lg:col-span-3 border border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Folder className="h-4 w-4 text-info" />
                المجلدات
              </h3>
            </div>

            {/* All files button */}
            <div
              className={`
                flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors
                hover:bg-muted/60 mb-1
                ${selectedFolder === null ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}
              `}
              onClick={() => setSelectedFolder(null)}
            >
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">جميع الملفات</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {files.length}
              </Badge>
            </div>

            {/* Folder list */}
            <div className="max-h-[520px] overflow-y-auto space-y-0.5">
              {folders.map((folderPath) => {
                const parts = folderPath.split('/');
                const displayName = parts[parts.length - 1];
                const depth = parts.length - 1;
                const isSelected = selectedFolder === folderPath;
                const docCount = folderDocCounts[folderPath] || 0;

                return (
                  <div
                    key={folderPath}
                    className={`
                      flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors
                      hover:bg-muted/60 group
                      ${isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}
                    `}
                    style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
                    onClick={() => setSelectedFolder(isSelected ? null : folderPath)}
                  >
                    <span className="w-4 shrink-0" />
                    <Folder className="h-4 w-4 shrink-0 text-info" />
                    <span className="truncate flex-1">{displayName}</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                      {docCount}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── File List ── */}
        <Card className="lg:col-span-9 border border-border/40">
          <CardContent className="p-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {selectedFolderName && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Folder className="h-3 w-3" />
                    {selectedFolderName}
                    <button
                      type="button"
                      className="me-1 hover:text-destructive transition-colors"
                      onClick={() => setSelectedFolder(null)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <h3 className="text-sm font-semibold">
                  {selectedFolderName ?? 'جميع الملفات'}
                  <span className="text-muted-foreground font-normal mr-1">
                    ({filteredFiles.length})
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="بحث في الملفات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 ps-8 text-xs"
                  />
                </div>

                {/* Filter by type */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Word">Word</SelectItem>
                    <SelectItem value="Excel">Excel</SelectItem>
                    <SelectItem value="صورة">صورة</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filter by privacy */}
                <Select value={filterPrivacy} onValueChange={setFilterPrivacy}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="الخصوصية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="private">خاص</SelectItem>
                    <SelectItem value="public">عام</SelectItem>
                  </SelectContent>
                </Select>

                {/* View toggle */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* View modes */}
            {viewMode === 'grid' ? (
              /* ── Grid View ── */
              filteredFiles.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                  <Folder className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-semibold text-foreground">لا توجد ملفات</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? 'عدّل البحث أو الفلاتر لعرض النتائج' : 'ابدأ برفع ملف جديد'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredFiles.map((file) => {
                    const info = getFileTypeInfo(file.file_type);
                    const Icon = info.icon;
                    return (
                      <div
                        key={file.name}
                        className={`
                          group rounded-xl border ${info.border} ${info.bg} p-4 cursor-pointer
                          transition-all duration-200 hover:shadow-md hover:scale-[1.01]
                        `}
                        onClick={() => openDetail(file)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${info.border} bg-white/60 dark:bg-black/20`}>
                            <Icon className={`h-5 w-5 ${info.color}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            {Number(file.is_private) === 1 ? (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5">
                                <Lock className="h-2.5 w-2.5" />
                                خاص
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                                <Globe className="h-2.5 w-2.5" />
                                عام
                              </Badge>
                            )}
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold truncate mb-1">{file.file_name || file.name}</h4>
                        {file.attached_to_doctype && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            مرتبط بـ: {file.attached_to_doctype} - {file.attached_to_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{file.creation ? formatDate(file.creation) : ''}</span>
                          <span className="font-mono">{formatFileSize(Number(file.file_size) || 0)}</span>
                        </div>
                        {file.folder && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                            <Folder className="h-3 w-3 text-info" />
                            {file.folder.split('/').pop()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ── List View (DataTable) ── */
              <DataTable
                data={filteredFiles}
                columns={tableColumns}
                tableId="doc-management-table"
                searchable={false}
                pageSize={10}
                onView={(row) => openDetail(row as ERPFile)}
                onDelete={(row) => deleteFile(row as ERPFile)}
                addLabel="رفع مستند"
                onAdd={() => {
                  toast({ title: 'رفع الملفات', description: 'يمكنك رفع الملفات من خلال واجهة ERPNext مباشرة' });
                }}
                exportFileName="documents"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── File Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الملف</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4 py-2">
              {/* File icon and name */}
              <div className="flex items-center gap-3">
                {(() => {
                  const info = getFileTypeInfo(selectedFile.file_type);
                  const Icon = info.icon;
                  return (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${info.bg} ${info.border} border`}>
                      <Icon className={`h-6 w-6 ${info.color}`} />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-sm">{selectedFile.file_name || selectedFile.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-[10px] text-muted-foreground">النوع</Label>
                  <p className="text-sm">{getFileTypeCategory(selectedFile.file_type)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">الحجم</Label>
                  <p className="text-sm">{formatFileSize(Number(selectedFile.file_size) || 0)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">الخصوصية</Label>
                  <p className="text-sm">{Number(selectedFile.is_private) === 1 ? 'خاص' : 'عام'}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">المجلد</Label>
                  <p className="text-sm">{selectedFile.folder || '—'}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">رفع بواسطة</Label>
                  <p className="text-sm">{selectedFile.owner || '—'}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">تاريخ الرفع</Label>
                  <p className="text-sm">{selectedFile.creation ? formatDate(selectedFile.creation) : '—'}</p>
                </div>
              </div>

              {/* Attached to */}
              {selectedFile.attached_to_doctype && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">مرتبط بـ</Label>
                  <a
                    href={`/doc/${selectedFile.attached_to_doctype}/${selectedFile.attached_to_name}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {selectedFile.attached_to_doctype} - {selectedFile.attached_to_name}
                  </a>
                </div>
              )}

              {/* File URL */}
              {selectedFile.file_url && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">رابط الملف</Label>
                  <a
                    href={selectedFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all block mt-1"
                  >
                    {selectedFile.file_url}
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailDialogOpen(false)}
              className="text-xs"
            >
              إغلاق
            </Button>
            {selectedFile && (
              <Button
                variant="destructive"
                onClick={() => {
                  deleteFile(selectedFile);
                  setDetailDialogOpen(false);
                }}
                className="text-xs gap-1.5"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                حذف
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

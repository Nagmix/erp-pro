'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/app-format';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  Plus,
  Download,
  Trash2,
  Eye,
  ChevronRight,
  ChevronDown,
  Tag,
  HardDrive,
  Clock,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  X,
  Pencil,
  FolderPlus,
} from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type DocType = 'PDF' | 'Word' | 'Excel' | 'Image' | 'أخرى';
type DocStatus = 'نشط' | 'مؤرشف' | 'معلق' | 'محذوف';

type Document = {
  id: string;
  name: string;
  type: DocType;
  size: string;
  folderId: string;
  description: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  status: DocStatus;
  linkedDoctype?: string;
  linkedDocname?: string;
  version: number;
};

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
};

/* ───────────────────────── Seed Data ───────────────────────── */

const SEED_FOLDERS: FolderItem[] = [
  { id: 'f1', name: 'عقود', parentId: null, color: '#e67e22' },
  { id: 'f2', name: 'فواتير', parentId: null, color: '#27ae60' },
  { id: 'f3', name: 'تقارير', parentId: null, color: '#3498db' },
  { id: 'f4', name: 'موظفين', parentId: null, color: '#9b59b6' },
  { id: 'f5', name: 'موردين', parentId: null, color: '#e74c3c' },
  { id: 'f6', name: 'مشاريع', parentId: null, color: '#1abc9c' },
  { id: 'f7', name: 'محاسبة', parentId: null, color: '#f39c12' },
  { id: 'f8', name: 'عام', parentId: null, color: '#95a5a6' },
];

const SEED_DOCUMENTS: Document[] = [
  { id: 'd1', name: 'عقد إيجار المكتب الرئيسي', type: 'PDF', size: '2.4 MB', folderId: 'f1', description: 'عقد إيجار المكتب لسنة 2025', tags: ['إيجار', 'مكتب'], uploadedBy: 'أحمد محمد', uploadedAt: '2025-01-15', status: 'نشط', linkedDoctype: 'عقد', linkedDocname: 'LEASE-001', version: 2 },
  { id: 'd2', name: 'عقد توريد أجهزة', type: 'Word', size: '1.1 MB', folderId: 'f1', description: 'عقد توريد أجهزة حاسب آلي', tags: ['توريد', 'أجهزة'], uploadedBy: 'سارة أحمد', uploadedAt: '2025-02-03', status: 'نشط', linkedDoctype: 'عقد', linkedDocname: 'SUPPLY-012', version: 1 },
  { id: 'd3', name: 'فاتورة مبيعات يناير', type: 'Excel', size: '856 KB', folderId: 'f2', description: 'ملخص فواتير مبيعات شهر يناير', tags: ['مبيعات', 'يناير'], uploadedBy: 'خالد علي', uploadedAt: '2025-02-01', status: 'نشط', version: 1 },
  { id: 'd4', name: 'فاتورة مشتريات فبراير', type: 'PDF', size: '1.3 MB', folderId: 'f2', description: 'فواتير مشتريات شهر فبراير', tags: ['مشتريات', 'فبراير'], uploadedBy: 'نورة حسن', uploadedAt: '2025-03-02', status: 'مؤرشف', version: 1 },
  { id: 'd5', name: 'تقرير مالي ربع سنوي Q1', type: 'PDF', size: '3.8 MB', folderId: 'f3', description: 'التقرير المالي للربع الأول 2025', tags: ['مالي', 'ربع سنوي'], uploadedBy: 'أحمد محمد', uploadedAt: '2025-04-05', status: 'نشط', linkedDoctype: 'تقرير', linkedDocname: 'FIN-Q1-2025', version: 3 },
  { id: 'd6', name: 'تقرير أداء الموظفين', type: 'Word', size: '640 KB', folderId: 'f3', description: 'تقرير أداء الموظفين للربع الأول', tags: ['أداء', 'موظفين'], uploadedBy: 'سارة أحمد', uploadedAt: '2025-04-10', status: 'معلق', version: 1 },
  { id: 'd7', name: 'ملف الموظف - أحمد علي', type: 'PDF', size: '4.2 MB', folderId: 'f4', description: 'ملف الموظف أحمد علي السنوي', tags: ['موظف', 'ملف شخصي'], uploadedBy: 'خالد علي', uploadedAt: '2025-01-20', status: 'نشط', version: 2 },
  { id: 'd8', name: 'كشف رواتب مارس', type: 'Excel', size: '1.7 MB', folderId: 'f4', description: 'كشف رواتب شهر مارس 2025', tags: ['رواتب', 'مارس'], uploadedBy: 'نورة حسن', uploadedAt: '2025-04-01', status: 'نشط', version: 1 },
  { id: 'd9', name: 'شهادة خبرة - محمد سالم', type: 'Word', size: '320 KB', folderId: 'f4', description: 'شهادة خبرة الموظف محمد سالم', tags: ['شهادة', 'خبرة'], uploadedBy: 'أحمد محمد', uploadedAt: '2025-03-15', status: 'نشط', version: 1 },
  { id: 'd10', name: 'عرض سعر مورد الأثاث', type: 'PDF', size: '5.1 MB', folderId: 'f5', description: 'عرض سعر من مورد الأثاث المكتبية', tags: ['عرض سعر', 'أثاث'], uploadedBy: 'سارة أحمد', uploadedAt: '2025-02-20', status: 'معلق', version: 1 },
  { id: 'd11', name: 'سجل الموردين المعتمدين', type: 'Excel', size: '920 KB', folderId: 'f5', description: 'قائمة الموردين المعتمدين لعام 2025', tags: ['موردين', 'معتمدين'], uploadedBy: 'خالد علي', uploadedAt: '2025-01-10', status: 'نشط', version: 2 },
  { id: 'd12', name: 'خطة مشروع التوسع', type: 'PDF', size: '6.3 MB', folderId: 'f6', description: 'خطة مشروع توسع الفرع الجديد', tags: ['مشروع', 'توسع'], uploadedBy: 'نورة حسن', uploadedAt: '2025-03-01', status: 'نشط', linkedDoctype: 'مشروع', linkedDocname: 'EXP-2025', version: 4 },
  { id: 'd13', name: 'ميزانية المشروع', type: 'Excel', size: '2.1 MB', folderId: 'f6', description: 'ميزانية مشروع التوسع التقديرية', tags: ['ميزانية', 'مشروع'], uploadedBy: 'أحمد محمد', uploadedAt: '2025-03-05', status: 'نشط', version: 2 },
  { id: 'd14', name: 'ميزان المراجعة 2024', type: 'PDF', size: '7.8 MB', folderId: 'f7', description: 'ميزان المراجعة للسنة المالية 2024', tags: ['محاسبة', 'ميزان مراجعة'], uploadedBy: 'سارة أحمد', uploadedAt: '2025-01-30', status: 'مؤرشف', version: 1 },
  { id: 'd15', name: 'دفتر اليومية العامة', type: 'Excel', size: '3.5 MB', folderId: 'f7', description: 'دفتر اليومية العامة للسنة المالية', tags: ['محاسبة', 'يومية'], uploadedBy: 'خالد علي', uploadedAt: '2025-02-15', status: 'نشط', version: 3 },
  { id: 'd16', name: 'صورة واجهة المبنى', type: 'Image', size: '4.6 MB', folderId: 'f8', description: 'صورة لواجهة المبنى الرئيسي', tags: ['صور', 'مبنى'], uploadedBy: 'نورة حسن', uploadedAt: '2025-03-20', status: 'نشط', version: 1 },
  { id: 'd17', name: 'سياسة الشركة العامة', type: 'Word', size: '540 KB', folderId: 'f8', description: 'وثيقة السياسة العامة للشركة', tags: ['سياسة', 'عام'], uploadedBy: 'أحمد محمد', uploadedAt: '2025-01-05', status: 'نشط', version: 5 },
  { id: 'd18', name: 'عقد صيانة المصاعد', type: 'PDF', size: '1.9 MB', folderId: 'f1', description: 'عقد صيانة المصاعد السنوي', tags: ['صيانة', 'عقد'], uploadedBy: 'سارة أحمد', uploadedAt: '2025-04-01', status: 'معلق', version: 1 },
  { id: 'd19', name: 'تقرير الجرد السنوي', type: 'Excel', size: '2.7 MB', folderId: 'f3', description: 'تقرير جرد المخزون السنوي 2024', tags: ['جرد', 'مخزون'], uploadedBy: 'خالد علي', uploadedAt: '2025-01-25', status: 'مؤرشف', version: 2 },
  { id: 'd20', name: 'إيصال دفعة مقدمة', type: 'PDF', size: '780 KB', folderId: 'f2', description: 'إيصال دفعة مقدمة على المشروع', tags: ['دفعة', 'إيصال'], uploadedBy: 'نورة حسن', uploadedAt: '2025-04-08', status: 'نشط', version: 1 },
];

/* ───────────────────────── localStorage Store ───────────────────────── */

const STORAGE_KEY = 'erp_documents';
const FOLDERS_KEY = 'erp_folders';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/* ── useSyncExternalStore helpers ── */

let documentsSnapshot = 0;
const documentsListeners = new Set<() => void>();

function subscribeDocuments(cb: () => void) {
  documentsListeners.add(cb);
  return () => documentsListeners.delete(cb);
}

function getDocumentsSnapshot() {
  return documentsSnapshot;
}

function notifyDocumentsChange() {
  documentsSnapshot++;
  documentsListeners.forEach((cb) => cb());
}

let foldersSnapshot = 0;
const foldersListeners = new Set<() => void>();

function subscribeFolders(cb: () => void) {
  foldersListeners.add(cb);
  return () => foldersListeners.delete(cb);
}

function getFoldersSnapshot() {
  return foldersSnapshot;
}

function notifyFoldersChange() {
  foldersSnapshot++;
  foldersListeners.forEach((cb) => cb());
}

/* ───────────────────────── Helper: doc type icon & color ───────────────────────── */

function getDocTypeInfo(type: DocType) {
  switch (type) {
    case 'PDF':
      return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900/50' };
    case 'Word':
      return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/50' };
    case 'Excel':
      return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/50' };
    case 'Image':
      return { icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/50' };
    default:
      return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-900/50' };
  }
}

function getDocStatusMapping(status: DocStatus) {
  switch (status) {
    case 'نشط':
      return 'Active';
    case 'مؤرشف':
      return 'Inactive';
    case 'معلق':
      return 'Open';
    case 'محذوف':
      return 'Cancelled';
    default:
      return 'Draft';
  }
}

/* ───────────────────────── Component ───────────────────────── */

export default function DocManagementPage() {
  const { toast } = useToast();

  /* ── Sync with localStorage via useSyncExternalStore ── */
  useSyncExternalStore(subscribeDocuments, getDocumentsSnapshot, getDocumentsSnapshot);
  useSyncExternalStore(subscribeFolders, getFoldersSnapshot, getFoldersSnapshot);

  /* ── State ── */
  const [documents, setDocuments] = useState<Document[]>(() => {
    const stored = loadFromStorage<Document[]>(STORAGE_KEY, []);
    if (stored.length === 0) {
      saveToStorage(STORAGE_KEY, SEED_DOCUMENTS);
      return SEED_DOCUMENTS;
    }
    return stored;
  });
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    const stored = loadFromStorage<FolderItem[]>(FOLDERS_KEY, []);
    if (stored.length === 0) {
      saveToStorage(FOLDERS_KEY, SEED_FOLDERS);
      return SEED_FOLDERS;
    }
    return stored;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(SEED_FOLDERS.map((f) => f.id)));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  /* Dialogs */
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  /* Upload form state */
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    folderId: '',
    tags: '',
    linkedDoctype: '',
    linkedDocname: '',
    type: 'PDF' as DocType,
  });

  /* New folder form */
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3498db');

  /* Context menu */
  const [contextMenu, setContextMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  /* Drag zone */
  const [isDragOver, setIsDragOver] = useState(false);

  /* ── Data is initialized via useState lazy initializers above ── */

  /* ── Persist documents ── */
  const updateDocuments = useCallback(
    (updater: (prev: Document[]) => Document[]) => {
      setDocuments((prev) => {
        const next = updater(prev);
        saveToStorage(STORAGE_KEY, next);
        notifyDocumentsChange();
        return next;
      });
    },
    []
  );

  /* ── Persist folders ── */
  const updateFolders = useCallback(
    (updater: (prev: FolderItem[]) => FolderItem[]) => {
      setFolders((prev) => {
        const next = updater(prev);
        saveToStorage(FOLDERS_KEY, next);
        notifyFoldersChange();
        return next;
      });
    },
    []
  );

  /* ── Computed values ── */
  const filteredDocuments = useMemo(() => {
    let result = documents;
    if (selectedFolderId) {
      result = result.filter((d) => d.folderId === selectedFolderId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') {
      result = result.filter((d) => d.type === filterType);
    }
    if (filterStatus !== 'all') {
      result = result.filter((d) => d.status === filterStatus);
    }
    return result;
  }, [documents, selectedFolderId, searchQuery, filterType, filterStatus]);

  const folderDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      counts[doc.folderId] = (counts[doc.folderId] || 0) + 1;
    }
    return counts;
  }, [documents]);

  /* ── KPI values ── */
  const kpiTotal = documents.length;
  const kpiThisMonth = documents.filter((d) => {
    const date = new Date(d.uploadedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const kpiStorage = '128.5 MB';
  const kpiPending = documents.filter((d) => d.status === 'معلق').length;

  /* ── Folder tree rendering ── */
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getChildFolders = (parentId: string | null) =>
    folders.filter((f) => f.parentId === parentId);

  const renderFolderTree = (parentId: string | null, depth: number = 0) => {
    const children = getChildFolders(parentId);
    return children.map((folder) => {
      const hasChildren = folders.some((f) => f.parentId === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const docCount = folderDocCounts[folder.id] || 0;

      return (
        <div key={folder.id}>
          <div
            className={`
              flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors
              hover:bg-muted/60 group
              ${isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}
            `}
            style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
            onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ folderId: folder.id, x: e.clientX, y: e.clientY });
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <Folder
              className="h-4 w-4 shrink-0"
              style={{ color: folder.color }}
            />
            <span className="truncate flex-1">{folder.name}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
              {docCount}
            </Badge>
          </div>
          {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  /* ── Document detail ── */
  const openDetail = (doc: Document) => {
    setSelectedDoc(doc);
    setDetailDialogOpen(true);
  };

  /* ── Delete document ── */
  const deleteDocument = (doc: Document) => {
    updateDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: 'تم حذف المستند', description: doc.name });
    if (selectedDoc?.id === doc.id) {
      setDetailDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  /* ── Upload handler ── */
  const handleUpload = () => {
    if (!uploadForm.name.trim() || !uploadForm.folderId) {
      toast({ title: 'خطأ', description: 'يرجى تعبئة اسم المستند واختيار المجلد', variant: 'destructive' });
      return;
    }
    const newDoc: Document = {
      id: `d${Date.now()}`,
      name: uploadForm.name.trim(),
      type: uploadForm.type,
      size: '0 KB',
      folderId: uploadForm.folderId,
      description: uploadForm.description,
      tags: uploadForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      uploadedBy: 'المستخدم الحالي',
      uploadedAt: new Date().toISOString().split('T')[0],
      status: 'نشط',
      linkedDoctype: uploadForm.linkedDoctype || undefined,
      linkedDocname: uploadForm.linkedDocname || undefined,
      version: 1,
    };
    updateDocuments((prev) => [newDoc, ...prev]);
    setUploadDialogOpen(false);
    setUploadForm({ name: '', description: '', folderId: '', tags: '', linkedDoctype: '', linkedDocname: '', type: 'PDF' });
    toast({ title: 'تم رفع المستند', description: newDoc.name });
  };

  /* ── New folder handler ── */
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderItem = {
      id: `f${Date.now()}`,
      name: newFolderName.trim(),
      parentId: null,
      color: newFolderColor,
    };
    updateFolders((prev) => [...prev, newFolder]);
    setNewFolderDialogOpen(false);
    setNewFolderName('');
    setNewFolderColor('#3498db');
    toast({ title: 'تم إنشاء المجلد', description: newFolder.name });
  };

  /* ── Context menu actions ── */
  const handleRenameFolder = () => {
    if (!renamingFolderId || !renameValue.trim()) return;
    updateFolders((prev) =>
      prev.map((f) => (f.id === renamingFolderId ? { ...f, name: renameValue.trim() } : f))
    );
    setRenamingFolderId(null);
    setRenameValue('');
    toast({ title: 'تم إعادة التسمية' });
  };

  const handleDeleteFolder = (folderId: string) => {
    const folderDocs = documents.filter((d) => d.folderId === folderId);
    if (folderDocs.length > 0) {
      toast({ title: 'لا يمكن حذف المجلد', description: 'المجلد يحتوي على مستندات', variant: 'destructive' });
      return;
    }
    updateFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    toast({ title: 'تم حذف المجلد' });
  };

  /* ── DataTable columns ── */
  const tableColumns: Column<Document>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الاسم',
        sortable: true,
        filterable: true,
        render: (_val: unknown, row: Document) => {
          const info = getDocTypeInfo(row.type);
          const Icon = info.icon;
          return (
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${info.bg} ${info.border} border`}>
                <Icon className={`h-4 w-4 ${info.color}`} />
              </div>
              <span className="truncate font-medium">{row.name}</span>
            </div>
          );
        },
      },
      {
        key: 'type',
        header: 'النوع',
        sortable: true,
        filterable: true,
        render: (_val: unknown, row: Document) => (
          <Badge variant="outline" className="text-[11px] border-0 font-medium">
            {row.type}
          </Badge>
        ),
      },
      {
        key: 'size',
        header: 'الحجم',
        sortable: true,
        render: (val: unknown) => (
          <span className="text-muted-foreground tabular-nums">{String(val)}</span>
        ),
      },
      {
        key: 'uploadedAt',
        header: 'تاريخ الرفع',
        sortable: true,
        render: (val: unknown) => (
          <span className="text-muted-foreground">{formatDate(String(val))}</span>
        ),
      },
      {
        key: 'uploadedBy',
        header: 'بواسطة',
        sortable: true,
        filterable: true,
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        render: (_val: unknown, row: Document) => (
          <StatusBadge status={getDocStatusMapping(row.status)} />
        ),
      },
    ],
    []
  );

  /* ── Close context menu on click outside ── */
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [contextMenu]);

  /* ── Selected folder name ── */
  const selectedFolderName = useMemo(
    () => folders.find((f) => f.id === selectedFolderId)?.name ?? null,
    [folders, selectedFolderId]
  );

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
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setNewFolderDialogOpen(true)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              مجلد جديد
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              رفع مستند
            </Button>
          </div>
        }
      />

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المستندات"
          value={kpiTotal}
          icon={FileText}
          accent="info"
          change={12}
          changeType="positive"
        />
        <KpiCard
          title="المستندات هذا الشهر"
          value={kpiThisMonth}
          icon={Clock}
          accent="success"
          change={8}
          changeType="positive"
        />
        <KpiCard
          title="سعة التخزين المستخدمة"
          value={kpiStorage}
          icon={HardDrive}
          accent="warning"
          description="من 1 GB المتاح"
        />
        <KpiCard
          title="المستندات المعلقة"
          value={kpiPending}
          icon={Folder}
          accent="destructive"
          change={kpiPending > 0 ? -5 : 0}
          changeType={kpiPending > 0 ? 'negative' : 'neutral'}
        />
      </KpiStrip>

      {/* ── Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Folder Tree (Right in RTL = col-start-1) ── */}
        <Card className="lg:col-span-3 border border-border/40">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Folder className="h-4 w-4 text-info" />
                المجلدات
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setNewFolderDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* All documents button */}
            <div
              className={`
                flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors
                hover:bg-muted/60 mb-1
                ${selectedFolderId === null ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}
              `}
              onClick={() => setSelectedFolderId(null)}
            >
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">جميع المستندات</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {documents.length}
              </Badge>
            </div>

            {/* Folder tree */}
            <div className="max-h-[520px] overflow-y-auto space-y-0.5">
              {renderFolderTree(null)}
            </div>
          </CardContent>
        </Card>

        {/* ── File List (Left in RTL = col-start-4) ── */}
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
                      onClick={() => setSelectedFolderId(null)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <h3 className="text-sm font-semibold">
                  {selectedFolderName ?? 'جميع المستندات'}
                  <span className="text-muted-foreground font-normal mr-1">
                    ({filteredDocuments.length})
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="بحث في المستندات..."
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
                    <SelectItem value="Image">صورة</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filter by status */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="نشط">نشط</SelectItem>
                    <SelectItem value="مؤرشف">مؤرشف</SelectItem>
                    <SelectItem value="معلق">معلق</SelectItem>
                    <SelectItem value="محذوف">محذوف</SelectItem>
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
              filteredDocuments.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                  <Folder className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-semibold text-foreground">لا توجد مستندات</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? 'عدّل البحث أو الفلاتر لعرض النتائج' : 'ابدأ برفع مستند جديد'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredDocuments.map((doc) => {
                    const info = getDocTypeInfo(doc.type);
                    const Icon = info.icon;
                    const folder = folders.find((f) => f.id === doc.folderId);
                    return (
                      <div
                        key={doc.id}
                        className={`
                          group rounded-xl border ${info.border} ${info.bg} p-4 cursor-pointer
                          transition-all duration-200 hover:shadow-md hover:scale-[1.01]
                        `}
                        onClick={() => openDetail(doc)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${info.border} bg-white/60 dark:bg-black/20`}>
                            <Icon className={`h-5 w-5 ${info.color}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={getDocStatusMapping(doc.status)} />
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold truncate mb-1">{doc.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {doc.description}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{formatDate(doc.uploadedAt)}</span>
                          <span className="font-mono">{doc.size}</span>
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[9px] h-4 px-1.5 gap-0.5"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{doc.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {folder && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                            <Folder className="h-3 w-3" style={{ color: folder.color }} />
                            {folder.name}
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
                data={filteredDocuments}
                columns={tableColumns}
                tableId="doc-management-table"
                searchable={false}
                pageSize={10}
                onView={(row) => openDetail(row as Document)}
                onDelete={(row) => deleteDocument(row as Document)}
                addLabel="رفع مستند"
                onAdd={() => setUploadDialogOpen(true)}
                exportFileName="documents"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg border bg-popover p-1 shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            onClick={() => {
              const folder = folders.find((f) => f.id === contextMenu.folderId);
              if (folder) {
                setRenamingFolderId(folder.id);
                setRenameValue(folder.name);
              }
              setContextMenu(null);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            إعادة تسمية
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              handleDeleteFolder(contextMenu.folderId);
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        </div>
      )}

      {/* ── Rename Folder Dialog ── */}
      <Dialog
        open={!!renamingFolderId}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingFolderId(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إعادة تسمية المجلد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">اسم المجلد</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="mt-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolder();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFolderId(null)} className="text-xs">
              إلغاء
            </Button>
            <Button onClick={handleRenameFolder} className="text-xs">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Folder Dialog ── */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مجلد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">اسم المجلد</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="أدخل اسم المجلد..."
                className="mt-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
              />
            </div>
            <div>
              <Label className="text-xs">لون المجلد</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="h-8 w-8 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{newFolderColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFolderDialogOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button onClick={handleCreateFolder} className="text-xs">
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Document Dialog ── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>رفع مستند جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Drag & drop zone */}
            <div
              className={`
                flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                p-8 text-center transition-colors cursor-pointer
                ${isDragOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40'}
              `}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
            >
              <div className="mb-3 rounded-full border border-border/40 bg-background p-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                اسحب الملفات وأفلتها هنا
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                أو انقر لاختيار ملف من جهازك
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                يدعم: PDF, Word, Excel, صور, وأخرى — بحد أقصى 10 MB
              </p>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">اسم المستند *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="أدخل اسم المستند..."
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">نوع المستند</Label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(v) => setUploadForm((p) => ({ ...p, type: v as DocType }))}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Word">Word</SelectItem>
                    <SelectItem value="Excel">Excel</SelectItem>
                    <SelectItem value="Image">صورة</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">المجلد *</Label>
                <Select
                  value={uploadForm.folderId}
                  onValueChange={(v) => setUploadForm((p) => ({ ...p, folderId: v }))}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="اختر المجلد" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-3 w-3" style={{ color: f.color }} />
                          {f.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs">الوصف</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="وصف المستند..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs">
                  <Tag className="h-3 w-3 inline me-1" />
                  الوسوم (مفصولة بفواصل)
                </Label>
                <Input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="مثال: فاتورة, مبيعات, يناير"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">نوع المستند المرتبط</Label>
                <Select
                  value={uploadForm.linkedDoctype || '_none'}
                  onValueChange={(v) =>
                    setUploadForm((p) => ({
                      ...p,
                      linkedDoctype: v === '_none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون ربط</SelectItem>
                    <SelectItem value="فاتورة">فاتورة</SelectItem>
                    <SelectItem value="عقد">عقد</SelectItem>
                    <SelectItem value="تقرير">تقرير</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">المرجع المرتبط</Label>
                <Input
                  value={uploadForm.linkedDocname}
                  onChange={(e) => setUploadForm((p) => ({ ...p, linkedDocname: e.target.value }))}
                  placeholder="مثال: INV-001"
                  className="mt-1 text-sm"
                  disabled={!uploadForm.linkedDoctype}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button onClick={handleUpload} className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              رفع المستند
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl">
          {selectedDoc && (() => {
            const info = getDocTypeInfo(selectedDoc.type);
            const Icon = info.icon;
            const folder = folders.find((f) => f.id === selectedDoc.folderId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${info.border} ${info.bg}`}>
                      <Icon className={`h-4 w-4 ${info.color}`} />
                    </div>
                    تفاصيل المستند
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Preview area */}
                  <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${info.border} ${info.bg} p-8 text-center`}>
                    <Icon className={`h-16 w-16 ${info.color} opacity-60 mb-3`} />
                    <p className="text-sm font-semibold text-foreground">{selectedDoc.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedDoc.type} — {selectedDoc.size}</p>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الاسم</p>
                      <p className="text-sm font-medium truncate">{selectedDoc.name}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الحجم</p>
                      <p className="text-sm font-medium">{selectedDoc.size}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">النوع</p>
                      <p className="text-sm font-medium">{selectedDoc.type}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">رفع بواسطة</p>
                      <p className="text-sm font-medium">{selectedDoc.uploadedBy}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">تاريخ الرفع</p>
                      <p className="text-sm font-medium">{formatDate(selectedDoc.uploadedAt)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الحالة</p>
                      <StatusBadge status={getDocStatusMapping(selectedDoc.status)} />
                    </div>
                    {folder && (
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">المجلد</p>
                        <div className="flex items-center gap-1">
                          <Folder className="h-3.5 w-3.5" style={{ color: folder.color }} />
                          <p className="text-sm font-medium">{folder.name}</p>
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">الإصدار</p>
                      <p className="text-sm font-medium">v{selectedDoc.version}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedDoc.description && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">الوصف</p>
                      <p className="text-sm text-foreground">{selectedDoc.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedDoc.tags.length > 0 && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1.5">الوسوم</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDoc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked document */}
                  {selectedDoc.linkedDoctype && selectedDoc.linkedDocname && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">المستند المرتبط</p>
                      <p className="text-sm font-medium">
                        {selectedDoc.linkedDoctype} — {selectedDoc.linkedDocname}
                      </p>
                    </div>
                  )}

                  {/* Version history */}
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[10px] text-muted-foreground mb-2">سجل الإصدارات</p>
                    <div className="space-y-2">
                      {Array.from({ length: selectedDoc.version }, (_, i) => {
                        const ver = selectedDoc.version - i;
                        const isCurrent = ver === selectedDoc.version;
                        return (
                          <div
                            key={ver}
                            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md ${
                              isCurrent ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            <span className="font-mono w-14 shrink-0">v{ver}</span>
                            <span className="flex-1 truncate">
                              {isCurrent ? 'الإصدار الحالي' : 'إصدار سابق'}
                            </span>
                            <span className="text-[10px]">
                              {formatDate(
                                new Date(
                                  new Date(selectedDoc.uploadedAt).getTime() - i * 86400000 * 3
                                )
                                  .toISOString()
                                  .split('T')[0]
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => deleteDocument(selectedDoc)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      toast({ title: 'جاري التحميل', description: selectedDoc.name });
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    تحميل
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => setDetailDialogOpen(false)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    إغلاق
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

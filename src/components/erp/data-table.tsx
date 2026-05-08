"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  Rows3,
  Columns3,
  Filter,
  ArrowUp,
  ArrowDown,
  Inbox,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/erp/export-button";
import { EmptyState } from "@/components/erp/empty-state";

export interface Column<T = unknown> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  /** فلتر نصي في صف الرأس الثاني */
  filterable?: boolean;
  /** تعديل مباشر بالنقر المزدوج عند توفر `onCellCommit` */
  editable?: boolean;
}

export interface DataTableProps<T = unknown> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  searchable?: boolean;
  pageSize?: number;
  onAdd?: () => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  addLabel?: string;
  loading?: boolean;
  /** عرض حالة الخطأ */
  error?: Error | null;
  /** إعادة محاولة عند الخطأ */
  onRetry?: () => void;
  /** مفتاح تفضيلات الأعمدة في localStorage */
  tableId?: string;
  /** تمييز صفوف + إجراءات جماعية */
  selectable?: boolean;
  /** تجميد أول عمود بيانات (مناسب للجداول العريضة) */
  stickyFirstColumn?: boolean;
  /** صف فلترة تحت رؤوس الأعمدة */
  columnFilters?: boolean;
  exportFileName?: string;
  printTitle?: string;
  getRowId?: (row: T, index: number) => string;
  onCellCommit?: (row: T, key: string, value: string) => void;
  bulkActions?: { label: string; variant?: "default" | "destructive"; onClick: (rows: T[]) => void }[];
}

type TablePrefs = { hidden: string[] };

function prefsKey(tableId: string) {
  return `erp_table_prefs_${tableId}`;
}

function loadPrefs(tableId: string | undefined): TablePrefs {
  if (!tableId || typeof window === "undefined") return { hidden: [] };
  try {
    const raw = localStorage.getItem(prefsKey(tableId));
    if (!raw) return { hidden: [] };
    const p = JSON.parse(raw) as TablePrefs;
    return { hidden: Array.isArray(p.hidden) ? p.hidden : [] };
  } catch {
    return { hidden: [] };
  }
}

function savePrefs(tableId: string | undefined, prefs: TablePrefs) {
  if (!tableId || typeof window === "undefined") return;
  try {
    localStorage.setItem(prefsKey(tableId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function defaultGetRowId<T>(row: T, index: number): string {
  const r = row as Record<string, unknown>;
  if (r && typeof r.name === "string" && r.name) return r.name;
  return `row-${index}`;
}

export function DataTable<T = unknown>({
  data,
  columns,
  title,
  searchable = true,
  pageSize = 10,
  onAdd,
  onView,
  onEdit,
  onDelete,
  addLabel = "إضافة جديد",
  loading = false,
  error,
  onRetry,
  tableId,
  selectable = false,
  stickyFirstColumn = false,
  columnFilters = false,
  exportFileName = "export.csv",
  printTitle = "ERP Pro",
  getRowId = defaultGetRowId,
  onCellCommit,
  bulkActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [hiddenPrefs, setHiddenPrefs] = useState<{ tableId: string | undefined; prefs: TablePrefs }>(() => ({
    tableId,
    prefs: loadPrefs(tableId),
  }));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // ── Null-safety: تأكد من أن data و columns مصفوفات صالحة ──
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];

  const rowRecord = (row: T): Record<string, unknown> => row as unknown as Record<string, unknown>;
  const hiddenCols = hiddenPrefs.tableId === tableId ? hiddenPrefs.prefs.hidden : loadPrefs(tableId).hidden;

  const visibleColumns = useMemo(
    () => safeColumns.filter((c) => !hiddenCols.includes(c.key)),
    [safeColumns, hiddenCols]
  );

  const setColumnHidden = useCallback(
    (key: string, show: boolean) => {
      setHiddenPrefs((prev) => {
        const currentHidden = prev.tableId === tableId ? prev.prefs.hidden : loadPrefs(tableId).hidden;
        const next = show ? currentHidden.filter((k) => k !== key) : [...new Set([...currentHidden, key])];
        savePrefs(tableId, { hidden: next });
        return { tableId, prefs: { hidden: next } };
      });
    },
    [tableId]
  );

  const filteredData = useMemo(() => {
    return safeData.filter((row) => {
      const rec = rowRecord(row);
      if (search) {
        const hit = Object.values(rec).some((val) => String(val).toLowerCase().includes(search.toLowerCase()));
        if (!hit) return false;
      }
      for (const col of visibleColumns) {
        const f = colFilters[col.key];
        if (!f?.trim()) continue;
        const val = String(rec[col.key] ?? "").toLowerCase();
        if (!val.includes(f.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [safeData, search, colFilters, visibleColumns]);

  const showActions = Boolean(onView || onEdit || onDelete);
  const showSelectCol = selectable;
  const bodyColSpan = visibleColumns.length + (showActions ? 1 : 0) + (showSelectCol ? 1 : 0);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = String(rowRecord(a)[sortKey] ?? "");
      const bVal = String(rowRecord(b)[sortKey] ?? "");
      const modifier = sortDir === "asc" ? 1 : -1;
      if (aVal < bVal) return -1 * modifier;
      if (aVal > bVal) return 1 * modifier;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIdx, startIdx + pageSize);

  const handleSort = (key: string) => {
    const col = safeColumns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const printTable = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const tableEl = document.getElementById(`erp-print-area-${tableId ?? "default"}`);
    const inner = tableEl?.innerHTML ?? "";
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>${printTitle}</title>
      <style>body{font-family:system-ui,sans-serif;font-size:11px;padding:12px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:4px;text-align:right;}</style>
      </head><body>${inner}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const pageIds = paginatedData.map((row, i) => getRowId(row, startIdx + i));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = useMemo(
    () => safeData.filter((row, i) => selected.has(getRowId(row, i))),
    [safeData, selected, getRowId]
  );

  const startEdit = (row: T, col: Column<T>, rowIndex: number) => {
    if (!col.editable || !onCellCommit) return;
    const id = getRowId(row, rowIndex);
    const val = String(rowRecord(row)[col.key] ?? "");
    setEditing({ rowId: id, colKey: col.key });
    setEditDraft(val);
  };

  const commitEdit = (row: T) => {
    if (!editing || !onCellCommit) return;
    onCellCommit(row, editing.colKey, editDraft);
    setEditing(null);
    setEditDraft("");
  };

  const bulkBar = selectable && selected.size > 0 && bulkActions && bulkActions.length > 0;

  // ── Error state ──
  if (error) {
    return (
      <div dir="rtl" className="space-y-4">
        {title && (
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span className="inline-block h-5 w-1 rounded-full bg-primary/70" aria-hidden />
            {title}
          </h2>
        )}
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
          <div className="mb-3 rounded-full border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-destructive">فشل تحميل البيانات</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            {error.message || "حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى."}
          </p>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 text-xs gap-1.5"
              onClick={onRetry}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة المحاولة
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4 print:space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        {title && (
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span className="inline-block h-5 w-1 rounded-full bg-primary/70" aria-hidden />
            {title}
          </h2>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في الجدول..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              className="h-9 w-56 rounded-[var(--radius-md-ui)] pe-8 text-xs"
              />
            </div>
          )}
          {tableId && safeColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1 rounded-[var(--radius-md-ui)]">
                  <Columns3 className="h-3.5 w-3.5" />
                  أعمدة
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {safeColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={!hiddenCols.includes(col.key)}
                    onCheckedChange={(c) => setColumnHidden(col.key, Boolean(c))}
                  >
                    {col.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ExportButton
            data={sortedData.map((row) => rowRecord(row))}
            filename={exportFileName.replace(/\.csv$/i, "")}
            columns={visibleColumns.map((c) => ({ key: c.key, header: c.header }))}
          />
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1 rounded-[var(--radius-md-ui)]" onClick={printTable} type="button">
            <Rows3 className="h-3.5 w-3.5" />
            طباعة
          </Button>
          {onAdd && (
            <Button
              size="sm"
              onClick={onAdd}
              className="h-9 text-xs gap-1.5 rounded-[var(--radius-md-ui)]"
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {bulkBar && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md-ui)] border border-warning/40 bg-warning/10 px-3 py-2 text-xs no-print">
          <span className="font-semibold">محدد: {selected.size}</span>
          {bulkActions!.map((a) => (
            <Button
              key={a.label}
              type="button"
              size="sm"
              variant={a.variant === "destructive" ? "destructive" : "secondary"}
              className="h-8 text-xs rounded-[var(--radius-sm-ui)]"
              onClick={() => a.onClick(selectedRows)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}

      <div
        id={`erp-print-area-${tableId ?? "default"}`}
        className="hidden md:block rounded-xl border border-border/40 bg-card overflow-x-auto transition-colors duration-200 hover:border-border/60"
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur">
            <TableRow className="hover:bg-muted/60 border-b border-border/40">
              {showSelectCol && (
                <TableHead className="w-10 text-center align-middle">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAllPage}
                    aria-label="تحديد كل الصفوف في الصفحة"
                    className="mx-auto"
                  />
                </TableHead>
              )}
              {visibleColumns.map((col, colIndex) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold select-none align-middle",
                    col.sortable && "cursor-pointer hover:bg-muted/70",
                    col.width,
                    stickyFirstColumn && colIndex === 0 && "sticky end-0 z-10 bg-muted/95 backdrop-blur border-s-2 border-border/30"
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 py-2">
                    {col.header}
                    {sortKey === col.key &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      ))}
                    {columnFilters && col.filterable && <Filter className="h-3 w-3 text-muted-foreground opacity-60" />}
                  </div>
                </TableHead>
              ))}
              {showActions && (
                <TableHead className="text-xs font-semibold w-20 text-center align-middle">إجراءات</TableHead>
              )}
            </TableRow>
            {columnFilters && (
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b no-print">
                {showSelectCol && <TableHead className="p-1" />}
                {visibleColumns.map((col) => (
                  <TableHead key={`f-${col.key}`} className="p-1">
                    {col.filterable ? (
                      <Input
                        className="h-7 text-[10px]"
                        placeholder="فلتر..."
                        value={colFilters[col.key] ?? ""}
                        onChange={(e) => {
                          setColFilters((f) => ({ ...f, [col.key]: e.target.value }));
                          setCurrentPage(1);
                        }}
                      />
                    ) : (
                      <span className="block h-7" />
                    )}
                  </TableHead>
                ))}
                {showActions && <TableHead className="p-1" />}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, si) => (
                <TableRow key={si}>
                  {Array.from({ length: bodyColSpan || safeColumns.length }).map((__, ci) => (
                    <TableCell key={ci} className="py-3">
                      <Skeleton className="h-4 w-full max-w-[8rem]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={bodyColSpan || 1} className="p-4">
                  <EmptyState
                    title="لا توجد بيانات"
                    description={search ? "لم يتم العثور على سجلات مطابقة لبحثك الحالي." : "لا توجد سجلات لعرضها. أضف سجلاً جديداً أو عدّل الفلاتر."}
                    icon={Inbox}
                    className="min-h-[180px]"
                    actionLabel={onAdd ? addLabel : undefined}
                    onAction={onAdd}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => {
                const globalIndex = startIdx + idx;
                const id = getRowId(row, globalIndex);
                const isSelected = selected.has(id);
                const isEditingRow = editing?.rowId === id;
                return (
                  <TableRow
                    key={id}
                    className={cn(
                      "group border-b border-border/30 transition-colors duration-150",
                      "hover:bg-primary/5",
                      isSelected && "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    {showSelectCol && (
                      <TableCell className="w-10 text-center py-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(id)}
                          aria-label="تحديد الصف"
                          className="mx-auto"
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((col, colIndex) => {
                      const raw = rowRecord(row)[col.key];
                      const editingCell = isEditingRow && editing?.colKey === col.key;
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "text-xs py-2 align-middle",
                            stickyFirstColumn &&
                              colIndex === 0 &&
                              cn(
                                "sticky end-0 z-[1] border-s border-border/40 shadow-[inset_-4px_0_6px_-6px_rgba(0,0,0,0.06)]",
                                idx % 2 === 1 && !isSelected ? "bg-muted/25" : "bg-card"
                              ),
                            isSelected && stickyFirstColumn && colIndex === 0 && "bg-desk-row-selected"
                          )}
                          onDoubleClick={() => startEdit(row, col, globalIndex)}
                        >
                          {editingCell ? (
                            <Input
                              autoFocus
                              className="h-7 text-xs"
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onBlur={() => commitEdit(row)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(row);
                                if (e.key === "Escape") {
                                  setEditing(null);
                                  setEditDraft("");
                                }
                              }}
                            />
                          ) : col.render ? (
                            col.render(raw, row)
                          ) : (
                            String(raw ?? "—")
                          )}
                        </TableCell>
                      );
                    })}
                    {showActions && (
                      <TableCell className="text-center py-2 no-print">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-9 min-w-9 opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(row)}>
                                <Eye className="me-2 h-3.5 w-3.5" />
                                عرض
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(row)}>
                                <Edit className="me-2 h-3.5 w-3.5" />
                                تعديل
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(row)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="me-2 h-3.5 w-3.5" />
                                حذف
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: Math.min(pageSize, 6) }).map((_, si) => (
            <Skeleton key={`mobile-sk-${si}`} className="h-28 w-full rounded-[var(--radius-md-ui)]" />
          ))
        ) : paginatedData.length === 0 ? (
          <EmptyState
            title="لا توجد بيانات"
            description={search ? "عدّل البحث أو الفلاتر لعرض النتائج." : "لا توجد سجلات لعرضها."}
            icon={Inbox}
            actionLabel={onAdd ? addLabel : undefined}
            onAction={onAdd}
          />
        ) : (
          paginatedData.map((row, idx) => {
            const globalIndex = startIdx + idx;
            const id = getRowId(row, globalIndex);
            const rec = rowRecord(row);
            const primary = visibleColumns[0];
            const secondary = visibleColumns.slice(1, 4);
            return (
              <div key={`m-${id}`} className="rounded-[var(--radius-md-ui)] border border-border/40 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{primary?.header ?? "السجل"}</p>
                    <p className="truncate text-sm font-semibold">
                      {primary ? String(rec[primary.key] ?? "—") : id}
                    </p>
                  </div>
                  {showSelectCol ? (
                    <Checkbox
                      checked={selected.has(id)}
                      onCheckedChange={() => toggleRow(id)}
                      aria-label="تحديد البطاقة"
                    />
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1.5">
                  {secondary.map((col) => (
                    <div key={`m-${id}-${col.key}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{col.header}</span>
                      <span className="truncate font-medium">{String(rec[col.key] ?? "—")}</span>
                    </div>
                  ))}
                </div>
                {showActions ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {onView ? <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onView(row)}>عرض</Button> : null}
                    {onEdit ? <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onEdit(row)}>تعديل</Button> : null}
                    {onDelete ? <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => onDelete(row)}>حذف</Button> : null}
                  </div>
                ) : null}
                {selected.has(id) ? <Badge variant="secondary" className="mt-2 text-[10px]">محدد</Badge> : null}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground no-print">
          <span>
            عرض {startIdx + 1}-{Math.min(startIdx + pageSize, sortedData.length)} من {sortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-9 min-w-9"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(safeCurrentPage - 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">
              {safeCurrentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-9 min-w-9"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(safeCurrentPage + 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

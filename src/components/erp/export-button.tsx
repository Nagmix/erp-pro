'use client';

import { Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react';
import { useState } from 'react';
import ExcelJS from 'exceljs';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; header: string }[];
}

function normalizeColumns(
  data: Record<string, unknown>[],
  columns?: { key: string; header: string }[]
) {
  const safeColumns = columns && columns.length > 0
    ? columns
    : Object.keys(data[0] || {}).map((key) => ({ key, header: key }));

  return {
    headers: safeColumns.map((c) => c.header),
    keys: safeColumns.map((c) => c.key),
  };
}

function exportToCSV(data: Record<string, unknown>[], filename: string, columns?: { key: string; header: string }[]) {
  if (data.length === 0) return;

  const { headers, keys } = normalizeColumns(data, columns);

  // Add BOM for Arabic support in Excel
  const bom = '\uFEFF';
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map((key) => {
      const val = row[key] ?? '';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = bom + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportToExcel(data: Record<string, unknown>[], filename: string, columns?: { key: string; header: string }[]) {
  if (data.length === 0) return;

  const { headers, keys } = normalizeColumns(data, columns);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  worksheet.views = [{ rightToLeft: true }];
  worksheet.addRow(headers);

  for (const row of data) {
    worksheet.addRow(keys.map((key) => row[key] ?? ''));
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'right' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });

  worksheet.columns = keys.map((key, index) => {
    const maxData = Math.max(
      String(headers[index] ?? '').length,
      ...data.map((row) => String(row[key] ?? '').length)
    );
    return {
      key,
      width: Math.min(Math.max(maxData + 3, 14), 42),
      style: { alignment: { horizontal: 'right' } },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, direction: 'rtl' },
  title: { fontSize: 14, marginBottom: 6, textAlign: 'right' },
  meta: { marginBottom: 10, textAlign: 'right', color: '#6B7280' },
  table: { display: 'flex', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row-reverse' },
  headerCell: {
    flex: 1,
    padding: 5,
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    textAlign: 'right',
    fontWeight: 700,
  },
  cell: {
    flex: 1,
    padding: 5,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    textAlign: 'right',
  },
});

async function exportToPdf(data: Record<string, unknown>[], filename: string, columns?: { key: string; header: string }[]) {
  if (data.length === 0) return;

  const { headers, keys } = normalizeColumns(data, columns);

  const doc = (
    <Document title={filename}>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{filename}</Text>
        <Text style={pdfStyles.meta}>تاريخ التصدير: {new Date().toLocaleDateString('ar-SA')}</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.row}>
            {headers.map((header) => (
              <Text key={header} style={pdfStyles.headerCell}>{header}</Text>
            ))}
          </View>
          {data.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={pdfStyles.row}>
              {keys.map((key) => (
                <Text key={`${rowIndex}-${key}`} style={pdfStyles.cell}>
                  {String(row[key] ?? '—')}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null);

  const handleExcel = async () => {
    setBusy('excel');
    try {
      await exportToExcel(data, filename, columns);
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      await exportToPdf(data, filename, columns);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={busy !== null}>
          <Download className="h-3.5 w-3.5" />
          تصدير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => exportToCSV(data, filename, columns)}>
          <Download className="ms-2 h-4 w-4" />
          تصدير CSV (سريع)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleExcel()} disabled={busy !== null}>
          {busy === 'excel' ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="ms-2 h-4 w-4" />}
          تصدير Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handlePdf()} disabled={busy !== null}>
          {busy === 'pdf' ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <FileText className="ms-2 h-4 w-4" />}
          تصدير PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handlePdf()} disabled={busy !== null}>
          <Printer className="ms-2 h-4 w-4" />
          معاينة/طباعة PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

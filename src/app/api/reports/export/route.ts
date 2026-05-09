import { NextRequest, NextResponse } from 'next/server';
import { runReport, resolveReportExecutionName } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';
import { getReportDef } from '@/lib/reports/catalog';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      reportName: string;
      format: 'csv' | 'excel' | 'pdf';
      filters?: Record<string, unknown>;
    };

    const { reportName, format, filters = {} } = body;

    if (!reportName) {
      return NextResponse.json({ success: false, error: 'اسم التقرير مطلوب' }, { status: 400 });
    }

    const def = getReportDef(reportName);
    if (!def) {
      return NextResponse.json({ success: false, error: 'التقرير غير مدعوم' }, { status: 404 });
    }

    const frappeSid = getFrappeSidFromRequest(request);
    const mergedFilters = { ...(def.defaultFilters || {}), ...filters };
    const erpReportName = await resolveReportExecutionName(def, frappeSid);
    const result = (await runReport(erpReportName, mergedFilters, frappeSid)) as { message?: any; result?: any[]; columns?: any[] };

    const reportData = result?.message ?? result;
    const rows: any[] = reportData?.result || reportData || [];
    const columns: any[] = reportData?.columns || [];

    if (format === 'csv') {
      // Generate CSV
      const headers = columns.map((c: any) => c.label || c.fieldname || c);
      const csvRows = [headers.join(',')];
      for (const row of rows) {
        const values = columns.map((c: any) => {
          const key = c.fieldname || c;
          const val = String(row[key] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        });
        csvRows.push(values.join(','));
      }
      const csv = csvRows.join('\n');
      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${reportName}.csv"`,
        },
      });
    }

    // Default: Excel format
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(def.title || reportName);

    // Add headers
    const headers = columns.map((c: any) => c.label || c.fieldname || c);
    const headerRow = sheet.addRow(headers);
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const row of rows) {
      const values = columns.map((c: any) => {
        const key = c.fieldname || c;
        return row[key] ?? '';
      });
      sheet.addRow(values);
    }

    // Auto-fit columns
    sheet.columns.forEach((col, i) => {
      const headerLen = String(headers[i] || '').length;
      let maxLen = headerLen;
      sheet.getColumn(i + 1).eachCell({ includeEmpty: true }, (cell) => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(Math.max(maxLen + 2, 10), 40);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${reportName}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'فشل تصدير التقرير' },
      { status: 500 }
    );
  }
}

// ============================================================
// Naming Series API — الترقيم المتسلسل
// Integrates with ERPNext Naming Series & tabSeries
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callMethod, getList, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

/**
 * Document types that support naming_series in ERPNext.
 * Each entry maps to a DocType and its default prefix pattern.
 */
const NAMING_SERIES_DOCTYPES = [
  { doctype: 'Sales Invoice', label: 'فاتورة مبيعات', defaultPrefix: 'ACC-SINV-.YYYY.-' },
  { doctype: 'POS Invoice', label: 'فاتورة نقطة بيع', defaultPrefix: 'ACC-PSINV-.YYYY.-' },
  { doctype: 'Purchase Invoice', label: 'فاتورة مشتريات', defaultPrefix: 'ACC-PINV-.YYYY.-' },
  { doctype: 'Journal Entry', label: 'قيد يومية', defaultPrefix: 'ACC-JV-.YYYY.-' },
  { doctype: 'Payment Entry', label: 'قيد دفع', defaultPrefix: 'ACC-PE-.YYYY.-' },
  { doctype: 'Quotation', label: 'عرض سعر', defaultPrefix: 'SAL-QTN-.YYYY.-' },
  { doctype: 'Sales Order', label: 'أمر مبيعات', defaultPrefix: 'SAL-SO-.YYYY.-' },
  { doctype: 'Delivery Note', label: 'إشعار تسليم', defaultPrefix: 'SAL-DN-.YYYY.-' },
  { doctype: 'Purchase Order', label: 'أمر شراء', defaultPrefix: 'PUR-PO-.YYYY.-' },
  { doctype: 'Purchase Receipt', label: 'إيصال استلام مشتريات', defaultPrefix: 'PUR-PR-.YYYY.-' },
  { doctype: 'Stock Entry', label: 'قيد مخزون', defaultPrefix: 'STE-.YYYY.-' },
  { doctype: 'Material Request', label: 'طلب مواد', defaultPrefix: 'MAT-MR-.YYYY.-' },
  { doctype: 'Request for Quotation', label: 'طلب عروض أسعار', defaultPrefix: 'PUR-RFQ-.YYYY.-' },
  { doctype: 'Supplier Quotation', label: 'عرض سعر مورد', defaultPrefix: 'PUR-SQ-.YYYY.-' },
  { doctype: 'Expense Claim', label: 'مطالبة مصروفات', defaultPrefix: 'HR-EXP-.YYYY.-' },
  { doctype: 'Production Plan', label: 'خطة إنتاج', defaultPrefix: 'MFG-PP-.YYYY.-' },
  { doctype: 'Lead', label: 'عميل محتمل', defaultPrefix: 'CRM-LEAD-.YYYY.-' },
  { doctype: 'Opportunity', label: 'فرصة', defaultPrefix: 'CRM-OPP-.YYYY.-' },
] as const;

/** GET — Fetch naming series info for all/specific DocTypes */
export async function GET(request: NextRequest) {
  const userSession = getFrappeSidFromRequest(request);
  const searchParams = request.nextUrl.searchParams;
  const specificDoctype = searchParams.get('doctype');

  try {
    if (specificDoctype) {
      // Fetch naming series options for a specific DocType
      return await getNamingSeriesForDoctype(specificDoctype, userSession);
    }

    // Fetch all naming series info
    return await getAllNamingSeries(userSession);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل بيانات الترقيم';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** POST — Update naming series (add prefix, update series, reset counter) */
export async function POST(request: NextRequest) {
  const userSession = getFrappeSidFromRequest(request);
  try {
    const body = await request.json();
    const action = body._action as string;

    switch (action) {
      case 'update_series':
        return await updateNamingSeries(body, userSession);
      case 'reset_counter':
        return await resetCounter(body, userSession);
      case 'add_prefix':
        return await addPrefix(body, userSession);
      default:
        return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث الترقيم';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── Implementation ────────────────────────────────────────

async function getNamingSeriesForDoctype(doctype: string, userSession?: string) {
  try {
    // Get the naming_series field options from the DocType meta
    const meta = await callMethod('frappe.client.get_value', {
      doctype: 'DocType',
      fieldname: ['name', 'naming_series'],
      name: doctype,
    }, userSession) as Record<string, unknown> | null;

    // Try to get existing series options from Naming Series DocType
    let seriesOptions: string[] = [];
    try {
      const namingSeriesDoc = await getDoc('Naming Series', doctype, userSession) as Record<string, unknown>;
      const seriesData = namingSeriesDoc?.series as string;
      if (seriesData) {
        seriesOptions = seriesData.split('\n').filter((s: string) => s.trim());
      }
    } catch {
      // Naming Series doc might not exist yet for this doctype
    }

    // Get current counter values from tabSeries
    let counterInfo: Record<string, number> = {};
    try {
      const seriesRows = await getList('Series', {
        fields: ['name', 'current'],
        limit: 200,
      }, userSession);
      if (Array.isArray(seriesRows)) {
        for (const row of seriesRows as Record<string, unknown>[]) {
          const name = String(row.name || '');
          // Only include series relevant to this doctype
          if (seriesOptions.some(s => name.startsWith(s.replace('.YYYY.-', '').replace('.YYYY.', '').replace('-', '')))) {
            counterInfo[name] = Number(row.current || 0);
          }
        }
      }
    } catch {
      // Series table might not be directly accessible
    }

    const doctypeInfo = NAMING_SERIES_DOCTYPES.find(d => d.doctype === doctype);

    return NextResponse.json({
      success: true,
      data: {
        doctype,
        label: doctypeInfo?.label || doctype,
        defaultPrefix: doctypeInfo?.defaultPrefix || '',
        seriesOptions,
        counterInfo,
        hasNamingSeries: meta != null,
      },
    });
  } catch (error) {
    // Graceful fallback
    const doctypeInfo = NAMING_SERIES_DOCTYPES.find(d => d.doctype === doctype);
    return NextResponse.json({
      success: true,
      data: {
        doctype,
        label: doctypeInfo?.label || doctype,
        defaultPrefix: doctypeInfo?.defaultPrefix || '',
        seriesOptions: doctypeInfo ? [doctypeInfo.defaultPrefix] : [],
        counterInfo: {},
        hasNamingSeries: false,
      },
    });
  }
}

async function getAllNamingSeries(userSession?: string) {
  const results: Record<string, unknown>[] = [];

  for (const dt of NAMING_SERIES_DOCTYPES) {
    let seriesOptions: string[] = [dt.defaultPrefix];
    let counterInfo: Record<string, number> = {};

    try {
      const namingSeriesDoc = await getDoc('Naming Series', dt.doctype, userSession) as Record<string, unknown>;
      const seriesData = namingSeriesDoc?.series as string;
      if (seriesData) {
        seriesOptions = seriesData.split('\n').filter((s: string) => s.trim());
      }
    } catch {
      // Use defaults
    }

    // Get counter values for matching series
    try {
      const allSeries = await getList('Series', {
        fields: ['name', 'current'],
        limit: 500,
      }, userSession);
      if (Array.isArray(allSeries)) {
        for (const row of allSeries as Record<string, unknown>[]) {
          const name = String(row.name || '');
          for (const prefix of seriesOptions) {
            // Match series that start with the prefix base
            const basePrefix = prefix.replace(/\.YYYY\.-?$/, '').replace(/\.YYYY\.?$/, '').replace(/\.####$/, '').replace(/-$/, '');
            if (name.startsWith(basePrefix) || name === prefix) {
              counterInfo[name] = Number(row.current || 0);
            }
          }
        }
      }
    } catch {
      // Counter info not available
    }

    results.push({
      doctype: dt.doctype,
      label: dt.label,
      defaultPrefix: dt.defaultPrefix,
      seriesOptions,
      counterInfo,
    });
  }

  return NextResponse.json({ success: true, data: results });
}

async function updateNamingSeries(
  body: { doctype: string; series: string[] },
  userSession?: string
) {
  const { doctype, series } = body;
  if (!doctype || !Array.isArray(series)) {
    return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
  }

  try {
    // Update the Naming Series document for this DocType
    const seriesString = series.filter((s: string) => s.trim()).join('\n');

    try {
      // Try to update existing Naming Series doc
      await callMethod('frappe.client.set_value', {
        doctype: 'Naming Series',
        name: doctype,
        fieldname: 'series',
        value: seriesString,
      }, userSession);
    } catch {
      // If doc doesn't exist, create it
      try {
        await callMethod('frappe.client.insert', {
          doc: {
            doctype: 'Naming Series',
            name: doctype,
            series: seriesString,
            modified: '',
            created: '',
          },
        }, userSession);
      } catch {
        // Some ERPNext versions handle this differently
      }
    }

    return NextResponse.json({ success: true, data: { doctype, series } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحديث التسلسل';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function resetCounter(
  body: { prefix: string; value: number },
  userSession?: string
) {
  const { prefix, value } = body;
  if (!prefix) {
    return NextResponse.json({ success: false, error: 'البادئة مطلوبة' }, { status: 400 });
  }

  try {
    // Reset the counter in tabSeries
    await callMethod('frappe.client.set_value', {
      doctype: 'Series',
      name: prefix,
      fieldname: 'current',
      value: value || 0,
    }, userSession);

    return NextResponse.json({ success: true, data: { prefix, newValue: value || 0 } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إعادة تعيين العداد';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function addPrefix(
  body: { doctype: string; prefix: string },
  userSession?: string
) {
  const { doctype, prefix } = body;
  if (!doctype || !prefix?.trim()) {
    return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
  }

  try {
    // Get existing series for this doctype
    let existingSeries: string[] = [];
    try {
      const namingSeriesDoc = await getDoc('Naming Series', doctype, userSession) as Record<string, unknown>;
      const seriesData = namingSeriesDoc?.series as string;
      if (seriesData) {
        existingSeries = seriesData.split('\n').filter((s: string) => s.trim());
      }
    } catch {
      // No existing series
    }

    // Add new prefix if it doesn't exist
    const newPrefix = prefix.trim();
    if (!existingSeries.includes(newPrefix)) {
      existingSeries.push(newPrefix);
    }

    // Update the Naming Series doc
    const seriesString = existingSeries.join('\n');
    try {
      await callMethod('frappe.client.set_value', {
        doctype: 'Naming Series',
        name: doctype,
        fieldname: 'series',
        value: seriesString,
      }, userSession);
    } catch {
      try {
        await callMethod('frappe.client.insert', {
          doc: {
            doctype: 'Naming Series',
            name: doctype,
            series: seriesString,
          },
        }, userSession);
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ success: true, data: { doctype, series: existingSeries } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل إضافة البادئة';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ── Register Arabic-compatible font ──────────────────────────
// Use Amiri (Google Fonts) – a Naskh-style Arabic typeface.
// Fallback to system fonts if the network request fails.
Font.register({
  family: 'Amiri',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.pdf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/amiri/v27/J7acnpd8CGxBHp2VkZY4xJ9CGyAa.pdf', fontWeight: 700 },
  ],
});

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    direction: 'rtl',
    fontFamily: 'Amiri',
    lineHeight: 1.4,
  },
  header: {
    textAlign: 'center',
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#7c3aed',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e1b4b',
  },
  title: {
    fontSize: 14,
    marginTop: 4,
    color: '#7c3aed',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 20,
  },
  infoCol: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1e1b4b',
    marginBottom: 6,
    marginTop: 10,
    paddingRight: 6,
    borderRightWidth: 3,
    borderRightColor: '#7c3aed',
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ede9fe',
    borderBottomWidth: 1,
    borderBottomColor: '#7c3aed',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tableCellHeader: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    fontWeight: 700,
    color: '#4c1d95',
  },
  tableCellHeaderNum: {
    width: 100,
    padding: 5,
    fontSize: 9,
    fontWeight: 700,
    color: '#4c1d95',
    textAlign: 'left',
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    color: '#374151',
  },
  tableCellNum: {
    width: 100,
    padding: 5,
    fontSize: 9,
    color: '#374151',
    textAlign: 'left',
  },
  totalSection: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
  },
  netPayBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 6,
    textAlign: 'center',
  },
  netPayLabel: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: 700,
  },
  netPayValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#047857',
    marginTop: 2,
  },
  bankSection: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 6,
    padding: 8,
  },
  bankLabel: {
    fontSize: 8,
    color: '#92400e',
    marginBottom: 1,
  },
  bankValue: {
    fontSize: 9,
    fontWeight: 700,
    color: '#78350f',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

// ── Types ────────────────────────────────────────────────────
export interface PayslipData {
  company: string;
  employee_name: string;
  employee_id: string;
  department?: string;
  designation?: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  earnings: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  bank_name?: string;
  bank_account?: string;
  currency?: string;
}

// ── Helpers ──────────────────────────────────────────────────
function fmtNum(n: number, currency = 'YER'): string {
  try {
    return new Intl.NumberFormat('ar-YE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function fmtDate(d: string): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return d;
  }
}

// ── Component ────────────────────────────────────────────────
export function PayslipPDFDocument({ data }: { data: PayslipData }) {
  const currency = data.currency || 'YER';
  const now = new Date();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.company || 'ERP Pro'}</Text>
          <Text style={styles.title}>قسيمة راتب</Text>
          <Text style={styles.subtitle}>
            الفترة: {fmtDate(data.start_date)} — {fmtDate(data.end_date)}
          </Text>
        </View>

        {/* ── Employee Info ── */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>اسم الموظف</Text>
            <Text style={styles.infoValue}>{data.employee_name || '—'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>رقم الموظف</Text>
            <Text style={styles.infoValue}>{data.employee_id || '—'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>القسم</Text>
            <Text style={styles.infoValue}>{data.department || '—'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>المسمى الوظيفي</Text>
            <Text style={styles.infoValue}>{data.designation || '—'}</Text>
          </View>
        </View>

        {/* ── Earnings Table ── */}
        <Text style={styles.sectionTitle}>المكافآت والبدلات</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellHeader}>البند</Text>
            <Text style={styles.tableCellHeaderNum}>المبلغ</Text>
          </View>
          {data.earnings.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>— لا توجد بنود —</Text>
              <Text style={styles.tableCellNum}>—</Text>
            </View>
          ) : (
            data.earnings.map((e, i) => (
              <View key={`e-${i}`} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                <Text style={styles.tableCell}>{e.name}</Text>
                <Text style={styles.tableCellNum}>{fmtNum(e.amount, currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Deductions Table ── */}
        <Text style={styles.sectionTitle}>الخصومات</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellHeader}>البند</Text>
            <Text style={styles.tableCellHeaderNum}>المبلغ</Text>
          </View>
          {data.deductions.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>— لا توجد خصومات —</Text>
              <Text style={styles.tableCellNum}>—</Text>
            </View>
          ) : (
            data.deductions.map((d, i) => (
              <View key={`d-${i}`} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                <Text style={styles.tableCell}>{d.name}</Text>
                <Text style={styles.tableCellNum}>{fmtNum(d.amount, currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Summary ── */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الراتب الإجمالي</Text>
            <Text style={styles.totalValue}>{fmtNum(data.gross_pay, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>إجمالي الخصومات</Text>
            <Text style={[styles.totalValue, { color: '#dc2626' }]}>({fmtNum(data.total_deduction, currency)})</Text>
          </View>
        </View>

        {/* ── Net Pay ── */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>صافي الراتب</Text>
          <Text style={styles.netPayValue}>{fmtNum(data.net_pay, currency)}</Text>
        </View>

        {/* ── Bank Details ── */}
        {(data.bank_name || data.bank_account) && (
          <View style={styles.bankSection}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankLabel}>البنك</Text>
              <Text style={styles.bankValue}>{data.bank_name || '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankLabel}>رقم الحساب</Text>
              <Text style={styles.bankValue}>{data.bank_account || '—'}</Text>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text>تم إنشاؤه تلقائياً بواسطة نظام ERP Pro — {fmtDate(now.toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
}

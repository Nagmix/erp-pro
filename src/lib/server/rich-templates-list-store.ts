/**
 * مخزن القوالب الغنية (طبقة ERP Pro).
 * المسار: data/rich-templates-list.json
 */
import fs from 'fs';
import path from 'path';

const FILE = 'rich-templates-list.json';

export type RichTemplate = {
  id: string;
  template_name: string;
  module: string;
  subject: string;
  response: string;
  use_html: boolean;
  owner: string;
  modified: string;
  createdAt?: string;
};

function fp(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

const DEFAULT_TEMPLATES: RichTemplate[] = [
  {
    id: 'RT-DEFAULT-001',
    template_name: 'تأكيد طلب مبيعات',
    module: 'المبيعات',
    subject: 'تأكيد الطلب {{ doc.name }}',
    response: '<p>مرحباً {{ doc.customer_name }},</p><p>تم تأكيد طلبك رقم <strong>{{ doc.name }}</strong> بتاريخ {{ doc.transaction_date }}.</p><p>الإجمالي: {{ doc.grand_total }} {{ doc.currency }}</p>',
    use_html: true,
    owner: 'المسؤول',
    modified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'RT-DEFAULT-002',
    template_name: 'إشعار فاتورة شراء',
    module: 'المشتريات',
    subject: 'فاتورة شراء جديدة {{ doc.name }}',
    response: 'تم إنشاء فاتورة شراء رقم {{ doc.name }} من المورد {{ doc.supplier_name }} بقيمة {{ doc.grand_total }}.',
    use_html: false,
    owner: 'المسؤول',
    modified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'RT-DEFAULT-003',
    template_name: 'تذكير دفع',
    module: 'المحاسبة',
    subject: 'تذكير: مستحقات معلقة - {{ doc.name }}',
    response: '<p>نود تذكيركم بوجود مستحقات معلقة بمبلغ <strong>{{ doc.outstanding_amount }}</strong> على الفاتورة {{ doc.name }}.</p><p>يرجى المبادرة بالسداد.</p>',
    use_html: true,
    owner: 'المسؤول',
    modified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'RT-DEFAULT-004',
    template_name: 'قيد يومية قياسي',
    module: 'المحاسبة',
    subject: 'قيد يومية - {{ doc.name }}',
    response: 'قيد يومية رقم {{ doc.name }} بتاريخ {{ doc.posting_date }}',
    use_html: false,
    owner: 'المسؤول',
    modified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function loadRichTemplatesList(): RichTemplate[] {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as RichTemplate[];
    return Array.isArray(j) && j.length > 0 ? j : DEFAULT_TEMPLATES;
  } catch {
    return [...DEFAULT_TEMPLATES];
  }
}

export function saveRichTemplatesList(templates: RichTemplate[]): void {
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(templates, null, 2), 'utf8');
}

export function addRichTemplate(template: Omit<RichTemplate, 'id' | 'createdAt'>): RichTemplate {
  const templates = loadRichTemplatesList();
  const newTemplate: RichTemplate = {
    ...template,
    id: `RT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  saveRichTemplatesList(templates);
  return newTemplate;
}

export function updateRichTemplate(id: string, patch: Partial<RichTemplate>): RichTemplate | null {
  const templates = loadRichTemplatesList();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  templates[idx] = { ...templates[idx], ...patch, modified: new Date().toISOString() };
  saveRichTemplatesList(templates);
  return templates[idx];
}

export function deleteRichTemplate(id: string): boolean {
  const templates = loadRichTemplatesList();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  saveRichTemplatesList(filtered);
  return true;
}

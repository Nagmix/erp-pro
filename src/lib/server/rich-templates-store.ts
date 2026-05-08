import fs from 'fs';
import path from 'path';

const FILE = 'rich-templates.json';

export type RichTemplatesState = {
  /** محتوى Markdown/WYSIWYG — يُنقل لاحقاً إلى HTML لقوالب الطباعة أو الشروط */
  bodyMarkdown: string;
  updatedAt?: string;
};

const defaults: RichTemplatesState = {
  bodyMarkdown:
    '# نموذج شروط\n\n- البند الأول\n- البند الثاني\n\n```jinja\n{{ doc.name }}\n```\n',
};

function fp(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

export function loadRichTemplates(): RichTemplatesState {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as Partial<RichTemplatesState>;
    return { ...defaults, ...j, bodyMarkdown: typeof j.bodyMarkdown === 'string' ? j.bodyMarkdown : defaults.bodyMarkdown };
  } catch {
    return { ...defaults };
  }
}

export function saveRichTemplates(next: RichTemplatesState): void {
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(
    p,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
}

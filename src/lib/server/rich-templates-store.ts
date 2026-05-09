import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE = 'rich-templates.json';

const ERPNEXT_DOCTYPE = 'Custom HTML Format';
const ERPNEXT_DOC_NAME = 'Config';

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

/** Load from local JSON only (sync, for internal use) */
function loadRichTemplatesLocal(): RichTemplatesState {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as Partial<RichTemplatesState>;
    return { ...defaults, ...j, bodyMarkdown: typeof j.bodyMarkdown === 'string' ? j.bodyMarkdown : defaults.bodyMarkdown };
  } catch {
    return { ...defaults };
  }
}

async function syncToErpnext(data: RichTemplatesState, sid?: string) {
  try {
    const existing = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid).catch(() => null);
    const jsonStr = JSON.stringify(data);
    if (existing) {
      await updateDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, { config_json: jsonStr }, sid);
    } else {
      await createDoc(ERPNEXT_DOCTYPE, {
        doctype: ERPNEXT_DOCTYPE,
        name: ERPNEXT_DOC_NAME,
        __newname: ERPNEXT_DOC_NAME,
        config_json: jsonStr,
      }, sid);
    }
  } catch (err) {
    console.error('[rich-templates] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<RichTemplatesState | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const parsed = JSON.parse(doc.config_json as string) as Partial<RichTemplatesState>;
      return {
        ...defaults,
        ...parsed,
        bodyMarkdown: typeof parsed.bodyMarkdown === 'string' ? parsed.bodyMarkdown : defaults.bodyMarkdown,
      };
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadRichTemplates(sid?: string): Promise<RichTemplatesState> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadRichTemplatesLocal();
}

export function saveRichTemplates(next: RichTemplatesState, sid?: string): void {
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const data = { ...next, updatedAt: new Date().toISOString() };
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(data, sid).catch(() => {});
}

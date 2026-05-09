/**
 * مخزن قواعد توجيه الحسابات (طبقة ERP Pro).
 * المسار: data/account-routing-rules.json
 */
import fs from 'fs';
import path from 'path';
import { getDoc, updateDoc, createDoc } from './backend';

const FILE = 'account-routing-rules.json';

const ERPNEXT_DOCTYPE = 'Account Routing';
const ERPNEXT_DOC_NAME = 'Config';

export type AccountRoutingRule = {
  id: string;
  document_type: string;
  default_account: string;
  company: string;
  createdAt?: string;
  updatedAt?: string;
};

function fp(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE);
}

/** Load from local JSON only (sync, for internal use) */
function loadAccountRoutingRulesLocal(): AccountRoutingRule[] {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as AccountRoutingRule[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function syncToErpnext(data: AccountRoutingRule[], sid?: string) {
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
    console.error('[account-routing] ERPNext sync failed:', (err as Error).message);
  }
}

async function loadFromErpnext(sid?: string): Promise<AccountRoutingRule[] | null> {
  try {
    const doc = await getDoc(ERPNEXT_DOCTYPE, ERPNEXT_DOC_NAME, sid) as Record<string, unknown> | null;
    if (doc?.config_json) {
      const parsed = JSON.parse(doc.config_json as string) as AccountRoutingRule[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Not found or error — fall back to local
  }
  return null;
}

export async function loadAccountRoutingRules(sid?: string): Promise<AccountRoutingRule[]> {
  // Try ERPNext first, fall back to local
  const erpData = await loadFromErpnext(sid);
  if (erpData) return erpData;
  return loadAccountRoutingRulesLocal();
}

export function saveAccountRoutingRules(rules: AccountRoutingRule[], sid?: string): void {
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rules, null, 2), 'utf8');
  // Non-blocking ERPNext sync
  syncToErpnext(rules, sid).catch(() => {});
}

export async function addAccountRoutingRule(rule: Omit<AccountRoutingRule, 'id' | 'createdAt' | 'updatedAt'>, sid?: string): Promise<AccountRoutingRule> {
  const rules = loadAccountRoutingRulesLocal();
  const newRule: AccountRoutingRule = {
    ...rule,
    id: `AR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rules.push(newRule);
  saveAccountRoutingRules(rules, sid);
  return newRule;
}

export function updateAccountRoutingRule(id: string, patch: Partial<AccountRoutingRule>, sid?: string): AccountRoutingRule | null {
  const rules = loadAccountRoutingRulesLocal();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...patch, updatedAt: new Date().toISOString() };
  saveAccountRoutingRules(rules, sid);
  return rules[idx];
}

export function deleteAccountRoutingRule(id: string, sid?: string): boolean {
  const rules = loadAccountRoutingRulesLocal();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  saveAccountRoutingRules(filtered, sid);
  return true;
}

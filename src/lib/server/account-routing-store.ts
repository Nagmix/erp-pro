/**
 * مخزن قواعد توجيه الحسابات (طبقة ERP Pro).
 * المسار: data/account-routing-rules.json
 */
import fs from 'fs';
import path from 'path';

const FILE = 'account-routing-rules.json';

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

export function loadAccountRoutingRules(): AccountRoutingRule[] {
  try {
    const raw = fs.readFileSync(fp(), 'utf8');
    const j = JSON.parse(raw) as AccountRoutingRule[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function saveAccountRoutingRules(rules: AccountRoutingRule[]): void {
  const p = fp();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rules, null, 2), 'utf8');
}

export function addAccountRoutingRule(rule: Omit<AccountRoutingRule, 'id' | 'createdAt' | 'updatedAt'>): AccountRoutingRule {
  const rules = loadAccountRoutingRules();
  const newRule: AccountRoutingRule = {
    ...rule,
    id: `AR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rules.push(newRule);
  saveAccountRoutingRules(rules);
  return newRule;
}

export function updateAccountRoutingRule(id: string, patch: Partial<AccountRoutingRule>): AccountRoutingRule | null {
  const rules = loadAccountRoutingRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...patch, updatedAt: new Date().toISOString() };
  saveAccountRoutingRules(rules);
  return rules[idx];
}

export function deleteAccountRoutingRule(id: string): boolean {
  const rules = loadAccountRoutingRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  saveAccountRoutingRules(filtered);
  return true;
}

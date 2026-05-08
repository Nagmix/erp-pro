/**
 * Optional local overrides for Frappe/ERPNext connection (host + API token).
 * Env vars take precedence; file fills gaps for dev / first-run without Docker.
 * File path: <project>/data/frappe-backend.json (gitignored).
 */
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'frappe-backend.json';

type FileShape = {
  backendHost?: string;
  apiKey?: string;
  apiSecret?: string;
  /** ERPNext major version string, e.g. 'v15' or 'v16'. Saved to file for session persistence. */
  backendVersion?: string;
  /** Admin credentials for system session — stored locally, never in process.env */
  adminUser?: string;
  adminPassword?: string;
  updatedAt?: string;
};

let cache: { mtime: number; data: FileShape } | null = null;

function filePath(): string {
  const dir = process.env.ERP_PRO_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dir, FILE_NAME);
}

function readFile(): FileShape {
  const fp = filePath();
  try {
    const st = fs.statSync(fp);
    if (cache && cache.mtime === st.mtimeMs) return cache.data;
    const raw = fs.readFileSync(fp, 'utf8');
    const data = JSON.parse(raw) as FileShape;
    cache = { mtime: st.mtimeMs, data };
    return data;
  } catch {
    return {};
  }
}

export function clearFrappeConnectionCache(): void {
  cache = null;
}

export function getResolvedBackendHost(): string {
  const fromEnv = process.env.BACKEND_HOST?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromFile = readFile().backendHost?.trim();
  if (fromFile) return fromFile.replace(/\/$/, '');
  return 'http://localhost:8000';
}

export function getFrappeApiTokenPair(): { key: string; secret: string } | null {
  const k =
    process.env.BACKEND_API_KEY?.trim() ||
    process.env.FRAPPE_API_KEY?.trim() ||
    readFile().apiKey?.trim();
  const s =
    process.env.BACKEND_API_SECRET?.trim() ||
    process.env.FRAPPE_API_SECRET?.trim() ||
    readFile().apiSecret?.trim();
  if (k && s) return { key: k, secret: s };
  return null;
}

export function usesFrappeTokenAuth(): boolean {
  return getFrappeApiTokenPair() !== null;
}

/**
 * Get the configured ERPNext version ('v15', 'v16', etc.).
 *
 * Priority:
 *   1. BACKEND_VERSION env var
 *   2. backendVersion field in data/frappe-backend.json
 *   3. Default: 'v16' (since the project now targets v16)
 *
 * This value is used by backend.ts and pos-service.ts to select the
 * correct API method paths and parameter names for each version.
 */
export function getBackendVersion(): string {
  const fromEnv = process.env.BACKEND_VERSION?.trim();
  if (fromEnv) return fromEnv.startsWith('v') ? fromEnv : `v${fromEnv}`;
  const fromFile = readFile().backendVersion?.trim();
  if (fromFile) return fromFile.startsWith('v') ? fromFile : `v${fromFile}`;
  return 'v16';
}

/** Check if the backend is running ERPNext v16 or later. */
export function isBackendV16OrLater(): boolean {
  const ver = getBackendVersion();
  const num = parseInt(ver.replace('v', ''), 10);
  return !isNaN(num) && num >= 16;
}

export function loadFrappeConnectionFile(): FileShape {
  return { ...readFile() };
}

export function saveFrappeConnectionFile(partial: {
  backendHost?: string;
  apiKey?: string;
  apiSecret?: string;
  backendVersion?: string;
  adminUser?: string;
  adminPassword?: string;
}): void {
  const fp = filePath();
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  const prev = readFile();
  const next: FileShape = {
    ...prev,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
  clearFrappeConnectionCache();
}

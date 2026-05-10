import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  type ApiKeyScope,
  loadDeveloperPortalStoreResolved,
  saveDeveloperPortalStore,
} from '@/lib/server/developer-portal-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


function generateToken() {
  return `erp_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export async function GET() {
  const { apiKeys } = await loadDeveloperPortalStoreResolved();
  return NextResponse.json({ success: true, data: apiKeys });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { label?: string; scopes?: ApiKeyScope[] };
  const validScopes: ApiKeyScope[] = ['read', 'write', 'reports', 'webhooks', 'admin'];
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is ApiKeyScope => validScopes.includes(s))
    : [];
  const store = await loadDeveloperPortalStoreResolved();
  const row = {
    id: `key_${randomUUID()}`,
    label: body.label?.trim() || 'Default API Key',
    key: generateToken(),
    scopes: scopes.length > 0 ? scopes : (['read'] as ApiKeyScope[]),
    createdAt: new Date().toISOString(),
  };
  store.apiKeys.unshift(row);
  saveDeveloperPortalStore(store);
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  const store = await loadDeveloperPortalStoreResolved();
  const row = store.apiKeys.find((k) => k.id === id);
  if (!row) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
  row.revokedAt = new Date().toISOString();
  saveDeveloperPortalStore(store);
  return NextResponse.json({ success: true, data: row });
}

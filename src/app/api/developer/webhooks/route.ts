import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  type DeliveryRow,
  loadDeveloperPortalStoreResolved,
  saveDeveloperPortalStore,
} from '@/lib/server/developer-portal-store';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';


async function deliverWebhook(row: DeliveryRow, hookUrl: string) {
  const maxAttempts = 3;
  while (row.attempts < maxAttempts) {
    row.attempts += 1;
    try {
      const res = await fetch(hookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: row.event, payload: row.payload, delivery_id: row.id }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      row.status = 'delivered';
      row.deliveredAt = new Date().toISOString();
      row.nextRetryAt = undefined;
      row.lastError = undefined;
      return;
    } catch (error) {
      row.status = 'failed';
      row.lastError = (error as Error).message;
      if (row.attempts < maxAttempts) {
        const retryMs = row.attempts * 2000;
        row.nextRetryAt = new Date(Date.now() + retryMs).toISOString();
        await new Promise((resolve) => setTimeout(resolve, retryMs));
      }
    }
  }
}

export async function GET() {
  const store = await loadDeveloperPortalStoreResolved();
  return NextResponse.json({
    success: true,
    data: { hooks: store.webhooks, deliveries: store.deliveries },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { event?: string; url?: string };
  if (!body.event || !body.url) {
    return NextResponse.json({ success: false, error: 'event and url required' }, { status: 400 });
  }
  const store = await loadDeveloperPortalStoreResolved();
  const row = {
    id: `wh_${randomUUID()}`,
    event: body.event,
    url: body.url,
    createdAt: new Date().toISOString(),
  };
  store.webhooks.unshift(row);
  saveDeveloperPortalStore(store);
  return NextResponse.json({ success: true, data: row });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { event?: string; payload?: unknown };
  if (!body.event) return NextResponse.json({ success: false, error: 'event required' }, { status: 400 });

  const store = await loadDeveloperPortalStoreResolved();
  const hooks = store.webhooks.filter((h) => h.event === body.event);
  if (hooks.length === 0) {
    return NextResponse.json({ success: false, error: 'no hooks for event' }, { status: 404 });
  }

  const created: DeliveryRow[] = hooks.map((hook, idx) => ({
    id: `del_${randomUUID()}_${idx}`,
    webhookId: hook.id,
    event: body.event as string,
    payload: body.payload ?? {},
    status: 'queued' as const,
    attempts: 0,
  }));
  store.deliveries.unshift(...created);
  saveDeveloperPortalStore(store);

  await Promise.all(created.map((row, idx) => deliverWebhook(row, hooks[idx]!.url)));
  saveDeveloperPortalStore(store);
  return NextResponse.json({ success: true, data: created });
}

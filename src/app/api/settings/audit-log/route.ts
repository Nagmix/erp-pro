import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

// Prevent static analysis during build — this route needs a live database
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await prisma.appAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 150,
      select: { id: true, action: true, subject: true, payload: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}

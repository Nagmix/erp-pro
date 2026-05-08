import { NextRequest, NextResponse } from 'next/server';
import { loadRichTemplates, saveRichTemplates, type RichTemplatesState } from '@/lib/server/rich-templates-store';

export async function GET() {
  return NextResponse.json({ success: true, data: loadRichTemplates() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<RichTemplatesState>;
  const prev = loadRichTemplates();
  const next: RichTemplatesState = {
    bodyMarkdown: typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown : prev.bodyMarkdown,
  };
  saveRichTemplates(next);
  return NextResponse.json({ success: true, data: next });
}

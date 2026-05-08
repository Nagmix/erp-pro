import { NextRequest, NextResponse } from 'next/server';
import {
  loadRichTemplatesList,
  addRichTemplate,
  updateRichTemplate,
  deleteRichTemplate,
  type RichTemplate,
} from '@/lib/server/rich-templates-list-store';

export async function GET() {
  const templates = loadRichTemplatesList();
  return NextResponse.json({ success: true, data: templates });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<RichTemplate> & { _action?: string };
  const action = body._action;

  if (action === 'delete') {
    if (!body.id) return NextResponse.json({ success: false, error: 'معرف القالب مطلوب' }, { status: 400 });
    const ok = deleteRichTemplate(body.id);
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, error: 'القالب غير موجود' }, { status: 404 });
  }

  if (action === 'update') {
    if (!body.id) return NextResponse.json({ success: false, error: 'معرف القالب مطلوب' }, { status: 400 });
    const result = updateRichTemplate(body.id, {
      template_name: body.template_name,
      module: body.module,
      subject: body.subject,
      response: body.response,
      use_html: body.use_html,
    });
    return result
      ? NextResponse.json({ success: true, data: result })
      : NextResponse.json({ success: false, error: 'القالب غير موجود' }, { status: 404 });
  }

  // Create
  if (!body.template_name) {
    return NextResponse.json({ success: false, error: 'اسم القالب مطلوب' }, { status: 400 });
  }
  const template = addRichTemplate({
    template_name: body.template_name,
    module: body.module || 'عام',
    subject: body.subject || '',
    response: body.response || '',
    use_html: body.use_html ?? false,
    owner: body.owner || 'المسؤول',
    modified: new Date().toISOString(),
  });
  return NextResponse.json({ success: true, data: template }, { status: 201 });
}

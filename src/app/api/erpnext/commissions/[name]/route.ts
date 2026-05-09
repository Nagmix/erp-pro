import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc, deleteDoc } from '@/lib/server/backend';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const sp = new URL(_req.url).searchParams;
    const doctype = sp.get('doctype') || 'Sales Commission Rule';
    const data = await getDoc(doctype, name);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const body = await req.json();
    const doctype = body._doctype || 'Sales Commission Rule';
    delete body._doctype;
    const data = await updateDoc(doctype, name, body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const sp = new URL(_req.url).searchParams;
    const doctype = sp.get('doctype') || 'Sales Commission Rule';
    await deleteDoc(doctype, name);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

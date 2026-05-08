import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { reportName: string; format: 'csv' | 'excel' | 'pdf' };
  // Config-ready endpoint: actual export pipeline can be attached later.
  return NextResponse.json({
    success: true,
    data: {
      url: `/reports?export=${encodeURIComponent(body.reportName)}&format=${body.format}`,
    },
  });
}

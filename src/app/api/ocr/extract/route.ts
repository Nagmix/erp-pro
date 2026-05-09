import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// ── Types ──
type OcrFieldResult = {
  value: string;
  confidence: 'high' | 'medium' | 'low';
};

type OcrExtractionResult = {
  amount: OcrFieldResult;
  currency: OcrFieldResult;
  vendor_name: OcrFieldResult;
  date: OcrFieldResult;
  description: OcrFieldResult;
  tax_amount: OcrFieldResult;
  raw_text: string;
};

/**
 * POST /api/ocr/extract
 * Body: { file_url: string }
 *
 * Uses z-ai-web-dev-sdk VLM to analyze a receipt image and extract structured data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file_url } = body as { file_url?: string };

    if (!file_url || typeof file_url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'يرجى توفير رابط الملف (file_url)' },
        { status: 400 }
      );
    }

    // Initialize the VLM SDK
    const zai = await ZAI.create();

    const systemPrompt = `You are an expert OCR assistant specialized in extracting data from receipts and invoices.
Your task is to analyze the receipt image and extract the following fields as a JSON object:
- amount: The total amount on the receipt (numeric string, no currency symbol)
- currency: The currency code (e.g., YER, USD, SAR, EUR). Default to YER if not found.
- vendor_name: The name of the vendor/store/business
- date: The date on the receipt in YYYY-MM-DD format. If only day/month shown, assume current year.
- description: A brief description of what was purchased (summarize line items if visible)
- tax_amount: The tax amount shown on the receipt (numeric string, "0" if not found)

For each field, also provide a confidence level:
- "high" if the value is clearly visible and unambiguous
- "medium" if the value is partially visible or could be interpreted differently
- "low" if the value is barely visible or estimated

Return ONLY a valid JSON object in this exact format:
{
  "amount": { "value": "150.00", "confidence": "high" },
  "currency": { "value": "YER", "confidence": "medium" },
  "vendor_name": { "value": "Store Name", "confidence": "high" },
  "date": { "value": "2025-01-15", "confidence": "high" },
  "description": { "value": "Office supplies", "confidence": "medium" },
  "tax_amount": { "value": "15.00", "confidence": "low" }
}

If a field cannot be extracted at all, use an empty string for value and "low" for confidence.
Do NOT include any text outside the JSON object.`;

    const userPrompt = `Analyze this receipt image and extract all the requested fields. Return the data as structured JSON with confidence levels for each field.`;

    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: file_url } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawContent = response.choices?.[0]?.message?.content || '';

    // Parse the VLM response — it should be JSON
    let extracted: Record<string, OcrFieldResult> | null = null;
    try {
      // Try to find JSON in the response (may be wrapped in markdown code blocks)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]!);
      }
    } catch {
      // If parsing fails, we'll build a fallback
    }

    // Build the result with defaults for any missing fields
    const defaultField: OcrFieldResult = { value: '', confidence: 'low' };
    const result: OcrExtractionResult = {
      amount: extracted?.amount || { ...defaultField },
      currency: extracted?.currency || { value: 'YER', confidence: 'low' },
      vendor_name: extracted?.vendor_name || { ...defaultField },
      date: extracted?.date || { ...defaultField },
      description: extracted?.description || { ...defaultField },
      tax_amount: extracted?.tax_amount || { ...defaultField },
      raw_text: rawContent,
    };

    // Validate confidence values
    for (const key of ['amount', 'currency', 'vendor_name', 'date', 'description', 'tax_amount'] as const) {
      const field = result[key];
      if (field.confidence !== 'high' && field.confidence !== 'medium' && field.confidence !== 'low') {
        field.confidence = 'low';
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[OCR Extract Error]', error);
    const message = error instanceof Error ? error.message : 'فشل تحليل الإيصال';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

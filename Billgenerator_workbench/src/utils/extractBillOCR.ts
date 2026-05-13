const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

export interface ExtractedItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ExtractedBillData {
  vendorName?: string;
  vendorGstin?: string;
  invoiceNo?: string;
  invoiceDate?: string;   // YYYY-MM-DD
  items?: ExtractedItem[];
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  totalAmount?: number;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const compressImage = (file: File, maxWidth = 1400): Promise<File> =>
  new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', 0.88);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });

const PROMPT = `This document is a purchase bill, tax invoice, or vendor account statement.
Extract all available fields and return ONLY a valid JSON object — no markdown, no explanation:
{
  "vendorName": "seller / company name as printed",
  "vendorGstin": "seller GSTIN if present (15 chars), else null",
  "invoiceNo": "invoice number, receipt number, or vch no as string, else null",
  "invoiceDate": "most recent date in YYYY-MM-DD format, else null",
  "items": [
    {
      "description": "product name / description",
      "hsnCode": "HSN or SAC code if present, else empty string",
      "quantity": quantity as number,
      "rate": price per unit as number,
      "amount": line total as number (quantity × rate, before GST)
    }
  ],
  "cgstRate": CGST percentage as number if present, else null,
  "cgstAmount": total CGST rupee amount as number if present, else null,
  "sgstRate": SGST percentage as number if present, else null,
  "sgstAmount": total SGST rupee amount as number if present, else null,
  "totalAmount": grand total or outstanding balance as number
}
Rules:
- For tax invoices: extract ALL line items with HSN codes and GST breakdowns.
- For ledger/account statements: items array can be empty; use the closing balance or debit amount as totalAmount; use any reference/receipt number as invoiceNo.
- Use null for fields that cannot be found. Numbers must be plain numbers, not strings.`;

export const extractBillData = async (imageFile: File): Promise<ExtractedBillData> => {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (!apiKey) throw new Error('GEMINI_KEY_MISSING');

  const isPdf = imageFile.type === 'application/pdf' || imageFile.name.toLowerCase().endsWith('.pdf');
  const compressed = (!isPdf && imageFile.size > 800_000) ? await compressImage(imageFile) : imageFile;
  const base64 = await toBase64(compressed);
  const mime = isPdf ? 'application/pdf' : (compressed.type.startsWith('image/') ? compressed.type : 'image/jpeg');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: PROMPT },
      ]}],
      generationConfig: { temperature: 0.05, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }

  const json = await res.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  const p: Record<string, unknown> = JSON.parse(cleaned);

  const num = (v: unknown) =>
    typeof v === 'number' && isFinite(v) ? v
    : typeof v === 'string' && v !== '' && isFinite(parseFloat(v)) ? parseFloat(v)
    : undefined;
  const str = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined);

  const rawItems = Array.isArray(p.items) ? p.items : [];
  const items: ExtractedItem[] = rawItems
    .map((it: unknown) => {
      if (typeof it !== 'object' || it === null) return null;
      const o = it as Record<string, unknown>;
      return {
        description: str(o.description) ?? '',
        hsnCode:     str(o.hsnCode)     ?? '',
        quantity:    num(o.quantity)    ?? 1,
        rate:        num(o.rate)        ?? 0,
        amount:      num(o.amount)      ?? 0,
      };
    })
    .filter((it): it is ExtractedItem => it !== null && (it.description !== '' || it.amount > 0));

  return {
    vendorName:  str(p.vendorName),
    vendorGstin: str(p.vendorGstin),
    invoiceNo:   str(p.invoiceNo),
    invoiceDate: str(p.invoiceDate),
    items:       items.length > 0 ? items : undefined,
    cgstRate:    num(p.cgstRate),
    cgstAmount:  num(p.cgstAmount),
    sgstRate:    num(p.sgstRate),
    sgstAmount:  num(p.sgstAmount),
    totalAmount: num(p.totalAmount),
  };
};

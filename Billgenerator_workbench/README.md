# MANIKKAM & CO — GST Billing & Audit System

A complete mobile-first billing, invoice and auditor management app for **MANIKKAM & CO** home appliances shop, Chennai.

---

## Features

| Module | Description |
|---|---|
| Login | Admin + Staff roles, demo login (no setup needed) |
| Dashboard | Today's sales, monthly stats, GST collected, quick actions |
| Generate Invoice | Full GST invoice with PDF download + WhatsApp send |
| Upload Purchase Bill | Camera / gallery upload, auto-named files |
| Upload Manual Bill | Old / handwritten bills with image attach |
| Missing Bills | Monthly calendar view, No Sales marking |
| Auditor Report | Excel exports, email preview, send to auditor |
| Reports | Search bills, monthly summary, PDF download |
| Customers | Master with purchase history |
| Products | Master with auto HSN/GST fill |
| HSN Master | Admin-managed, 20+ seeded codes |

---

## Tech Stack

- **React 18 + TypeScript** (Vite)
- **Tailwind CSS v3** — mobile-first, custom design tokens
- **Zustand** — local state with localStorage persistence
- **Supabase** — auth + PostgreSQL (optional for cloud sync)
- **jsPDF + jspdf-autotable** — PDF invoice (A4, GST format)
- **ExcelJS** — Excel report exports
- **React Hot Toast** — toast notifications
- **React Router v6** — routing

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Demo Logins (no backend needed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@manikkam.co | admin123 |
| Staff | staff@manikkam.co | staff123 |

All data is stored in browser localStorage (Zustand persist). Works fully offline without any backend configuration.

---

## Production Setup

### 1. Supabase (Cloud Database)

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Run `supabase/seed.sql` for initial HSN codes
4. Create Auth users for admin and staff
5. Copy `.env.example` to `.env` and fill credentials

### 2. Google Drive

Create a Supabase Edge Function `drive-upload` that accepts file upload and uses the Google Drive API. Store OAuth credentials as Supabase secrets (never in frontend).

### 3. Email (Auditor Reports)

Create a Supabase Edge Function `send-email` using SendGrid or Gmail API.

---

## Folder Structure

```
src/
├── components/layout/   AppLayout, bottom nav, drawer
├── components/ui/       Button, Input, Select, Modal, Card
├── context/             AuthContext
├── data/                HSN codes, seed products
├── lib/                 supabase, pdfGenerator, excelExport, whatsapp, googleDrive
├── pages/               All 11 pages
├── store/               appStore.ts (Zustand)
├── types/               TypeScript types
└── utils/               formatters, validators, billNumber
supabase/
├── migrations/001_initial_schema.sql
└── seed.sql
```

---

## Invoice Format (A4 PDF)

- Orange header: MANIKKAM & CO, GSTIN, address, phone
- Cash/Credit Bill + Tax Invoice label
- Customer details + Bill number + Date
- Item table: S.No, Description, HSN, Qty, Rate, Taxable, GST%, SGST, CGST, Total
- Totals: Taxable + SGST + CGST + **Grand Total** (highlighted)
- Amount in words
- Customer + Authorized Signatory
- Footer: *Goods once sold cannot be taken back. Service warranty given by manufacturer.*

---

## Bill Numbering

Format: `MC/YYYY-YY/NNNN` — e.g. `MC/2026-27/0001`

Bills are sequential and never reused. Cancelled bills remain with "Cancelled" status.

---

## Google Drive Folder Structure

```
Manikkam & Co / 2026 / January /
  Purchase Bills /
  Customer Bills /
    Original Generated Bills /
    Uploaded Manual Bills /
    Backdated Actual Sale Bills /
    No Sales Declarations /
  Auditor Reports /
```

---

## Shop Details

- **Shop:** MANIKKAM & CO
- **GSTIN:** 33AOAPL9789B1ZU
- **Address:** No.3/104, G.N.T Road, Karanodai, Chennai - 67
- **Phone:** 9498411373 / 9840456373

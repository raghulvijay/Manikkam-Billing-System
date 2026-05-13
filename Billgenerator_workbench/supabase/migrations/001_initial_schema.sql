-- ============================================================
-- MANIKKAM & CO — Billing System — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  mobile      TEXT NOT NULL UNIQUE,
  address     TEXT,
  gstin       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HSN MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hsn_master (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hsn_code        TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  gst_percentage  NUMERIC(5,2) NOT NULL,
  category        TEXT NOT NULL,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  brand           TEXT NOT NULL,
  hsn_id          UUID REFERENCES public.hsn_master(id),
  default_price   NUMERIC(12,2),
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMER BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_bills (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number        TEXT NOT NULL UNIQUE,
  bill_date          DATE NOT NULL,
  customer_id        UUID REFERENCES public.customers(id),
  customer_name      TEXT NOT NULL,
  customer_mobile    TEXT NOT NULL,
  customer_address   TEXT,
  customer_gstin     TEXT,
  payment_type       TEXT NOT NULL CHECK (payment_type IN ('Cash', 'Credit', 'UPI', 'Bank Transfer')),
  bill_type          TEXT NOT NULL CHECK (bill_type IN ('generated', 'manual', 'backdated')) DEFAULT 'generated',
  status             TEXT NOT NULL CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
  taxable_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sgst         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cgst         NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_in_words    TEXT,
  drive_file_id      TEXT,
  drive_url          TEXT,
  created_by         UUID REFERENCES public.users(id),
  cancelled_by       UUID REFERENCES public.users(id),
  cancel_reason      TEXT,
  backdated_reason   TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES public.customer_bills(id) ON DELETE CASCADE,
  sno              INTEGER NOT NULL,
  category         TEXT NOT NULL,
  brand            TEXT NOT NULL,
  description      TEXT NOT NULL,
  hsn_code         TEXT NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL,
  rate             NUMERIC(12,2) NOT NULL,
  gst_percentage   NUMERIC(5,2) NOT NULL,
  taxable_amount   NUMERIC(12,2) NOT NULL,
  sgst_amount      NUMERIC(12,2) NOT NULL,
  cgst_amount      NUMERIC(12,2) NOT NULL,
  line_total       NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PURCHASE BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_date      DATE NOT NULL,
  vendor_name      TEXT,
  notes            TEXT,
  file_names       TEXT[] DEFAULT '{}',
  drive_file_ids   TEXT[] DEFAULT '{}',
  drive_urls       TEXT[] DEFAULT '{}',
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVE FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drive_files (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  drive_file_id    TEXT NOT NULL,
  drive_url        TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  folder_path      TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NO SALES DAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.no_sales_days (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL UNIQUE,
  declared_by  UUID REFERENCES public.users(id),
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDITOR SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auditor_submissions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year                   INTEGER NOT NULL,
  month                  INTEGER NOT NULL,
  auditor_email          TEXT NOT NULL,
  cc_email               TEXT,
  email_subject          TEXT NOT NULL,
  email_body             TEXT NOT NULL,
  total_customer_bills   INTEGER DEFAULT 0,
  total_purchase_bills   INTEGER DEFAULT 0,
  total_sales_amount     NUMERIC(14,2) DEFAULT 0,
  total_sgst             NUMERIC(14,2) DEFAULT 0,
  total_cgst             NUMERIC(14,2) DEFAULT 0,
  grand_total            NUMERIC(14,2) DEFAULT 0,
  missing_dates          TEXT[] DEFAULT '{}',
  no_sales_dates         TEXT[] DEFAULT '{}',
  sent_by                UUID REFERENCES public.users(id),
  sent_at                TIMESTAMPTZ DEFAULT NOW(),
  drive_folder_id        TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  performed_by  UUID REFERENCES public.users(id),
  details       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_bills_date     ON public.customer_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_customer_bills_mobile   ON public.customer_bills(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_customer_bills_status   ON public.customer_bills(status);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_date     ON public.purchase_bills(upload_date);
CREATE INDEX IF NOT EXISTS idx_no_sales_date           ON public.no_sales_days(date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice   ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile        ON public.customers(mobile);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsn_master           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_sales_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all data
CREATE POLICY "Auth users can read" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read hsn" ON public.hsn_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read bills" ON public.customer_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert bills" ON public.customer_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update bills" ON public.customer_bills FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth read items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read purchase" ON public.purchase_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert purchase" ON public.purchase_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read no_sales" ON public.no_sales_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert no_sales" ON public.no_sales_days FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete no_sales" ON public.no_sales_days FOR DELETE TO authenticated USING (true);
CREATE POLICY "Auth insert logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Using demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      users: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      customers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      products: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      hsn_master: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      customer_bills: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      invoice_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      purchase_bills: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      drive_files: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      auditor_submissions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      no_sales_days: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      audit_logs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
};

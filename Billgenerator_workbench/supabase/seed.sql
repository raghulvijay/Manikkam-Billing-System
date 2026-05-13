-- ============================================================
-- MANIKKAM & CO — Seed Data
-- ============================================================

-- HSN Master
INSERT INTO public.hsn_master (hsn_code, description, gst_percentage, category) VALUES
  ('85287200', 'LED Television Sets', 18, 'TV'),
  ('84151010', 'Split Air Conditioner', 28, 'AC'),
  ('84182100', 'Refrigerator (household)', 18, 'Fridge'),
  ('84501100', 'Fully Automatic Washing Machine', 18, 'Washing Machine'),
  ('85094000', 'Mixer Grinder / Food Processor', 12, 'Mixer'),
  ('84156010', 'Air Cooler (Desert/Room)', 12, 'Air Cooler'),
  ('85161000', 'Electric Instant Water Heater', 28, 'Water Heater'),
  ('94031000', 'Wooden Office Furniture', 12, 'Office Table'),
  ('94033000', 'Wooden Furniture (Cot)', 12, 'Wooden Cot'),
  ('94016100', 'Sofa with Wood Frame', 18, 'Sofa')
ON CONFLICT (hsn_code) DO NOTHING;

-- Admin user (password: admin123 — set through Supabase Auth)
-- INSERT INTO public.users (id, email, name, role) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@manikkam.co', 'Admin', 'admin'),
--   ('00000000-0000-0000-0000-000000000002', 'staff@manikkam.co', 'Staff', 'staff');

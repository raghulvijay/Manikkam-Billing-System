import { hsnMaster } from '../data/hsnMaster';
import type { HsnEntry } from '../types';

const HSN_KEY = 'mc-hsn-master-v2';

// Always reads from localStorage first (user-edited list), falls back to bundled defaults
const getEntries = (): HsnEntry[] => {
  try {
    const raw = localStorage.getItem(HSN_KEY);
    if (raw) return JSON.parse(raw) as HsnEntry[];
  } catch { /* ignore */ }
  return hsnMaster;
};

export const lookupByCategory = (cat: string): HsnEntry | undefined => {
  if (!cat) return undefined;
  const lower = cat.toLowerCase().trim();
  return getEntries().find(e => e.category.toLowerCase() === lower);
};

export const lookupByKeyword = (text: string): HsnEntry | undefined => {
  if (!text) return undefined;
  const lower = text.toLowerCase().trim();
  const entries = getEntries();
  // Exact category match first
  const exact = entries.find(e => e.category.toLowerCase() === lower);
  if (exact) return exact;
  // Keyword match
  return entries.find(e =>
    e.keywords.some(k => lower.includes(k) || k.includes(lower))
  );
};

export const getHsnForCategory = (category: string): { hsn: string; gst: number } => {
  const entry = lookupByKeyword(category);
  return entry ? { hsn: entry.hsn, gst: entry.gst } : { hsn: '', gst: 18 };
};

// All categories for the dropdown in invoice form (from user-editable list)
export const getAllCategories = (): string[] =>
  getEntries().map(e => e.category);

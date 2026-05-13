import type { ProductEntry } from '../types';

const CACHE_KEY = 'mc-product-master-v1';

export const SAMPLE_ENTRIES: ProductEntry[] = [
  { category: 'TV',               brand: 'BPL',       productName: 'BPL LED TV',                  hsn: '85287218', gstPercent: 18, isActive: true },
  { category: 'Washing Machine',  brand: 'Whirlpool', productName: 'Whirlpool Washing Machine',   hsn: '84501100', gstPercent: 18, isActive: true },
  { category: 'AC',               brand: 'Voltas',    productName: 'Voltas 1.5 Ton AC',           hsn: '84151010', gstPercent: 18, isActive: true },
  { category: 'AC',               brand: 'AKAI',      productName: 'AKAI 1.5 Ton AC',             hsn: '84151010', gstPercent: 18, isActive: true },
  { category: 'Mixer',            brand: 'Crompton',  productName: 'Crompton Mixer Grinder',      hsn: '85094010', gstPercent: 18, isActive: true },
  { category: 'Air Cooler',       brand: 'Bajaj',     productName: 'Bajaj Air Cooler',            hsn: '84796000', gstPercent: 18, isActive: true },
  { category: 'Wooden Furniture', brand: 'Local',     productName: 'Wooden Cot',                  hsn: '94036000', gstPercent: 18, isActive: true },
  { category: 'Office Furniture', brand: 'Local',     productName: 'Office Table',                hsn: '94033010', gstPercent: 18, isActive: true },
];

// In-memory cache for the current session
let _mem: ProductEntry[] | null = null;

export const getCachedEntries = (): ProductEntry[] => {
  if (_mem !== null) return _mem;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      _mem = JSON.parse(raw) as ProductEntry[];
      return _mem;
    }
  } catch { /* ignore */ }
  return SAMPLE_ENTRIES;
};

export const updateCache = (entries: ProductEntry[]): void => {
  _mem = entries;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entries)); } catch { /* storage full */ }
};

export const clearProductCache = (): void => {
  _mem = null;
  localStorage.removeItem(CACHE_KEY);
};

// ── Query helpers (pass entries to avoid repeat cache reads) ──────────────

export const getCategories = (entries?: ProductEntry[]): string[] => {
  const list = entries ?? getCachedEntries();
  return [...new Set(list.filter(e => e.isActive).map(e => e.category))].sort();
};

export const getBrands = (category?: string, entries?: ProductEntry[]): string[] => {
  const list = entries ?? getCachedEntries();
  const active = list.filter(e => e.isActive && (!category || e.category === category));
  return [...new Set(active.map(e => e.brand))].sort();
};

export const getProducts = (
  category?: string,
  brand?: string,
  entries?: ProductEntry[],
): ProductEntry[] => {
  const list = entries ?? getCachedEntries();
  return list.filter(
    e => e.isActive &&
      (!category || e.category === category) &&
      (!brand    || e.brand    === brand),
  );
};

export const findProduct = (
  productName: string,
  category?: string,
  brand?: string,
): ProductEntry | undefined =>
  getCachedEntries().find(
    e => e.isActive &&
      e.productName === productName &&
      (!category || e.category === category) &&
      (!brand    || e.brand    === brand),
  );

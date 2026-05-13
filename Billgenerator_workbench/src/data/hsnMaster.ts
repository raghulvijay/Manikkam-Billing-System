import type { HsnEntry } from '../types';

export const hsnMaster: HsnEntry[] = [
  // ── Big Appliances ──
  { id: '01', category: 'TV',                              keywords: ['tv', 'television', 'led tv', 'smart tv', 'oled', 'qled'],              hsn: '85287200', gst: 28 },
  { id: '02', category: 'Refrigerator',                   keywords: ['refrigerator', 'fridge', 'single door', 'double door', 'side by side'], hsn: '84181000', gst: 18 },
  { id: '03', category: 'Fully Automatic Washing Machine', keywords: ['fully automatic', 'front load', 'top load'],                            hsn: '84501100', gst: 18 },
  { id: '04', category: 'Semi Automatic Washing Machine',  keywords: ['semi automatic', 'twin tub'],                                           hsn: '84501100', gst: 18 },
  { id: '05', category: 'AC',                              keywords: ['ac', 'air conditioner', 'split ac', 'window ac', 'inverter ac'],        hsn: '84151010', gst: 28 },
  { id: '06', category: 'Air Cooler',                      keywords: ['air cooler', 'cooler', 'desert cooler', 'tower cooler'],                hsn: '84796000', gst: 18 },

  // ── Kitchen ──
  { id: '07', category: 'Mixer',                           keywords: ['mixer', 'mixer grinder', 'juicer mixer'],                               hsn: '85094000', gst: 18 },
  { id: '08', category: 'Grinder',                         keywords: ['grinder', 'wet grinder', 'dry grinder'],                                hsn: '85094000', gst: 18 },
  { id: '09', category: 'Microwave',                       keywords: ['microwave', 'oven', 'microwave oven'],                                  hsn: '85166000', gst: 18 },
  { id: '10', category: 'Induction Stove',                 keywords: ['induction', 'induction stove', 'induction cooktop'],                    hsn: '85166000', gst: 18 },
  { id: '11', category: 'Chimney',                         keywords: ['chimney', 'kitchen chimney', 'range hood'],                             hsn: '85166000', gst: 28 },
  { id: '12', category: 'Water Purifier',                  keywords: ['water purifier', 'ro', 'ro purifier', 'uv purifier'],                   hsn: '84219100', gst: 18 },

  // ── Small Appliances ──
  { id: '13', category: 'Fan',                             keywords: ['fan', 'ceiling fan', 'table fan', 'pedestal fan', 'exhaust fan'],       hsn: '84145100', gst: 18 },
  { id: '14', category: 'Geyser',                          keywords: ['geyser', 'water heater', 'instant heater'],                             hsn: '85161000', gst: 18 },
  { id: '15', category: 'Iron Box',                        keywords: ['iron', 'iron box', 'steam iron'],                                       hsn: '85164000', gst: 18 },
  { id: '16', category: 'Stabilizer',                      keywords: ['stabilizer', 'voltage stabilizer'],                                     hsn: '85044000', gst: 18 },
  { id: '17', category: 'Set Top Box',                     keywords: ['set top box', 'stb', 'dth', 'cable box'],                               hsn: '85279200', gst: 18 },

  // ── Furniture ──
  { id: '18', category: 'Sofa',                            keywords: ['sofa', 'sofa set', 'couch', 'recliner'],                                hsn: '94016100', gst: 18 },
  { id: '19', category: 'Wooden Cot',                      keywords: ['cot', 'bed', 'wooden bed', 'wooden cot', 'double cot', 'single cot'],   hsn: '94017900', gst: 18 },
  { id: '20', category: 'Dining Table',                    keywords: ['dining table', 'dining set'],                                           hsn: '94036000', gst: 18 },
  { id: '21', category: 'Bero',                            keywords: ['bero', 'almirah', 'wardrobe', 'cupboard'],                              hsn: '94035000', gst: 18 },
  { id: '22', category: 'Wooden Items',                    keywords: ['wooden', 'wood', 'tv unit', 'bookshelf', 'shelf', 'cabinet'],           hsn: '94035000', gst: 18 },

  // ── Other Materials ──
  { id: '23', category: 'Steel Items',                     keywords: ['steel', 'steel almirah', 'steel rack', 'steel furniture'],              hsn: '94033000', gst: 18 },
  { id: '24', category: 'Plastic Items',                   keywords: ['plastic', 'plastic chair', 'plastic furniture', 'plastic rack'],        hsn: '39269099', gst: 18 },
];

export const hsnLookup = (category: string): HsnEntry | undefined => {
  if (!category) return undefined;
  const lower = category.toLowerCase().trim();
  return hsnMaster.find(e =>
    e.category.toLowerCase() === lower ||
    e.keywords.some(k => lower.includes(k) || k.includes(lower))
  );
};

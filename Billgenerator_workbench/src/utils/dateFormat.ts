export const todayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtDate = (d: string): string => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
};

export const fmtDateLong = (d: string): string => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const getMonthName = (m: number): string =>
  new Date(2000, m - 1, 1).toLocaleString('en-IN', { month: 'long' });

export const getDaysInMonth = (y: number, m: number): number =>
  new Date(y, m, 0).getDate();

export const currentYear = (): number => new Date().getFullYear();

export const currentMonth = (): number => new Date().getMonth() + 1;

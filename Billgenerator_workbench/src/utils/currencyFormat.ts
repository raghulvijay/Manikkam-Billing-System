const INR = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const fmtCurrency = (n: number): string => '₹' + INR.format(n);

export const fmtNumber = (n: number): string => NUM.format(n);

export const parseCurrency = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[₹,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

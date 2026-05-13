export const getFinancialYear = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
};

export const makeBillNumber = (seq: number): string => {
  const fy = getFinancialYear();
  const padded = String(seq).padStart(4, '0');
  return `MC/${fy}/${padded}`;
};

export const parseSequence = (billNo: string): number | null => {
  if (!billNo) return null;
  const parts = billNo.split('/');
  if (parts.length !== 3) return null;
  const seq = parseInt(parts[2], 10);
  return isNaN(seq) ? null : seq;
};

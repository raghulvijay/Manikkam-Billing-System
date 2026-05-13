export const isValidMobile = (mobile: string): boolean =>
  /^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ''));

export const isValidGSTIN = (gstin: string): boolean => {
  if (!gstin) return true; // optional
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
};

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isPositive = (val: number): boolean => val > 0;

export const isValidHSN = (hsn: string): boolean =>
  /^\d{4,8}$/.test(hsn);

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const toWords = (n: number): string => {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const rem = n % 10;
    return TENS[Math.floor(n / 10)] + (rem ? ' ' + ONES[rem] : '');
  }
  if (n < 1000) {
    const rem = n % 100;
    return ONES[Math.floor(n / 100)] + ' Hundred' + (rem ? ' ' + toWords(rem) : '');
  }
  if (n < 100000) {
    const rem = n % 1000;
    return toWords(Math.floor(n / 1000)) + ' Thousand' + (rem ? ' ' + toWords(rem) : '');
  }
  if (n < 10000000) {
    const rem = n % 100000;
    return toWords(Math.floor(n / 100000)) + ' Lakh' + (rem ? ' ' + toWords(rem) : '');
  }
  const rem = n % 10000000;
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (rem ? ' ' + toWords(rem) : '');
};

export const numberToWords = (amount: number): string => {
  if (isNaN(amount) || amount < 0) return 'Rupees Zero Only';
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const rupeePart = rupees === 0 ? 'Zero' : toWords(rupees);
  let result = `Rupees ${rupeePart}`;

  if (paise > 0) {
    result += ` and ${toWords(paise)} Paise`;
  }

  return result + ' Only';
};

// Also export as amountToWords for backward compat
export const amountToWords = numberToWords;

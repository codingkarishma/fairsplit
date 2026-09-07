export const CURRENCY_SYMBOLS = {
  INR: '₹',
  GBP: '£',
  USD: '$',
};

export const CURRENCY_CODES = ['INR', 'GBP', 'USD'];

export function formatCurrency(amountCents, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const amount = (amountCents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

export function centsToAmount(cents) {
  return cents / 100;
}

export function amountToCents(amount) {
  return Math.round(amount * 100);
}
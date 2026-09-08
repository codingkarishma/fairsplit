import { CURRENCY_CODES } from './currency';

export function validateBillForm(data) {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = 'Bill title is required';
  }

  for (const field of ['taxPercent', 'tipPercent']) {
    const value = Number(data[field]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors[field] =
        `${field === 'taxPercent' ? 'Tax' : 'Tip'} must be between 0 and 100`;
    }
  }

  if (!CURRENCY_CODES.includes(data.currency)) {
    errors.currency = 'Invalid currency';
  }

  return errors;
}

export function validateParticipantName(name) {
  if (!name?.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  return null;
}

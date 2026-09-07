import { CURRENCY_CODES } from './currency';

export function validateBillForm(data) {
  const errors = {};

  if (!data.hostName?.trim()) {
    errors.hostName = 'Host name is required';
  }

  if (data.taxAmount !== undefined && data.taxAmount < 0) {
    errors.taxAmount = 'Tax cannot be negative';
  }

  if (data.tipAmount !== undefined && data.tipAmount < 0) {
    errors.tipAmount = 'Tip cannot be negative';
  }

  if (data.currency && !CURRENCY_CODES.includes(data.currency)) {
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
export interface BankAccountInfo {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  bankCountry: string;
  bankCurrency: string;
}

export interface PayPalInfo {
  paypalEmail: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRoutingNumber = (routingNumber: string): boolean => {
  const cleaned = routingNumber.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;

  const digits = cleaned.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;

  return checksum === 0;
};

export const validateSwiftCode = (swiftCode: string): boolean => {
  const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(swiftCode.toUpperCase());
};

export const validateIBAN = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;

  if (!ibanRegex.test(cleaned)) return false;
  if (cleaned.length < 15 || cleaned.length > 34) return false;

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numericString = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  let remainder = numericString;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(9);
  }

  return parseInt(remainder, 10) % 97 === 1;
};

export const validateAccountNumber = (accountNumber: string): boolean => {
  const cleaned = accountNumber.replace(/\D/g, '');
  return cleaned.length >= 4 && cleaned.length <= 17;
};

export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber) return '';
  const cleaned = accountNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return cleaned;
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

export const getLastFourDigits = (accountNumber: string): string => {
  const cleaned = accountNumber.replace(/\D/g, '');
  return cleaned.slice(-4);
};

export const validateBankAccountInfo = (info: Partial<BankAccountInfo>): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!info.accountHolderName || info.accountHolderName.trim().length < 2) {
    errors.accountHolderName = 'Account holder name is required';
  }

  if (!info.bankName || info.bankName.trim().length < 2) {
    errors.bankName = 'Bank name is required';
  }

  if (!info.accountNumber || !validateAccountNumber(info.accountNumber)) {
    errors.accountNumber = 'Valid account number is required (4-17 digits)';
  }

  if (info.routingNumber && !validateRoutingNumber(info.routingNumber)) {
    errors.routingNumber = 'Invalid routing number (must be 9 digits)';
  }

  if (info.swiftCode && !validateSwiftCode(info.swiftCode)) {
    errors.swiftCode = 'Invalid SWIFT/BIC code (e.g., AAAABB22 or AAAABB22XXX)';
  }

  if (info.iban && !validateIBAN(info.iban)) {
    errors.iban = 'Invalid IBAN format';
  }

  if (!info.bankCountry || info.bankCountry.trim().length < 2) {
    errors.bankCountry = 'Bank country is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validatePayPalInfo = (info: Partial<PayPalInfo>): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!info.paypalEmail || !validateEmail(info.paypalEmail)) {
    errors.paypalEmail = 'Valid PayPal email address is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const formatRoutingNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 9);
};

export const formatSwiftCode = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
};

export const formatIBAN = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
};

export const countriesWithIBAN = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'NO', 'CH'
];

export const requiresSwiftCode = (country: string): boolean => {
  return !countriesWithIBAN.includes(country.toUpperCase());
};

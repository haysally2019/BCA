// Error utility functions for better debugging and user experience

const IS_DEVELOPMENT = import.meta.env.DEV;

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  context?: string;
}

export const createError = (code: string, message: string, details?: unknown, context?: string): AppError => ({
  code,
  message,
  details,
  timestamp: new Date().toISOString(),
  context,
});

export const logError = (error: AppError | Error | unknown, context?: string) => {
  if (!IS_DEVELOPMENT) {
    return;
  }

  const errorData = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
  };

  if (error instanceof Error) {
    console.error('[Error]', context || error.name, {
      ...errorData,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else if (typeof error === 'object' && error !== null) {
    console.error('[Error]', context || 'Object Error', { ...errorData, error });
  } else {
    console.error('[Error]', context || 'Unknown Error', { ...errorData, error });
  }
};

export const logWarning = (message: string, data?: unknown) => {
  if (!IS_DEVELOPMENT) {
    return;
  }
  console.warn('[Warning]', message, data);
};

export const logInfo = (message: string, data?: unknown) => {
  if (!IS_DEVELOPMENT) {
    return;
  }
  console.log('[Info]', message, data);
};

export const logDebug = (message: string, data?: unknown) => {
  if (!IS_DEVELOPMENT) {
    return;
  }
  console.log('[Debug]', message, data);
};

export const isSupabaseError = (error: unknown): error is { message: string; code?: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (isSupabaseError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { valid: true };
  }

  const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
    return { valid: false, error: 'Please enter a valid phone number (at least 10 digits)' };
  }

  return { valid: true };
};

export const validateRequired = (value: string, fieldName: string): { valid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
};
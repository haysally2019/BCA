import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (value: any, rules: ValidationRule): string | null => {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required';
  }

  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const validateForm = (data: any, schema: { [key: string]: ValidationRule }): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(schema).forEach(field => {
    const error = validateField(data[field], schema[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  options,
  rows,
  min,
  max,
  step
}) => {
  const baseClasses = "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 transition-colors";
  const errorClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500";

  const renderInput = () => {
    if (type === 'select' && options) {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className={`${baseClasses} ${errorClasses}`}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          rows={rows || 3}
          className={`${baseClasses} ${errorClasses}`}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => {
          const newValue = type === 'number' ? (e.target.value ? parseFloat(e.target.value) : '') : e.target.value;
          onChange(name, newValue);
        }}
        className={`${baseClasses} ${errorClasses}`}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {error && (
        <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Common validation schemas
export const leadValidationSchema = {
  name: { required: true, minLength: 2, maxLength: 100 },
  phone: { 
    required: true, 
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    custom: (value: string) => {
      if (value && value.length < 10) return 'Phone number must be at least 10 digits';
      return null;
    }
  },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  },
  estimated_value: {
    custom: (value: any) => {
      if (value && (isNaN(value) || value < 0)) {
        return 'Value must be a positive number';
      }
      return null;
    }
  }
};

export const dealValidationSchema = {
  title: { required: true, minLength: 3, maxLength: 200 },
  value: { 
    required: true,
    custom: (value: any) => {
      if (!value || isNaN(value) || value <= 0) {
        return 'Deal value must be a positive number';
      }
      return null;
    }
  },
  probability: {
    custom: (value: any) => {
      if (value !== undefined && value !== '' && (isNaN(value) || value < 0 || value > 100)) {
        return 'Probability must be between 0 and 100';
      }
      return null;
    }
  },
  stage_id: { required: true }
};

export const prospectValidationSchema = {
  company_name: { required: true, minLength: 2, maxLength: 200 },
  contact_name: { required: true, minLength: 2, maxLength: 100 },
  phone: { 
    required: true, 
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    custom: (value: string) => {
      if (value && value.length < 10) return 'Phone number must be at least 10 digits';
      return null;
    }
  },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  },
  deal_value: {
    custom: (value: any) => {
      if (value && (isNaN(value) || value < 0)) {
        return 'Deal value must be a positive number';
      }
      return null;
    }
  },
  probability: {
    custom: (value: any) => {
      if (value !== undefined && value !== '' && (isNaN(value) || value < 0 || value > 100)) {
        return 'Probability must be between 0 and 100';
      }
      return null;
    }
  }
};
import React from 'react';

// --- Validation Functions ---

export const validateEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value: string, min: number, fieldName: string): string | null => {
  if (!value || value.trim().length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (!phoneRegex.test(phone.trim()) || phone.replace(/[^0-9]/g, '').length < 7) {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const validateUrl = (url: string): string | null => {
  if (!url || !url.trim()) {
    return 'URL is required';
  }
  try {
    const parsed = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
    if (!parsed.hostname.includes('.')) {
      return 'Please enter a valid URL';
    }
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

// --- FormField Component ---

interface FormFieldProps {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, required = false, children }) => {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
        )}
      </label>
      <div
        style={{
          position: 'relative',
        }}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement<any>(child)) {
            const existingStyle = child.props.style || {};
            return React.cloneElement(child, {
              style: {
                ...existingStyle,
                borderColor: error ? '#dc2626' : existingStyle.borderColor || '#d1d5db',
                boxShadow: error ? '0 0 0 1px #dc2626' : existingStyle.boxShadow || 'none',
              },
            });
          }
          return child;
        })}
      </div>
      {error && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: '#dc2626',
            lineHeight: '1.4',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;

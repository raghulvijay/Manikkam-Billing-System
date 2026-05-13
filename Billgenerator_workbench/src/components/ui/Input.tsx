import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, required, hint, className = '', ...props }) => (
  <div className="w-full">
    {label && (
      <label className="mc-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      className={`mc-input ${error ? 'mc-input-error' : ''} ${className}`}
      {...props}
    />
    {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, required, className = '', ...props }) => (
  <div className="w-full">
    {label && (
      <label className="mc-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      className={`mc-input resize-none ${error ? 'mc-input-error' : ''} ${className}`}
      rows={3}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, required, options, placeholder, className = '', ...props }) => (
  <div className="w-full">
    {label && (
      <label className="mc-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      className={`mc-input appearance-none ${error ? 'mc-input-error' : ''} ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

import React from 'react';

export const Input = ({
  label,
  id,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 bg-slate-50/50 border ${
          error ? 'border-rose-450 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
        } text-slate-900 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-rose-605 font-medium">{error}</p>}
    </div>
  );
};

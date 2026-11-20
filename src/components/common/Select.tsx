import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  bilingualSub?: string;
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  bilingualSub,
  error,
  helperText,
  children,
  className,
  id,
  required,
  ...props
}, ref) => {
  const selectId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-stone-700 tracking-wide">
          <span>{label}</span>
          {bilingualSub && <span className="text-stone-400 font-normal ml-1">/ {bilingualSub}</span>}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-2xl shadow-2xs">
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full appearance-none rounded-2xl border bg-white px-4 py-2.5 pr-10 text-sm text-stone-800 transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#F37321]/30 focus:border-[#F37321]',
              error
                ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
                : 'border-[#FED7AA] hover:border-[#FB923C]',
              className
            )
          )}
          {...props}
        >
          {children}
        </select>

        {/* Custom Chevron icon */}
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-stone-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';


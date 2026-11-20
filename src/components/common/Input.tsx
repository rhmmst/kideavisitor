import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  bilingualSub?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  bilingualSub,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-stone-700 tracking-wide">
          <span>{label}</span>
          {bilingualSub && <span className="text-stone-400 font-normal ml-1">/ {bilingualSub}</span>}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-2xl shadow-2xs">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full rounded-2xl border bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#F37321]/30 focus:border-[#F37321]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error
                ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
                : 'border-[#FED7AA] hover:border-[#FB923C]',
              className
            )
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
            {rightIcon}
          </div>
        )}
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

Input.displayName = 'Input';


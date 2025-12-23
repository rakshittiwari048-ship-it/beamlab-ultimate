// @ts-nocheck
/**
 * input.tsx
 *
 * Compact Input Component for Engineering UI
 * - Height: h-8 (32px) for high-density layouts
 * - Consistent styling with Radix/Shadcn design patterns
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'error';
  /** Size variant */
  inputSize?: 'sm' | 'default' | 'lg';
  /** Optional left icon/prefix */
  prefix?: React.ReactNode;
  /** Optional right icon/suffix */
  suffix?: React.ReactNode;
}

// ============================================================================
// INPUT COMPONENT
// ============================================================================

/**
 * Compact Input component with h-8 height for engineering data density.
 * Supports prefix/suffix icons and error states.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      variant = 'default',
      inputSize = 'default',
      prefix,
      suffix,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-7 text-xs px-2',
      default: 'h-8 text-sm px-3',
      lg: 'h-10 text-sm px-4',
    };

    const variantStyles = {
      default: clsx(
        'border-zinc-200 dark:border-zinc-700',
        'bg-white dark:bg-zinc-900',
        'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
      ),
      ghost: clsx(
        'border-transparent',
        'bg-zinc-100 dark:bg-zinc-800',
        'focus:border-zinc-300 focus:ring-2 focus:ring-zinc-500/20',
        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
      ),
      error: clsx(
        'border-red-500 dark:border-red-500',
        'bg-red-50 dark:bg-red-950/20',
        'focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
        'placeholder:text-red-400 dark:placeholder:text-red-500'
      ),
    };

    // If we have prefix or suffix, wrap in a container
    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-zinc-400">
              {prefix}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={clsx(
              // Base styles
              'w-full rounded-md border font-inter',
              'transition-colors duration-150',
              'focus:outline-none',
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800',
              // Size
              sizeStyles[inputSize],
              // Variant
              variantStyles[variant],
              // Padding adjustments for prefix/suffix
              prefix && 'pl-8',
              suffix && 'pr-8',
              // Text color
              'text-zinc-900 dark:text-zinc-100',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-2.5 flex items-center pointer-events-none text-zinc-400">
              {suffix}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={clsx(
          // Base styles
          'w-full rounded-md border font-inter',
          'transition-colors duration-150',
          'focus:outline-none',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800',
          // Size
          sizeStyles[inputSize],
          // Variant
          variantStyles[variant],
          // Text color
          'text-zinc-900 dark:text-zinc-100',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// ============================================================================
// NUMERIC INPUT COMPONENT
// ============================================================================

export interface NumericInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  /** Value as number */
  value?: number;
  /** Change handler with parsed number */
  onChange?: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Unit display (e.g., "kN", "m") */
  unit?: string;
  /** Decimal precision */
  precision?: number;
}

/**
 * Numeric input specialized for engineering values with unit display.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      unit,
      precision = 3,
      className,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        let clamped = parsed;
        if (min !== undefined) clamped = Math.max(min, clamped);
        if (max !== undefined) clamped = Math.min(max, clamped);
        onChange?.(clamped);
      }
    };

    return (
      <Input
        ref={ref}
        type="number"
        value={value?.toFixed(precision)}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        suffix={unit ? <span className="text-xs text-zinc-500">{unit}</span> : undefined}
        className={clsx('font-mono text-right', className)}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'ghost' | 'error';
}

/**
 * Textarea component matching Input styling.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', disabled, ...props }, ref) => {
    const variantStyles = {
      default: clsx(
        'border-zinc-200 dark:border-zinc-700',
        'bg-white dark:bg-zinc-900',
        'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        'placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
      ),
      ghost: clsx(
        'border-transparent',
        'bg-zinc-100 dark:bg-zinc-800',
        'focus:border-zinc-300 focus:ring-2 focus:ring-zinc-500/20'
      ),
      error: clsx(
        'border-red-500 dark:border-red-500',
        'bg-red-50 dark:bg-red-950/20',
        'focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      ),
    };

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={clsx(
          // Base styles
          'w-full rounded-md border font-inter text-sm px-3 py-2',
          'transition-colors duration-150',
          'focus:outline-none',
          'min-h-[80px] resize-y',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Variant
          variantStyles[variant],
          // Text color
          'text-zinc-900 dark:text-zinc-100',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

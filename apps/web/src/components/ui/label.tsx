// @ts-nocheck
/**
 * label.tsx
 *
 * Label Component for Engineering Forms
 * - Size: text-xs (12px) for compact density
 * - Color: text-zinc-500 for subtle hierarchy
 * - Supports required indicator and descriptions
 */

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field is required */
  required?: boolean;
  /** Optional description below label */
  description?: string;
  /** Size variant */
  size?: 'xs' | 'sm';
}

// ============================================================================
// LABEL COMPONENT
// ============================================================================

/**
 * Compact Label component with text-xs size and text-zinc-500 color.
 * Designed for high-density engineering forms.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, className, required, description, size = 'xs', ...props }, ref) => {
    const sizeStyles = {
      xs: 'text-xs',
      sm: 'text-sm',
    };

    return (
      <div className="flex flex-col gap-0.5">
        <label
          ref={ref}
          className={clsx(
            'font-inter font-medium text-zinc-500 dark:text-zinc-400',
            'select-none',
            sizeStyles[size],
            className
          )}
          {...props}
        >
          {children}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {description && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {description}
          </span>
        )}
      </div>
    );
  }
);
Label.displayName = 'Label';

// ============================================================================
// FORM FIELD WRAPPER
// ============================================================================

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** HTML for attribute */
  htmlFor?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Optional description */
  description?: string;
  /** Error message */
  error?: string;
  /** Children (input component) */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Layout direction */
  layout?: 'vertical' | 'horizontal';
}

/**
 * Form Field wrapper that combines Label, Input, and error message.
 * Provides consistent spacing and layout for forms.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      htmlFor,
      required,
      description,
      error,
      children,
      className,
      layout = 'vertical',
    },
    ref
  ) => {
    if (layout === 'horizontal') {
      return (
        <div
          ref={ref}
          className={clsx(
            'grid grid-cols-[120px_1fr] gap-3 items-center',
            className
          )}
        >
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
          <div className="flex flex-col gap-1">
            {children}
            {error && (
              <span className="text-xs text-red-500 dark:text-red-400">
                {error}
              </span>
            )}
            {description && !error && (
              <span className="text-xs text-zinc-400">{description}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={clsx('flex flex-col gap-1.5', className)}>
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
        {children}
        {error && (
          <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
        )}
        {description && !error && (
          <span className="text-xs text-zinc-400">{description}</span>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

// ============================================================================
// INLINE LABEL-VALUE DISPLAY
// ============================================================================

export interface LabelValueProps {
  /** Property label */
  label: string;
  /** Property value */
  value: ReactNode;
  /** Unit suffix */
  unit?: string;
  /** Whether value is monospace */
  mono?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Inline Label-Value display for property panels.
 * Shows label on left, value on right.
 */
export const LabelValue = ({
  label,
  value,
  unit,
  mono = true,
  className,
}: LabelValueProps) => (
  <div
    className={clsx(
      'flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0',
      className
    )}
  >
    <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    <span
      className={clsx(
        'text-xs font-medium text-zinc-900 dark:text-white',
        mono && 'font-mono'
      )}
    >
      {value}
      {unit && (
        <span className="ml-1 text-zinc-400 font-normal">{unit}</span>
      )}
    </span>
  </div>
);

// @ts-nocheck
/**
 * typography.tsx
 *
 * Design System Typography Components
 * - Inter font family (configured via CSS/Tailwind)
 * - Base size: text-sm (14px) for high-density engineering UI
 * - Headers: font-semibold tracking-tight
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

interface HeadingProps extends TypographyProps {
  as?: HeadingLevel;
}

// ============================================================================
// BASE TEXT COMPONENT
// ============================================================================

/**
 * Base Text component with Inter font and text-sm (14px) default.
 * Use for body text, labels, and general content.
 */
export const Text = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx(
        'font-inter text-sm text-zinc-900 dark:text-zinc-100',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);
Text.displayName = 'Text';

/**
 * Muted text for secondary information.
 */
export const TextMuted = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx(
        'font-inter text-sm text-zinc-500 dark:text-zinc-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);
TextMuted.displayName = 'TextMuted';

/**
 * Small text for compact UI elements.
 */
export const TextSmall = forwardRef<HTMLSpanElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        'font-inter text-xs text-zinc-600 dark:text-zinc-400',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
TextSmall.displayName = 'TextSmall';

/**
 * Monospace text for code, values, and technical data.
 */
export const TextMono = forwardRef<HTMLSpanElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        'font-mono text-sm text-zinc-900 dark:text-zinc-100',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
TextMono.displayName = 'TextMono';

// ============================================================================
// HEADING COMPONENTS
// ============================================================================

/**
 * Page title - largest heading.
 * Style: font-semibold tracking-tight
 */
export const H1 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h1
      ref={ref}
      className={clsx(
        'font-inter text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
);
H1.displayName = 'H1';

/**
 * Section title.
 * Style: font-semibold tracking-tight
 */
export const H2 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h2
      ref={ref}
      className={clsx(
        'font-inter text-xl font-semibold tracking-tight text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
);
H2.displayName = 'H2';

/**
 * Subsection title.
 * Style: font-semibold tracking-tight
 */
export const H3 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx(
        'font-inter text-lg font-semibold tracking-tight text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
H3.displayName = 'H3';

/**
 * Card/Panel title.
 * Style: font-semibold tracking-tight
 */
export const H4 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h4
      ref={ref}
      className={clsx(
        'font-inter text-base font-semibold tracking-tight text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
);
H4.displayName = 'H4';

/**
 * Small section header (for sidebars, panels).
 * Style: font-semibold tracking-tight
 */
export const H5 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h5
      ref={ref}
      className={clsx(
        'font-inter text-sm font-semibold tracking-tight text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h5>
  )
);
H5.displayName = 'H5';

/**
 * Label-style header (smallest).
 * Style: font-semibold tracking-tight uppercase
 */
export const H6 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h6
      ref={ref}
      className={clsx(
        'font-inter text-xs font-semibold tracking-tight uppercase text-zinc-500 dark:text-zinc-400',
        className
      )}
      {...props}
    >
      {children}
    </h6>
  )
);
H6.displayName = 'H6';

/**
 * Dynamic Heading component that renders the appropriate level.
 */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as = 'h2', children, className, ...props }, ref) => {
    const headingStyles: Record<HeadingLevel, string> = {
      h1: 'text-2xl',
      h2: 'text-xl',
      h3: 'text-lg',
      h4: 'text-base',
      h5: 'text-sm',
      h6: 'text-xs uppercase',
    };

    const Tag = as;

    return (
      <Tag
        ref={ref}
        className={clsx(
          'font-inter font-semibold tracking-tight text-zinc-900 dark:text-white',
          headingStyles[as],
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Heading.displayName = 'Heading';

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * Section Label - used above form groups or table sections.
 */
export const SectionLabel = forwardRef<HTMLDivElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'font-inter text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
SectionLabel.displayName = 'SectionLabel';

/**
 * Value display for property panels.
 */
export const ValueDisplay = forwardRef<
  HTMLSpanElement,
  TypographyProps & { unit?: string }
>(({ children, className, unit, ...props }, ref) => (
  <span
    ref={ref}
    className={clsx(
      'font-mono text-sm font-medium text-zinc-900 dark:text-white',
      className
    )}
    {...props}
  >
    {children}
    {unit && (
      <span className="ml-1 text-xs font-normal text-zinc-500">{unit}</span>
    )}
  </span>
));
ValueDisplay.displayName = 'ValueDisplay';

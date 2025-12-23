/**
 * UI Component Design System
 *
 * BeamLab Engineering UI Components
 * - Inter font family
 * - High-density layouts (text-sm base, h-8 inputs)
 * - Shadcn/Radix-inspired patterns
 */

// Typography
export {
  Text,
  TextMuted,
  TextSmall,
  TextMono,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Heading,
  SectionLabel,
  ValueDisplay,
} from './typography';

// Inputs & Forms
export { Input, NumericInput, Textarea } from './input';
export type { InputProps, NumericInputProps, TextareaProps } from './input';

export { Label, FormField, LabelValue } from './label';
export type { LabelProps, FormFieldProps, LabelValueProps } from './label';

// Data Table
export {
  DataTable,
  createTextColumn,
  createNumericColumn,
  createSelectionColumn,
} from './data-table';
export type { DataTableProps } from './data-table';

// Property Inspector (Side Panel)
export { PropertyInspector } from './PropertyInspector';

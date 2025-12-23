/**
 * BaseNode.tsx
 * 
 * Base styling and components for parametric nodes.
 * Provides consistent look and feel across all node types.
 */

import React from 'react';
import { Handle, Position, type HandleProps } from 'reactflow';
import { motion } from 'framer-motion';

// ============================================================================
// STYLES
// ============================================================================

export const nodeColors = {
  input: {
    bg: 'bg-emerald-900/90',
    border: 'border-emerald-500',
    header: 'bg-emerald-800',
    accent: 'emerald',
  },
  geometry: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-500',
    header: 'bg-blue-800',
    accent: 'blue',
  },
  pattern: {
    bg: 'bg-purple-900/90',
    border: 'border-purple-500',
    header: 'bg-purple-800',
    accent: 'purple',
  },
  transform: {
    bg: 'bg-orange-900/90',
    border: 'border-orange-500',
    header: 'bg-orange-800',
    accent: 'orange',
  },
  output: {
    bg: 'bg-rose-900/90',
    border: 'border-rose-500',
    header: 'bg-rose-800',
    accent: 'rose',
  },
};

export type NodeCategory = keyof typeof nodeColors;

// ============================================================================
// NODE CONTAINER
// ============================================================================

interface NodeContainerProps {
  category: NodeCategory;
  label: string;
  icon: React.ReactNode;
  selected?: boolean;
  children: React.ReactNode;
}

export const NodeContainer: React.FC<NodeContainerProps> = ({
  category,
  label,
  icon,
  selected,
  children,
}) => {
  const colors = nodeColors[category];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        ${colors.bg} ${colors.border}
        min-w-[180px] rounded-lg border-2 backdrop-blur-sm
        shadow-lg shadow-black/30
        ${selected ? 'ring-2 ring-white/50' : ''}
      `}
    >
      {/* Header */}
      <div className={`${colors.header} flex items-center gap-2 rounded-t-md px-3 py-2`}>
        <span className="text-white/80">{icon}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3">{children}</div>
    </motion.div>
  );
};

// ============================================================================
// INPUT/OUTPUT HANDLES
// ============================================================================

interface NodeHandleProps extends Omit<HandleProps, 'type'> {
  label?: string;
  type: 'source' | 'target';
  handleColor?: string;
}

export const NodeHandle: React.FC<NodeHandleProps> = ({
  label,
  type,
  position,
  id,
  handleColor = 'bg-white',
  ...props
}) => {
  const isInput = type === 'target';

  return (
    <div
      className={`relative flex items-center ${
        isInput ? 'justify-start' : 'justify-end'
      }`}
    >
      <Handle
        type={type}
        position={position}
        id={id}
        className={`!h-3 !w-3 !rounded-full !border-2 !border-zinc-700 ${handleColor}`}
        {...props}
      />
      {label && (
        <span
          className={`text-xs text-zinc-400 ${isInput ? 'ml-5' : 'mr-5'}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// Left side inputs
export const InputHandle: React.FC<Omit<NodeHandleProps, 'type' | 'position'>> = (
  props
) => <NodeHandle type="target" position={Position.Left} {...props} />;

// Right side outputs
export const OutputHandle: React.FC<Omit<NodeHandleProps, 'type' | 'position'>> = (
  props
) => <NodeHandle type="source" position={Position.Right} {...props} />;

// ============================================================================
// FORM CONTROLS
// ============================================================================

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-zinc-400">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-20 rounded bg-zinc-800 px-2 py-1 text-right text-sm text-white 
                 focus:outline-none focus:ring-1 focus:ring-white/30"
    />
  </div>
);

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs font-mono text-white">{value}</span>
    </div>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-500"
    />
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-zinc-400">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded bg-zinc-800 px-2 py-1 text-sm text-white 
                 focus:outline-none focus:ring-1 focus:ring-white/30"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================================================
// OUTPUT PREVIEW
// ============================================================================

interface OutputPreviewProps {
  value: unknown;
}

export const OutputPreview: React.FC<OutputPreviewProps> = ({ value }) => {
  const preview = React.useMemo(() => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'number') return value.toFixed(2);
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `{${keys.slice(0, 2).join(', ')}${keys.length > 2 ? '...' : ''}}`;
    }
    return String(value);
  }, [value]);

  return (
    <div className="mt-2 rounded bg-black/30 px-2 py-1 text-center text-xs font-mono text-zinc-400">
      {preview}
    </div>
  );
};

/**
 * FrameRepeaterNode.tsx
 * 
 * Repeats geometry along an axis to create structural frames.
 * Essential for generating multi-bay structures.
 */

import React from 'react';
import type { NodeProps } from 'reactflow';
import type { FrameRepeaterData } from '../types';
import { NodeContainer, InputHandle, OutputHandle, NumberField, SelectField } from './BaseNode';

// Icon
const FrameIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="3" width="6" height="18" strokeWidth={2} rx="1" />
    <rect x="12" y="3" width="6" height="18" strokeWidth={2} rx="1" />
    <path strokeLinecap="round" strokeWidth={2} d="M9 6h3M9 12h3M9 18h3" />
  </svg>
);

interface FrameRepeaterNodeProps extends NodeProps<FrameRepeaterData> {}

export const FrameRepeaterNode: React.FC<FrameRepeaterNodeProps> = ({ data, selected }) => {
  const handleChange = (updates: Partial<FrameRepeaterData>) => {
    if (data.onUpdate) {
      data.onUpdate(updates);
    }
  };

  return (
    <NodeContainer
      category="pattern"
      label={data.label || 'Frame Repeater'}
      icon={<FrameIcon />}
      selected={selected}
    >
      {/* Inputs */}
      <div className="space-y-1 border-b border-zinc-700 pb-2">
        <InputHandle id="geometry" label="Geometry" handleColor="bg-blue-400" />
        <InputHandle id="count" label="Count" handleColor="bg-emerald-400" />
        <InputHandle id="spacing" label="Spacing" handleColor="bg-emerald-400" />
      </div>

      {/* Settings */}
      <SelectField
        label="Axis"
        value={data.axis}
        onChange={(axis) => handleChange({ axis: axis as FrameRepeaterData['axis'] })}
        options={[
          { value: 'x', label: 'X Axis' },
          { value: 'y', label: 'Y Axis' },
          { value: 'z', label: 'Z Axis' },
        ]}
      />

      {/* Default values */}
      <div className="space-y-1 border-t border-zinc-700 pt-2">
        <NumberField
          label="Count"
          value={data.defaultCount ?? 3}
          onChange={(v) => handleChange({ defaultCount: v })}
          min={1}
          max={50}
        />
        <NumberField
          label="Spacing"
          value={data.defaultSpacing ?? 6}
          onChange={(v) => handleChange({ defaultSpacing: v })}
          min={0.1}
          step={0.1}
        />
      </div>

      {/* Connect inter-frame */}
      <div className="flex items-center gap-2 rounded bg-black/20 px-2 py-1">
        <input
          type="checkbox"
          checked={data.connectFrames ?? true}
          onChange={(e) => handleChange({ connectFrames: e.target.checked })}
          className="accent-purple-500"
        />
        <span className="text-xs text-zinc-400">Connect frames</span>
      </div>

      {/* Output */}
      <OutputHandle id="geometry" label="Geometry" handleColor="bg-purple-400" />
    </NodeContainer>
  );
};

export default FrameRepeaterNode;

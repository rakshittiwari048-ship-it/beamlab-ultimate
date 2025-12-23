/**
 * PointGeneratorNode.tsx
 * 
 * Generates point grids in 3D space.
 * Outputs array of Point3D objects.
 */

// @ts-nocheck
import React from 'react';
import type { NodeProps } from 'reactflow';
import type { PointGeneratorData } from '../types';
import { NodeContainer, InputHandle, OutputHandle, NumberField, SelectField } from './BaseNode';

// Icon
const PointIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
    <circle cx="6" cy="6" r="2" strokeWidth={2} />
    <circle cx="18" cy="6" r="2" strokeWidth={2} />
    <circle cx="6" cy="18" r="2" strokeWidth={2} />
    <circle cx="18" cy="18" r="2" strokeWidth={2} />
  </svg>
);

interface PointGeneratorNodeProps extends NodeProps<PointGeneratorData> {}

export const PointGeneratorNode: React.FC<PointGeneratorNodeProps> = ({ data, selected }) => {
  const handleChange = (updates: Partial<PointGeneratorData>) => {
    if (data.onUpdate) {
      data.onUpdate(updates);
    }
  };

  return (
    <NodeContainer
      category="geometry"
      label={data.label || 'Point Grid'}
      icon={<PointIcon />}
      selected={selected}
    >
      {/* Inputs */}
      <div className="space-y-1 border-b border-zinc-700 pb-2">
        <InputHandle id="origin" label="Origin" handleColor="bg-blue-400" />
        <InputHandle id="countX" label="Count X" handleColor="bg-emerald-400" />
        <InputHandle id="countY" label="Count Y" handleColor="bg-emerald-400" />
        <InputHandle id="countZ" label="Count Z" handleColor="bg-emerald-400" />
        <InputHandle id="spacingX" label="Spacing X" handleColor="bg-emerald-400" />
        <InputHandle id="spacingY" label="Spacing Y" handleColor="bg-emerald-400" />
        <InputHandle id="spacingZ" label="Spacing Z" handleColor="bg-emerald-400" />
      </div>

      {/* Pattern selection */}
      <SelectField
        label="Pattern"
        value={data.pattern}
        onChange={(pattern) => handleChange({ pattern: pattern as PointGeneratorData['pattern'] })}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'line', label: 'Line' },
          { value: 'circle', label: 'Circle' },
          { value: 'custom', label: 'Custom' },
        ]}
      />

      {/* Default counts when not connected */}
      <div className="space-y-1 border-t border-zinc-700 pt-2">
        <NumberField
          label="Count X"
          value={data.defaultCountX ?? 3}
          onChange={(v) => handleChange({ defaultCountX: v })}
          min={1}
          max={50}
        />
        <NumberField
          label="Count Y"
          value={data.defaultCountY ?? 3}
          onChange={(v) => handleChange({ defaultCountY: v })}
          min={1}
          max={50}
        />
        <NumberField
          label="Spacing"
          value={data.defaultSpacing ?? 3}
          onChange={(v) => handleChange({ defaultSpacing: v })}
          min={0.1}
          step={0.1}
        />
      </div>

      {/* Output */}
      <OutputHandle id="points" label="Points" handleColor="bg-blue-400" />
    </NodeContainer>
  );
};

export default PointGeneratorNode;

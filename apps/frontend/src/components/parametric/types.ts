/**
 * types.ts
 * 
 * Type definitions for the Visual Scripting / Parametric Design system
 */

// ============================================================================
// NODE DATA TYPES
// ============================================================================

export type NodeCategory = 'input' | 'geometry' | 'transform' | 'pattern' | 'output';

export interface BaseNodeData {
  label: string;
  category?: NodeCategory;
  /** Whether this node has been evaluated */
  evaluated?: boolean;
  /** Error message if evaluation failed */
  error?: string;
  /** Callback to update node data */
  onUpdate?: (updates: Partial<ParametricNodeDataUnion>) => void;
  /** Callback to apply model output */
  onApply?: () => void;
}

export interface NumberInputData extends BaseNodeData {
  type: 'numberInput';
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface PointGeneratorData extends BaseNodeData {
  type: 'pointGenerator';
  mode?: 'single' | 'grid' | 'line' | 'arc';
  pattern?: 'grid' | 'line' | 'circle' | 'custom';
  /** Default values when inputs not connected */
  defaultCountX?: number;
  defaultCountY?: number;
  defaultSpacing?: number;
  /** Output points */
  points?: Point3D[];
}

export interface LineConnectorData extends BaseNodeData {
  type: 'lineConnector';
  mode: 'pairs' | 'chain' | 'complete';
  /** Output lines (pairs of point indices) */
  lines?: [number, number][];
}

export interface FrameRepeaterData extends BaseNodeData {
  type: 'frameRepeater';
  axis: 'x' | 'y' | 'z';
  /** Default values when inputs not connected */
  defaultCount?: number;
  defaultSpacing?: number;
  connectFrames?: boolean;
  /** Generated frame geometry */
  frames?: FrameGeometry[];
}

export interface OutputNodeData extends BaseNodeData {
  type: 'modelOutput';
  /** Final nodes for model */
  nodes?: ModelNode[];
  /** Final members for model */
  members?: ModelMember[];
  /** Stats for display */
  nodeCount?: number;
  memberCount?: number;
  isValid?: boolean;
}

export interface SliderInputData extends BaseNodeData {
  type: 'sliderInput';
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface VectorInputData extends BaseNodeData {
  type: 'vectorInput';
  x: number;
  y: number;
  z: number;
}

export interface MathOperationData extends BaseNodeData {
  type: 'mathOperation';
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt';
  result?: number;
}

export interface TransformData extends BaseNodeData {
  type: 'transform';
  mode: 'translate' | 'rotate' | 'scale' | 'mirror';
}

// Union type for all node data (without callbacks for circular reference)
export type ParametricNodeDataUnion =
  | NumberInputData
  | PointGeneratorData
  | LineConnectorData
  | FrameRepeaterData
  | OutputNodeData
  | SliderInputData
  | VectorInputData
  | MathOperationData
  | TransformData;

// Main exported type
export type ParametricNodeData = ParametricNodeDataUnion;

// ============================================================================
// GEOMETRY TYPES
// ============================================================================

export interface Point3D {
  x: number;
  y: number;
  z: number;
  id?: string;
}

export interface Line3D {
  start: Point3D;
  end: Point3D;
  id?: string;
}

export interface FrameGeometry {
  nodes: Point3D[];
  members: [number, number][];
}

// ============================================================================
// MODEL OUTPUT TYPES
// ============================================================================

export interface ModelNode {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface ModelMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  sectionId?: string;
  materialId?: string;
}

export interface ParametricModelOutput {
  nodes: ModelNode[];
  members: ModelMember[];
  metadata?: {
    generatedAt: string;
    nodeCount: number;
    memberCount: number;
  };
}

// ============================================================================
// GRAPH TYPES
// ============================================================================

export interface PortDefinition {
  id: string;
  label: string;
  type: 'number' | 'point' | 'points' | 'lines' | 'geometry' | 'any';
  required?: boolean;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultData: Partial<ParametricNodeData>;
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export interface ExecutionContext {
  /** Input values for this node */
  inputs: Record<string, unknown>;
  /** Node's own data */
  data: ParametricNodeData;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Record<string, unknown>;
  error?: string;
}

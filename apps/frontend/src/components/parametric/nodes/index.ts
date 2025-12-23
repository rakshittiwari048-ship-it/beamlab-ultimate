/**
 * nodes/index.ts
 * 
 * Export all custom node components and their type registrations.
 */

export { NumberInputNode } from './NumberInputNode';
export { PointGeneratorNode } from './PointGeneratorNode';
export { LineConnectorNode } from './LineConnectorNode';
export { FrameRepeaterNode } from './FrameRepeaterNode';
export { ModelOutputNode } from './ModelOutputNode';

export {
  NodeContainer,
  InputHandle,
  OutputHandle,
  NumberField,
  SliderField,
  SelectField,
  OutputPreview,
  nodeColors,
} from './BaseNode';

// Node type registration for ReactFlow
import { NumberInputNode } from './NumberInputNode';
import { PointGeneratorNode } from './PointGeneratorNode';
import { LineConnectorNode } from './LineConnectorNode';
import { FrameRepeaterNode } from './FrameRepeaterNode';
import { ModelOutputNode } from './ModelOutputNode';

export const nodeTypes = {
  numberInput: NumberInputNode,
  sliderInput: NumberInputNode, // Reuse with different props
  vectorInput: NumberInputNode, // TODO: Create dedicated VectorInputNode
  pointGenerator: PointGeneratorNode,
  lineConnector: LineConnectorNode,
  frameRepeater: FrameRepeaterNode,
  modelOutput: ModelOutputNode,
  mathOperation: NumberInputNode, // TODO: Create dedicated MathNode
  transform: NumberInputNode, // TODO: Create dedicated TransformNode
};

export type NodeType = keyof typeof nodeTypes;

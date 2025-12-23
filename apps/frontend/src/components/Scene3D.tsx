import type { FC } from 'react';
import { useEditorStore } from '../store/editorStore';
import { NodeMesh } from './3d/NodeMesh';
import { BeamMesh } from './3d/BeamMesh';
import { SupportMesh } from './3d/SupportMesh';

export const Scene3D: FC = () => {
  const { model, selectedNodeIds, selectedElementIds } = useEditorStore();

  return (
    <group>
      {/* Render all nodes */}
      {model.nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isSelected={selectedNodeIds.has(node.id)}
        />
      ))}

      {/* Render all elements */}
      {model.elements.map((element) => {
        const startNode = model.nodes.find((n) => n.id === element.startNodeId);
        const endNode = model.nodes.find((n) => n.id === element.endNodeId);
        
        if (!startNode || !endNode) return null;
        
        return (
          <BeamMesh
            key={element.id}
            element={element}
            startNode={startNode}
            endNode={endNode}
            isSelected={selectedElementIds.has(element.id)}
          />
        );
      })}

      {/* Render all supports */}
      {model.supports.map((support) => {
        const node = model.nodes.find((n) => n.id === support.nodeId);
        if (!node) return null;
        
        return (
          <SupportMesh
            key={support.nodeId}
            support={support}
            node={node}
          />
        );
      })}
    </group>
  );
};

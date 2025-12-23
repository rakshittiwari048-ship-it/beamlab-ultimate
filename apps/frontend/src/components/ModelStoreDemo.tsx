import type { FC } from 'react';
import { 
  useModelStore, 
  useUndo, 
  useRedo,
  selectAllNodes,
  selectAllMembers,
  generateNodeId,
  generateMemberId
} from '../store/model';
import { Undo2, Redo2, Plus, Trash2 } from 'lucide-react';

/**
 * Demo component showing how to use the useModelStore
 * This demonstrates all CRUD operations and undo/redo functionality
 */
export const ModelStoreDemo: FC = () => {
  // Access store actions
  const addNode = useModelStore((state) => state.addNode);
  const removeNode = useModelStore((state) => state.removeNode);
  const updateNodePosition = useModelStore((state) => state.updateNodePosition);
  const addMember = useModelStore((state) => state.addMember);
  const removeMember = useModelStore((state) => state.removeMember);
  const selectNode = useModelStore((state) => state.selectNode);
  const clearSelection = useModelStore((state) => state.clearSelection);
  
  // Access store data with selectors
  const nodes = useModelStore(selectAllNodes);
  const members = useModelStore(selectAllMembers);
  const selectedNodeIds = useModelStore((state) => state.selectedNodeIds);
  
  // Undo/Redo hooks
  const { undo, canUndo } = useUndo();
  const { redo, canRedo } = useRedo();

  // Handlers
  const handleAddNode = () => {
    const id = generateNodeId();
    addNode({
      id,
      x: Math.random() * 10,
      y: Math.random() * 10,
      z: Math.random() * 10,
    });
  };

  const handleAddMember = () => {
    if (nodes.length < 2) {
      alert('Need at least 2 nodes to create a member');
      return;
    }
    
    // Connect the last two nodes
    const [node1, node2] = nodes.slice(-2);
    addMember({
      id: generateMemberId(),
      startNodeId: node1.id,
      endNodeId: node2.id,
      sectionId: 'section_default',
    });
  };

  const handleMoveNode = (id: string) => {
    updateNodePosition(id, {
      x: Math.random() * 10,
      y: Math.random() * 10,
      z: Math.random() * 10,
    });
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Model Store Demo</h2>
        <div className="flex gap-2">
          <button
            onClick={() => undo()}
            disabled={!canUndo}
            className={`p-2 rounded flex items-center gap-2 ${
              canUndo
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Undo2 size={16} />
            Undo
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            className={`p-2 rounded flex items-center gap-2 ${
              canRedo
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Redo2 size={16} />
            Redo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 p-4 rounded">
          <div className="text-2xl font-bold text-white">{nodes.length}</div>
          <div className="text-sm text-gray-400">Nodes</div>
        </div>
        <div className="bg-gray-700 p-4 rounded">
          <div className="text-2xl font-bold text-white">{members.length}</div>
          <div className="text-sm text-gray-400">Members</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleAddNode}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          <Plus size={16} />
          Add Node
        </button>
        <button
          onClick={handleAddMember}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          disabled={nodes.length < 2}
        >
          <Plus size={16} />
          Add Member
        </button>
        <button
          onClick={clearSelection}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Clear Selection
        </button>
      </div>

      {/* Node List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase">Nodes</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`flex items-center justify-between p-2 rounded ${
                selectedNodeIds.has(node.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <button
                onClick={() => selectNode(node.id)}
                className="flex-1 text-left text-sm font-mono"
              >
                {node.id.substring(0, 12)}... ({node.x.toFixed(1)}, {node.y.toFixed(1)}, {node.z.toFixed(1)})
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => handleMoveNode(node.id)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                >
                  Move
                </button>
                <button
                  onClick={() => removeNode(node.id)}
                  className="p-1 bg-red-600 hover:bg-red-700 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {nodes.length === 0 && (
            <div className="text-center text-gray-500 py-4 text-sm">
              No nodes yet. Click "Add Node" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase">Members</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 bg-gray-700 rounded"
            >
              <div className="flex-1 text-sm text-gray-300 font-mono">
                {member.startNodeId.substring(0, 8)}... → {member.endNodeId.substring(0, 8)}...
              </div>
              <button
                onClick={() => removeMember(member.id)}
                className="p-1 bg-red-600 hover:bg-red-700 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center text-gray-500 py-4 text-sm">
              No members yet. Add at least 2 nodes, then click "Add Member".
            </div>
          )}
        </div>
      </div>

      {/* Performance Note */}
      <div className="text-xs text-gray-500 italic border-t border-gray-700 pt-4">
        💡 This store uses Map&lt;string, T&gt; for O(1) lookups. Try adding 1000+ nodes to see the performance benefits.
      </div>
    </div>
  );
};

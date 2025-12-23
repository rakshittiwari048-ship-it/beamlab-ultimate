import type { FC } from 'react';
import { useEffect } from 'react';
import { useModelStore, generateNodeId, generateMemberId } from '../store/model';
import { useViewportStore } from '../store/viewport';
import { Grid2X2, Maximize2, RotateCcw } from 'lucide-react';

/**
 * ViewportDemo - Demonstrates the ViewportManager with sample data
 * 
 * Creates a simple frame structure to visualize in multiple viewports
 */
export const ViewportDemo: FC = () => {
  const addNode = useModelStore((state) => state.addNode);
  const addMember = useModelStore((state) => state.addMember);
  const clear = useModelStore((state) => state.clear);
  const nodes = useModelStore((state) => state.getAllNodes());
  const members = useModelStore((state) => state.getAllMembers());
  
  const layout = useViewportStore((state) => state.layout);
  const setLayout = useViewportStore((state) => state.setLayout);
  const showGrid = useViewportStore((state) => state.showGrid);
  const showAxis = useViewportStore((state) => state.showAxis);
  const toggleGrid = useViewportStore((state) => state.toggleGrid);
  const toggleAxis = useViewportStore((state) => state.toggleAxis);

  // Create sample structure on mount
  useEffect(() => {
    if (nodes.length === 0) {
      createSampleFrame();
    }
  }, []);

  const createSampleFrame = () => {
    // Create a simple portal frame
    // Bottom nodes
    const n1 = generateNodeId();
    const n2 = generateNodeId();
    const n3 = generateNodeId();
    
    // Top nodes
    const n4 = generateNodeId();
    const n5 = generateNodeId();
    const n6 = generateNodeId();

    // Add nodes
    addNode({ id: n1, x: 0, y: 0, z: 0 });      // Bottom left
    addNode({ id: n2, x: 5, y: 0, z: 0 });      // Bottom center
    addNode({ id: n3, x: 10, y: 0, z: 0 });     // Bottom right
    addNode({ id: n4, x: 0, y: 4, z: 0 });      // Top left
    addNode({ id: n5, x: 5, y: 5, z: 0 });      // Top center (peaked)
    addNode({ id: n6, x: 10, y: 4, z: 0 });     // Top right

    // Add members (beams/columns)
    // Columns
    addMember({ id: generateMemberId(), startNodeId: n1, endNodeId: n4, sectionId: 'W12x26' });
    addMember({ id: generateMemberId(), startNodeId: n2, endNodeId: n5, sectionId: 'W12x26' });
    addMember({ id: generateMemberId(), startNodeId: n3, endNodeId: n6, sectionId: 'W12x26' });
    
    // Roof beams
    addMember({ id: generateMemberId(), startNodeId: n4, endNodeId: n5, sectionId: 'W14x30' });
    addMember({ id: generateMemberId(), startNodeId: n5, endNodeId: n6, sectionId: 'W14x30' });
  };

  const handleClearModel = () => {
    clear();
  };

  const handleCreateFrame = () => {
    clear();
    createSampleFrame();
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-700">
      <div className="text-sm font-semibold text-white mb-2">Viewport Controls</div>
      
      {/* Layout Toggle */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 uppercase">Layout</div>
        <div className="flex gap-2">
          <button
            onClick={() => setLayout('SINGLE')}
            className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 text-sm transition-colors ${
              layout === 'SINGLE'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Maximize2 size={16} />
            Single
          </button>
          <button
            onClick={() => setLayout('QUAD')}
            className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 text-sm transition-colors ${
              layout === 'QUAD'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Grid2X2 size={16} />
            Quad
          </button>
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 uppercase">Display</div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={toggleGrid}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            Show Grid
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showAxis}
              onChange={toggleAxis}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            Show Axis
          </label>
        </div>
      </div>

      {/* Model Actions */}
      <div className="space-y-2 pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 uppercase">Model</div>
        <button
          onClick={handleCreateFrame}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw size={16} />
          Create Sample Frame
        </button>
        <button
          onClick={handleClearModel}
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          Clear Model
        </button>
      </div>

      {/* Stats */}
      <div className="pt-2 border-t border-gray-700 text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Nodes:</span>
          <span className="text-white font-mono">{nodes.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Members:</span>
          <span className="text-white font-mono">{members.length}</span>
        </div>
      </div>
    </div>
  );
};

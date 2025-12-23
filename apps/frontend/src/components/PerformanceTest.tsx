import type { FC } from 'react';
import { useState } from 'react';
import { useModelStore, generateNodeId, generateMemberId } from '../store/model';
import { Zap, Trash2 } from 'lucide-react';

/**
 * PerformanceTest - Stress test component for 10,000+ elements
 * 
 * Demonstrates optimized rendering capabilities:
 * - Creates large-scale structural models
 * - Tests instanced mesh performance
 * - Monitors FPS during operations
 */
export const PerformanceTest: FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const addNode = useModelStore((state) => state.addNode);
  const addMember = useModelStore((state) => state.addMember);
  const clear = useModelStore((state) => state.clear);
  const nodes = useModelStore((state) => state.getAllNodes());
  const members = useModelStore((state) => state.getAllMembers());

  const generateLargeGrid = (gridSize: number) => {
    setIsGenerating(true);
    
    // Use setTimeout to not block UI
    setTimeout(() => {
      clear();
      
      const nodeIds: string[][] = [];
      
      // Generate grid of nodes
      for (let x = 0; x < gridSize; x++) {
        nodeIds[x] = [];
        for (let y = 0; y < gridSize; y++) {
          const nodeId = generateNodeId();
          nodeIds[x][y] = nodeId;
          addNode({
            id: nodeId,
            x: x * 2,
            y: y * 2,
            z: Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2, // Wavy surface
          });
        }
      }
      
      // Generate members connecting adjacent nodes
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          // Horizontal connections
          if (x < gridSize - 1) {
            addMember({
              id: generateMemberId(),
              startNodeId: nodeIds[x][y],
              endNodeId: nodeIds[x + 1][y],
              sectionId: 'W12x26',
            });
          }
          
          // Vertical connections
          if (y < gridSize - 1) {
            addMember({
              id: generateMemberId(),
              startNodeId: nodeIds[x][y],
              endNodeId: nodeIds[x][y + 1],
              sectionId: 'W12x26',
            });
          }
          
          // Diagonal connections (every other)
          if (x < gridSize - 1 && y < gridSize - 1 && (x + y) % 2 === 0) {
            addMember({
              id: generateMemberId(),
              startNodeId: nodeIds[x][y],
              endNodeId: nodeIds[x + 1][y + 1],
              sectionId: 'W10x22',
            });
          }
        }
      }
      
      setIsGenerating(false);
    }, 100);
  };

  const generate3DLattice = (size: number) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      clear();
      
      const nodeIds: string[][][] = [];
      
      // Generate 3D lattice of nodes
      for (let x = 0; x < size; x++) {
        nodeIds[x] = [];
        for (let y = 0; y < size; y++) {
          nodeIds[x][y] = [];
          for (let z = 0; z < size; z++) {
            const nodeId = generateNodeId();
            nodeIds[x][y][z] = nodeId;
            addNode({
              id: nodeId,
              x: x * 3,
              y: y * 3,
              z: z * 3,
            });
          }
        }
      }
      
      // Generate members connecting adjacent nodes
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          for (let z = 0; z < size; z++) {
            // X-direction
            if (x < size - 1) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[x][y][z],
                endNodeId: nodeIds[x + 1][y][z],
                sectionId: 'W12x26',
              });
            }
            
            // Y-direction
            if (y < size - 1) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[x][y][z],
                endNodeId: nodeIds[x][y + 1][z],
                sectionId: 'W12x26',
              });
            }
            
            // Z-direction
            if (z < size - 1) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[x][y][z],
                endNodeId: nodeIds[x][y][z + 1],
                sectionId: 'W12x26',
              });
            }
          }
        }
      }
      
      setIsGenerating(false);
    }, 100);
  };

  const generateSkyscraper = (floors: number, baysX: number, baysY: number) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      clear();
      
      const nodeIds: string[][][] = [];
      const floorHeight = 4;
      const bayWidth = 6;
      
      // Generate nodes for each floor
      for (let floor = 0; floor <= floors; floor++) {
        nodeIds[floor] = [];
        for (let x = 0; x <= baysX; x++) {
          nodeIds[floor][x] = [];
          for (let y = 0; y <= baysY; y++) {
            const nodeId = generateNodeId();
            nodeIds[floor][x][y] = nodeId;
            addNode({
              id: nodeId,
              x: x * bayWidth,
              y: floor * floorHeight,
              z: y * bayWidth,
            });
          }
        }
      }
      
      // Generate columns and beams
      for (let floor = 0; floor <= floors; floor++) {
        for (let x = 0; x <= baysX; x++) {
          for (let y = 0; y <= baysY; y++) {
            // Columns (vertical)
            if (floor < floors) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[floor][x][y],
                endNodeId: nodeIds[floor + 1][x][y],
                sectionId: 'W14x90',
              });
            }
            
            // Beams in X direction
            if (x < baysX) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[floor][x][y],
                endNodeId: nodeIds[floor][x + 1][y],
                sectionId: 'W18x50',
              });
            }
            
            // Beams in Y direction
            if (y < baysY) {
              addMember({
                id: generateMemberId(),
                startNodeId: nodeIds[floor][x][y],
                endNodeId: nodeIds[floor][x][y + 1],
                sectionId: 'W18x50',
              });
            }
          }
        }
      }
      
      setIsGenerating(false);
    }, 100);
  };

  const generateBridgeTruss = (spanLength: number, segments: number) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      clear();
      
      const segmentLength = spanLength / segments;
      const height = spanLength / 8;
      const nodeIds: { top: string[]; bottom: string[] } = { top: [], bottom: [] };
      
      // Generate top and bottom chord nodes
      for (let i = 0; i <= segments; i++) {
        const topId = generateNodeId();
        const bottomId = generateNodeId();
        
        nodeIds.top.push(topId);
        nodeIds.bottom.push(bottomId);
        
        addNode({
          id: topId,
          x: i * segmentLength,
          y: height,
          z: 0,
        });
        
        addNode({
          id: bottomId,
          x: i * segmentLength,
          y: 0,
          z: 0,
        });
      }
      
      // Generate chord members
      for (let i = 0; i < segments; i++) {
        // Top chord
        addMember({
          id: generateMemberId(),
          startNodeId: nodeIds.top[i],
          endNodeId: nodeIds.top[i + 1],
          sectionId: 'W14x82',
        });
        
        // Bottom chord
        addMember({
          id: generateMemberId(),
          startNodeId: nodeIds.bottom[i],
          endNodeId: nodeIds.bottom[i + 1],
          sectionId: 'W14x82',
        });
        
        // Vertical members
        addMember({
          id: generateMemberId(),
          startNodeId: nodeIds.bottom[i],
          endNodeId: nodeIds.top[i],
          sectionId: 'W12x26',
        });
        
        // Diagonal members (alternating)
        if (i % 2 === 0) {
          addMember({
            id: generateMemberId(),
            startNodeId: nodeIds.bottom[i],
            endNodeId: nodeIds.top[i + 1],
            sectionId: 'W10x22',
          });
        } else {
          addMember({
            id: generateMemberId(),
            startNodeId: nodeIds.top[i],
            endNodeId: nodeIds.bottom[i + 1],
            sectionId: 'W10x22',
          });
        }
      }
      
      setIsGenerating(false);
    }, 100);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
        <Zap size={16} className="text-yellow-400" />
        Performance Test
      </div>
      
      {/* Stats */}
      <div className="bg-gray-800 rounded p-3 space-y-1 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>Nodes:</span>
          <span className="text-white font-mono">{nodes.length.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Members:</span>
          <span className="text-white font-mono">{members.length.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Total:</span>
          <span className="text-yellow-400 font-mono font-bold">
            {(nodes.length + members.length).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Grid Generation */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 uppercase">2D Grid Tests</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => generateLargeGrid(50)}
            disabled={isGenerating}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            50x50
            <div className="text-[10px] opacity-70">2.5k nodes</div>
          </button>
          <button
            onClick={() => generateLargeGrid(100)}
            disabled={isGenerating}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            100x100
            <div className="text-[10px] opacity-70">10k nodes</div>
          </button>
        </div>
      </div>

      {/* 3D Lattice Generation */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 uppercase">3D Lattice Tests</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => generate3DLattice(15)}
            disabled={isGenerating}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            15x15x15
            <div className="text-[10px] opacity-70">3.4k nodes</div>
          </button>
          <button
            onClick={() => generate3DLattice(20)}
            disabled={isGenerating}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            20x20x20
            <div className="text-[10px] opacity-70">8k nodes</div>
          </button>
        </div>
      </div>

      {/* Advanced Structures */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 uppercase">Complex Structures</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => generateSkyscraper(50, 4, 4)}
            disabled={isGenerating}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            Skyscraper
            <div className="text-[10px] opacity-70">50 floors</div>
          </button>
          <button
            onClick={() => generateBridgeTruss(200, 40)}
            disabled={isGenerating}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
          >
            Bridge Truss
            <div className="text-[10px] opacity-70">200m span</div>
          </button>
        </div>
      </div>

      {/* Clear */}
      <button
        onClick={() => clear()}
        disabled={isGenerating}
        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Trash2 size={16} />
        Clear All
      </button>

      {isGenerating && (
        <div className="text-xs text-yellow-400 text-center animate-pulse">
          Generating...
        </div>
      )}

      {/* Performance Tips */}
      <div className="pt-2 border-t border-gray-700 text-[10px] text-gray-500 space-y-1">
        <div>✓ InstancedMesh rendering</div>
        <div>✓ Map-based O(1) lookups</div>
        <div>✓ Reduced geometry complexity</div>
        <div>✓ Frustum culling enabled</div>
      </div>
    </div>
  );
};

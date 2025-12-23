/**
 * SuperElementPanel.tsx
 * 
 * UI component for creating and managing super elements via static condensation.
 * 
 * Features:
 * - Select member groups from the model
 * - Identify/set boundary nodes
 * - Create super elements with one click
 * - View created super elements with statistics
 * - Export/import super elements
 */

// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  useSubstructure,
  calculateSelectionStats,
} from '../hooks/useSubstructure';
import type { SuperElement } from '@beamlab/analysis-engine';

// ============================================================================
// STYLES (Tailwind classes)
// ============================================================================

const panelClasses = 'bg-gray-900 text-gray-100 rounded-lg shadow-xl p-4 w-80';
const headerClasses = 'text-lg font-semibold mb-4 flex items-center gap-2';
const sectionClasses = 'mb-4';
const sectionTitleClasses = 'text-sm font-medium text-gray-400 mb-2';
const buttonClasses = 'px-3 py-2 rounded text-sm font-medium transition-colors';
const primaryButtonClasses = `${buttonClasses} bg-blue-600 hover:bg-blue-500 text-white`;
const secondaryButtonClasses = `${buttonClasses} bg-gray-700 hover:bg-gray-600 text-gray-200`;
const dangerButtonClasses = `${buttonClasses} bg-red-600 hover:bg-red-500 text-white`;
const inputClasses = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:border-blue-500 focus:outline-none';
const statBoxClasses = 'bg-gray-800 rounded p-3 flex flex-col items-center';
const statValueClasses = 'text-2xl font-bold text-blue-400';
const statLabelClasses = 'text-xs text-gray-500';

// ============================================================================
// COMPONENT
// ============================================================================

export function SuperElementPanel() {
  const { state, actions } = useSubstructure();
  const [superElementName, setSuperElementName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate statistics for current selection
  const selectionStats = useMemo(() => {
    const selectedNodes = Array.from(state.selectedNodeIds);
    const selectedMembers = Array.from(state.selectedMemberIds);
    
    return calculateSelectionStats(
      selectedNodes.map(id => ({ id, x: 0, y: 0, z: 0 })), // Placeholder coords
      selectedMembers.map(id => ({ 
        id, 
        startNodeId: '', 
        endNodeId: '', 
        E: 0, A: 0, Iy: 0, Iz: 0 
      })),
      state.boundaryNodeIds
    );
  }, [state.selectedNodeIds, state.selectedMemberIds, state.boundaryNodeIds]);

  // Handlers
  const handleCreateSuperElement = async () => {
    const name = superElementName.trim() || `Super Element ${state.superElements.length + 1}`;
    const result = await actions.createSuperElement(name);
    if (result) {
      setSuperElementName('');
    }
  };

  const handleExport = (id: string) => {
    const json = actions.exportSuperElement(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `super-element-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        actions.importSuperElement(text);
      }
    };
    input.click();
  };

  return (
    <div className={panelClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <SuperElementIcon />
        <span>Super Elements</span>
      </div>

      {/* Selection Section */}
      <div className={sectionClasses}>
        <div className={sectionTitleClasses}>Current Selection</div>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className={statBoxClasses}>
            <span className={statValueClasses}>{state.selectedNodeIds.size}</span>
            <span className={statLabelClasses}>Nodes</span>
          </div>
          <div className={statBoxClasses}>
            <span className={statValueClasses}>{state.selectedMemberIds.size}</span>
            <span className={statLabelClasses}>Members</span>
          </div>
          <div className={statBoxClasses}>
            <span className={statValueClasses}>{state.boundaryNodeIds.length}</span>
            <span className={statLabelClasses}>Boundary</span>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={actions.selectNodesOfSelectedMembers}
            className={secondaryButtonClasses}
            title="Select nodes of all selected members"
          >
            Select Nodes
          </button>
          <button
            onClick={actions.autoDetectBoundaryNodes}
            className={secondaryButtonClasses}
            title="Auto-detect boundary nodes"
          >
            Auto Boundary
          </button>
          <button
            onClick={actions.clearSelection}
            className={secondaryButtonClasses}
            title="Clear selection"
          >
            Clear
          </button>
        </div>

        {/* Reduction preview */}
        {state.selectedNodeIds.size >= 2 && (
          <div className="bg-gray-800 rounded p-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">DOF Reduction:</span>
              <span className="text-lg font-bold text-green-400">
                {selectionStats.reductionPercent.toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectionStats.originalDOFs} → {selectionStats.condensedDOFs} DOFs
            </div>
          </div>
        )}
      </div>

      {/* Create Section */}
      <div className={sectionClasses}>
        <div className={sectionTitleClasses}>Create Super Element</div>
        
        <input
          type="text"
          value={superElementName}
          onChange={(e) => setSuperElementName(e.target.value)}
          placeholder="Super element name..."
          className={`${inputClasses} mb-2`}
        />
        
        <button
          onClick={handleCreateSuperElement}
          disabled={state.isCondensing || state.selectedNodeIds.size < 2}
          className={`${primaryButtonClasses} w-full flex items-center justify-center gap-2`}
        >
          {state.isCondensing ? (
            <>
              <LoadingSpinner />
              <span>Condensing... {state.progress}%</span>
            </>
          ) : (
            <>
              <CondenseIcon />
              <span>Create Super Element</span>
            </>
          )}
        </button>

        {state.error && (
          <div className="mt-2 text-sm text-red-400 bg-red-900/20 rounded p-2">
            {state.error}
          </div>
        )}
      </div>

      {/* Super Elements List */}
      <div className={sectionClasses}>
        <div className={`${sectionTitleClasses} flex justify-between items-center`}>
          <span>Created Super Elements ({state.superElements.length})</span>
          <button
            onClick={handleImport}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Import
          </button>
        </div>

        {state.superElements.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            No super elements created yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.superElements.map((element) => (
              <SuperElementCard
                key={element.id}
                element={element}
                isExpanded={expandedId === element.id}
                onToggleExpand={() => setExpandedId(
                  expandedId === element.id ? null : element.id
                )}
                onExport={() => handleExport(element.id)}
                onRemove={() => actions.removeSuperElement(element.id)}
              />
            ))}
          </div>
        )}

        {state.superElements.length > 0 && (
          <button
            onClick={actions.clearAllSuperElements}
            className={`${dangerButtonClasses} w-full mt-3`}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SuperElementCardProps {
  element: SuperElement;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onExport: () => void;
  onRemove: () => void;
}

function SuperElementCard({
  element,
  isExpanded,
  onToggleExpand,
  onExport,
  onRemove,
}: SuperElementCardProps) {
  const stats = element.originalStats;
  
  return (
    <div className="bg-gray-800 rounded overflow-hidden">
      {/* Header */}
      <div
        className="p-3 cursor-pointer hover:bg-gray-750 flex justify-between items-center"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon isExpanded={isExpanded} />
          <span className="font-medium">{element.name}</span>
        </div>
        <span className="text-sm text-green-400">
          -{(stats.reductionRatio * 100).toFixed(0)}%
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2 py-2 text-sm">
            <div>
              <span className="text-gray-500">Original:</span>{' '}
              <span>{stats.numNodes} nodes, {stats.numMembers} members</span>
            </div>
            <div>
              <span className="text-gray-500">DOFs:</span>{' '}
              <span>{stats.numTotalDOFs} → {stats.numBoundaryDOFs}</span>
            </div>
            <div>
              <span className="text-gray-500">Boundary:</span>{' '}
              <span>{element.boundaryNodeIds.length} nodes</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>{' '}
              <span>{element.createdAt.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className={`${secondaryButtonClasses} flex-1`}
            >
              Export
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className={`${dangerButtonClasses} flex-1`}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function SuperElementIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4" />
      <path d="M6.5 10v4" />
      <path d="M17.5 10v4" />
      <path d="M10 17.5h4" />
    </svg>
  );
}

function CondenseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h6M14 12h6" />
      <path d="M10 8l-3 4 3 4" />
      <path d="M14 8l3 4-3 4" />
    </svg>
  );
}

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SuperElementPanel;

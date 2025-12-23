import type { FC } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelectionStore } from '../store/selection';
import { useModelStore } from '../store/model';
import { useSectionsStore } from '../store/sections';
import { SectionPicker, SectionPreview } from './SectionPicker';
import { Vector3 } from 'three';
import { Settings, Move3D, GitBranch, Unlock } from 'lucide-react';

/**
 * PropertiesPanel - Editable properties for selected nodes/members
 * 
 * Features:
 * - Subscribes to selectedIds from selection store
 * - Conditional rendering based on selection type
 * - Debounced inputs (100ms) to prevent excessive re-renders
 * - Node: X, Y, Z position inputs
 * - Member: Length (read-only), Section ID, Releases
 */

// ============================================================================
// DEBOUNCED NUMBER INPUT
// ============================================================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

const NumberInput: FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  step = 0.1,
  min,
  max,
}) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toFixed(2));
    }
  }, [value, isFocused]);

  // Debounced onChange (100ms)
  useEffect(() => {
    if (!isFocused) return;

    const timer = setTimeout(() => {
      const num = parseFloat(localValue);
      if (!isNaN(num) && num !== value) {
        onChange(num);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [localValue, isFocused, onChange, value]);

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      onChange(num);
      setLocalValue(num.toFixed(2));
    } else {
      setLocalValue(value.toFixed(2));
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 uppercase">{label}</label>
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        readOnly={readOnly}
        step={step}
        min={min}
        max={max}
        className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm 
          focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  );
};

// ============================================================================
// SECTION DROPDOWN
// ============================================================================
// SECTION PICKER BUTTON
// ============================================================================

interface SectionDropdownProps {
  value: string;
  onChange: (sectionId: string) => void;
}

const SectionDropdown: FC<SectionDropdownProps> = ({ value, onChange }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const getSectionById = useSectionsStore((state) => state.getSectionById);
  const section = getSectionById(value);

  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 uppercase">Section</label>
      <SectionPreview
        sectionId={value}
        onClick={() => setIsPickerOpen(true)}
        className="w-full"
      />
      {section && (
        <div className="text-xs text-gray-500 mt-1">
          {section.depth} × {section.flangeWidth} mm • Ixx: {(section.Ixx / 1e6).toFixed(1)}×10⁶ mm⁴
        </div>
      )}
      <SectionPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(s) => onChange(s.id)}
        currentSectionId={value}
      />
    </div>
  );
};

// ============================================================================
// RELEASES CHECKBOXES
// ============================================================================

interface ReleasesCheckboxesProps {
  startReleases: { rx: boolean; ry: boolean; rz: boolean };
  endReleases: { rx: boolean; ry: boolean; rz: boolean };
  onStartChange: (axis: 'rx' | 'ry' | 'rz', value: boolean) => void;
  onEndChange: (axis: 'rx' | 'ry' | 'rz', value: boolean) => void;
}

const ReleasesCheckboxes: FC<ReleasesCheckboxesProps> = ({
  startReleases,
  endReleases,
  onStartChange,
  onEndChange,
}) => {
  const axes: ('rx' | 'ry' | 'rz')[] = ['rx', 'ry', 'rz'];

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 uppercase flex items-center gap-1">
        <Unlock size={12} />
        End Releases
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Start Node Releases */}
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-500 mb-2">Start Node</div>
          <div className="space-y-1">
            {axes.map((axis) => (
              <label key={`start-${axis}`} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startReleases[axis]}
                  onChange={(e) => onStartChange(axis, e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                {axis.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* End Node Releases */}
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-500 mb-2">End Node</div>
          <div className="space-y-1">
            {axes.map((axis) => (
              <label key={`end-${axis}`} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={endReleases[axis]}
                  onChange={(e) => onEndChange(axis, e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                {axis.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NODE PROPERTIES PANEL
// ============================================================================

interface NodePropertiesProps {
  nodeId: string;
}

const NodeProperties: FC<NodePropertiesProps> = ({ nodeId }) => {
  const node = useModelStore((state) => state.nodes.get(nodeId));
  const updateNodePosition = useModelStore((state) => state.updateNodePosition);
  const [notesValue, setNotesValue] = useState(node?.notes || '');

  useEffect(() => {
    setNotesValue(node?.notes || '');
  }, [node?.notes]);

  const handleChange = useCallback(
    (field: 'x' | 'y' | 'z', value: number) => {
      if (!node) return;
      updateNodePosition(nodeId, {
        x: field === 'x' ? value : node.x,
        y: field === 'y' ? value : node.y,
        z: field === 'z' ? value : node.z,
        notes: node.notes, // Preserve notes when updating position
      } as any);
    },
    [nodeId, node, updateNodePosition]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotesValue(value);
      if (node) {
        updateNodePosition(nodeId, {
          x: node.x,
          y: node.y,
          z: node.z,
          notes: value,
        } as any);
      }
    },
    [nodeId, node, updateNodePosition]
  );

  if (!node) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Move3D size={16} className="text-blue-400" />
        Node Properties
      </div>

      <div className="bg-gray-800/50 rounded p-3 space-y-1 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>ID:</span>
          <span className="text-white font-mono">{nodeId.slice(0, 8)}...</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-400 uppercase">Position</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            label="X"
            value={node.x}
            onChange={(v) => handleChange('x', v)}
          />
          <NumberInput
            label="Y"
            value={node.y}
            onChange={(v) => handleChange('y', v)}
          />
          <NumberInput
            label="Z"
            value={node.z}
            onChange={(v) => handleChange('z', v)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase">Notes</label>
        <textarea
          value={notesValue}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Enter notes for this node..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MEMBER PROPERTIES PANEL
// ============================================================================

interface MemberPropertiesProps {
  memberId: string;
}

const MemberProperties: FC<MemberPropertiesProps> = ({ memberId }) => {
  const member = useModelStore((state) => state.members.get(memberId));
  const nodes = useModelStore((state) => state.nodes);
  const updateMember = useModelStore((state) => state.updateMember);

  // Local state for releases (UI only for now)
  const [startReleases, setStartReleases] = useState({ rx: false, ry: false, rz: false });
  const [endReleases, setEndReleases] = useState({ rx: false, ry: false, rz: false });

  // Calculate member length
  const length = useMemo(() => {
    if (!member) return 0;
    const startNode = nodes.get(member.startNodeId);
    const endNode = nodes.get(member.endNodeId);
    if (!startNode || !endNode) return 0;

    const start = new Vector3(startNode.x, startNode.y, startNode.z);
    const end = new Vector3(endNode.x, endNode.y, endNode.z);
    return start.distanceTo(end);
  }, [member, nodes]);

  if (!member) return null;

  const handleSectionChange = (sectionId: string) => {
    updateMember(memberId, { sectionId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <GitBranch size={16} className="text-purple-400" />
        Member Properties
      </div>

      <div className="bg-gray-800/50 rounded p-3 space-y-1 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>ID:</span>
          <span className="text-white font-mono">{memberId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Start Node:</span>
          <span className="text-white font-mono">{member.startNodeId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>End Node:</span>
          <span className="text-white font-mono">{member.endNodeId.slice(0, 8)}...</span>
        </div>
      </div>

      <NumberInput
        label="Length (m)"
        value={length}
        onChange={() => {}}
        readOnly
      />

      <SectionDropdown
        value={member.sectionId}
        onChange={handleSectionChange}
      />

      <ReleasesCheckboxes
        startReleases={startReleases}
        endReleases={endReleases}
        onStartChange={(axis, value) =>
          setStartReleases((prev) => ({ ...prev, [axis]: value }))
        }
        onEndChange={(axis, value) =>
          setEndReleases((prev) => ({ ...prev, [axis]: value }))
        }
      />
    </div>
  );
};

// ============================================================================
// MULTI-SELECTION INFO
// ============================================================================

interface MultiSelectionInfoProps {
  nodeCount: number;
  memberCount: number;
}

const MultiSelectionInfo: FC<MultiSelectionInfoProps> = ({ nodeCount, memberCount }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Settings size={16} className="text-yellow-400" />
        Multiple Selection
      </div>

      <div className="bg-gray-800/50 rounded p-3 space-y-2 text-xs">
        {nodeCount > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Nodes selected:</span>
            <span className="text-blue-400 font-semibold">{nodeCount}</span>
          </div>
        )}
        {memberCount > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Members selected:</span>
            <span className="text-purple-400 font-semibold">{memberCount}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Select a single element to edit its properties.
      </p>
    </div>
  );
};

// ============================================================================
// MAIN PROPERTIES PANEL
// ============================================================================

export const PropertiesPanel: FC = () => {
  // Subscribe to selection store
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const selectedMemberIds = useSelectionStore((state) => state.selectedMemberIds);

  const nodeCount = selectedNodeIds.size;
  const memberCount = selectedMemberIds.size;
  const totalSelected = nodeCount + memberCount;

  // Get single selected IDs
  const singleNodeId = nodeCount === 1 ? Array.from(selectedNodeIds)[0] : null;
  const singleMemberId = memberCount === 1 && nodeCount === 0 ? Array.from(selectedMemberIds)[0] : null;

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Settings size={16} />
        Properties
      </h2>

      {/* No Selection */}
      {totalSelected === 0 && (
        <p className="text-xs text-gray-500">
          Select a node or member to view and edit properties.
        </p>
      )}

      {/* Single Node Selected */}
      {singleNodeId && <NodeProperties nodeId={singleNodeId} />}

      {/* Single Member Selected */}
      {singleMemberId && <MemberProperties memberId={singleMemberId} />}

      {/* Multiple Selection */}
      {totalSelected > 1 && (
        <MultiSelectionInfo nodeCount={nodeCount} memberCount={memberCount} />
      )}
    </div>
  );
};

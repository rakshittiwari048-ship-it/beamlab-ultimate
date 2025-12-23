/**
 * PropertyInspector.tsx
 *
 * Side panel for editing Member Properties (SkyCiv-style)
 *
 * Features:
 * - Selection-aware: Shows "No Selection" or member form
 * - Section Picker: Database dropdown + section size dropdown
 * - Material Editor: E (Modulus), Fy (Yield) with presets
 * - Live Update: Immediate dispatch to uiStore.updateMember()
 *
 * Author: BeamLab Team
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useUIStore, type MemberProperties } from '../../store/uiStore';
import sectionsData from '../../data/sections.json';
import {
  ChevronDown,
  Box,
  Ruler,
  Layers,
  Settings2,
  Trash2,
  Copy,
  X,
  Zap,
  Package,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type DatabaseKey = 'EU' | 'US' | 'UK';

interface SectionProperties {
  type: string;
  h: number;
  b: number;
  tw: number;
  tf: number;
  area: number;
  Iy: number;
  Iz: number;
  weight: number;
}

interface MaterialProperties {
  description: string;
  E: number;
  Fy: number;
  Fu: number;
  density: number;
  poisson: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatNumber = (value: number, decimals: number = 0): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  return value.toFixed(decimals);
};

const getDatabaseSections = (database: DatabaseKey): Record<string, SectionProperties> => {
  return (sectionsData.databases[database]?.sections || {}) as Record<string, SectionProperties>;
};

const getMaterials = (): Record<string, MaterialProperties> => {
  return sectionsData.materials as Record<string, MaterialProperties>;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
}) => {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-8 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     appearance-none cursor-pointer hover:border-blue-400 focus:border-blue-500 
                     focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

interface NumberFieldProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  unit,
  onChange,
  icon,
  min = 0,
  max,
  step = 1,
  readOnly = false,
}) => {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          className={`w-full px-3 py-2 pr-12 text-sm border border-gray-200 rounded-lg 
                     focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none 
                     transition-colors ${readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 hover:border-blue-400'}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
          {unit}
        </span>
      </div>
    </div>
  );
};

interface SectionCardProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({
  label,
  children,
  icon,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-gray-700">
          {icon}
          {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};

// ============================================================================
// NO SELECTION STATE
// ============================================================================

const NoSelection: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Box className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Selection</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Click on a member in the 3D view to select it and edit its properties here.
      </p>
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-600">
          💡 <strong>Tip:</strong> Use the Pen Tool in the Modeling tab to draw new members.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MEMBER INFO HEADER
// ============================================================================

interface MemberHeaderProps {
  memberId: string;
  length: number;
  onDelete: () => void;
  onDeselect: () => void;
}

const MemberHeader: React.FC<MemberHeaderProps> = ({
  memberId,
  length,
  onDelete,
  onDeselect,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl mb-4 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-80">SELECTED MEMBER</span>
        <div className="flex gap-1">
          <button
            onClick={onDeselect}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Deselect"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors"
            title="Delete Member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-lg truncate max-w-[180px]" title={memberId}>
            {memberId.split('-').slice(0, 2).join('-')}
          </p>
          <p className="text-xs opacity-80">
            Length: <span className="font-mono">{length.toFixed(3)} m</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PROPERTY INSPECTOR COMPONENT
// ============================================================================

export const PropertyInspector: React.FC = () => {
  // Store state
  const selectedMemberId = useUIStore((state) => state.selectedMemberId);
  const members = useUIStore((state) => state.members);
  const updateMember = useUIStore((state) => state.updateMember);
  const deleteMember = useUIStore((state) => state.deleteMember);
  const setSelectedMember = useUIStore((state) => state.setSelectedMember);

  // Get selected member
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, members]);

  // Local state for form
  const [database, setDatabase] = useState<DatabaseKey>('EU');
  const [sectionSize, setSectionSize] = useState<string>('IPE 200');
  const [material, setMaterial] = useState<string>('Steel S275');
  const [customE, setCustomE] = useState<number>(210000);
  const [customFy, setCustomFy] = useState<number>(275);

  // Sync local state with selected member
  useEffect(() => {
    if (selectedMember) {
      setDatabase(selectedMember.properties.sectionDatabase);
      setSectionSize(selectedMember.properties.sectionSize);
      setMaterial(selectedMember.properties.material);
      setCustomE(selectedMember.properties.E);
      setCustomFy(selectedMember.properties.Fy);
    }
  }, [selectedMember]);

  // Calculate member length
  const memberLength = useMemo(() => {
    if (!selectedMember) return 0;
    const [x1, y1, z1] = selectedMember.start;
    const [x2, y2, z2] = selectedMember.end;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
  }, [selectedMember]);

  // Get available sections for selected database
  const availableSections = useMemo(() => {
    const sections = getDatabaseSections(database);
    return Object.keys(sections).map((name) => ({
      value: name,
      label: name,
    }));
  }, [database]);

  // Get available materials
  const availableMaterials = useMemo(() => {
    const materials = getMaterials();
    return Object.keys(materials).map((name) => ({
      value: name,
      label: name,
    }));
  }, []);

  // Database options
  const databaseOptions = [
    { value: 'EU', label: 'European (HE/IPE)' },
    { value: 'US', label: 'US (W-Shapes)' },
    { value: 'UK', label: 'UK (UB/UC)' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleDatabaseChange = useCallback(
    (newDatabase: string) => {
      const db = newDatabase as DatabaseKey;
      setDatabase(db);

      // Get first section in new database as default
      const sections = getDatabaseSections(db);
      const firstSection = Object.keys(sections)[0];
      setSectionSize(firstSection);

      if (selectedMemberId && firstSection) {
        const sectionProps = sections[firstSection];
        updateMember(selectedMemberId, {
          sectionDatabase: db,
          sectionSize: firstSection,
          area: sectionProps.area,
          Iy: sectionProps.Iy,
          Iz: sectionProps.Iz,
        });
      }
    },
    [selectedMemberId, updateMember]
  );

  const handleSectionChange = useCallback(
    (newSection: string) => {
      setSectionSize(newSection);

      const sections = getDatabaseSections(database);
      const sectionProps = sections[newSection];

      if (selectedMemberId && sectionProps) {
        updateMember(selectedMemberId, {
          sectionSize: newSection,
          area: sectionProps.area,
          Iy: sectionProps.Iy,
          Iz: sectionProps.Iz,
        });
      }
    },
    [database, selectedMemberId, updateMember]
  );

  const handleMaterialChange = useCallback(
    (newMaterial: string) => {
      setMaterial(newMaterial);

      const materials = getMaterials();
      const materialProps = materials[newMaterial];

      if (selectedMemberId && materialProps) {
        setCustomE(materialProps.E);
        setCustomFy(materialProps.Fy);
        updateMember(selectedMemberId, {
          material: newMaterial,
          E: materialProps.E,
          Fy: materialProps.Fy,
        });
      }
    },
    [selectedMemberId, updateMember]
  );

  const handleCustomEChange = useCallback(
    (value: number) => {
      setCustomE(value);
      setMaterial('Custom');
      if (selectedMemberId) {
        updateMember(selectedMemberId, {
          material: 'Custom',
          E: value,
        });
      }
    },
    [selectedMemberId, updateMember]
  );

  const handleCustomFyChange = useCallback(
    (value: number) => {
      setCustomFy(value);
      setMaterial('Custom');
      if (selectedMemberId) {
        updateMember(selectedMemberId, {
          material: 'Custom',
          Fy: value,
        });
      }
    },
    [selectedMemberId, updateMember]
  );

  const handleDelete = useCallback(() => {
    if (selectedMemberId && confirm('Delete this member?')) {
      deleteMember(selectedMemberId);
    }
  }, [selectedMemberId, deleteMember]);

  const handleDeselect = useCallback(() => {
    setSelectedMember(null);
  }, [setSelectedMember]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Get current section properties for display
  const currentSectionProps = useMemo(() => {
    const sections = getDatabaseSections(database);
    return sections[sectionSize] || null;
  }, [database, sectionSize]);

  if (!selectedMemberId || !selectedMember) {
    return (
      <div className="h-full bg-gray-50 border-l border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Property Inspector
          </h2>
        </div>
        <NoSelection />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Property Inspector
        </h2>
      </div>

      <div className="p-4">
        {/* Member Header Card */}
        <MemberHeader
          memberId={selectedMember.id}
          length={memberLength}
          onDelete={handleDelete}
          onDeselect={handleDeselect}
        />

        {/* Section Picker */}
        <SectionCard
          label="Section"
          icon={<Layers className="w-4 h-4 text-blue-500" />}
          defaultOpen={true}
        >
          <SelectField
            label="Section Database"
            value={database}
            options={databaseOptions}
            onChange={handleDatabaseChange}
            icon={<Package className="w-3.5 h-3.5" />}
          />

          <SelectField
            label="Section Size"
            value={sectionSize}
            options={availableSections}
            onChange={handleSectionChange}
            icon={<Box className="w-3.5 h-3.5" />}
          />

          {/* Section Properties Display */}
          {currentSectionProps && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">
                SECTION PROPERTIES
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{currentSectionProps.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Height:</span>
                  <span className="font-mono">{currentSectionProps.h} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Area:</span>
                  <span className="font-mono">{formatNumber(currentSectionProps.area)} mm²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Weight:</span>
                  <span className="font-mono">{currentSectionProps.weight} kg/m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Iy:</span>
                  <span className="font-mono">{formatNumber(currentSectionProps.Iy)} mm⁴</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Iz:</span>
                  <span className="font-mono">{formatNumber(currentSectionProps.Iz)} mm⁴</span>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Material Editor */}
        <SectionCard
          label="Material"
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          defaultOpen={true}
        >
          <SelectField
            label="Material Preset"
            value={material}
            options={[
              ...availableMaterials,
              { value: 'Custom', label: '✏️ Custom Values' },
            ]}
            onChange={handleMaterialChange}
          />

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Elastic Modulus (E)"
              value={customE}
              unit="MPa"
              onChange={handleCustomEChange}
              min={1000}
              max={500000}
              step={1000}
            />

            <NumberField
              label="Yield Strength (Fy)"
              value={customFy}
              unit="MPa"
              onChange={handleCustomFyChange}
              min={100}
              max={1000}
              step={5}
            />
          </div>

          {/* Material Info */}
          {material !== 'Custom' && getMaterials()[material] && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                {getMaterials()[material].description}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ρ = {getMaterials()[material].density} kg/m³ | ν = {getMaterials()[material].poisson}
              </p>
            </div>
          )}
        </SectionCard>

        {/* Coordinates (Read-only) */}
        <SectionCard
          label="Geometry"
          icon={<Ruler className="w-4 h-4 text-green-500" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Start Point</p>
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="X"
                  value={selectedMember.start[0]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
                <NumberField
                  label="Y"
                  value={selectedMember.start[1]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
                <NumberField
                  label="Z"
                  value={selectedMember.start[2]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">End Point</p>
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="X"
                  value={selectedMember.end[0]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
                <NumberField
                  label="Y"
                  value={selectedMember.end[1]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
                <NumberField
                  label="Z"
                  value={selectedMember.end[2]}
                  unit="m"
                  onChange={() => {}}
                  readOnly
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              if (selectedMember) {
                navigator.clipboard.writeText(JSON.stringify(selectedMember, null, 2));
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm 
                       text-gray-600 bg-white border border-gray-200 rounded-lg 
                       hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy JSON
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm 
                       text-red-600 bg-red-50 border border-red-200 rounded-lg 
                       hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyInspector;

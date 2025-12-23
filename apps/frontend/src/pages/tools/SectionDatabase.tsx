// @ts-nocheck
/**
 * SectionDatabase.tsx
 * 
 * Steel Section Database - Free Tool
 * Searchable database of AISC and Indian Standard steel sections
 * with interactive 2D cross-section visualization.
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Database,
  Search,
  ChevronDown,
  Copy,
  Check,
  Info,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

// Import JSON data
import aiscShapesData from '../../data/aisc-shapes.json';
import isSectionsData from '../../data/is-sections.json';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedSection {
  id: string;
  name: string;
  standard: 'AISC' | 'IS';
  type: string;
  depth: number;           // Consistent units based on standard
  width: number;           // Flange width
  flangeThickness: number; // tf
  webThickness: number;    // tw
  area: number;            // Cross-sectional area
  Ix: number;              // Moment of inertia (major axis)
  Iy: number;              // Moment of inertia (minor axis)
  Zx?: number;             // Section modulus (major axis) - calculated
  Zy?: number;             // Section modulus (minor axis) - calculated
  weight: number;          // Weight per unit length
  units: {
    length: string;
    area: string;
    inertia: string;
    modulus: string;
    weight: string;
  };
}

type HighlightedProperty = 'depth' | 'width' | 'flangeThickness' | 'webThickness' | null;

// ============================================================================
// DATA PROCESSING
// ============================================================================

function processAiscSections(): UnifiedSection[] {
  return aiscShapesData.wShapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    standard: 'AISC' as const,
    type: 'W-Shape',
    depth: shape.depth,
    width: shape.flangeWidth,
    flangeThickness: shape.flangeThickness,
    webThickness: shape.webThickness,
    area: shape.area,
    Ix: shape.Ix,
    Iy: shape.Iy,
    Zx: shape.depth > 0 ? +(shape.Ix / (shape.depth / 2)).toFixed(1) : 0,
    Zy: shape.flangeWidth > 0 ? +(shape.Iy / (shape.flangeWidth / 2)).toFixed(1) : 0,
    weight: shape.weight,
    units: {
      length: 'in',
      area: 'in²',
      inertia: 'in⁴',
      modulus: 'in³',
      weight: 'lb/ft',
    },
  }));
}

function processIsSections(): UnifiedSection[] {
  return isSectionsData.sections.map((section) => ({
    id: section.id,
    name: section.name,
    standard: 'IS' as const,
    type: section.type,
    depth: section.depth,
    width: section.flangeWidth,
    flangeThickness: section.flangeThickness,
    webThickness: section.webThickness,
    area: section.area / 100, // mm² to cm²
    Ix: section.Ixx / 10000, // mm⁴ to cm⁴
    Iy: section.Iyy / 10000, // mm⁴ to cm⁴
    Zx: section.depth > 0 ? +((section.Ixx / 10000) / (section.depth / 20)).toFixed(0) : 0,
    Zy: section.flangeWidth > 0 ? +((section.Iyy / 10000) / (section.flangeWidth / 20)).toFixed(0) : 0,
    weight: section.weight,
    units: {
      length: 'mm',
      area: 'cm²',
      inertia: 'cm⁴',
      modulus: 'cm³',
      weight: 'kg/m',
    },
  }));
}

// Combine all sections
const allSections: UnifiedSection[] = [
  ...processAiscSections(),
  ...processIsSections(),
];

const standardOptions = [
  { value: 'all', label: 'All Standards' },
  { value: 'AISC', label: 'AISC (US)' },
  { value: 'IS', label: 'IS (India)' },
];

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'W-Shape', label: 'W-Shapes (AISC)' },
  { value: 'ISMB', label: 'ISMB (I-Beams)' },
  { value: 'ISWB', label: 'ISWB (Wide Beams)' },
  { value: 'ISLB', label: 'ISLB (Light Beams)' },
  { value: 'ISJB', label: 'ISJB (Junior Beams)' },
];

// ============================================================================
// NAVBAR
// ============================================================================

function ToolNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              to="/tools"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">All Tools</span>
            </Link>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Steel Section Database</span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Full App
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// INTERACTIVE SECTION DIAGRAM
// ============================================================================

interface SectionDiagramProps {
  section: UnifiedSection;
  highlightedProperty: HighlightedProperty;
  onHoverProperty: (prop: HighlightedProperty) => void;
}

function InteractiveSectionDiagram({ section, highlightedProperty, onHoverProperty }: SectionDiagramProps) {
  const isMetric = section.standard === 'IS';
  
  // Scale for SVG (normalize to ~100px height)
  const scaleFactor = isMetric ? 0.15 : 2.5;
  const d = section.depth * scaleFactor;
  const b = section.width * scaleFactor;
  const tf = Math.max(section.flangeThickness * scaleFactor * (isMetric ? 1 : 5), 4);
  const tw = Math.max(section.webThickness * scaleFactor * (isMetric ? 1 : 5), 3);

  const width = Math.max(b + 80, 140);
  const height = Math.max(d + 80, 160);

  const getPartColor = (part: HighlightedProperty) => {
    if (highlightedProperty === part) return '#3b82f6'; // blue-500
    return '#94a3b8'; // slate-400
  };

  const getLabelStyle = (part: HighlightedProperty) => ({
    fill: highlightedProperty === part ? '#1e40af' : '#64748b',
    fontWeight: highlightedProperty === part ? 600 : 400,
  });

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
      className="overflow-visible"
    >
      {/* Top Flange - Interactive */}
      <g
        onMouseEnter={() => onHoverProperty('flangeThickness')}
        onMouseLeave={() => onHoverProperty(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={-b/2}
          y={-d/2}
          width={b}
          height={tf}
          fill={getPartColor('flangeThickness')}
          stroke={highlightedProperty === 'flangeThickness' ? '#1d4ed8' : '#475569'}
          strokeWidth={highlightedProperty === 'flangeThickness' ? 2 : 1}
          rx={1}
        />
        <text
          x={b/2 + 8}
          y={-d/2 + tf/2 + 4}
          className="text-[10px]"
          style={getLabelStyle('flangeThickness')}
        >
          tf
        </text>
      </g>

      {/* Bottom Flange - Interactive */}
      <g
        onMouseEnter={() => onHoverProperty('flangeThickness')}
        onMouseLeave={() => onHoverProperty(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={-b/2}
          y={d/2 - tf}
          width={b}
          height={tf}
          fill={getPartColor('flangeThickness')}
          stroke={highlightedProperty === 'flangeThickness' ? '#1d4ed8' : '#475569'}
          strokeWidth={highlightedProperty === 'flangeThickness' ? 2 : 1}
          rx={1}
        />
      </g>

      {/* Web - Interactive */}
      <g
        onMouseEnter={() => onHoverProperty('webThickness')}
        onMouseLeave={() => onHoverProperty(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={-tw/2}
          y={-d/2 + tf}
          width={tw}
          height={d - 2*tf}
          fill={getPartColor('webThickness')}
          stroke={highlightedProperty === 'webThickness' ? '#1d4ed8' : '#475569'}
          strokeWidth={highlightedProperty === 'webThickness' ? 2 : 1}
        />
        <text
          x={tw/2 + 6}
          y={0}
          className="text-[10px]"
          style={getLabelStyle('webThickness')}
        >
          tw
        </text>
      </g>

      {/* Depth dimension line */}
      <g
        onMouseEnter={() => onHoverProperty('depth')}
        onMouseLeave={() => onHoverProperty(null)}
        style={{ cursor: 'pointer' }}
      >
        <line
          x1={-b/2 - 20}
          y1={-d/2}
          x2={-b/2 - 20}
          y2={d/2}
          stroke={getPartColor('depth')}
          strokeWidth={highlightedProperty === 'depth' ? 2 : 1}
          markerStart="url(#arrowUp)"
          markerEnd="url(#arrowDown)"
        />
        <line x1={-b/2 - 25} y1={-d/2} x2={-b/2 - 15} y2={-d/2} stroke={getPartColor('depth')} strokeWidth={1} />
        <line x1={-b/2 - 25} y1={d/2} x2={-b/2 - 15} y2={d/2} stroke={getPartColor('depth')} strokeWidth={1} />
        <text
          x={-b/2 - 32}
          y={4}
          className="text-[11px] font-medium"
          style={getLabelStyle('depth')}
          textAnchor="end"
        >
          d
        </text>
      </g>

      {/* Width dimension line */}
      <g
        onMouseEnter={() => onHoverProperty('width')}
        onMouseLeave={() => onHoverProperty(null)}
        style={{ cursor: 'pointer' }}
      >
        <line
          x1={-b/2}
          y1={d/2 + 20}
          x2={b/2}
          y2={d/2 + 20}
          stroke={getPartColor('width')}
          strokeWidth={highlightedProperty === 'width' ? 2 : 1}
          markerStart="url(#arrowLeft)"
          markerEnd="url(#arrowRight)"
        />
        <line x1={-b/2} y1={d/2 + 15} x2={-b/2} y2={d/2 + 25} stroke={getPartColor('width')} strokeWidth={1} />
        <line x1={b/2} y1={d/2 + 15} x2={b/2} y2={d/2 + 25} stroke={getPartColor('width')} strokeWidth={1} />
        <text
          x={0}
          y={d/2 + 35}
          className="text-[11px] font-medium"
          style={getLabelStyle('width')}
          textAnchor="middle"
        >
          bf
        </text>
      </g>

      {/* Axis lines */}
      <line x1={-b/2 - 10} y1={0} x2={b/2 + 10} y2={0} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
      <line x1={0} y1={-d/2 - 10} x2={0} y2={d/2 + 10} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
      <text x={b/2 + 15} y={4} className="text-[9px] fill-slate-400">x</text>
      <text x={4} y={-d/2 - 12} className="text-[9px] fill-slate-400">y</text>

      {/* Arrow markers */}
      <defs>
        <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M3,6 L0,0 L6,0 Z" fill="#64748b" />
        </marker>
        <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,6 L6,6 L3,0 Z" fill="#64748b" />
        </marker>
        <marker id="arrowLeft" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M6,0 L6,6 L0,3 Z" fill="#64748b" />
        </marker>
        <marker id="arrowRight" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 Z" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}

// ============================================================================
// SECTION TABLE
// ============================================================================

interface SectionTableProps {
  sections: UnifiedSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  highlightedProperty: HighlightedProperty;
}

function SectionTable({ sections, selectedId, onSelect, highlightedProperty }: SectionTableProps) {
  const getHighlightClass = (prop: HighlightedProperty) => {
    if (highlightedProperty === prop) {
      return 'bg-blue-100 text-blue-800 font-semibold';
    }
    return '';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">
                Section
              </th>
              <th className={`px-3 py-3 text-right font-medium text-gray-600 transition-colors ${getHighlightClass('depth')}`}>
                Depth (d)
              </th>
              <th className={`px-3 py-3 text-right font-medium text-gray-600 transition-colors ${getHighlightClass('width')}`}>
                Width (bf)
              </th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Area</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">I<sub>x</sub></th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">I<sub>y</sub></th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Z<sub>x</sub></th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Z<sub>y</sub></th>
              <th className={`px-3 py-3 text-right font-medium text-gray-600 transition-colors ${getHighlightClass('flangeThickness')}`}>
                t<sub>f</sub>
              </th>
              <th className={`px-3 py-3 text-right font-medium text-gray-600 transition-colors ${getHighlightClass('webThickness')}`}>
                t<sub>w</sub>
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr
                key={section.id}
                onClick={() => onSelect(section.id)}
                className={`border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedId === section.id
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-3 py-2.5 font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      section.standard === 'AISC' 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {section.standard}
                    </span>
                    <span className="whitespace-nowrap">{section.name}</span>
                  </div>
                </td>
                <td className={`px-3 py-2.5 text-right text-gray-600 transition-colors ${getHighlightClass('depth')}`}>
                  {section.depth.toFixed(2)}
                </td>
                <td className={`px-3 py-2.5 text-right text-gray-600 transition-colors ${getHighlightClass('width')}`}>
                  {section.width.toFixed(2)}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {section.area.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {section.Ix.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {section.Iy.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {section.Zx?.toLocaleString() ?? '-'}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {section.Zy?.toLocaleString() ?? '-'}
                </td>
                <td className={`px-3 py-2.5 text-right text-gray-600 transition-colors ${getHighlightClass('flangeThickness')}`}>
                  {section.flangeThickness.toFixed(3)}
                </td>
                <td className={`px-3 py-2.5 text-right text-gray-600 transition-colors ${getHighlightClass('webThickness')}`}>
                  {section.webThickness.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sections match your search</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term (e.g., "W14" or "ISMB300")</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION DETAIL PANEL
// ============================================================================

interface SectionDetailProps {
  section: UnifiedSection | null;
  highlightedProperty: HighlightedProperty;
  onHoverProperty: (prop: HighlightedProperty) => void;
}

function SectionDetail({ section, highlightedProperty, onHoverProperty }: SectionDetailProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!section) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Select a section to view details</p>
          <p className="text-sm text-gray-400 mt-1">Click any row in the table</p>
        </div>
      </div>
    );
  }

  const properties: { label: string; key: HighlightedProperty | null; value: number | string; unit: string }[] = [
    { label: 'Depth (d)', key: 'depth', value: section.depth, unit: section.units.length },
    { label: 'Flange Width (bf)', key: 'width', value: section.width, unit: section.units.length },
    { label: 'Web Thickness (tw)', key: 'webThickness', value: section.webThickness, unit: section.units.length },
    { label: 'Flange Thickness (tf)', key: 'flangeThickness', value: section.flangeThickness, unit: section.units.length },
    { label: 'Area (A)', key: null, value: section.area, unit: section.units.area },
    { label: 'Moment of Inertia (Ix)', key: null, value: section.Ix, unit: section.units.inertia },
    { label: 'Moment of Inertia (Iy)', key: null, value: section.Iy, unit: section.units.inertia },
    { label: 'Section Modulus (Zx)', key: null, value: section.Zx ?? 0, unit: section.units.modulus },
    { label: 'Section Modulus (Zy)', key: null, value: section.Zy ?? 0, unit: section.units.modulus },
    { label: 'Weight', key: null, value: section.weight, unit: section.units.weight },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 text-xs rounded-md font-medium ${
              section.standard === 'AISC' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {section.standard}
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{section.name}</h2>
              <p className="text-sm text-gray-500">{section.type}</p>
            </div>
          </div>
        </div>

        {/* Interactive Diagram */}
        <div className="p-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center justify-center">
            <InteractiveSectionDiagram
              section={section}
              highlightedProperty={highlightedProperty}
              onHoverProperty={onHoverProperty}
            />
          </div>
          <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Hover over diagram parts to highlight properties
          </p>
        </div>

        {/* Properties Grid */}
        <div className="p-4 space-y-1">
          {properties.map((prop) => (
            <div
              key={prop.label}
              onMouseEnter={() => prop.key && onHoverProperty(prop.key)}
              onMouseLeave={() => prop.key && onHoverProperty(null)}
              className={`flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                highlightedProperty === prop.key ? 'bg-blue-50' : 'hover:bg-gray-50'
              } ${prop.key ? 'cursor-pointer' : ''}`}
            >
              <span className={`text-sm ${highlightedProperty === prop.key ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                {prop.label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${highlightedProperty === prop.key ? 'text-blue-800' : 'text-gray-900'}`}>
                  {typeof prop.value === 'number' ? prop.value.toLocaleString() : prop.value}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">{prop.unit}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(String(prop.value), prop.label);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy value"
                >
                  {copiedField === prop.label ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// CTA SECTION
// ============================================================================

function CTASection() {
  return (
    <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Need to use these sections in your design?</h3>
          <p className="text-blue-100 text-sm">
            Import sections directly into BeamLab's 3D analysis workspace for steel design.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          Open 3D Workspace
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SectionDatabase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [standardFilter, setStandardFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedProperty, setHighlightedProperty] = useState<HighlightedProperty>(null);

  const filteredSections = useMemo(() => {
    return allSections.filter(section => {
      // Search filter - match name/id
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' ||
        section.name.toLowerCase().includes(query) ||
        section.id.toLowerCase().includes(query);
      
      // Standard filter
      const matchesStandard = standardFilter === 'all' || section.standard === standardFilter;
      
      // Type filter
      const matchesType = typeFilter === 'all' || section.type === typeFilter;
      
      return matchesSearch && matchesStandard && matchesType;
    });
  }, [searchQuery, standardFilter, typeFilter]);

  const selectedSection = useMemo(() => 
    allSections.find(s => s.id === selectedId) || null,
    [selectedId]
  );

  // Get unique types from filtered sections for dynamic type options
  const availableTypes = useMemo(() => {
    const types = new Set(allSections.filter(s => 
      standardFilter === 'all' || s.standard === standardFilter
    ).map(s => s.type));
    return [
      { value: 'all', label: 'All Types' },
      ...Array.from(types).map(t => ({ value: t, label: t })),
    ];
  }, [standardFilter]);

  return (
    <>
      <Helmet>
        <title>Steel Section Database | AISC W-Shapes & IS Sections | BeamLab</title>
        <meta
          name="description"
          content="Free searchable steel section database with AISC W-shapes and Indian Standard sections. View properties: depth, width, area, moment of inertia, section modulus, weight. Interactive 2D cross-section visualization."
        />
        <meta
          name="keywords"
          content="steel section database, AISC shapes, W14x90, ISMB, steel properties, moment of inertia, section modulus, structural steel, I-beam"
        />
        <link rel="canonical" href="https://beamlab.app/tools/section-database" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Steel Section Database
            </h1>
            <p className="text-gray-600">
              Search and explore AISC W-shapes and Indian Standard steel sections with interactive cross-section visualization.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sections (e.g., W14x90, ISMB300)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={standardFilter}
                  onChange={(e) => {
                    setStandardFilter(e.target.value);
                    setTypeFilter('all'); // Reset type when standard changes
                  }}
                  className="pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  {standardOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                >
                  {availableTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredSections.length}</span> of{' '}
              <span className="font-medium text-gray-700">{allSections.length}</span> sections
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                AISC: {allSections.filter(s => s.standard === 'AISC').length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                IS: {allSections.filter(s => s.standard === 'IS').length}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SectionTable
                sections={filteredSections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                highlightedProperty={highlightedProperty}
              />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <SectionDetail
                  section={selectedSection}
                  highlightedProperty={highlightedProperty}
                  onHoverProperty={setHighlightedProperty}
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <CTASection />
        </main>
      </div>
    </>
  );
}

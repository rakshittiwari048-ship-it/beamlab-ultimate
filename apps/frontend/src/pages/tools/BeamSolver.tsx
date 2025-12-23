// @ts-nocheck
/**
 * BeamSolver.tsx
 * 
 * Interactive 2D Beam Solver - Free Public Tool
 * 
 * Features:
 * - Visual beam editor: draw beam, add supports, add loads by clicking
 * - Uses @beamlab/analysis-engine Solver for accurate FEM analysis
 * - Real-time SFD, BMD, and Deflection diagrams
 * - Hook to upgrade to full 3D workspace
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  MousePointer,
  TriangleIcon,
  ArrowDown,
  Trash2,
  Play,
  RotateCcw,
  Maximize2,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';

// Import analysis engine
import {
  Solver,
  type SolverNode,
  type SolverMember,
  type SolverSupport,
  type NodalLoad,
} from '@beamlab/analysis-engine';

// ============================================================================
// TYPES
// ============================================================================

type Tool = 'select' | 'support-pin' | 'support-roller' | 'support-fixed' | 'load-point' | 'load-udl';

interface BeamSupport {
  id: string;
  position: number; // Position along beam (0 to beamLength)
  type: 'pin' | 'roller' | 'fixed';
}

interface BeamLoad {
  id: string;
  type: 'point' | 'udl';
  position: number; // For point load or UDL start
  endPosition?: number; // For UDL end
  magnitude: number; // kN for point, kN/m for UDL
}

interface AnalysisResults {
  maxShear: number;
  maxMoment: number;
  maxDeflection: number;
  sfdData: { x: number; value: number }[];
  bmdData: { x: number; value: number }[];
  deflectionData: { x: number; value: number }[];
  reactions: { position: number; fy: number; mz: number }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CANVAS_PADDING = 60;
const BEAM_Y = 150;
const GRID_SPACING = 50;

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; shortcut?: string }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
  { id: 'support-pin', label: 'Pin Support', icon: <TriangleIcon className="w-4 h-4" />, shortcut: '1' },
  { id: 'support-roller', label: 'Roller Support', icon: <div className="w-4 h-4 flex items-center justify-center"><div className="w-3 h-3 rounded-full border-2 border-current" /></div>, shortcut: '2' },
  { id: 'support-fixed', label: 'Fixed Support', icon: <div className="w-4 h-4 border-l-2 border-current" />, shortcut: '3' },
  { id: 'load-point', label: 'Point Load', icon: <ArrowDown className="w-4 h-4" />, shortcut: 'P' },
  { id: 'load-udl', label: 'Distributed Load', icon: <div className="w-4 h-4 flex flex-col gap-0.5"><div className="flex justify-between"><ArrowDown className="w-1.5 h-1.5" /><ArrowDown className="w-1.5 h-1.5" /><ArrowDown className="w-1.5 h-1.5" /></div></div>, shortcut: 'U' },
];

// ============================================================================
// NAVBAR
// ============================================================================

function ToolNavbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-4">
            <Link
              to="/tools"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Tools</span>
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">2D Beam Solver</span>
            </div>
          </div>
          <Link
            to="/workspace/3d"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Open 3D Workspace
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// BEAM CANVAS
// ============================================================================

interface BeamCanvasProps {
  beamLength: number;
  supports: BeamSupport[];
  loads: BeamLoad[];
  selectedTool: Tool;
  selectedId: string | null;
  onAddSupport: (position: number, type: 'pin' | 'roller' | 'fixed') => void;
  onAddLoad: (position: number, type: 'point' | 'udl') => void;
  onSelect: (id: string | null) => void;
}

function BeamCanvas({
  beamLength,
  supports,
  loads,
  selectedTool,
  selectedId,
  onAddSupport,
  onAddLoad,
  onSelect,
}: BeamCanvasProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [udlStart, setUdlStart] = useState<number | null>(null);

  // Scale factor: pixels per meter
  const scale = useMemo(() => 
    (canvasWidth - 2 * CANVAS_PADDING) / beamLength,
    [canvasWidth, beamLength]
  );

  // Position to x coordinate
  const posToX = useCallback((pos: number) => 
    CANVAS_PADDING + pos * scale,
    [scale]
  );

  // X coordinate to position
  const xToPos = useCallback((x: number) => {
    const pos = (x - CANVAS_PADDING) / scale;
    return Math.max(0, Math.min(beamLength, pos));
  }, [scale, beamLength]);

  // Resize handler
  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current?.parentElement) {
        setCanvasWidth(canvasRef.current.parentElement.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pos = xToPos(x);
    
    // Snap to 0.25m increments
    const snappedPos = Math.round(pos * 4) / 4;

    // Check if clicking on beam area
    if (y < BEAM_Y - 80 || y > BEAM_Y + 60) {
      onSelect(null);
      return;
    }

    switch (selectedTool) {
      case 'select':
        onSelect(null);
        break;
      case 'support-pin':
        onAddSupport(snappedPos, 'pin');
        break;
      case 'support-roller':
        onAddSupport(snappedPos, 'roller');
        break;
      case 'support-fixed':
        onAddSupport(snappedPos, 'fixed');
        break;
      case 'load-point':
        onAddLoad(snappedPos, 'point');
        break;
      case 'load-udl':
        if (udlStart === null) {
          setUdlStart(snappedPos);
        } else {
          // Create UDL from start to current position
          const start = Math.min(udlStart, snappedPos);
          const end = Math.max(udlStart, snappedPos);
          if (end > start) {
            onAddLoad(start, 'udl');
          }
          setUdlStart(null);
        }
        break;
    }
  }, [selectedTool, xToPos, onAddSupport, onAddLoad, onSelect, udlStart]);

  // Render support
  const renderSupport = (support: BeamSupport) => {
    const x = posToX(support.position);
    const isSelected = selectedId === support.id;
    const color = isSelected ? '#22c55e' : '#3b82f6';

    switch (support.type) {
      case 'pin':
        return (
          <g
            key={support.id}
            onClick={(e) => { e.stopPropagation(); onSelect(support.id); }}
            className="cursor-pointer"
          >
            <polygon
              points={`${x},${BEAM_Y} ${x-12},${BEAM_Y+20} ${x+12},${BEAM_Y+20}`}
              fill={color}
              stroke={isSelected ? '#16a34a' : '#2563eb'}
              strokeWidth={2}
            />
            <line x1={x-15} y1={BEAM_Y+23} x2={x+15} y2={BEAM_Y+23} stroke={color} strokeWidth={2} />
          </g>
        );
      case 'roller':
        return (
          <g
            key={support.id}
            onClick={(e) => { e.stopPropagation(); onSelect(support.id); }}
            className="cursor-pointer"
          >
            <polygon
              points={`${x},${BEAM_Y} ${x-12},${BEAM_Y+16} ${x+12},${BEAM_Y+16}`}
              fill={color}
              stroke={isSelected ? '#16a34a' : '#2563eb'}
              strokeWidth={2}
            />
            <circle cx={x-8} cy={BEAM_Y+22} r={5} fill={color} />
            <circle cx={x+8} cy={BEAM_Y+22} r={5} fill={color} />
            <line x1={x-15} y1={BEAM_Y+29} x2={x+15} y2={BEAM_Y+29} stroke={color} strokeWidth={2} />
          </g>
        );
      case 'fixed':
        return (
          <g
            key={support.id}
            onClick={(e) => { e.stopPropagation(); onSelect(support.id); }}
            className="cursor-pointer"
          >
            <rect
              x={support.position === 0 ? x - 8 : x}
              y={BEAM_Y - 25}
              width={8}
              height={50}
              fill={color}
            />
            {/* Hatching */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1={support.position === 0 ? x - 8 : x + 8}
                y1={BEAM_Y - 25 + i * 12}
                x2={support.position === 0 ? x - 18 : x + 18}
                y2={BEAM_Y - 20 + i * 12}
                stroke={color}
                strokeWidth={1.5}
              />
            ))}
          </g>
        );
    }
  };

  // Render load
  const renderLoad = (load: BeamLoad) => {
    const isSelected = selectedId === load.id;
    const color = isSelected ? '#22c55e' : '#ef4444';

    if (load.type === 'point') {
      const x = posToX(load.position);
      const arrowLength = Math.min(60, Math.abs(load.magnitude) * 3 + 20);
      
      return (
        <g
          key={load.id}
          onClick={(e) => { e.stopPropagation(); onSelect(load.id); }}
          className="cursor-pointer"
        >
          <line
            x1={x}
            y1={BEAM_Y - arrowLength}
            x2={x}
            y2={BEAM_Y - 5}
            stroke={color}
            strokeWidth={3}
          />
          <polygon
            points={`${x},${BEAM_Y} ${x-6},${BEAM_Y-12} ${x+6},${BEAM_Y-12}`}
            fill={color}
          />
          <text
            x={x}
            y={BEAM_Y - arrowLength - 8}
            textAnchor="middle"
            className="text-xs font-medium"
            fill={color}
          >
            {load.magnitude} kN
          </text>
        </g>
      );
    } else {
      // UDL
      const x1 = posToX(load.position);
      const x2 = posToX(load.endPosition ?? load.position + 1);
      const arrowCount = Math.max(3, Math.floor((x2 - x1) / 25));
      const spacing = (x2 - x1) / (arrowCount - 1);

      return (
        <g
          key={load.id}
          onClick={(e) => { e.stopPropagation(); onSelect(load.id); }}
          className="cursor-pointer"
        >
          <rect
            x={x1}
            y={BEAM_Y - 50}
            width={x2 - x1}
            height={45}
            fill={color}
            fillOpacity={0.1}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4"
          />
          {Array.from({ length: arrowCount }).map((_, i) => {
            const ax = x1 + i * spacing;
            return (
              <g key={i}>
                <line x1={ax} y1={BEAM_Y - 45} x2={ax} y2={BEAM_Y - 5} stroke={color} strokeWidth={1.5} />
                <polygon points={`${ax},${BEAM_Y} ${ax-4},${BEAM_Y-8} ${ax+4},${BEAM_Y-8}`} fill={color} />
              </g>
            );
          })}
          <text
            x={(x1 + x2) / 2}
            y={BEAM_Y - 55}
            textAnchor="middle"
            className="text-xs font-medium"
            fill={color}
          >
            {load.magnitude} kN/m
          </text>
        </g>
      );
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <svg
        ref={canvasRef}
        width="100%"
        height={280}
        onClick={handleCanvasClick}
        className="cursor-crosshair"
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={GRID_SPACING} height={GRID_SPACING} patternUnits="userSpaceOnUse">
            <path
              d={`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`}
              fill="none"
              stroke="#334155"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Dimension line */}
        <line
          x1={posToX(0)}
          y1={BEAM_Y + 60}
          x2={posToX(beamLength)}
          y2={BEAM_Y + 60}
          stroke="#64748b"
          strokeWidth={1}
        />
        <text
          x={posToX(beamLength / 2)}
          y={BEAM_Y + 78}
          textAnchor="middle"
          fill="#94a3b8"
          className="text-sm"
        >
          L = {beamLength} m
        </text>

        {/* Beam */}
        <line
          x1={posToX(0)}
          y1={BEAM_Y}
          x2={posToX(beamLength)}
          y2={BEAM_Y}
          stroke="#60a5fa"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Supports */}
        {supports.map(renderSupport)}

        {/* Loads */}
        {loads.map(renderLoad)}

        {/* UDL preview when drawing */}
        {udlStart !== null && (
          <line
            x1={posToX(udlStart)}
            y1={BEAM_Y - 30}
            x2={posToX(udlStart)}
            y2={BEAM_Y - 30}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4"
          />
        )}

        {/* Position markers */}
        {Array.from({ length: Math.floor(beamLength) + 1 }).map((_, i) => (
          <g key={i}>
            <line
              x1={posToX(i)}
              y1={BEAM_Y + 4}
              x2={posToX(i)}
              y2={BEAM_Y + 10}
              stroke="#64748b"
              strokeWidth={1}
            />
            <text
              x={posToX(i)}
              y={BEAM_Y + 45}
              textAnchor="middle"
              fill="#64748b"
              className="text-xs"
            >
              {i}m
            </text>
          </g>
        ))}
      </svg>

      {/* Tool hint */}
      <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700 text-xs text-slate-400">
        {selectedTool === 'select' && 'Click on elements to select them'}
        {selectedTool === 'support-pin' && 'Click on beam to add pinned support (restrains vertical + horizontal)'}
        {selectedTool === 'support-roller' && 'Click on beam to add roller support (restrains vertical only)'}
        {selectedTool === 'support-fixed' && 'Click at beam ends to add fixed support (restrains all DOFs)'}
        {selectedTool === 'load-point' && 'Click on beam to add point load (downward)'}
        {selectedTool === 'load-udl' && (udlStart === null 
          ? 'Click to start UDL region' 
          : 'Click again to end UDL region')}
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarProps {
  selectedTool: Tool;
  onSelectTool: (tool: Tool) => void;
  onReset: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

function Toolbar({
  selectedTool,
  onSelectTool,
  onReset,
  onAnalyze,
  isAnalyzing,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        >
          {tool.icon}
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>

      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isAnalyzing ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        Analyze
      </button>
    </div>
  );
}

// ============================================================================
// PROPERTIES PANEL
// ============================================================================

interface PropertiesPanelProps {
  beamLength: number;
  onBeamLengthChange: (length: number) => void;
  sectionE: number;
  onSectionEChange: (E: number) => void;
  sectionI: number;
  onSectionIChange: (I: number) => void;
  selectedId: string | null;
  supports: BeamSupport[];
  loads: BeamLoad[];
  onUpdateLoad: (id: string, updates: Partial<BeamLoad>) => void;
  onDelete: (id: string) => void;
}

function PropertiesPanel({
  beamLength,
  onBeamLengthChange,
  sectionE,
  onSectionEChange,
  sectionI,
  onSectionIChange,
  selectedId,
  supports,
  loads,
  onUpdateLoad,
  onDelete,
}: PropertiesPanelProps) {
  const selectedSupport = supports.find((s: BeamSupport) => s.id === selectedId);
  const selectedLoad = loads.find((l: BeamLoad) => l.id === selectedId);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-400" />
        Properties
      </h3>

      {/* Beam Properties */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Beam Length (m)</label>
          <input
            type="number"
            value={beamLength}
            onChange={(e) => onBeamLengthChange(Math.max(1, parseFloat(e.target.value) || 1))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            min={1}
            max={50}
            step={0.5}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">E (GPa) - Elastic Modulus</label>
          <input
            type="number"
            value={sectionE / 1e9}
            onChange={(e) => onSectionEChange((parseFloat(e.target.value) || 200) * 1e9)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            min={1}
            step={10}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">I (cm⁴) - Moment of Inertia</label>
          <input
            type="number"
            value={sectionI * 1e8}
            onChange={(e) => onSectionIChange((parseFloat(e.target.value) || 5000) / 1e8)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            min={100}
            step={100}
          />
        </div>
      </div>

      {/* Selected Element */}
      {selectedSupport && (
        <div className="pt-3 border-t border-slate-700 space-y-3">
          <h4 className="text-sm font-medium text-white">
            {selectedSupport.type.charAt(0).toUpperCase() + selectedSupport.type.slice(1)} Support
          </h4>
          <p className="text-xs text-slate-400">
            Position: {selectedSupport.position.toFixed(2)} m
          </p>
          <button
            onClick={() => onDelete(selectedSupport.id)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm w-full hover:bg-red-600/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Support
          </button>
        </div>
      )}

      {selectedLoad && (
        <div className="pt-3 border-t border-slate-700 space-y-3">
          <h4 className="text-sm font-medium text-white">
            {selectedLoad.type === 'point' ? 'Point Load' : 'Distributed Load'}
          </h4>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Magnitude ({selectedLoad.type === 'point' ? 'kN' : 'kN/m'})
            </label>
            <input
              type="number"
              value={selectedLoad.magnitude}
              onChange={(e) => onUpdateLoad(selectedLoad.id, { magnitude: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              step={1}
            />
          </div>
          {selectedLoad.type === 'udl' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start (m)</label>
                <input
                  type="number"
                  value={selectedLoad.position}
                  onChange={(e) => onUpdateLoad(selectedLoad.id, { position: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  step={0.5}
                  min={0}
                  max={beamLength}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">End (m)</label>
                <input
                  type="number"
                  value={selectedLoad.endPosition ?? beamLength}
                  onChange={(e) => onUpdateLoad(selectedLoad.id, { endPosition: parseFloat(e.target.value) || beamLength })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  step={0.5}
                  min={0}
                  max={beamLength}
                />
              </div>
            </div>
          )}
          <button
            onClick={() => onDelete(selectedLoad.id)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm w-full hover:bg-red-600/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Load
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="pt-3 border-t border-slate-700">
        <h4 className="text-xs text-slate-400 mb-2">Model Summary</h4>
        <div className="text-sm text-slate-300 space-y-1">
          <p>{supports.length} support{supports.length !== 1 ? 's' : ''}</p>
          <p>{loads.length} load{loads.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DIAGRAM CHART
// ============================================================================

interface DiagramChartProps {
  title: string;
  data: { x: number; value: number }[];
  beamLength: number;
  color: string;
  unit: string;
  fillPositive?: boolean;
}

function DiagramChart({ title, data, beamLength, color, unit, fillPositive = true }: DiagramChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h4 className="text-sm font-medium text-white mb-3">{title}</h4>
        <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
          Run analysis to see diagram
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 0.001);
  const height = 120;
  const padding = { left: 40, right: 10, top: 10, bottom: 20 };
  const chartWidth = 100; // percentage
  
  const scaleX = (x: number) => `${padding.left + (x / beamLength) * (chartWidth - padding.left - padding.right)}%`;
  const scaleY = (v: number) => height / 2 + (v / maxValue) * ((height - padding.top - padding.bottom) / 2) * (fillPositive ? 1 : -1);

  // Build path
  const pathData = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(d.x).replace('%', '')} ${scaleY(d.value)}`
  ).join(' ');

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <span className="text-xs text-slate-400">
          Max: {maxValue.toFixed(2)} {unit}
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
        {/* Baseline */}
        <line
          x1={padding.left}
          y1={height / 2}
          x2={chartWidth - padding.right}
          y2={height / 2}
          stroke="#475569"
          strokeWidth={0.5}
        />
        
        {/* Fill */}
        <path
          d={`${pathData} L ${chartWidth - padding.right} ${height/2} L ${padding.left} ${height/2} Z`}
          fill={color}
          fillOpacity={0.2}
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* Y-axis labels */}
        <text x={2} y={padding.top + 3} fill="#94a3b8" fontSize={3}>
          +{maxValue.toFixed(1)}
        </text>
        <text x={2} y={height - padding.bottom + 3} fill="#94a3b8" fontSize={3}>
          -{maxValue.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// REACTIONS TABLE
// ============================================================================

interface ReactionsTableProps {
  reactions: { position: number; fy: number; mz: number }[];
}

function ReactionsTable({ reactions }: ReactionsTableProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h4 className="text-sm font-medium text-white mb-3">Support Reactions</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs">
            <th className="text-left py-1">Position</th>
            <th className="text-right py-1">Fy (kN) ↑</th>
            <th className="text-right py-1">Mz (kN·m)</th>
          </tr>
        </thead>
        <tbody>
          {reactions.map((r, i) => (
            <tr key={i} className="text-white border-t border-slate-700">
              <td className="py-2">{r.position.toFixed(2)} m</td>
              <td className="text-right py-2 font-mono">{r.fy.toFixed(2)}</td>
              <td className="text-right py-2 font-mono">{r.mz.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// UPGRADE CTA
// ============================================================================

function UpgradeCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            Need to analyze a frame?
          </h3>
          <p className="text-blue-100 text-sm">
            Open your beam in the full 3D workspace with multi-member frames, 
            3D loading, steel design, and detailed reports.
          </p>
        </div>
        <Link
          to="/workspace/3d"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          <Maximize2 className="w-4 h-4" />
          Open in 3D Workspace
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BeamSolver() {
  // Beam state
  const [beamLength, setBeamLength] = useState(6);
  const [sectionE, setSectionE] = useState(200e9); // 200 GPa steel
  const [sectionI, setSectionI] = useState(5000e-8); // 5000 cm⁴
  
  // Model state
  const [supports, setSupports] = useState<BeamSupport[]>([
    { id: 's1', position: 0, type: 'pin' },
    { id: 's2', position: 6, type: 'roller' },
  ]);
  const [loads, setLoads] = useState<BeamLoad[]>([
    { id: 'l1', type: 'point', position: 3, magnitude: 10 },
  ]);
  
  // UI state
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handlers
  const handleAddSupport = useCallback((position: number, type: 'pin' | 'roller' | 'fixed') => {
    const id = `s${Date.now()}`;
    setSupports((prev: BeamSupport[]) => [...prev, { id, position, type }]);
    setSelectedId(id);
    setSelectedTool('select');
  }, []);

  const handleAddLoad = useCallback((position: number, type: 'point' | 'udl') => {
    const id = `l${Date.now()}`;
    const newLoad: BeamLoad = type === 'point'
      ? { id, type, position, magnitude: 10 }
      : { id, type, position, endPosition: Math.min(position + 2, beamLength), magnitude: 5 };
    setLoads((prev: BeamLoad[]) => [...prev, newLoad]);
    setSelectedId(id);
    setSelectedTool('select');
  }, [beamLength]);

  const handleUpdateLoad = useCallback((id: string, updates: Partial<BeamLoad>) => {
    setLoads((prev: BeamLoad[]) => prev.map((l: BeamLoad) => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSupports((prev: BeamSupport[]) => prev.filter((s: BeamSupport) => s.id !== id));
    setLoads((prev: BeamLoad[]) => prev.filter((l: BeamLoad) => l.id !== id));
    setSelectedId(null);
  }, []);

  const handleReset = useCallback(() => {
    setSupports([
      { id: 's1', position: 0, type: 'pin' },
      { id: 's2', position: beamLength, type: 'roller' },
    ]);
    setLoads([]);
    setResults(null);
    setError(null);
    setSelectedId(null);
  }, [beamLength]);

  // Analysis function using Solver
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Validation
      if (supports.length < 1) {
        throw new Error('Add at least one support to analyze the beam');
      }
      if (loads.length < 1) {
        throw new Error('Add at least one load to analyze the beam');
      }

      // Build solver model
      // Use internal nodes at small intervals for smooth diagrams
      const segments = Math.max(40, Math.ceil(beamLength * 20));
      const dx = beamLength / segments;
      
      const nodes: SolverNode[] = [];
      for (let i = 0; i <= segments; i++) {
        nodes.push({ id: `n${i}`, x: i * dx, y: 0, z: 0 });
      }

      // Members connecting consecutive nodes
      const members: SolverMember[] = [];
      for (let i = 0; i < segments; i++) {
        members.push({
          id: `m${i}`,
          startNodeId: `n${i}`,
          endNodeId: `n${i + 1}`,
          E: sectionE / 1000, // Convert Pa to kN/m²
          A: 0.01, // Cross-sectional area (m²) - arbitrary for bending-only
          Iy: sectionI,
          Iz: sectionI,
          G: sectionE / (2 * 1.3) / 1000,
          J: sectionI * 2,
        });
      }

      // Map supports to nearest nodes
      const solverSupports: SolverSupport[] = supports.map((s: BeamSupport) => {
        const nodeIdx = Math.round(s.position / dx);
        const nodeId = `n${Math.min(nodeIdx, segments)}`;
        
        switch (s.type) {
          case 'pin':
            return { nodeId, dx: true, dy: true, dz: true, rx: true, ry: true, rz: false };
          case 'roller':
            return { nodeId, dx: false, dy: true, dz: true, rx: true, ry: true, rz: false };
          case 'fixed':
            return { nodeId, dx: true, dy: true, dz: true, rx: true, ry: true, rz: true };
        }
      });

      // Build load vector
      const nodalLoads: NodalLoad[] = [];
      
      for (const load of loads) {
        if (load.type === 'point') {
          const nodeIdx = Math.round(load.position / dx);
          nodalLoads.push({
            nodeId: `n${Math.min(nodeIdx, segments)}`,
            fy: -load.magnitude, // Negative for downward
          });
        } else {
          // UDL - convert to equivalent nodal loads
          const startIdx = Math.floor(load.position / dx);
          const endIdx = Math.ceil((load.endPosition ?? load.position + 1) / dx);
          const w = load.magnitude; // kN/m
          
          for (let i = startIdx; i <= endIdx && i <= segments; i++) {
            let contributionLength = dx;
            if (i === startIdx) {
              contributionLength = (i + 1) * dx - load.position;
            } else if (i === endIdx) {
              contributionLength = (load.endPosition ?? load.position + 1) - i * dx;
            }
            contributionLength = Math.max(0, Math.min(dx, contributionLength));
            
            nodalLoads.push({
              nodeId: `n${i}`,
              fy: -w * contributionLength,
            });
          }
        }
      }

      // Create and run solver
      const solver = new Solver({ nodes, members, supports: solverSupports });
      const solution = solver.solve(nodalLoads);

      // Extract deflection from displacements
      const deflectionData: { x: number; value: number }[] = [];
      for (let i = 0; i <= segments; i++) {
        const disp = solution.nodalDisplacements.get(`n${i}`);
        if (disp) {
          deflectionData.push({ 
            x: i * dx, 
            value: disp.dy * 1000 // Convert to mm
          });
        }
      }

      // Get reactions at support nodes
      const reactions: { position: number; fy: number; mz: number }[] = [];
      for (const support of supports) {
        const nodeIdx = Math.round(support.position / dx);
        const nodeId = `n${Math.min(nodeIdx, segments)}`;
        const reaction = solution.nodalReactions.get(nodeId);
        
        if (reaction) {
          reactions.push({
            position: support.position,
            fy: -reaction.fy, // Flip sign for display (upward positive)
            mz: reaction.mz,
          });
        }
      }

      // Calculate SFD from reactions and loads using equilibrium
      const sfdData: { x: number; value: number }[] = [];
      const sortedReactions = [...reactions].sort((a, b) => a.position - b.position);
      
      for (let x = 0; x <= beamLength; x += beamLength / 50) {
        let V = 0;
        // Add reactions to left of current position
        for (const r of sortedReactions) {
          if (r.position <= x + 0.001) V += r.fy;
        }
        // Subtract point loads to left
        for (const l of loads.filter((l: BeamLoad) => l.type === 'point')) {
          if (l.position <= x + 0.001) V -= l.magnitude;
        }
        // Subtract UDL contribution
        for (const l of loads.filter((l: BeamLoad) => l.type === 'udl')) {
          const start = l.position;
          const end = l.endPosition ?? l.position + 1;
          if (x > start) {
            V -= l.magnitude * Math.min(x - start, end - start);
          }
        }
        sfdData.push({ x, value: V });
      }

      // Calculate BMD from SFD (integration using trapezoidal rule)
      const bmdData: { x: number; value: number }[] = [];
      let M = 0;
      for (let i = 0; i < sfdData.length; i++) {
        if (i > 0) {
          const dxStep = sfdData[i].x - sfdData[i - 1].x;
          M += (sfdData[i].value + sfdData[i - 1].value) / 2 * dxStep;
        }
        bmdData.push({ x: sfdData[i].x, value: M });
      }

      // Max values
      const maxShear = Math.max(...sfdData.map(d => Math.abs(d.value)));
      const maxMoment = Math.max(...bmdData.map(d => Math.abs(d.value)));
      const maxDeflection = Math.max(...deflectionData.map(d => Math.abs(d.value)));

      setResults({
        maxShear,
        maxMoment,
        maxDeflection,
        sfdData,
        bmdData,
        deflectionData,
        reactions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [beamLength, sectionE, sectionI, supports, loads]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'v': setSelectedTool('select'); break;
        case '1': setSelectedTool('support-pin'); break;
        case '2': setSelectedTool('support-roller'); break;
        case '3': setSelectedTool('support-fixed'); break;
        case 'p': setSelectedTool('load-point'); break;
        case 'u': setSelectedTool('load-udl'); break;
        case 'delete':
        case 'backspace':
          if (selectedId) handleDelete(selectedId);
          break;
        case 'enter':
          if (!isAnalyzing) handleAnalyze();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, isAnalyzing, handleDelete, handleAnalyze]);

  return (
    <>
      <Helmet>
        <title>Interactive 2D Beam Solver | Draw & Analyze | BeamLab</title>
        <meta
          name="description"
          content="Free interactive 2D beam solver. Draw beams, add supports and loads visually. Get instant shear force, bending moment, and deflection diagrams using FEM analysis."
        />
        <meta
          name="keywords"
          content="beam solver, beam calculator, shear force diagram, bending moment diagram, structural analysis, FEM, finite element"
        />
        <link rel="canonical" href="https://beamlab.app/tools/beam-solver" />
      </Helmet>

      <div className="min-h-screen bg-slate-900">
        <ToolNavbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              Interactive 2D Beam Solver
            </h1>
            <p className="text-slate-400">
              Draw your beam, add supports and loads, then click <span className="text-green-400">Analyze</span> for instant results.
              Use keyboard shortcuts: <span className="font-mono text-slate-300">V</span> select, <span className="font-mono text-slate-300">1-3</span> supports, <span className="font-mono text-slate-300">P</span> point load, <span className="font-mono text-slate-300">U</span> UDL.
            </p>
          </div>

          {/* Toolbar */}
          <div className="mb-4">
            <Toolbar
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onReset={handleReset}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Canvas Area */}
            <div className="lg:col-span-3 space-y-4">
              {/* Canvas */}
              <BeamCanvas
                beamLength={beamLength}
                supports={supports}
                loads={loads}
                selectedTool={selectedTool}
                selectedId={selectedId}
                onAddSupport={handleAddSupport}
                onAddLoad={handleAddLoad}
                onSelect={setSelectedId}
              />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300"
                  >
                    <strong>Analysis Error:</strong> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Diagrams */}
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid md:grid-cols-3 gap-4"
                >
                  <DiagramChart
                    title="Shear Force Diagram"
                    data={results.sfdData}
                    beamLength={beamLength}
                    color="#22c55e"
                    unit="kN"
                  />
                  <DiagramChart
                    title="Bending Moment Diagram"
                    data={results.bmdData}
                    beamLength={beamLength}
                    color="#3b82f6"
                    unit="kN·m"
                    fillPositive={false}
                  />
                  <DiagramChart
                    title="Deflection"
                    data={results.deflectionData}
                    beamLength={beamLength}
                    color="#f59e0b"
                    unit="mm"
                  />
                </motion.div>
              )}

              {/* Reactions */}
              {results && <ReactionsTable reactions={results.reactions} />}

              {/* Upgrade CTA */}
              {results && <UpgradeCTA />}
            </div>

            {/* Properties Panel */}
            <div className="lg:col-span-1">
              <PropertiesPanel
                beamLength={beamLength}
                onBeamLengthChange={setBeamLength}
                sectionE={sectionE}
                onSectionEChange={setSectionE}
                sectionI={sectionI}
                onSectionIChange={setSectionI}
                selectedId={selectedId}
                supports={supports}
                loads={loads}
                onUpdateLoad={handleUpdateLoad}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

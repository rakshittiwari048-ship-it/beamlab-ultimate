// @ts-nocheck
/**
 * BeamCalculator.tsx
 * 
 * Simple Beam Calculator - Free Tool
 * Calculates bending moments, shear forces, and deflections
 * for common beam configurations.
 */

import { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  Download,
  RotateCcw,
  Info,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type BeamType = 'simply-supported' | 'cantilever' | 'fixed-fixed';
type LoadType = 'point' | 'udl' | 'triangular';

interface BeamInput {
  beamType: BeamType;
  loadType: LoadType;
  span: number;        // meters
  load: number;        // kN or kN/m
  loadPosition: number; // meters from left (for point load)
  E: number;           // MPa
  I: number;           // cm^4
}

interface BeamResults {
  maxMoment: number;       // kN-m
  maxMomentLocation: number; // m from left
  maxShear: number;        // kN
  maxDeflection: number;   // mm
  reactions: { left: number; right: number }; // kN
}

// ============================================================================
// BEAM CALCULATIONS
// ============================================================================

function calculateBeamResults(input: BeamInput): BeamResults {
  const { beamType, loadType, span, load, loadPosition, E, I } = input;
  
  // Convert units: I from cm^4 to m^4, E from MPa to kN/m^2
  const I_m4 = I * 1e-8;
  const E_kNm2 = E * 1000;
  const EI = E_kNm2 * I_m4;
  
  let maxMoment = 0;
  let maxMomentLocation = 0;
  let maxShear = 0;
  let maxDeflection = 0;
  let reactions = { left: 0, right: 0 };
  
  if (beamType === 'simply-supported') {
    if (loadType === 'point') {
      const a = loadPosition;
      const b = span - a;
      const P = load;
      
      reactions.left = (P * b) / span;
      reactions.right = (P * a) / span;
      maxMoment = (P * a * b) / span;
      maxMomentLocation = a;
      maxShear = Math.max(reactions.left, reactions.right);
      
      // Deflection at load point
      maxDeflection = (P * a * a * b * b) / (3 * EI * span) * 1000;
    } else if (loadType === 'udl') {
      const w = load; // kN/m
      const L = span;
      
      reactions.left = (w * L) / 2;
      reactions.right = (w * L) / 2;
      maxMoment = (w * L * L) / 8;
      maxMomentLocation = L / 2;
      maxShear = reactions.left;
      maxDeflection = (5 * w * Math.pow(L, 4)) / (384 * EI) * 1000;
    } else if (loadType === 'triangular') {
      const w = load; // max intensity at right
      const L = span;
      
      reactions.left = (w * L) / 6;
      reactions.right = (w * L) / 3;
      maxMoment = (w * L * L) / (9 * Math.sqrt(3));
      maxMomentLocation = L / Math.sqrt(3);
      maxShear = reactions.right;
      maxDeflection = (w * Math.pow(L, 4)) / (120 * EI) * 1000;
    }
  } else if (beamType === 'cantilever') {
    if (loadType === 'point') {
      const P = load;
      const L = span;
      
      reactions.left = P;
      reactions.right = 0;
      maxMoment = P * L;
      maxMomentLocation = 0;
      maxShear = P;
      maxDeflection = (P * Math.pow(L, 3)) / (3 * EI) * 1000;
    } else if (loadType === 'udl') {
      const w = load;
      const L = span;
      
      reactions.left = w * L;
      reactions.right = 0;
      maxMoment = (w * L * L) / 2;
      maxMomentLocation = 0;
      maxShear = w * L;
      maxDeflection = (w * Math.pow(L, 4)) / (8 * EI) * 1000;
    } else if (loadType === 'triangular') {
      const w = load;
      const L = span;
      
      reactions.left = (w * L) / 2;
      reactions.right = 0;
      maxMoment = (w * L * L) / 6;
      maxMomentLocation = 0;
      maxShear = (w * L) / 2;
      maxDeflection = (w * Math.pow(L, 4)) / (30 * EI) * 1000;
    }
  } else if (beamType === 'fixed-fixed') {
    if (loadType === 'udl') {
      const w = load;
      const L = span;
      
      reactions.left = (w * L) / 2;
      reactions.right = (w * L) / 2;
      maxMoment = (w * L * L) / 12; // At supports
      maxMomentLocation = 0;
      maxShear = reactions.left;
      maxDeflection = (w * Math.pow(L, 4)) / (384 * EI) * 1000;
    } else {
      // Simplified for other load types
      const P = load;
      const L = span;
      
      reactions.left = P / 2;
      reactions.right = P / 2;
      maxMoment = (P * L) / 8;
      maxMomentLocation = L / 2;
      maxShear = P / 2;
      maxDeflection = (P * Math.pow(L, 3)) / (192 * EI) * 1000;
    }
  }
  
  return {
    maxMoment: Math.abs(maxMoment),
    maxMomentLocation,
    maxShear: Math.abs(maxShear),
    maxDeflection: Math.abs(maxDeflection),
    reactions,
  };
}

// ============================================================================
// NAVBAR
// ============================================================================

function ToolNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Beam Calculator</span>
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
// INPUT SECTION
// ============================================================================

interface InputSectionProps {
  input: BeamInput;
  onChange: (input: BeamInput) => void;
  onReset: () => void;
}

function InputSection({ input, onChange, onReset }: InputSectionProps) {
  const beamTypes: { value: BeamType; label: string }[] = [
    { value: 'simply-supported', label: 'Simply Supported' },
    { value: 'cantilever', label: 'Cantilever' },
    { value: 'fixed-fixed', label: 'Fixed-Fixed' },
  ];

  const loadTypes: { value: LoadType; label: string }[] = [
    { value: 'point', label: 'Point Load' },
    { value: 'udl', label: 'Uniform Load (UDL)' },
    { value: 'triangular', label: 'Triangular Load' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Input Parameters</h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Beam Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beam Type
          </label>
          <div className="relative">
            <select
              value={input.beamType}
              onChange={(e) => onChange({ ...input, beamType: e.target.value as BeamType })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {beamTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Load Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load Type
          </label>
          <div className="relative">
            <select
              value={input.loadType}
              onChange={(e) => onChange({ ...input, loadType: e.target.value as LoadType })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loadTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Span */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Span (m)
          </label>
          <input
            type="number"
            value={input.span}
            onChange={(e) => onChange({ ...input, span: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0.1"
            step="0.1"
          />
        </div>

        {/* Load */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load ({input.loadType === 'point' ? 'kN' : 'kN/m'})
          </label>
          <input
            type="number"
            value={input.load}
            onChange={(e) => onChange({ ...input, load: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1"
          />
        </div>

        {/* Load Position (for point load) */}
        {input.loadType === 'point' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Load Position from Left (m)
            </label>
            <input
              type="number"
              value={input.loadPosition}
              onChange={(e) => onChange({ ...input, loadPosition: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max={input.span}
              step="0.1"
            />
          </div>
        )}

        {/* E */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Elastic Modulus E (MPa)
          </label>
          <input
            type="number"
            value={input.E}
            onChange={(e) => onChange({ ...input, E: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1000"
            step="1000"
          />
        </div>

        {/* I */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moment of Inertia I (cm⁴)
          </label>
          <input
            type="number"
            value={input.I}
            onChange={(e) => onChange({ ...input, I: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            step="100"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BEAM DIAGRAM
// ============================================================================

interface BeamDiagramProps {
  input: BeamInput;
}

function BeamDiagram({ input }: BeamDiagramProps) {
  const width = 400;
  const height = 150;
  const padding = 40;
  const beamY = 80;
  const beamLength = width - 2 * padding;

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
      <svg width={width} height={height} className="overflow-visible">
        {/* Beam line */}
        <line
          x1={padding}
          y1={beamY}
          x2={width - padding}
          y2={beamY}
          stroke="#1e293b"
          strokeWidth="4"
        />

        {/* Left support */}
        {input.beamType === 'cantilever' ? (
          // Fixed support
          <g>
            <rect x={padding - 10} y={beamY - 15} width="10" height="30" fill="#64748b" />
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1={padding - 10} y1={beamY - 12 + i * 10} x2={padding - 18} y2={beamY - 6 + i * 10} stroke="#64748b" strokeWidth="2" />
            ))}
          </g>
        ) : (
          // Pin/Roller support
          <g>
            <polygon
              points={`${padding},${beamY} ${padding - 10},${beamY + 15} ${padding + 10},${beamY + 15}`}
              fill="#64748b"
            />
            {input.beamType === 'fixed-fixed' && (
              <rect x={padding - 10} y={beamY - 15} width="10" height="30" fill="#64748b" />
            )}
          </g>
        )}

        {/* Right support */}
        {input.beamType !== 'cantilever' && (
          <g>
            {input.beamType === 'fixed-fixed' ? (
              <rect x={width - padding} y={beamY - 15} width="10" height="30" fill="#64748b" />
            ) : (
              <>
                <circle cx={width - padding} cy={beamY + 12} r="6" fill="#64748b" />
                <line x1={width - padding - 12} y1={beamY + 20} x2={width - padding + 12} y2={beamY + 20} stroke="#64748b" strokeWidth="2" />
              </>
            )}
          </g>
        )}

        {/* Load visualization */}
        {input.loadType === 'point' && (
          <g>
            <line
              x1={padding + (input.loadPosition / input.span) * beamLength}
              y1={beamY - 40}
              x2={padding + (input.loadPosition / input.span) * beamLength}
              y2={beamY}
              stroke="#dc2626"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={padding + (input.loadPosition / input.span) * beamLength}
              y={beamY - 45}
              textAnchor="middle"
              className="text-xs fill-red-600 font-medium"
            >
              {input.load} kN
            </text>
          </g>
        )}

        {input.loadType === 'udl' && (
          <g>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(frac => (
              <line
                key={frac}
                x1={padding + frac * beamLength}
                y1={beamY - 30}
                x2={padding + frac * beamLength}
                y2={beamY}
                stroke="#dc2626"
                strokeWidth="1.5"
              />
            ))}
            <line
              x1={padding}
              y1={beamY - 30}
              x2={width - padding}
              y2={beamY - 30}
              stroke="#dc2626"
              strokeWidth="2"
            />
            <text
              x={width / 2}
              y={beamY - 35}
              textAnchor="middle"
              className="text-xs fill-red-600 font-medium"
            >
              {input.load} kN/m
            </text>
          </g>
        )}

        {/* Dimension line */}
        <g>
          <line
            x1={padding}
            y1={beamY + 35}
            x2={width - padding}
            y2={beamY + 35}
            stroke="#94a3b8"
            strokeWidth="1"
            markerStart="url(#dimStart)"
            markerEnd="url(#dimEnd)"
          />
          <text
            x={width / 2}
            y={beamY + 50}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            L = {input.span} m
          </text>
        </g>

        {/* Markers */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <polygon points="0,0 6,3 0,6" fill="#dc2626" />
          </marker>
          <marker
            id="dimStart"
            markerWidth="6"
            markerHeight="6"
            refX="0"
            refY="3"
            orient="auto"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" />
          </marker>
          <marker
            id="dimEnd"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <line x1="6" y1="0" x2="6" y2="6" stroke="#94a3b8" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================================
// RESULTS SECTION
// ============================================================================

interface ResultsSectionProps {
  results: BeamResults;
}

function ResultsSection({ results }: ResultsSectionProps) {
  const resultCards = [
    {
      label: 'Maximum Bending Moment',
      value: results.maxMoment.toFixed(2),
      unit: 'kN·m',
      sublabel: `at ${results.maxMomentLocation.toFixed(2)} m from left`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Maximum Shear Force',
      value: results.maxShear.toFixed(2),
      unit: 'kN',
      sublabel: 'at support',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Maximum Deflection',
      value: results.maxDeflection.toFixed(3),
      unit: 'mm',
      sublabel: 'at max moment location',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Results</h2>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {resultCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`${card.bgColor} rounded-xl p-4`}
          >
            <p className="text-sm text-gray-600 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value} <span className="text-base font-medium">{card.unit}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.sublabel}</p>
          </motion.div>
        ))}
      </div>

      {/* Reactions */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Support Reactions</h3>
        <div className="flex gap-8">
          <div>
            <span className="text-xs text-gray-500">Left Support (R₁)</span>
            <p className="text-lg font-semibold text-gray-900">
              {results.reactions.left.toFixed(2)} kN
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Right Support (R₂)</span>
            <p className="text-lg font-semibold text-gray-900">
              {results.reactions.right.toFixed(2)} kN
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const defaultInput: BeamInput = {
  beamType: 'simply-supported',
  loadType: 'udl',
  span: 6,
  load: 10,
  loadPosition: 3,
  E: 200000,
  I: 5000,
};

export default function BeamCalculator() {
  const [input, setInput] = useState<BeamInput>(defaultInput);

  const results = useMemo(() => calculateBeamResults(input), [input]);

  const handleReset = useCallback(() => {
    setInput(defaultInput);
  }, []);

  return (
    <>
      <Helmet>
        <title>Simple Beam Calculator | Free Online Tool | BeamLab</title>
        <meta
          name="description"
          content="Free online beam calculator. Calculate bending moments, shear forces, and deflections for simply supported, cantilever, and fixed beams. No registration required."
        />
        <meta
          name="keywords"
          content="beam calculator, bending moment, shear force, deflection, simply supported beam, cantilever beam, structural engineering"
        />
        <link rel="canonical" href="https://beamlab.app/tools/beam-calculator" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Simple Beam Calculator
            </h1>
            <p className="text-gray-600">
              Calculate bending moments, shear forces, and deflections for common beam configurations.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: Input */}
            <div className="lg:col-span-3 space-y-6">
              <InputSection input={input} onChange={setInput} onReset={handleReset} />
              <BeamDiagram input={input} />
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
              <ResultsSection results={results} />
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About This Calculator</p>
              <p className="text-blue-700">
                This calculator uses standard beam formulas for common loading conditions.
                For complex load combinations or multi-span beams, use our{' '}
                <Link to="/dashboard" className="underline hover:no-underline">
                  full structural analysis platform
                </Link>.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

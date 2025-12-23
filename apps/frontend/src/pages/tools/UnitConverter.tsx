/**
 * UnitConverter.tsx
 * 
 * Engineering Unit Converter - Free Tool
 * Convert between common engineering units for force, length, stress, moment, etc.
 */

import { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRightLeft,
  Ruler,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// UNIT DEFINITIONS
// ============================================================================

interface Unit {
  id: string;
  name: string;
  symbol: string;
  toBase: number; // Multiplier to convert to base unit
}

interface UnitCategory {
  id: string;
  name: string;
  icon: string;
  baseUnit: string;
  units: Unit[];
}

const unitCategories: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    icon: '📏',
    baseUnit: 'm',
    units: [
      { id: 'mm', name: 'Millimeter', symbol: 'mm', toBase: 0.001 },
      { id: 'cm', name: 'Centimeter', symbol: 'cm', toBase: 0.01 },
      { id: 'm', name: 'Meter', symbol: 'm', toBase: 1 },
      { id: 'km', name: 'Kilometer', symbol: 'km', toBase: 1000 },
      { id: 'in', name: 'Inch', symbol: 'in', toBase: 0.0254 },
      { id: 'ft', name: 'Foot', symbol: 'ft', toBase: 0.3048 },
      { id: 'yd', name: 'Yard', symbol: 'yd', toBase: 0.9144 },
      { id: 'mi', name: 'Mile', symbol: 'mi', toBase: 1609.34 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    icon: '⬜',
    baseUnit: 'm²',
    units: [
      { id: 'mm2', name: 'Square Millimeter', symbol: 'mm²', toBase: 1e-6 },
      { id: 'cm2', name: 'Square Centimeter', symbol: 'cm²', toBase: 1e-4 },
      { id: 'm2', name: 'Square Meter', symbol: 'm²', toBase: 1 },
      { id: 'km2', name: 'Square Kilometer', symbol: 'km²', toBase: 1e6 },
      { id: 'in2', name: 'Square Inch', symbol: 'in²', toBase: 0.00064516 },
      { id: 'ft2', name: 'Square Foot', symbol: 'ft²', toBase: 0.092903 },
    ],
  },
  {
    id: 'force',
    name: 'Force',
    icon: '💪',
    baseUnit: 'N',
    units: [
      { id: 'N', name: 'Newton', symbol: 'N', toBase: 1 },
      { id: 'kN', name: 'Kilonewton', symbol: 'kN', toBase: 1000 },
      { id: 'MN', name: 'Meganewton', symbol: 'MN', toBase: 1e6 },
      { id: 'kgf', name: 'Kilogram-force', symbol: 'kgf', toBase: 9.80665 },
      { id: 'tf', name: 'Tonne-force', symbol: 'tf', toBase: 9806.65 },
      { id: 'lbf', name: 'Pound-force', symbol: 'lbf', toBase: 4.44822 },
      { id: 'kip', name: 'Kip', symbol: 'kip', toBase: 4448.22 },
    ],
  },
  {
    id: 'stress',
    name: 'Stress / Pressure',
    icon: '🎯',
    baseUnit: 'Pa',
    units: [
      { id: 'Pa', name: 'Pascal', symbol: 'Pa', toBase: 1 },
      { id: 'kPa', name: 'Kilopascal', symbol: 'kPa', toBase: 1000 },
      { id: 'MPa', name: 'Megapascal', symbol: 'MPa', toBase: 1e6 },
      { id: 'GPa', name: 'Gigapascal', symbol: 'GPa', toBase: 1e9 },
      { id: 'bar', name: 'Bar', symbol: 'bar', toBase: 1e5 },
      { id: 'kgcm2', name: 'kg/cm²', symbol: 'kg/cm²', toBase: 98066.5 },
      { id: 'psi', name: 'PSI', symbol: 'psi', toBase: 6894.76 },
      { id: 'ksi', name: 'KSI', symbol: 'ksi', toBase: 6.89476e6 },
      { id: 'atm', name: 'Atmosphere', symbol: 'atm', toBase: 101325 },
    ],
  },
  {
    id: 'moment',
    name: 'Moment / Torque',
    icon: '🔄',
    baseUnit: 'N·m',
    units: [
      { id: 'Nm', name: 'Newton-meter', symbol: 'N·m', toBase: 1 },
      { id: 'kNm', name: 'Kilonewton-meter', symbol: 'kN·m', toBase: 1000 },
      { id: 'MNm', name: 'Meganewton-meter', symbol: 'MN·m', toBase: 1e6 },
      { id: 'kgfm', name: 'Kilogram-force-meter', symbol: 'kgf·m', toBase: 9.80665 },
      { id: 'tfm', name: 'Tonne-force-meter', symbol: 'tf·m', toBase: 9806.65 },
      { id: 'lbfft', name: 'Pound-force-foot', symbol: 'lbf·ft', toBase: 1.35582 },
      { id: 'kipft', name: 'Kip-foot', symbol: 'kip·ft', toBase: 1355.82 },
      { id: 'lbfin', name: 'Pound-force-inch', symbol: 'lbf·in', toBase: 0.112985 },
    ],
  },
  {
    id: 'distributed',
    name: 'Distributed Load',
    icon: '📊',
    baseUnit: 'N/m',
    units: [
      { id: 'Nm_dist', name: 'Newton per meter', symbol: 'N/m', toBase: 1 },
      { id: 'kNm_dist', name: 'Kilonewton per meter', symbol: 'kN/m', toBase: 1000 },
      { id: 'kgfm_dist', name: 'Kilogram-force per meter', symbol: 'kgf/m', toBase: 9.80665 },
      { id: 'lbfft_dist', name: 'Pound-force per foot', symbol: 'lbf/ft', toBase: 14.5939 },
      { id: 'kipft_dist', name: 'Kip per foot', symbol: 'kip/ft', toBase: 14593.9 },
    ],
  },
  {
    id: 'inertia',
    name: 'Moment of Inertia',
    icon: '◯',
    baseUnit: 'm⁴',
    units: [
      { id: 'mm4', name: 'mm⁴', symbol: 'mm⁴', toBase: 1e-12 },
      { id: 'cm4', name: 'cm⁴', symbol: 'cm⁴', toBase: 1e-8 },
      { id: 'm4', name: 'm⁴', symbol: 'm⁴', toBase: 1 },
      { id: 'in4', name: 'in⁴', symbol: 'in⁴', toBase: 4.16231e-7 },
      { id: 'ft4', name: 'ft⁴', symbol: 'ft⁴', toBase: 0.00863097 },
    ],
  },
  {
    id: 'density',
    name: 'Density',
    icon: '🧊',
    baseUnit: 'kg/m³',
    units: [
      { id: 'kgm3', name: 'kg/m³', symbol: 'kg/m³', toBase: 1 },
      { id: 'tm3', name: 't/m³', symbol: 't/m³', toBase: 1000 },
      { id: 'gcm3', name: 'g/cm³', symbol: 'g/cm³', toBase: 1000 },
      { id: 'lbft3', name: 'lb/ft³', symbol: 'lb/ft³', toBase: 16.0185 },
      { id: 'lbin3', name: 'lb/in³', symbol: 'lb/in³', toBase: 27679.9 },
    ],
  },
];

// ============================================================================
// NAVBAR
// ============================================================================

function ToolNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Ruler className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-900">Unit Converter</span>
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
// CATEGORY SELECTOR
// ============================================================================

interface CategorySelectorProps {
  categories: UnitCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function CategorySelector({ categories, selectedId, onSelect }: CategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedId === category.id
              ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className="mr-2">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// CONVERTER COMPONENT
// ============================================================================

interface ConverterProps {
  category: UnitCategory;
}

function Converter({ category }: ConverterProps) {
  const [fromUnit, setFromUnit] = useState(category.units[0].id);
  const [toUnit, setToUnit] = useState(category.units.length > 1 ? category.units[1].id : category.units[0].id);
  const [fromValue, setFromValue] = useState<string>('1');
  const [copied, setCopied] = useState(false);

  // Reset units when category changes
  useMemo(() => {
    setFromUnit(category.units[0].id);
    setToUnit(category.units.length > 1 ? category.units[1].id : category.units[0].id);
    setFromValue('1');
  }, [category]);

  const fromUnitData = category.units.find(u => u.id === fromUnit)!;
  const toUnitData = category.units.find(u => u.id === toUnit)!;

  const convert = useCallback((value: number, from: Unit, to: Unit): number => {
    const baseValue = value * from.toBase;
    return baseValue / to.toBase;
  }, []);

  const toValue = useMemo(() => {
    const numValue = parseFloat(fromValue);
    if (isNaN(numValue)) return '';
    const result = convert(numValue, fromUnitData, toUnitData);
    // Format with appropriate precision
    if (Math.abs(result) < 0.0001 || Math.abs(result) >= 1e10) {
      return result.toExponential(6);
    }
    return result.toPrecision(8).replace(/\.?0+$/, '');
  }, [fromValue, fromUnitData, toUnitData, convert]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue || '0');
  };

  const copyResult = () => {
    navigator.clipboard.writeText(toValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setFromValue('1');
    setFromUnit(category.units[0].id);
    setToUnit(category.units.length > 1 ? category.units[1].id : category.units[0].id);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {category.icon} {category.name} Converter
          </h2>
          <button
            onClick={reset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <div className="space-y-6">
          {/* From Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                className="flex-1 px-4 py-3 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Enter value"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {category.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol} ({unit.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapUnits}
              className="p-3 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200 transition-colors"
              title="Swap units"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* To Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={toValue}
                  readOnly
                  className="w-full px-4 py-3 text-lg bg-gray-50 border border-gray-200 rounded-lg font-mono"
                  placeholder="Result"
                />
                {toValue && (
                  <button
                    onClick={copyResult}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    title="Copy result"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {category.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol} ({unit.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversion Formula Display */}
          {toValue && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium text-gray-900">{fromValue} {fromUnitData.symbol}</span>
                {' = '}
                <span className="font-medium text-amber-600">{toValue} {toUnitData.symbol}</span>
              </p>
              <p className="text-xs text-gray-400 text-center mt-2">
                1 {fromUnitData.symbol} = {(fromUnitData.toBase / toUnitData.toBase).toExponential(4)} {toUnitData.symbol}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// QUICK CONVERSIONS
// ============================================================================

function QuickConversions({ category }: { category: UnitCategory }) {
  const quickRefs = useMemo(() => {
    const result: { from: Unit; to: Unit; value: number; result: number }[] = [];
    const baseUnit = category.units.find(u => u.toBase === 1);
    if (!baseUnit) return result;

    for (const unit of category.units) {
      if (unit.id !== baseUnit.id) {
        result.push({
          from: unit,
          to: baseUnit,
          value: 1,
          result: unit.toBase / baseUnit.toBase,
        });
      }
    }
    return result.slice(0, 8);
  }, [category]);

  if (quickRefs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quick Reference
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickRefs.map((ref, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm"
          >
            <span className="text-gray-600">
              1 {ref.from.symbol}
            </span>
            <span className="text-gray-400">=</span>
            <span className="font-medium text-gray-900">
              {ref.result < 0.001 || ref.result > 10000
                ? ref.result.toExponential(3)
                : ref.result.toPrecision(6).replace(/\.?0+$/, '')
              } {ref.to.symbol}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnitConverter() {
  const [selectedCategory, setSelectedCategory] = useState<string>('force');

  const category = useMemo(() => 
    unitCategories.find(c => c.id === selectedCategory) || unitCategories[0],
    [selectedCategory]
  );

  return (
    <>
      <Helmet>
        <title>Engineering Unit Converter | Force, Stress, Moment | BeamLab</title>
        <meta
          name="description"
          content="Free engineering unit converter. Convert force (kN, kip), stress (MPa, psi), moment (kN·m, kip·ft), length, area, and more. Quick and accurate."
        />
        <meta
          name="keywords"
          content="unit converter, engineering units, force converter, stress converter, MPa to psi, kN to kip"
        />
        <link rel="canonical" href="https://beamlab.app/tools/unit-converter" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Engineering Unit Converter
            </h1>
            <p className="text-gray-600">
              Quick and accurate conversions for structural engineering units.
            </p>
          </div>

          {/* Category Selector */}
          <CategorySelector
            categories={unitCategories}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {/* Converter */}
          <div className="grid gap-6">
            <Converter category={category} />
            <QuickConversions category={category} />
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Looking for more advanced analysis?{' '}
              <Link to="/dashboard" className="text-blue-600 hover:underline">
                Try BeamLab's full structural analysis
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

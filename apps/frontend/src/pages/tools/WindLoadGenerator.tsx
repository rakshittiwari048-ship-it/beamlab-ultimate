/**
 * WindLoadGenerator.tsx
 * 
 * IS 875 Part 3 Wind Load Calculator - Free Tool
 * Calculate design wind pressure based on Indian Standard.
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Wind,
  MapPin,
  Building2,
  Info,
  ChevronDown,
  Calculator,
} from 'lucide-react';

// ============================================================================
// IS 875 DATA
// ============================================================================

interface WindZoneCity {
  name: string;
  state: string;
  Vb: number; // Basic wind speed m/s
}

// Basic wind speeds as per IS 875 Part 3 (Third Revision)
const windZoneCities: WindZoneCity[] = [
  // Zone I (Vb = 33 m/s)
  { name: 'Ahmedabad', state: 'Gujarat', Vb: 39 },
  { name: 'Bangalore', state: 'Karnataka', Vb: 33 },
  { name: 'Chandigarh', state: 'Punjab', Vb: 47 },
  { name: 'Chennai', state: 'Tamil Nadu', Vb: 50 },
  { name: 'Delhi', state: 'Delhi NCR', Vb: 47 },
  { name: 'Hyderabad', state: 'Telangana', Vb: 44 },
  { name: 'Jaipur', state: 'Rajasthan', Vb: 47 },
  { name: 'Kolkata', state: 'West Bengal', Vb: 50 },
  { name: 'Lucknow', state: 'Uttar Pradesh', Vb: 47 },
  { name: 'Mumbai', state: 'Maharashtra', Vb: 44 },
  { name: 'Pune', state: 'Maharashtra', Vb: 39 },
  { name: 'Patna', state: 'Bihar', Vb: 47 },
  { name: 'Bhubaneswar', state: 'Odisha', Vb: 50 },
  { name: 'Thiruvananthapuram', state: 'Kerala', Vb: 39 },
  { name: 'Vishakhapatnam', state: 'Andhra Pradesh', Vb: 50 },
  { name: 'Guwahati', state: 'Assam', Vb: 50 },
  { name: 'Srinagar', state: 'J&K', Vb: 39 },
  { name: 'Shimla', state: 'Himachal Pradesh', Vb: 39 },
].sort((a, b) => a.name.localeCompare(b.name));

interface TerrainCategory {
  id: string;
  name: string;
  description: string;
  // k2 values at different heights
  k2Values: Record<number, number>;
}

const terrainCategories: TerrainCategory[] = [
  {
    id: '1',
    name: 'Category 1',
    description: 'Exposed open terrain with few or no obstructions (coastal areas, flat plains)',
    k2Values: { 10: 1.05, 15: 1.09, 20: 1.12, 30: 1.17, 50: 1.22, 100: 1.29, 150: 1.32 },
  },
  {
    id: '2',
    name: 'Category 2',
    description: 'Open terrain with scattered obstructions 1.5m to 10m height (grassland, airports)',
    k2Values: { 10: 1.00, 15: 1.05, 20: 1.07, 30: 1.12, 50: 1.17, 100: 1.24, 150: 1.27 },
  },
  {
    id: '3',
    name: 'Category 3',
    description: 'Terrain with numerous closely spaced obstructions 3m to 10m height (suburban areas)',
    k2Values: { 10: 0.91, 15: 0.97, 20: 1.01, 30: 1.06, 50: 1.12, 100: 1.19, 150: 1.22 },
  },
  {
    id: '4',
    name: 'Category 4',
    description: 'Terrain with large closely spaced obstructions 10m to 25m height (city centers)',
    k2Values: { 10: 0.80, 15: 0.80, 20: 0.80, 30: 0.88, 50: 0.98, 100: 1.10, 150: 1.15 },
  },
];

interface BuildingClass {
  id: string;
  name: string;
  description: string;
  k1: number; // Risk coefficient
}

const buildingClasses: BuildingClass[] = [
  { id: 'general', name: 'General Buildings', description: 'Normal structures with moderate consequences of failure', k1: 1.0 },
  { id: 'important', name: 'Important Buildings', description: 'Hospitals, schools, assembly halls, communication buildings', k1: 1.08 },
  { id: 'critical', name: 'Post-Disaster', description: 'Power plants, emergency shelters, critical infrastructure', k1: 1.10 },
  { id: 'temporary', name: 'Temporary Structures', description: 'Structures with lifespan < 5 years', k1: 0.92 },
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
              <Wind className="w-5 h-5 text-cyan-600" />
              <span className="font-semibold text-gray-900">Wind Load Calculator</span>
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
// INPUT COMPONENTS
// ============================================================================

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  info?: string;
}

function SelectInput({ label, value, onChange, options, info }: SelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {info && (
          <span className="ml-1 text-gray-400 cursor-help" title={info}>
            <Info className="w-3.5 h-3.5 inline" />
          </span>
        )}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
}

function NumberInput({ label, value, onChange, unit, min, max, step = 1, info }: NumberInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {info && (
          <span className="ml-1 text-gray-400 cursor-help" title={info}>
            <Info className="w-3.5 h-3.5 inline" />
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// RESULTS COMPONENT
// ============================================================================

interface WindCalcResults {
  Vb: number;       // Basic wind speed (m/s)
  k1: number;       // Risk coefficient
  k2: number;       // Terrain & height factor
  k3: number;       // Topography factor (default 1.0)
  Vz: number;       // Design wind speed (m/s)
  pz: number;       // Design wind pressure (N/m² = Pa)
  pz_kPa: number;   // Design wind pressure (kPa)
  pz_kN_m2: number; // Design wind pressure (kN/m²)
}

interface ResultsDisplayProps {
  results: WindCalcResults;
}

function ResultsDisplay({ results }: ResultsDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-cyan-600" />
        Calculation Results
      </h3>

      {/* Formula Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Design Wind Speed (Clause 6.3):</p>
        <p className="text-lg font-mono text-center text-gray-800">
          V<sub>z</sub> = V<sub>b</sub> × k<sub>1</sub> × k<sub>2</sub> × k<sub>3</sub>
        </p>
        <p className="text-sm text-gray-600 mt-4 mb-2">Design Wind Pressure (Clause 7.2):</p>
        <p className="text-lg font-mono text-center text-gray-800">
          p<sub>z</sub> = 0.6 × V<sub>z</sub>²
        </p>
      </div>

      {/* Input Parameters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Basic Wind Speed (V<sub>b</sub>)</p>
          <p className="text-xl font-semibold text-blue-900">{results.Vb} m/s</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Risk Factor (k<sub>1</sub>)</p>
          <p className="text-xl font-semibold text-purple-900">{results.k1.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-600 mb-1">Terrain Factor (k<sub>2</sub>)</p>
          <p className="text-xl font-semibold text-amber-900">{results.k2.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">Topography Factor (k<sub>3</sub>)</p>
          <p className="text-xl font-semibold text-green-900">{results.k3.toFixed(2)}</p>
        </div>
      </div>

      {/* Output Results */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg">
          <div>
            <p className="text-sm text-cyan-700">Design Wind Speed (V<sub>z</sub>)</p>
            <p className="text-xs text-cyan-600 mt-0.5">V<sub>b</sub> × k<sub>1</sub> × k<sub>2</sub> × k<sub>3</sub></p>
          </div>
          <p className="text-2xl font-bold text-cyan-900">
            {results.Vz.toFixed(2)} <span className="text-sm font-normal">m/s</span>
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-white">
          <div>
            <p className="text-sm opacity-90">Design Wind Pressure (p<sub>z</sub>)</p>
            <p className="text-xs opacity-75 mt-0.5">0.6 × V<sub>z</sub>²</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              {results.pz_kN_m2.toFixed(3)}
            </p>
            <p className="text-sm opacity-90">kN/m²</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500">In Pascal (N/m²)</p>
            <p className="font-semibold text-gray-900">{results.pz.toFixed(1)} Pa</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500">In kPa</p>
            <p className="font-semibold text-gray-900">{results.pz_kPa.toFixed(3)} kPa</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        Results based on IS 875 (Part 3) : 2015. For final design, verify with a structural engineer.
      </p>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WindLoadGenerator() {
  // Input State
  const [selectedCity, setSelectedCity] = useState<string>('Delhi');
  const [customVb, setCustomVb] = useState<number | null>(null);
  const [terrainCategory, setTerrainCategory] = useState<string>('2');
  const [buildingClass, setBuildingClass] = useState<string>('general');
  const [buildingHeight, setBuildingHeight] = useState<number>(15);
  const [topographyFactor, setTopographyFactor] = useState<number>(1.0);

  // Get selected city data
  const cityData = windZoneCities.find(c => c.name === selectedCity);
  const Vb = customVb ?? cityData?.Vb ?? 47;

  // Get terrain data
  const terrain = terrainCategories.find(t => t.id === terrainCategory)!;
  
  // Interpolate k2 for the given height
  const getK2 = (height: number): number => {
    const heights = Object.keys(terrain.k2Values).map(Number).sort((a, b) => a - b);
    
    if (height <= heights[0]) return terrain.k2Values[heights[0]];
    if (height >= heights[heights.length - 1]) return terrain.k2Values[heights[heights.length - 1]];
    
    // Linear interpolation
    for (let i = 0; i < heights.length - 1; i++) {
      if (height >= heights[i] && height <= heights[i + 1]) {
        const h1 = heights[i];
        const h2 = heights[i + 1];
        const k1 = terrain.k2Values[h1];
        const k2 = terrain.k2Values[h2];
        return k1 + (k2 - k1) * (height - h1) / (h2 - h1);
      }
    }
    return 1.0;
  };

  // Get building class data
  const buildingClassData = buildingClasses.find(b => b.id === buildingClass)!;

  // Calculate results
  const results: WindCalcResults = useMemo(() => {
    const k1 = buildingClassData.k1;
    const k2 = getK2(buildingHeight);
    const k3 = topographyFactor;
    
    const Vz = Vb * k1 * k2 * k3;
    const pz = 0.6 * Vz * Vz; // N/m² (Pa)
    
    return {
      Vb,
      k1,
      k2,
      k3,
      Vz,
      pz,
      pz_kPa: pz / 1000,
      pz_kN_m2: pz / 1000,
    };
  }, [Vb, buildingClassData, buildingHeight, topographyFactor, terrain]);

  return (
    <>
      <Helmet>
        <title>IS 875 Wind Load Calculator | Design Wind Pressure | BeamLab</title>
        <meta
          name="description"
          content="Free IS 875 Part 3 wind load calculator. Calculate design wind speed and pressure based on location, terrain category, building height, and risk coefficient."
        />
        <meta
          name="keywords"
          content="IS 875, wind load, wind pressure, basic wind speed, terrain category, k1, k2, k3 factor, Indian Standard"
        />
        <link rel="canonical" href="https://beamlab.app/tools/wind-load" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              IS 875 Part 3 Wind Load Calculator
            </h1>
            <p className="text-gray-600">
              Calculate design wind speed and pressure as per IS 875 (Part 3) : 2015.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Location */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                  Location
                </h3>

                <div className="space-y-4">
                  <SelectInput
                    label="Select City"
                    value={selectedCity}
                    onChange={setSelectedCity}
                    options={windZoneCities.map(c => ({
                      value: c.name,
                      label: `${c.name}, ${c.state} (Vb = ${c.Vb} m/s)`,
                    }))}
                    info="Basic wind speed as per IS 875 Table 1"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or Enter Custom V<sub>b</sub> (m/s)
                    </label>
                    <input
                      type="number"
                      value={customVb ?? ''}
                      onChange={(e) => setCustomVb(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder={`Default: ${cityData?.Vb ?? 47} m/s`}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      min={20}
                      max={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to use city default
                    </p>
                  </div>
                </div>
              </div>

              {/* Terrain & Building */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                  Terrain & Building
                </h3>

                <div className="space-y-4">
                  <SelectInput
                    label="Terrain Category (k₂)"
                    value={terrainCategory}
                    onChange={setTerrainCategory}
                    options={terrainCategories.map(t => ({
                      value: t.id,
                      label: t.name,
                      description: t.description,
                    }))}
                    info="Table 2 of IS 875 Part 3"
                  />
                  <p className="text-xs text-gray-500 -mt-2">
                    {terrain.description}
                  </p>

                  <NumberInput
                    label="Building Height"
                    value={buildingHeight}
                    onChange={setBuildingHeight}
                    unit="m"
                    min={5}
                    max={500}
                    step={1}
                    info="Height above ground level"
                  />

                  <SelectInput
                    label="Building Class (k₁)"
                    value={buildingClass}
                    onChange={setBuildingClass}
                    options={buildingClasses.map(b => ({
                      value: b.id,
                      label: `${b.name} (k₁ = ${b.k1})`,
                    }))}
                    info="Risk coefficient based on building importance"
                  />
                  <p className="text-xs text-gray-500 -mt-2">
                    {buildingClassData.description}
                  </p>

                  <NumberInput
                    label="Topography Factor (k₃)"
                    value={topographyFactor}
                    onChange={setTopographyFactor}
                    unit=""
                    min={1.0}
                    max={1.36}
                    step={0.01}
                    info="Default 1.0 for flat terrain. Use Clause 6.3.3 for hills/ridges"
                  />
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div>
              <ResultsDisplay results={results} />
            </div>
          </div>

          {/* Reference Table */}
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              k₂ Values Reference (Table 2)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Height (m)</th>
                    {[10, 15, 20, 30, 50, 100, 150].map(h => (
                      <th key={h} className="px-4 py-2 text-center font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {terrainCategories.map(t => (
                    <tr 
                      key={t.id} 
                      className={`border-b border-gray-100 ${t.id === terrainCategory ? 'bg-cyan-50' : ''}`}
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">{t.name}</td>
                      {[10, 15, 20, 30, 50, 100, 150].map(h => (
                        <td key={h} className="px-4 py-2 text-center text-gray-600">
                          {t.k2Values[h].toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need to apply wind loads to your structure?{' '}
              <Link to="/dashboard" className="text-blue-600 hover:underline">
                Try BeamLab's full analysis
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

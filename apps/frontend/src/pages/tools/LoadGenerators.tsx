/**
 * LoadGenerators.tsx
 * 
 * IS 875 Wind Load & IS 1893 Seismic Load Calculators
 * Free standalone calculators with transparent formulas and copy functionality.
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wind,
  Activity,
  Copy,
  Check,
  ChevronDown,
  Info,
  Calculator,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES & DATA
// ============================================================================

interface CityData {
  name: string;
  state: string;
  Vb: number; // Basic wind speed in m/s
}

// IS 875 Part 3 - Basic Wind Speed Data for Major Cities
const indianCities: CityData[] = [
  { name: 'Mumbai', state: 'Maharashtra', Vb: 44 },
  { name: 'Delhi', state: 'Delhi', Vb: 47 },
  { name: 'Bangalore', state: 'Karnataka', Vb: 33 },
  { name: 'Chennai', state: 'Tamil Nadu', Vb: 50 },
  { name: 'Kolkata', state: 'West Bengal', Vb: 50 },
  { name: 'Hyderabad', state: 'Telangana', Vb: 44 },
  { name: 'Ahmedabad', state: 'Gujarat', Vb: 39 },
  { name: 'Pune', state: 'Maharashtra', Vb: 39 },
  { name: 'Jaipur', state: 'Rajasthan', Vb: 47 },
  { name: 'Lucknow', state: 'Uttar Pradesh', Vb: 47 },
  { name: 'Bhopal', state: 'Madhya Pradesh', Vb: 39 },
  { name: 'Chandigarh', state: 'Punjab', Vb: 47 },
  { name: 'Thiruvananthapuram', state: 'Kerala', Vb: 39 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', Vb: 50 },
  { name: 'Nagpur', state: 'Maharashtra', Vb: 44 },
  { name: 'Indore', state: 'Madhya Pradesh', Vb: 39 },
  { name: 'Patna', state: 'Bihar', Vb: 47 },
  { name: 'Guwahati', state: 'Assam', Vb: 50 },
  { name: 'Surat', state: 'Gujarat', Vb: 44 },
  { name: 'Kochi', state: 'Kerala', Vb: 39 },
  { name: 'Coimbatore', state: 'Tamil Nadu', Vb: 39 },
  { name: 'Mangalore', state: 'Karnataka', Vb: 39 },
  { name: 'Raipur', state: 'Chhattisgarh', Vb: 39 },
  { name: 'Ranchi', state: 'Jharkhand', Vb: 39 },
  { name: 'Bhubaneswar', state: 'Odisha', Vb: 50 },
];

// Terrain Categories (IS 875 Part 3)
const terrainCategories = [
  { 
    value: 1, 
    label: 'Category 1', 
    description: 'Exposed open terrain (sea coast, flat treeless plains)',
    alpha: 0.09,
    zg: 10,
  },
  { 
    value: 2, 
    label: 'Category 2', 
    description: 'Open terrain with scattered obstructions (farmland, suburbs)',
    alpha: 0.14,
    zg: 15,
  },
  { 
    value: 3, 
    label: 'Category 3', 
    description: 'Terrain with numerous obstructions (industrial areas)',
    alpha: 0.22,
    zg: 20,
  },
  { 
    value: 4, 
    label: 'Category 4', 
    description: 'Dense urban areas with tall buildings',
    alpha: 0.30,
    zg: 30,
  },
];

// Seismic Zones (IS 1893:2016)
const seismicZones = [
  { value: 'II', label: 'Zone II', Z: 0.10, description: 'Low damage risk' },
  { value: 'III', label: 'Zone III', Z: 0.16, description: 'Moderate damage risk' },
  { value: 'IV', label: 'Zone IV', Z: 0.24, description: 'High damage risk' },
  { value: 'V', label: 'Zone V', Z: 0.36, description: 'Very high damage risk' },
];

// Soil Types (IS 1893:2016)
const soilTypes = [
  { value: 'I', label: 'Type I - Rock/Hard Soil', Sa_g_factor: 1.0 },
  { value: 'II', label: 'Type II - Medium Soil', Sa_g_factor: 1.36 },
  { value: 'III', label: 'Type III - Soft Soil', Sa_g_factor: 1.67 },
];

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
              <Calculator className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-gray-900">Load Generators</span>
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
// COPY BUTTON COMPONENT
// ============================================================================

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all ${
        copied ? 'bg-green-100 text-green-700' : ''
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// ============================================================================
// WIND LOAD CALCULATOR (IS 875 Part 3)
// ============================================================================

function WindLoadCalculator() {
  const [selectedCity, setSelectedCity] = useState<string>('Mumbai');
  const [terrainCategory, setTerrainCategory] = useState<number>(2);
  const [buildingHeight, setBuildingHeight] = useState<number>(15);
  const [topographyFactor, setTopographyFactor] = useState<number>(1.0);

  const city = useMemo(() => 
    indianCities.find(c => c.name === selectedCity) || indianCities[0],
    [selectedCity]
  );

  const terrain = useMemo(() => 
    terrainCategories.find(t => t.value === terrainCategory) || terrainCategories[1],
    [terrainCategory]
  );

  // Calculate wind parameters
  const calculations = useMemo(() => {
    const Vb = city.Vb;
    const k1 = 1.0; // Risk coefficient (assuming normal structures)
    
    // k2 - Terrain, height, and structure size factor (simplified for height z)
    const z = Math.max(buildingHeight, 10);
    // terrain.alpha and terrain.zg are available for power-law calculation if needed
    
    // k2 calculation based on IS 875 Table 2 (simplified lookup)
    let k2: number;
    if (z <= 10) {
      k2 = terrainCategory === 1 ? 1.05 : 
           terrainCategory === 2 ? 1.00 : 
           terrainCategory === 3 ? 0.91 : 0.80;
    } else if (z <= 15) {
      k2 = terrainCategory === 1 ? 1.09 : 
           terrainCategory === 2 ? 1.05 : 
           terrainCategory === 3 ? 0.97 : 0.80;
    } else if (z <= 20) {
      k2 = terrainCategory === 1 ? 1.12 : 
           terrainCategory === 2 ? 1.07 : 
           terrainCategory === 3 ? 1.01 : 0.88;
    } else if (z <= 30) {
      k2 = terrainCategory === 1 ? 1.15 : 
           terrainCategory === 2 ? 1.12 : 
           terrainCategory === 3 ? 1.06 : 0.95;
    } else if (z <= 50) {
      k2 = terrainCategory === 1 ? 1.20 : 
           terrainCategory === 2 ? 1.17 : 
           terrainCategory === 3 ? 1.12 : 1.02;
    } else if (z <= 100) {
      k2 = terrainCategory === 1 ? 1.26 : 
           terrainCategory === 2 ? 1.24 : 
           terrainCategory === 3 ? 1.20 : 1.13;
    } else if (z <= 150) {
      k2 = terrainCategory === 1 ? 1.30 : 
           terrainCategory === 2 ? 1.28 : 
           terrainCategory === 3 ? 1.24 : 1.19;
    } else {
      k2 = terrainCategory === 1 ? 1.32 : 
           terrainCategory === 2 ? 1.30 : 
           terrainCategory === 3 ? 1.28 : 1.24;
    }
    
    const k3 = topographyFactor; // Topography factor (1.0 for flat terrain)
    const k4 = 1.0; // Importance factor for cyclonic region (assuming non-cyclonic)

    // Design wind speed
    const Vz = Vb * k1 * k2 * k3 * k4;
    
    // Design wind pressure (Pz = 0.6 * Vz²)
    const Pz = 0.6 * Vz * Vz / 1000; // Convert to kN/m²

    return { Vb, k1, k2, k3, k4, Vz, Pz, z };
  }, [city, terrain, terrainCategory, buildingHeight, topographyFactor]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Wind className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Wind Load Calculator</h2>
            <p className="text-sm text-gray-500">IS 875 (Part 3) : 2015</p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-4">
        {/* City Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City / Location
          </label>
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {indianCities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}, {c.state} (Vb = {c.Vb} m/s)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Terrain Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Terrain Category
          </label>
          <div className="relative">
            <select
              value={terrainCategory}
              onChange={(e) => setTerrainCategory(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {terrainCategories.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} - {t.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Building Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building Height (m)
          </label>
          <input
            type="number"
            value={buildingHeight}
            onChange={(e) => setBuildingHeight(Math.max(3, Number(e.target.value)))}
            min={3}
            max={500}
            step={1}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Topography Factor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topography Factor (k₃)
          </label>
          <div className="relative">
            <select
              value={topographyFactor}
              onChange={(e) => setTopographyFactor(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={1.0}>1.0 - Flat terrain (up to 3° slope)</option>
              <option value={1.15}>1.15 - Moderate upwind slope</option>
              <option value={1.36}>1.36 - Steep upwind slope / cliff / escarpment</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Results</h3>
        
        {/* Main Result */}
        <div className="bg-sky-600 text-white rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sky-200 text-sm">Design Wind Pressure (Pz)</p>
              <p className="text-3xl font-bold">{calculations.Pz.toFixed(3)} kN/m²</p>
            </div>
            <CopyButton 
              value={calculations.Pz.toFixed(3)} 
              label="Copy" 
              className="bg-sky-500 hover:bg-sky-400 text-white"
            />
          </div>
        </div>

        {/* Intermediate Values */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Design Wind Speed</p>
            <p className="text-lg font-semibold text-gray-900">{calculations.Vz.toFixed(2)} m/s</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Basic Wind Speed</p>
            <p className="text-lg font-semibold text-gray-900">{calculations.Vb} m/s</p>
          </div>
        </div>

        {/* Formula Display */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-sky-600" />
            <span className="text-sm font-medium text-gray-700">Calculation Steps</span>
          </div>
          
          <div className="space-y-2 text-sm font-mono bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600">
              <span className="text-sky-600">Vz</span> = Vb × k₁ × k₂ × k₃ × k₄
            </p>
            <p className="text-gray-800">
              <span className="text-sky-600">Vz</span> = {calculations.Vb} × {calculations.k1.toFixed(2)} × {calculations.k2.toFixed(2)} × {calculations.k3.toFixed(2)} × {calculations.k4.toFixed(2)}
            </p>
            <p className="text-gray-800 font-semibold">
              <span className="text-sky-600">Vz</span> = {calculations.Vz.toFixed(2)} m/s
            </p>
            <hr className="my-2 border-gray-200" />
            <p className="text-gray-600">
              <span className="text-sky-600">Pz</span> = 0.6 × Vz² (N/m²)
            </p>
            <p className="text-gray-800">
              <span className="text-sky-600">Pz</span> = 0.6 × {calculations.Vz.toFixed(2)}² = {(0.6 * calculations.Vz * calculations.Vz).toFixed(1)} N/m²
            </p>
            <p className="text-gray-800 font-semibold">
              <span className="text-sky-600">Pz</span> = {calculations.Pz.toFixed(3)} kN/m²
            </p>
          </div>

          {/* Factor Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>k₁ = {calculations.k1.toFixed(2)} (Risk coefficient)</div>
            <div>k₂ = {calculations.k2.toFixed(2)} (Terrain & height)</div>
            <div>k₃ = {calculations.k3.toFixed(2)} (Topography)</div>
            <div>k₄ = {calculations.k4.toFixed(2)} (Importance)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEISMIC LOAD CALCULATOR (IS 1893)
// ============================================================================

function SeismicLoadCalculator() {
  const [zone, setZone] = useState<string>('III');
  const [soilType, setSoilType] = useState<string>('II');
  const [importance, setImportance] = useState<number>(1.0);
  const [responseReduction, setResponseReduction] = useState<number>(5.0);
  const [timePeriod, setTimePeriod] = useState<number>(0.5);

  const selectedZone = useMemo(() => 
    seismicZones.find(z => z.value === zone) || seismicZones[1],
    [zone]
  );

  const selectedSoil = useMemo(() => 
    soilTypes.find(s => s.value === soilType) || soilTypes[1],
    [soilType]
  );

  // Calculate seismic parameters
  const calculations = useMemo(() => {
    const Z = selectedZone.Z;
    const I = importance;
    const R = responseReduction;
    const T = timePeriod;

    // Sa/g calculation based on soil type and time period (IS 1893:2016)
    let Sa_g: number;
    
    if (soilType === 'I') {
      // Rock/Hard Soil
      if (T <= 0.10) {
        Sa_g = 1 + 15 * T;
      } else if (T <= 0.40) {
        Sa_g = 2.5;
      } else if (T <= 4.0) {
        Sa_g = 1.0 / T;
      } else {
        Sa_g = 0.25;
      }
    } else if (soilType === 'II') {
      // Medium Soil
      if (T <= 0.10) {
        Sa_g = 1 + 15 * T;
      } else if (T <= 0.55) {
        Sa_g = 2.5;
      } else if (T <= 4.0) {
        Sa_g = 1.36 / T;
      } else {
        Sa_g = 0.34;
      }
    } else {
      // Soft Soil
      if (T <= 0.10) {
        Sa_g = 1 + 15 * T;
      } else if (T <= 0.67) {
        Sa_g = 2.5;
      } else if (T <= 4.0) {
        Sa_g = 1.67 / T;
      } else {
        Sa_g = 0.42;
      }
    }

    // Design horizontal seismic coefficient
    const Ah = (Z * I * Sa_g) / (2 * R);

    return { Z, I, R, T, Sa_g, Ah };
  }, [selectedZone, selectedSoil, soilType, importance, responseReduction, timePeriod]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Seismic Load Calculator</h2>
            <p className="text-sm text-gray-500">IS 1893 (Part 1) : 2016</p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-4">
        {/* Seismic Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seismic Zone
          </label>
          <div className="grid grid-cols-4 gap-2">
            {seismicZones.map((z) => (
              <button
                key={z.value}
                onClick={() => setZone(z.value)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  zone === z.value
                    ? 'bg-orange-100 border-orange-400 text-orange-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold">{z.label}</div>
                <div className="text-xs">Z = {z.Z}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{selectedZone.description}</p>
        </div>

        {/* Soil Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Soil Type
          </label>
          <div className="relative">
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {soilTypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Importance Factor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Importance Factor (I)
          </label>
          <div className="relative">
            <select
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={1.0}>1.0 - General buildings</option>
              <option value={1.2}>1.2 - Schools, community halls</option>
              <option value={1.5}>1.5 - Hospitals, fire stations, power plants</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Response Reduction Factor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response Reduction Factor (R)
          </label>
          <div className="relative">
            <select
              value={responseReduction}
              onChange={(e) => setResponseReduction(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={1.5}>1.5 - Unreinforced masonry</option>
              <option value={3.0}>3.0 - Ordinary moment resisting frame</option>
              <option value={4.0}>4.0 - Special moment resisting frame (steel/concrete)</option>
              <option value={5.0}>5.0 - SMRF with ductile detailing (RC)</option>
              <option value={6.0}>6.0 - SMRF with ductile detailing (Steel)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Time Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Natural Time Period T (seconds)
          </label>
          <input
            type="number"
            value={timePeriod}
            onChange={(e) => setTimePeriod(Math.max(0.01, Number(e.target.value)))}
            min={0.01}
            max={4.0}
            step={0.01}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: Use T = 0.075h^0.75 for RC frames, T = 0.085h^0.75 for steel frames
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Results</h3>
        
        {/* Main Result */}
        <div className="bg-orange-600 text-white rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">Design Horizontal Seismic Coefficient (Ah)</p>
              <p className="text-3xl font-bold">{calculations.Ah.toFixed(4)}</p>
            </div>
            <CopyButton 
              value={calculations.Ah.toFixed(4)} 
              label="Copy" 
              className="bg-orange-500 hover:bg-orange-400 text-white"
            />
          </div>
        </div>

        {/* Warning for high Ah */}
        {calculations.Ah > 0.15 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              High seismic coefficient. Consider ductile detailing and special provisions.
            </p>
          </div>
        )}

        {/* Intermediate Values */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Spectral Acceleration (Sa/g)</p>
            <p className="text-lg font-semibold text-gray-900">{calculations.Sa_g.toFixed(3)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Zone Factor (Z)</p>
            <p className="text-lg font-semibold text-gray-900">{calculations.Z}</p>
          </div>
        </div>

        {/* Formula Display */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Calculation Steps</span>
          </div>
          
          <div className="space-y-2 text-sm font-mono bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600">
              <span className="text-orange-600">Ah</span> = (Z × I × Sa/g) / (2 × R)
            </p>
            <p className="text-gray-800">
              <span className="text-orange-600">Ah</span> = ({calculations.Z} × {calculations.I.toFixed(1)} × {calculations.Sa_g.toFixed(3)}) / (2 × {calculations.R.toFixed(1)})
            </p>
            <p className="text-gray-800">
              <span className="text-orange-600">Ah</span> = {(calculations.Z * calculations.I * calculations.Sa_g).toFixed(4)} / {(2 * calculations.R).toFixed(1)}
            </p>
            <p className="text-gray-800 font-semibold">
              <span className="text-orange-600">Ah</span> = {calculations.Ah.toFixed(4)}
            </p>
          </div>

          {/* Factor Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>Z = {calculations.Z} (Zone factor)</div>
            <div>I = {calculations.I.toFixed(1)} (Importance factor)</div>
            <div>R = {calculations.R.toFixed(1)} (Response reduction)</div>
            <div>T = {calculations.T.toFixed(2)}s (Time period)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CTA SECTION
// ============================================================================

function CTASection() {
  return (
    <div className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Ready to apply these loads to your structure?</h3>
          <p className="text-orange-100 text-sm">
            Use BeamLab's full structural analysis workspace for automatic load combinations and design checks.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap"
        >
          Open Workspace
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoadGenerators() {
  const [activeTab, setActiveTab] = useState<'wind' | 'seismic'>('wind');

  return (
    <>
      <Helmet>
        <title>Wind & Seismic Load Calculator | IS 875 & IS 1893 | BeamLab</title>
        <meta
          name="description"
          content="Free IS 875 wind load calculator and IS 1893 seismic load calculator. Calculate design wind pressure (Pz) and base shear coefficient (Ah) with transparent formulas."
        />
        <meta
          name="keywords"
          content="IS 875, IS 1893, wind load calculator, seismic load, base shear, Ah, Pz, design wind pressure, earthquake load, Indian Standard, structural design"
        />
        <link rel="canonical" href="https://beamlab.app/tools/load-generators" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <ToolNavbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Wind & Seismic Load Calculators
            </h1>
            <p className="text-gray-600">
              Calculate design loads as per IS 875 (Part 3) and IS 1893 (Part 1) with transparent step-by-step calculations.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('wind')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'wind'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wind className="w-4 h-4" />
              Wind Load (IS 875)
            </button>
            <button
              onClick={() => setActiveTab('seismic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'seismic'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              Seismic Load (IS 1893)
            </button>
          </div>

          {/* Calculator Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'wind' ? <WindLoadCalculator /> : <SeismicLoadCalculator />}
            </motion.div>
          </AnimatePresence>

          {/* CTA */}
          <CTASection />

          {/* Reference Note */}
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Reference Standards</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>IS 875 (Part 3) : 2015</strong> - Design Loads for Buildings - Wind Loads</li>
              <li>• <strong>IS 1893 (Part 1) : 2016</strong> - Criteria for Earthquake Resistant Design of Structures</li>
            </ul>
            <p className="text-xs text-gray-400 mt-3">
              Note: This calculator is for preliminary estimation. For final design, refer to the complete code provisions.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

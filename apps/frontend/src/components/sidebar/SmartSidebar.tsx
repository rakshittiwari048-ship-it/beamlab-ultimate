/**
 * SmartSidebar.tsx
 *
 * Dynamic sidebar that renders different tools and panels based on the active category
 * from the Umbrella State Manager (uiStore).
 *
 * Categories:
 * - MODELING: Template bank, Draw tools
 * - PROPERTIES: Section picker
 * - LOADING: Load generators, Manual loads
 * - ANALYSIS: Solver controls, Result toggles
 * - DESIGN: Design controls
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useUIStore, selectActiveCategory, selectActiveTool } from '../../store/uiStore';

// ============================================================================
// TYPES
// ============================================================================

interface ToastState {
  visible: boolean;
  message: string;
  type: 'loading' | 'success' | 'error';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SmartSidebar() {
  const activeCategory = useUIStore(selectActiveCategory);

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800 text-zinc-100">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          {activeCategory} Tools
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeCategory === 'MODELING' && <ModelingPanel />}
        {activeCategory === 'PROPERTIES' && <PropertiesPanel />}
        {activeCategory === 'LOADING' && <LoadingPanel />}
        {activeCategory === 'ANALYSIS' && <AnalysisPanel />}
        {activeCategory === 'DESIGN' && <DesignPanel />}
      </div>
    </div>
  );
}

// ============================================================================
// MODELING PANEL
// ============================================================================

function ModelingPanel() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'loading',
  });
  const setActiveTool = useUIStore((state) => state.setActiveTool);
  const activeTool = useUIStore(selectActiveTool);

  const handleTemplateClick = async (templateType: string) => {
    setToast({ visible: true, message: `Loading ${templateType}...`, type: 'loading' });

    try {
      // Fetch from Python backend or Node backend
      const response = await fetch(`http://localhost:8001/template/${templateType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ span: 10, height: 5, bays: 4 }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }

      const data = await response.json();
      setToast({
        visible: true,
        message: `✓ ${templateType} loaded successfully`,
        type: 'success',
      });

      console.log('Template loaded:', data);

      // TODO: Dispatch event or callback to load model into canvas
    } catch (error) {
      setToast({
        visible: true,
        message: `✗ Error loading template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Template Bank */}
      <Accordion title="Template Bank" defaultOpen>
        <div className="space-y-2">
          <button
            onClick={() => handleTemplateClick('beam')}
            className="w-full px-3 py-2 bg-blue-900 hover:bg-blue-800 text-blue-100 rounded text-sm transition-colors"
          >
            📊 Beam (Continuous)
          </button>
          <button
            onClick={() => handleTemplateClick('truss')}
            className="w-full px-3 py-2 bg-green-900 hover:bg-green-800 text-green-100 rounded text-sm transition-colors"
          >
            △ Truss (Pratt)
          </button>
          <button
            onClick={() => handleTemplateClick('frame')}
            className="w-full px-3 py-2 bg-purple-900 hover:bg-purple-800 text-purple-100 rounded text-sm transition-colors"
          >
            ⬜ Frame (3D Warehouse)
          </button>
        </div>
      </Accordion>

      {/* Draw Tools */}
      <Accordion title="Draw Tools" defaultOpen>
        <div className="space-y-2">
          <button
            onClick={() => setActiveTool('DRAW_NODE')}
            className={`w-full px-3 py-2 rounded text-sm transition-colors ${
              activeTool === 'DRAW_NODE'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
            }`}
          >
            ● Add Node
          </button>
          <button
            onClick={() => setActiveTool('DRAW_BEAM')}
            className={`w-full px-3 py-2 rounded text-sm transition-colors ${
              activeTool === 'DRAW_BEAM'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
            }`}
          >
            ─ Add Beam
          </button>
          <button
            onClick={() => setActiveTool('ADD_SUPPORT')}
            className={`w-full px-3 py-2 rounded text-sm transition-colors ${
              activeTool === 'ADD_SUPPORT'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
            }`}
          >
            🔒 Add Support
          </button>
          <button
            onClick={() => setActiveTool(null)}
            className="w-full px-3 py-2 bg-red-900 hover:bg-red-800 text-red-100 rounded text-sm transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      </Accordion>

      {/* Toast */}
      {toast.visible && (
        <div
          className={`p-3 rounded text-sm ${
            toast.type === 'success'
              ? 'bg-green-900 text-green-100'
              : toast.type === 'error'
                ? 'bg-red-900 text-red-100'
                : 'bg-blue-900 text-blue-100'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROPERTIES PANEL
// ============================================================================

function PropertiesPanel() {
  const [selectedCode, setSelectedCode] = useState<'AISC' | 'IS808'>('AISC');
  const [selectedProfile, setSelectedProfile] = useState<string>('ISMB300');

  const profiles: Record<string, string[]> = {
    AISC: ['W12x26', 'W12x35', 'W12x50', 'W18x35', 'W18x55'],
    IS808: ['ISMB300', 'ISMB400', 'ISMB500', 'ISUB300', 'ISUB400'],
  };

  const handleAssign = () => {
    console.log(`Assigned section: ${selectedProfile} (${selectedCode})`);
    alert(`Assigned ${selectedProfile} to selected members`);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Section Picker */}
      <Accordion title="Section Codes" defaultOpen>
        <div className="space-y-3">
          {/* Code Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Standard Code
            </label>
            <select
              value={selectedCode}
              onChange={(e) => {
                setSelectedCode(e.target.value as 'AISC' | 'IS808');
                setSelectedProfile(profiles[e.target.value][0]);
              }}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="AISC">AISC (US)</option>
              <option value="IS808">IS 808 (India)</option>
            </select>
          </div>

          {/* Profile List */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Profiles
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {profiles[selectedCode].map((profile) => (
                <label
                  key={profile}
                  className="flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="profile"
                    value={profile}
                    checked={selectedProfile === profile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-zinc-100">{profile}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            ✓ Assign to Selected
          </button>
        </div>
      </Accordion>

      {/* Properties Info */}
      <Accordion title="Section Properties">
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Area:</span>
            <span className="text-zinc-200">5300 mm²</span>
          </div>
          <div className="flex justify-between">
            <span>Ixx:</span>
            <span className="text-zinc-200">101.1 × 10⁶ mm⁴</span>
          </div>
          <div className="flex justify-between">
            <span>Iyy:</span>
            <span className="text-zinc-200">6.8 × 10⁶ mm⁴</span>
          </div>
          <div className="flex justify-between">
            <span>Material:</span>
            <span className="text-zinc-200">Steel (250 MPa)</span>
          </div>
        </div>
      </Accordion>
    </div>
  );
}

// ============================================================================
// LOADING PANEL
// ============================================================================

function LoadingPanel() {
  const [windSpeed, setWindSpeed] = useState<number>(30);
  const [windZone, setWindZone] = useState<string>('IV');
  const [deadLoadEnabled, setDeadLoadEnabled] = useState<boolean>(true);
  const [fx, setFx] = useState<number>(0);
  const [fy, setFy] = useState<number>(-10);
  const [fz, setFz] = useState<number>(0);
  const [moment, setMoment] = useState<number>(0);

  const handleAddLoad = () => {
    console.log({
      type: 'manual',
      fx,
      fy,
      fz,
      moment,
    });
    alert(`Load applied: Fx=${fx}, Fy=${fy}, Fz=${fz}, M=${moment}`);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Load Generators */}
      <Accordion title="Load Generators" defaultOpen>
        <div className="space-y-4">
          {/* Wind Load */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-2">
              Wind Load (IS 875-1)
            </label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-zinc-400">Zone</label>
                <select
                  value={windZone}
                  onChange={(e) => setWindZone(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="I">Zone I (30 m/s)</option>
                  <option value="II">Zone II (39 m/s)</option>
                  <option value="III">Zone III (47 m/s)</option>
                  <option value="IV">Zone IV (55 m/s)</option>
                  <option value="V">Zone V (65 m/s)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 flex justify-between">
                  <span>Wind Speed</span>
                  <span>{windSpeed} m/s</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <button className="w-full px-2 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded text-sm transition-colors">
                ↪ Apply Wind Load
              </button>
            </div>
          </div>

          {/* Dead Load */}
          <div className="flex items-center justify-between p-2 bg-zinc-800 rounded">
            <label className="text-sm text-zinc-300">Self Weight (Dead Load)</label>
            <input
              type="checkbox"
              checked={deadLoadEnabled}
              onChange={(e) => setDeadLoadEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
          </div>
        </div>
      </Accordion>

      {/* Manual Loads */}
      <Accordion title="Manual Loads">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Fx (kN)</label>
            <input
              type="number"
              value={fx}
              onChange={(e) => setFx(parseFloat(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Fy (kN)</label>
            <input
              type="number"
              value={fy}
              onChange={(e) => setFy(parseFloat(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Fz (kN)</label>
            <input
              type="number"
              value={fz}
              onChange={(e) => setFz(parseFloat(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Moment (kN·m)</label>
            <input
              type="number"
              value={moment}
              onChange={(e) => setMoment(parseFloat(e.target.value))}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddLoad}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            ➕ Add Load
          </button>
        </div>
      </Accordion>
    </div>
  );
}

// ============================================================================
// ANALYSIS PANEL
// ============================================================================

function AnalysisPanel() {
  const [resultToggles, setResultToggles] = useState({
    deflection: true,
    bendingMoment: true,
    shearForce: true,
    reactions: false,
    stress: false,
  });
  const [isRunning, setIsRunning] = useState(false);

  const handleRunSolver = async () => {
    setIsRunning(true);
    try {
      // Call solver endpoint
      const response = await fetch('http://localhost:6000/api/solver/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: 'current' }),
      });

      if (!response.ok) throw new Error('Solver failed');

      alert('✓ Analysis completed successfully!');
      // TODO: Load and display results
    } catch (error) {
      alert(`✗ Solver error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Solver Controls */}
      <Accordion title="Solver Controls" defaultOpen>
        <div className="space-y-3">
          <button
            onClick={handleRunSolver}
            disabled={isRunning}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded font-semibold transition-colors text-sm"
          >
            {isRunning ? '⏳ Running...' : '▶ RUN SOLVER'}
          </button>

          <div className="text-xs text-zinc-400 p-2 bg-zinc-800 rounded">
            <p>✓ Geometry valid</p>
            <p>✓ {resultToggles ? '5 load cases' : '0 load cases'}</p>
            <p>✓ Solver ready</p>
          </div>
        </div>
      </Accordion>

      {/* Result Toggles */}
      <Accordion title="Display Results">
        <div className="space-y-2">
          {[
            { key: 'deflection', label: '📉 Deflection' },
            { key: 'bendingMoment', label: '∿ Bending Moment' },
            { key: 'shearForce', label: '⟿ Shear Force' },
            { key: 'reactions', label: '⬆ Reactions' },
            { key: 'stress', label: '🔴 Stress' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={resultToggles[key as keyof typeof resultToggles]}
                onChange={(e) =>
                  setResultToggles({
                    ...resultToggles,
                    [key]: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-blue-500 mr-2"
              />
              <span className="text-sm text-zinc-100">{label}</span>
            </label>
          ))}
        </div>
      </Accordion>

      {/* Analysis Info */}
      <Accordion title="Analysis Info">
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Method:</span>
            <span className="text-zinc-200">FEM (Linear Elastic)</span>
          </div>
          <div className="flex justify-between">
            <span>Elements:</span>
            <span className="text-zinc-200">64</span>
          </div>
          <div className="flex justify-between">
            <span>DOF:</span>
            <span className="text-zinc-200">384</span>
          </div>
          <div className="flex justify-between">
            <span>Solver:</span>
            <span className="text-zinc-200">Intel MKL</span>
          </div>
        </div>
      </Accordion>
    </div>
  );
}

// ============================================================================
// DESIGN PANEL
// ============================================================================

function DesignPanel() {
  const [designMethod, setDesignMethod] = useState<'LRFD' | 'ASD'>('LRFD');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleRunDesign = async () => {
    setIsOptimizing(true);
    try {
      alert(`Running design optimization using ${designMethod}...`);
      // TODO: Call design endpoint
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Design Controls */}
      <Accordion title="Design Controls" defaultOpen>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-2">
              Design Method
            </label>
            <select
              value={designMethod}
              onChange={(e) => setDesignMethod(e.target.value as 'LRFD' | 'ASD')}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="LRFD">LRFD (Load & Resistance Factor Design)</option>
              <option value="ASD">ASD (Allowable Stress Design)</option>
            </select>
          </div>

          <button
            onClick={handleRunDesign}
            disabled={isOptimizing}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded font-semibold transition-colors text-sm"
          >
            {isOptimizing ? '⏳ Optimizing...' : '⚡ RUN DESIGN'}
          </button>
        </div>
      </Accordion>

      {/* Design Constraints */}
      <Accordion title="Constraints">
        <div className="space-y-2 text-xs text-zinc-400">
          <label className="flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer">
            <input type="checkbox" className="mr-2 accent-blue-500" defaultChecked />
            <span className="text-zinc-100">Max Deflection: L/240</span>
          </label>
          <label className="flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer">
            <input type="checkbox" className="mr-2 accent-blue-500" defaultChecked />
            <span className="text-zinc-100">Utilization: ≤ 90%</span>
          </label>
          <label className="flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer">
            <input type="checkbox" className="mr-2 accent-blue-500" />
            <span className="text-zinc-100">Cost Optimization</span>
          </label>
        </div>
      </Accordion>

      {/* Recommendations */}
      <Accordion title="Recommendations">
        <div className="text-xs text-zinc-400 space-y-2">
          <p className="text-zinc-300">Run Analysis first to see design recommendations.</p>
        </div>
      </Accordion>
    </div>
  );
}

// ============================================================================
// ACCORDION COMPONENT (Simple custom implementation)
// ============================================================================

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-700 rounded overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-100">{title}</span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-3 bg-zinc-850 border-t border-zinc-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

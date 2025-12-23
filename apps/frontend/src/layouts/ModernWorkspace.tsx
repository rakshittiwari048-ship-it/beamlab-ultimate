/**
 * ModernWorkspace.tsx - Main IDE-style workspace layout
 * 
 * Features:
 * - 5-tab umbrella switcher (Modeling, Properties, Loading, Analysis, Design)
 * - Resizable left sidebar (context-aware content)
 * - 3D canvas center
 * - Right inspector panel (collapsible)
 * - Bottom status bar
 * - Dark theme with Tailwind CSS
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Boxes,
  Settings,
  Wind,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ViewportManager } from '../components/ViewportManager';
import { useUIStore, WorkflowCategory } from '../store/uiStore';

// Category tab configuration
const CATEGORIES = [
  { id: WorkflowCategory.MODELING, label: 'Modeling', icon: Boxes },
  { id: WorkflowCategory.PROPERTIES, label: 'Properties', icon: Settings },
  { id: WorkflowCategory.LOADING, label: 'Loading', icon: Wind },
  { id: WorkflowCategory.ANALYSIS, label: 'Analysis', icon: BarChart3 },
  { id: WorkflowCategory.DESIGN, label: 'Design', icon: CheckCircle2 },
];

/**
 * Top Bar - Umbrella Switcher with 5 category tabs
 */
const TopBar: React.FC = () => {
  const { activeCategory, setCategory } = useUIStore();

  return (
    <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
      {CATEGORIES.map(({ id, label, icon: Icon }) => (
        <motion.button
          key={id}
          onClick={() => setCategory(id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
            activeCategory === id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
          )}
        >
          <Icon size={18} />
          <span>{label}</span>
        </motion.button>
      ))}
    </div>
  );
};

/**
 * Context Sidebar - Content changes based on activeCategory
 */
const ContextSidebar: React.FC = () => {
  const { activeCategory, activeTool, setActiveTool } = useUIStore();

  const renderContent = () => {
    switch (activeCategory) {
      case WorkflowCategory.MODELING:
        return <ModelingSidebar activeTool={activeTool} setActiveTool={setActiveTool} />;
      case WorkflowCategory.PROPERTIES:
        return <PropertiesSidebar />;
      case WorkflowCategory.LOADING:
        return <LoadingSidebar activeTool={activeTool} setActiveTool={setActiveTool} />;
      case WorkflowCategory.ANALYSIS:
        return <AnalysisSidebar />;
      case WorkflowCategory.DESIGN:
        return <DesignSidebar />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="w-72 bg-zinc-900 border-r border-zinc-800 overflow-y-auto p-4"
    >
      {renderContent()}
    </motion.div>
  );
};

/**
 * Modeling Sidebar - Template Bank, Draw Tools, DXF Import
 */
const ModelingSidebar: React.FC<{
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
}> = ({ activeTool, setActiveTool }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
        Template Bank
      </h3>
      <div className="space-y-2">
        {['Simple Beam', 'Portal Frame', 'Truss', 'Grid'].map((template) => (
          <button
            key={template}
            className="w-full text-left px-3 py-2 rounded text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            + {template}
          </button>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
        Draw Tools
      </h3>
      <div className="space-y-2">
        {['Draw Beam', 'Add Node', 'Add Support', 'Draw Member'].map((tool) => (
          <motion.button
            key={tool}
            onClick={() => setActiveTool(activeTool === tool ? null : tool)}
            whileHover={{ scale: 1.02 }}
            className={clsx(
              'w-full text-left px-3 py-2 rounded text-sm transition',
              activeTool === tool
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            )}
          >
            {tool}
          </motion.button>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
        Import
      </h3>
      <button className="w-full px-3 py-2 rounded text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition">
        📄 Import DXF
      </button>
    </div>
  </div>
);

/**
 * Properties Sidebar - Section Library, Material Grades
 */
const PropertiesSidebar: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
        Section Library
      </h3>
      <select className="w-full px-3 py-2 rounded text-sm bg-zinc-800 text-zinc-200 border border-zinc-700">
        <option>ISMB 300</option>
        <option>ISMB 400</option>
        <option>ISMB 500</option>
        <option>UC 152x152</option>
      </select>
    </div>

    <div>
      <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
        Material Grade
      </h3>
      <select className="w-full px-3 py-2 rounded text-sm bg-zinc-800 text-zinc-200 border border-zinc-700">
        <option>Fe 250</option>
        <option>Fe 345</option>
        <option>Fe 415</option>
      </select>
    </div>

    <div>
      <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
        Properties
      </h3>
      <div className="space-y-2 text-xs text-zinc-400">
        <div className="flex justify-between">
          <span>Area (mm²):</span>
          <span className="text-zinc-200">5300</span>
        </div>
        <div className="flex justify-between">
          <span>Ixx (mm⁴):</span>
          <span className="text-zinc-200">101.1×10⁶</span>
        </div>
        <div className="flex justify-between">
          <span>Iyy (mm⁴):</span>
          <span className="text-zinc-200">6.8×10⁶</span>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Loading Sidebar - Load Generators
 */
const LoadingSidebar: React.FC<{
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
}> = ({ activeTool, setActiveTool }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
        Load Generators
      </h3>
      <div className="space-y-2">
        {['Wind Load (IS 875)', 'Seismic (IS 1893)', 'Point Load', 'UDL'].map((gen) => (
          <motion.button
            key={gen}
            onClick={() => setActiveTool(activeTool === gen ? null : gen)}
            className={clsx(
              'w-full text-left px-3 py-2 rounded text-sm transition',
              activeTool === gen
                ? 'bg-yellow-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            )}
          >
            {gen}
          </motion.button>
        ))}
      </div>
    </div>

    <div className="p-3 bg-zinc-800 rounded border border-zinc-700">
      <p className="text-xs text-zinc-400">
        Select load type and configure parameters. Apply to members or nodes.
      </p>
    </div>
  </div>
);

/**
 * Analysis Sidebar - Run Solver, View Results
 */
const AnalysisSidebar: React.FC = () => (
  <div className="space-y-4">
    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm">
      ▶ Run Solver
    </button>

    <div>
      <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
        Analysis Type
      </h3>
      <div className="space-y-2">
        {['Static Linear', 'Modal', 'Deformed Shape'].map((type) => (
          <label key={type} className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 cursor-pointer">
            <input type="radio" name="analysis" className="w-4 h-4" />
            <span className="text-sm text-zinc-300">{type}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="p-3 bg-zinc-800 rounded border border-zinc-700">
      <p className="text-xs text-zinc-400">Status: Ready</p>
      <p className="text-xs text-green-400 mt-1">Model is valid ✓</p>
    </div>
  </div>
);

/**
 * Design Sidebar - Code Checks
 */
const DesignSidebar: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
        Design Code
      </h3>
      <select className="w-full px-3 py-2 rounded text-sm bg-zinc-800 text-zinc-200 border border-zinc-700">
        <option>IS 800 (Steel)</option>
        <option>IS 456 (Concrete)</option>
        <option>IS 1343 (PSC)</option>
      </select>
    </div>

    <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm">
      🔍 Run Design Check
    </button>

    <div className="space-y-2">
      <div className="p-3 bg-green-900/30 rounded border border-green-800">
        <p className="text-xs text-green-400">Beam M1: PASS ✓</p>
        <p className="text-xs text-zinc-400">Utilization: 72%</p>
      </div>
      <div className="p-3 bg-red-900/30 rounded border border-red-800">
        <p className="text-xs text-red-400">Column C1: FAIL ✗</p>
        <p className="text-xs text-zinc-400">Utilization: 115%</p>
      </div>
    </div>
  </div>
);

/**
 * Right Inspector Panel - Shows selected element properties
 */
const InspectorPanel: React.FC = () => {
  const { inspectorOpen, toggleInspector } = useUIStore();

  if (!inspectorOpen) {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        onClick={toggleInspector}
        className="absolute right-4 top-20 z-20 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
      >
        <ChevronLeft size={18} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200">Inspector</h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={toggleInspector}
          className="p-1 hover:bg-zinc-800 rounded"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Selected Element</h4>
          <div className="text-sm text-zinc-400">None selected</div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Properties</h4>
          <div className="space-y-1 text-xs text-zinc-400">
            <p>Select an element to view its properties</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Bottom Status Bar - Unit System, Code Year, Stats
 */
const StatusBar: React.FC = () => {
  return (
    <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-400">
      <div className="flex items-center gap-4">
        <span>📏 Units: mm</span>
        <span>•</span>
        <span>📅 Code Year: 2023</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Nodes: 12 | Members: 15</span>
        <span>•</span>
        <span>FPS: 60</span>
      </div>
    </div>
  );
};

/**
 * Main ModernWorkspace Component
 */
const ModernWorkspace: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && <ContextSidebar key="sidebar" />}
        </AnimatePresence>

        {/* Toggle Sidebar Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={toggleSidebar}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-r-lg"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </motion.button>

        {/* Center - 3D Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
          <ViewportManager activeTool="select" />
        </div>

        {/* Right Inspector Panel */}
        <InspectorPanel />
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};

export default ModernWorkspace;

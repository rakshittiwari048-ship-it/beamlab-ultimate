/**
 * WorkspaceLayout.tsx
 * 
 * Resizable IDE-Style Layout using react-resizable-panels
 * Professional structural analysis workspace with:
 * - Fixed Header/Ribbon (64px)
 * - Resizable Sidebar (Collapsible, 250px default)
 * - 3D Canvas (Flex-grow center)
 * - Resizable Properties Panel (300px default)
 * - Collapsible Data Tables (Bottom)
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Link, useParams, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Panel,
  Group,
  Separator,
} from 'react-resizable-panels';
import {
  Box,
  FileText,
  Shapes,
  Settings,
  Ruler,
  Weight,
  Play,
  Wrench,
  ClipboardList,
  ChevronDown,
  Plus,
  Move,
  Grid3X3,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Save,
  Download,
  Home,
  Layers,
  Target,
  Wind,
  Calculator,
  FileCheck,
  Table,
  Eye,
  PanelLeftClose,
  PanelLeft,
  GripVertical,
  GripHorizontal,
  PanelBottomClose,
  PanelBottom,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowStep = 
  | 'job-info'
  | 'geometry'
  | 'properties'
  | 'specifications'
  | 'loading'
  | 'analysis'
  | 'design'
  | 'reports';

interface RibbonTool {
  id: string;
  label: string;
  icon: typeof Box;
  action?: () => void;
}

// ============================================================================
// RESIZE HANDLE COMPONENTS
// ============================================================================

function VerticalResizeHandle({ className = '' }: { className?: string }) {
  return (
    <Separator
      className={`group relative w-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize ${className}`}
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3 text-white" />
      </div>
    </Separator>
  );
}

function HorizontalResizeHandle({ className = '' }: { className?: string }) {
  return (
    <Separator
      className={`group relative h-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-row-resize ${className}`}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal className="w-3 h-3 text-white" />
      </div>
    </Separator>
  );
}

// ============================================================================
// RIBBON (TOP - FIXED 64px)
// ============================================================================

interface RibbonProps {
  activeStep: WorkflowStep;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  tablesCollapsed: boolean;
  onToggleTables: () => void;
}

function Ribbon({
  activeStep,
  sidebarCollapsed,
  onToggleSidebar,
  tablesCollapsed,
  onToggleTables,
}: RibbonProps) {
  // Define tools for each workflow step
  const ribbonTools: Record<WorkflowStep, RibbonTool[]> = {
    'job-info': [
      { id: 'save', label: 'Save', icon: Save },
      { id: 'export', label: 'Export', icon: Download },
    ],
    geometry: [
      { id: 'add-node', label: 'Add Node', icon: Target },
      { id: 'add-beam', label: 'Draw Beam', icon: Ruler },
      { id: 'add-plate', label: 'Add Plate', icon: Grid3X3 },
      { id: 'snap-node', label: 'Snap Node', icon: Move },
      { id: 'insert-node', label: 'Insert Node', icon: Plus },
    ],
    properties: [
      { id: 'add-section', label: 'Add Section', icon: Layers },
      { id: 'add-material', label: 'Add Material', icon: Settings },
      { id: 'section-library', label: 'Section Library', icon: Box },
    ],
    specifications: [
      { id: 'add-support', label: 'Add Support', icon: Target },
      { id: 'member-release', label: 'Member Release', icon: Shapes },
      { id: 'member-offset', label: 'Member Offset', icon: Move },
    ],
    loading: [
      { id: 'add-load-case', label: 'Add Load Case', icon: Plus },
      { id: 'nodal-load', label: 'Add Load', icon: Target },
      { id: 'member-load', label: 'Member Load', icon: Ruler },
      { id: 'wind-gen', label: 'Wind Gen', icon: Wind },
    ],
    analysis: [
      { id: 'run-analysis', label: 'Run Analysis', icon: Play },
      { id: 'analysis-settings', label: 'Settings', icon: Settings },
      { id: 'view-results', label: 'View Results', icon: Eye },
    ],
    design: [
      { id: 'steel-design', label: 'Steel Design', icon: Wrench },
      { id: 'rc-design', label: 'RC Design', icon: Calculator },
      { id: 'design-check', label: 'Design Check', icon: FileCheck },
    ],
    reports: [
      { id: 'generate-report', label: 'Generate Report', icon: ClipboardList },
      { id: 'export-pdf', label: 'Export PDF', icon: Download },
      { id: 'export-calc', label: 'Export Calc Sheet', icon: Table },
    ],
  };

  const tools = ribbonTools[activeStep] || [];

  return (
    <header className="h-16 flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center z-40">
      {/* Left Section - Sidebar Toggle + File Operations */}
      <div className="flex items-center gap-1 px-3 border-r border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
          title={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
          <Redo2 className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Center Section - Context Tools */}
      <div className="flex-1 flex items-center gap-1 px-4 overflow-x-auto">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={tool.action}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Section - View Controls */}
      <div className="flex items-center gap-1 px-3 border-l border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onToggleTables}
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
          title={tablesCollapsed ? 'Show Tables' : 'Hide Tables'}
        >
          {tablesCollapsed ? <PanelBottom className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
        </button>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Fit View">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Rotate View">
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Home Button */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-4 py-2 mx-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden lg:inline">Dashboard</span>
      </Link>
    </header>
  );
}

// ============================================================================
// WORKFLOW SIDEBAR (LEFT)
// ============================================================================

interface WorkflowSidebarProps {
  activeStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
}

function WorkflowSidebar({ activeStep, onStepChange }: WorkflowSidebarProps) {
  const workflowSteps: { id: WorkflowStep; label: string; icon: typeof Box; subItems?: string[] }[] = [
    { id: 'job-info', label: 'Job Info', icon: FileText },
    { id: 'geometry', label: 'Geometry', icon: Shapes, subItems: ['Nodes', 'Beams', 'Plates'] },
    { id: 'properties', label: 'Properties', icon: Layers, subItems: ['Sections', 'Materials'] },
    { id: 'specifications', label: 'Specifications', icon: Settings, subItems: ['Releases', 'Offsets', 'Supports'] },
    { id: 'loading', label: 'Loading', icon: Weight, subItems: ['Load Cases', 'Combinations', 'Wind Gen'] },
    { id: 'analysis', label: 'Analysis', icon: Play, subItems: ['Run Analysis', 'Settings'] },
    { id: 'design', label: 'Design', icon: Wrench, subItems: ['Steel Design', 'RC Design'] },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
  ];

  return (
    <aside className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="h-14 flex-shrink-0 border-b border-zinc-800 flex items-center px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Box className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold">BeamLab</span>
        </Link>
      </div>

      {/* Workflow Title */}
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Workflow</span>
      </div>

      {/* Workflow Steps - Scrollable */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isPast = workflowSteps.findIndex(s => s.id === activeStep) > index;

          return (
            <div key={step.id}>
              <button
                onClick={() => onStepChange(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all relative ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : isPast
                    ? 'text-green-400 hover:bg-zinc-800'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                )}

                {/* Step Number */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isPast
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {index + 1}
                </div>

                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium flex-1 text-left">{step.label}</span>
                {step.subItems && (
                  <ChevronDown className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Sub-items */}
              {isActive && step.subItems && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-zinc-800/50"
                >
                  {step.subItems.map((subItem) => (
                    <button
                      key={subItem}
                      className="w-full text-left pl-14 pr-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {subItem}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ============================================================================
// CANVAS WRAPPER (CENTER)
// ============================================================================

interface CanvasWrapperProps {
  children?: ReactNode;
}

function CanvasWrapper({ children }: CanvasWrapperProps) {
  return (
    <div className="relative h-full w-full bg-zinc-950">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Coordinate Axis (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10">
        <svg width="60" height="60" viewBox="0 0 60 60">
          <line x1="10" y1="50" x2="55" y2="50" stroke="#EF4444" strokeWidth="2" />
          <line x1="10" y1="50" x2="10" y2="5" stroke="#22C55E" strokeWidth="2" />
          <line x1="10" y1="50" x2="35" y2="35" stroke="#3B82F6" strokeWidth="2" />
          <text x="52" y="46" fill="#EF4444" fontSize="10" fontWeight="600">X</text>
          <text x="14" y="12" fill="#22C55E" fontSize="10" fontWeight="600">Y</text>
          <text x="36" y="32" fill="#3B82F6" fontSize="10" fontWeight="600">Z</text>
        </svg>
      </div>

      {/* ViewCube (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 w-16 h-16 bg-zinc-800/80 backdrop-blur rounded-lg border border-zinc-700 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 rounded transform rotate-12 flex items-center justify-center text-xs text-zinc-400 font-mono">
          3D
        </div>
      </div>

      {/* Placeholder / Children */}
      {children || (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Box className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-500 text-lg">3D Canvas</p>
            <p className="text-zinc-600 text-sm mt-1">WebGL viewport will render here</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROPERTIES PANEL (RIGHT)
// ============================================================================

function PropertiesPanel() {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['geometry', 'properties']);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const propertyGroups = [
    {
      id: 'geometry',
      label: 'Geometry',
      properties: [
        { label: 'Start Node', value: 'N1' },
        { label: 'End Node', value: 'N2' },
        { label: 'Length', value: '5.000 m' },
      ],
    },
    {
      id: 'properties',
      label: 'Properties',
      properties: [
        { label: 'Section', value: 'ISMB 200' },
        { label: 'Material', value: 'Fe 250' },
        { label: 'Area', value: '32.3 cm²' },
        { label: 'Ixx', value: '2235.4 cm⁴' },
      ],
    },
    {
      id: 'assignments',
      label: 'Assignments',
      properties: [
        { label: 'Start Release', value: 'Fixed' },
        { label: 'End Release', value: 'Fixed' },
        { label: 'Offset', value: 'None' },
      ],
    },
  ];

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Properties</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Member B1 Selected</p>
      </div>

      {/* Property Groups - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2">
        {propertyGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.id);
          return (
            <div key={group.id} className="mb-2">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{group.label}</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 space-y-2">
                      {group.properties.map((prop) => (
                        <div key={prop.label} className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">{prop.label}</span>
                          <span className="text-xs font-medium text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {prop.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          Apply Changes
        </button>
      </div>
    </aside>
  );
}

// ============================================================================
// DATA TABLES (BOTTOM)
// ============================================================================

function DataTables() {
  const [activeTab, setActiveTab] = useState<'nodes' | 'beams' | 'supports'>('nodes');

  const tabs = [
    { id: 'nodes' as const, label: 'Nodes Table' },
    { id: 'beams' as const, label: 'Beams Table' },
    { id: 'supports' as const, label: 'Supports Table' },
  ];

  // Sample data
  const nodesData = [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 5, y: 0, z: 0 },
    { id: 3, x: 10, y: 0, z: 0 },
    { id: 4, x: 0, y: 3, z: 0 },
    { id: 5, x: 5, y: 3, z: 0 },
  ];

  const beamsData = [
    { id: 1, startNode: 1, endNode: 2, section: 'ISMB 200', material: 'Fe 250' },
    { id: 2, startNode: 2, endNode: 3, section: 'ISMB 200', material: 'Fe 250' },
    { id: 3, startNode: 1, endNode: 4, section: 'ISMB 150', material: 'Fe 250' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      {/* Tab Header */}
      <div className="flex-shrink-0 h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'nodes' && (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">ID</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">X (m)</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Y (m)</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Z (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {nodesData.map((node) => (
                <tr key={node.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-white">{node.id}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{node.x.toFixed(3)}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{node.y.toFixed(3)}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{node.z.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'beams' && (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">ID</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Start Node</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">End Node</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Section</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Material</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {beamsData.map((beam) => (
                <tr key={beam.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-white">{beam.id}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{beam.startNode}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{beam.endNode}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{beam.section}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{beam.material}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'supports' && (
          <div className="p-8 text-center text-zinc-500">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No supports defined yet.</p>
            <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
              Add Support
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WORKSPACE LAYOUT COMPONENT
// ============================================================================

export default function WorkspaceLayout() {
  const { type } = useParams<{ type: string }>();

  const [activeStep, setActiveStep] = useState<WorkflowStep>('geometry');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tablesCollapsed, setTablesCollapsed] = useState(false);

  // Set initial step based on workspace type
  useEffect(() => {
    if (type === 'steel-design' || type === 'rc-design') {
      setActiveStep('design');
    } else if (type === 'foundation' || type === 'connection') {
      setActiveStep('design');
    }
  }, [type]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex flex-col">
      {/* Top: Ribbon (Fixed 64px) */}
      <Ribbon
        activeStep={activeStep}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        tablesCollapsed={tablesCollapsed}
        onToggleTables={() => setTablesCollapsed(!tablesCollapsed)}
      />

      {/* Middle: Main Content Area */}
      <div className="flex-1 min-h-0">
        <Group orientation="vertical">
          {/* Upper Section: Sidebar + Canvas + Properties */}
          <Panel defaultSize={tablesCollapsed ? 100 : 75} minSize={40}>
            <Group orientation="horizontal">
              {/* Left: Workflow Sidebar */}
              {!sidebarCollapsed && (
                <>
                  <Panel defaultSize={15} minSize={10} maxSize={25}>
                    <WorkflowSidebar activeStep={activeStep} onStepChange={setActiveStep} />
                  </Panel>
                  <VerticalResizeHandle />
                </>
              )}

              {/* Center: 3D Canvas */}
              <Panel minSize={30}>
                <CanvasWrapper>
                  <Outlet />
                </CanvasWrapper>
              </Panel>

              <VerticalResizeHandle />

              {/* Right: Properties Panel */}
              <Panel defaultSize={20} minSize={15} maxSize={35}>
                <PropertiesPanel />
              </Panel>
            </Group>
          </Panel>

          {/* Bottom: Data Tables (Collapsible) */}
          {!tablesCollapsed && (
            <>
              <HorizontalResizeHandle />
              <Panel defaultSize={25} minSize={10} maxSize={50}>
                <DataTables />
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}

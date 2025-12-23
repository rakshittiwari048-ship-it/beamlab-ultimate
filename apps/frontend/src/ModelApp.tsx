import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { ViewportManager } from './components/ViewportManager';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ResultsTable } from './components/ResultsTable';
import { ViewportDemo } from './components/ViewportDemo';
import { PerformanceTest } from './components/PerformanceTest';
import { FPSMonitor } from './components/FPSMonitor';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { ToolSelector, useToolKeyboardShortcuts, ToolStatusBar, type Tool } from './components/ToolSelector';
import { PerformanceWarning, AnalysisProgress } from './components/PerformanceIndicators';
import { AIArchitectPanel } from './components/AIArchitectPanel';
import { useAppBrain } from './store/appBrain';
import { useSelectionStore } from './store/selection';
import { useModelStore } from './store/model';

const ModelApp: FC = () => {
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  
  // Connect to the Brain
  const { currentProject, createProject } = useAppBrain();
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const selectedMemberIds = useSelectionStore((state) => state.selectedMemberIds);
  const nodes = useModelStore((state) => state.getAllNodes());
  const members = useModelStore((state) => state.getAllMembers());
  const isAnalyzing = useModelStore((state) => state.isAnalyzing);
  
  // Setup keyboard shortcuts for tools
  useToolKeyboardShortcuts(setActiveTool);
  
  // Initialize with a default project if none exists
  useEffect(() => {
    if (!currentProject) {
      createProject('New Structural Model', 'Default project created by BeamLab Ultimate');
    }
  }, [currentProject, createProject]);

  return (
    <div className="model-app">
      <KeyboardShortcuts />
      
      {/* Performance Indicators */}
      <PerformanceWarning />
      <AnalysisProgress isAnalyzing={isAnalyzing} />
      
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <h1 className="text-xl font-bold text-white">BeamLab Ultimate</h1>
        <div className="ml-4 text-sm text-gray-400">
          Structural Analysis Platform
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-16 bg-gray-800 border-r border-gray-700">
          <Toolbar />
        </aside>

        {/* Center Viewport */}
        <main className="flex-1 relative">
          <ViewportManager activeTool={activeTool} />
          <ToolSelector activeTool={activeTool} onToolChange={setActiveTool} />
          <FPSMonitor />
        </main>

        {/* Right Panels */}
        <aside className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="space-y-0">
            <AIArchitectPanel />
            <div className="p-4 space-y-4">
              <ViewportDemo />
              <PerformanceTest />
              <PropertiesPanel />
              <ResultsPanel />
              <ResultsTable />
            </div>
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400">
        <ToolStatusBar tool={activeTool} />
        <span className="ml-4">
          Elements: {nodes.length} nodes, {members.length} members
        </span>
        {(selectedNodeIds.size > 0 || selectedMemberIds.size > 0) && (
          <span className="ml-4 text-orange-400">
            Selected: {selectedNodeIds.size > 0 && `${selectedNodeIds.size} nodes`}
            {selectedNodeIds.size > 0 && selectedMemberIds.size > 0 && ', '}
            {selectedMemberIds.size > 0 && `${selectedMemberIds.size} members`}
          </span>
        )}
        <span className="ml-auto">Units: Metric (kN, m)</span>
      </footer>
    </div>
  );
};

export default ModelApp;

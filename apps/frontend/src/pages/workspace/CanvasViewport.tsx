import { useState } from 'react';
import { ViewportManager } from '../../components/ViewportManager';
import { FPSMonitor } from '../../components/FPSMonitor';
import { ToolSelector, useToolKeyboardShortcuts, type Tool } from '../../components/ToolSelector';

/**
 * CanvasViewport
 * Lightweight viewport host for the new WorkspaceLayout.
 * Provides the 3D canvas with tool selection and FPS monitor, without the legacy header/sidebars.
 */
export default function CanvasViewport() {
  const [activeTool, setActiveTool] = useState<Tool>('select');

  // Keyboard shortcuts (V/N/B/S/L/D, Esc, Delete)
  useToolKeyboardShortcuts(setActiveTool);

  return (
    <div className="w-full h-full relative bg-gray-900">
      <ViewportManager activeTool={activeTool} />
      <ToolSelector activeTool={activeTool} onToolChange={setActiveTool} />
      <FPSMonitor />
    </div>
  );
}

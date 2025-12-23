import type { FC } from 'react';
import {
  MousePointer2,
  Circle,
  Minus,
  Anchor,
  Zap,
  Trash2,
  Play,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { Tool } from '../store/editorStore';
import { useModelStore } from '../store/model';

interface ToolButton {
  tool: Tool;
  icon: FC<{ className?: string }>;
  label: string;
}

const tools: ToolButton[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select' },
  { tool: 'node', icon: Circle, label: 'Add Node' },
  { tool: 'beam', icon: Minus, label: 'Add Beam' },
  { tool: 'support', icon: Anchor, label: 'Add Support' },
  { tool: 'load', icon: Zap, label: 'Add Load' },
  { tool: 'delete', icon: Trash2, label: 'Delete' },
];

export const Toolbar: FC = () => {
  const { activeTool, setActiveTool } = useEditorStore();
  const runAnalysis = useModelStore((state) => state.runAnalysis);
  const isAnalyzing = useModelStore((state) => state.isAnalyzing);
  const hasAnyLoadCase = useModelStore((state) => state.loadCases.length > 0);

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {tools.map(({ tool, icon: Icon, label }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          className={`
            w-12 h-12 rounded-lg flex items-center justify-center
            transition-colors relative group
            ${
              activeTool === tool
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }
          `}
          title={label}
        >
          <Icon className="w-5 h-5" />
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {label}
          </div>
        </button>
      ))}

      <button
        onClick={() => runAnalysis()}
        disabled={!hasAnyLoadCase || isAnalyzing}
        className={`
          mt-2 w-full px-3 h-12 rounded-lg flex items-center justify-center gap-2
          text-sm font-medium transition-colors
          ${!hasAnyLoadCase || isAnalyzing
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
        `}
        title={hasAnyLoadCase ? 'Run Analysis' : 'Add a load case to run analysis'}
      >
        <Play className="w-4 h-4" />
        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  );
};

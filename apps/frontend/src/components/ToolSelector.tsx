import { FC } from 'react';
import { MousePointer2, Circle, Minus, Anchor, Zap, Trash2 } from 'lucide-react';

/**
 * ToolSelector - Interactive tool selection panel
 * 
 * Provides buttons for switching between different tools:
 * - Select: Default selection tool
 * - Node: Create nodes
 * - Beam: Draw beams/members between nodes
 * - Support: Add supports
 * - Load: Apply loads
 * - Delete: Remove elements
 * 
 * Usage:
 * ```tsx
 * const [activeTool, setActiveTool] = useState<Tool>('select');
 * 
 * <ToolSelector
 *   activeTool={activeTool}
 *   onToolChange={setActiveTool}
 * />
 * ```
 */

export type Tool = 'select' | 'node' | 'beam' | 'support' | 'load' | 'delete';

interface ToolSelectorProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

interface ToolButtonProps {
  tool: Tool;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
}

const ToolButton: FC<ToolButtonProps> = ({ icon, label, active, onClick, shortcut }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-3 rounded-lg transition-all
        ${active 
          ? 'bg-primary-600 text-white shadow-lg' 
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
        }
      `}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <div className="w-6 h-6 mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-gray-400 mt-0.5">{shortcut}</span>
      )}
    </button>
  );
};

export const ToolSelector: FC<ToolSelectorProps> = ({ activeTool, onToolChange }) => {
  const tools: Array<{ tool: Tool; icon: React.ReactNode; label: string; shortcut?: string }> = [
    { tool: 'select', icon: <MousePointer2 />, label: 'Select', shortcut: 'V' },
    { tool: 'node', icon: <Circle />, label: 'Node', shortcut: 'N' },
    { tool: 'beam', icon: <Minus />, label: 'Beam', shortcut: 'B' },
    { tool: 'support', icon: <Anchor />, label: 'Support', shortcut: 'S' },
    { tool: 'load', icon: <Zap />, label: 'Load', shortcut: 'L' },
    { tool: 'delete', icon: <Trash2 />, label: 'Delete', shortcut: 'D' },
  ];

  return (
    <div className="absolute left-4 top-20 bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-700">
      <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
        Tools
      </div>
      
      <div className="flex flex-col gap-2">
        {tools.map(({ tool, icon, label, shortcut }) => (
          <ToolButton
            key={tool}
            tool={tool}
            icon={icon}
            label={label}
            active={activeTool === tool}
            onClick={() => onToolChange(tool)}
            shortcut={shortcut}
          />
        ))}
      </div>

      {/* Active Tool Info */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {activeTool === 'select' && 'Click to select elements'}
          {activeTool === 'node' && 'Click to place nodes'}
          {activeTool === 'beam' && 'Click two nodes to draw beam'}
          {activeTool === 'support' && 'Click node to add support'}
          {activeTool === 'load' && 'Click node to apply load'}
          {activeTool === 'delete' && 'Click to delete elements'}
        </div>
      </div>
    </div>
  );
};

/**
 * useToolKeyboardShortcuts - Hook for tool keyboard shortcuts
 * 
 * Automatically switches tools based on keyboard input
 */
import { useEffect } from 'react';

export const useToolKeyboardShortcuts = (
  onToolChange: (tool: Tool) => void
): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't trigger if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          onToolChange('select');
          break;
        case 'n':
          onToolChange('node');
          break;
        case 'b':
          onToolChange('beam');
          break;
        case 's':
          onToolChange('support');
          break;
        case 'l':
          onToolChange('load');
          break;
        case 'd':
          onToolChange('delete');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToolChange]);
};

/**
 * ToolStatusBar - Shows current tool status in bottom status bar
 */
interface ToolStatusBarProps {
  tool: Tool;
  additionalInfo?: string;
}

export const ToolStatusBar: FC<ToolStatusBarProps> = ({ tool, additionalInfo }) => {
  const getToolIcon = () => {
    switch (tool) {
      case 'select': return <MousePointer2 size={14} />;
      case 'node': return <Circle size={14} />;
      case 'beam': return <Minus size={14} />;
      case 'support': return <Anchor size={14} />;
      case 'load': return <Zap size={14} />;
      case 'delete': return <Trash2 size={14} />;
    }
  };

  const getToolColor = () => {
    switch (tool) {
      case 'select': return 'text-blue-400';
      case 'node': return 'text-green-400';
      case 'beam': return 'text-purple-400';
      case 'support': return 'text-yellow-400';
      case 'load': return 'text-red-400';
      case 'delete': return 'text-orange-400';
    }
  };

  return (
    <span className={`flex items-center gap-2 ${getToolColor()}`}>
      {getToolIcon()}
      <span className="font-medium capitalize">{tool}</span>
      {additionalInfo && (
        <span className="text-gray-400">| {additionalInfo}</span>
      )}
    </span>
  );
};

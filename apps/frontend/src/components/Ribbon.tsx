/**
 * Ribbon.tsx
 * 
 * Context-aware ribbon interface inspired by Office/CAD software.
 * Displays relevant tools based on the active tab (Geometry, Loading, Results, Analysis).
 * 
 * Features:
 * - Animated tab switching
 * - Tool groups organized by function
 * - Quick access buttons with icons
 * - Keyboard shortcuts hints
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Wind,
  Zap,
  Crosshair,
  Settings,
  Play,
  Save,
  Download,
  Upload,
  Eye,
  Grid3x3,
  Lock,
} from 'lucide-react';

interface RibbonTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface RibbonToolGroup {
  label: string;
  tools: RibbonTool[];
}

interface RibbonTool {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  shortcut?: string;
  color?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  disabled?: boolean;
}

interface RibbonProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

const Ribbon: React.FC<RibbonProps> = ({ activeTab = 'geometry', onTabChange }) => {
  const tabs: RibbonTab[] = [
    { id: 'geometry', label: 'Geometry', icon: '📐' },
    { id: 'loading', label: 'Loading', icon: '⚡' },
    { id: 'results', label: 'Results', icon: '📊' },
    { id: 'analysis', label: 'Analysis', icon: '🔧' },
  ];

  const toolGroups = useMemo(() => {
    const baseTools: RibbonToolGroup[] = [
      {
        label: 'File',
        tools: [
          {
            id: 'new',
            label: 'New',
            icon: <Plus size={16} />,
            shortcut: '⌘N',
          },
          {
            id: 'open',
            label: 'Open',
            icon: <Upload size={16} />,
            shortcut: '⌘O',
          },
          {
            id: 'save',
            label: 'Save',
            icon: <Save size={16} />,
            shortcut: '⌘S',
          },
          {
            id: 'export',
            label: 'Export',
            icon: <Download size={16} />,
          },
        ],
      },
      {
        label: 'Edit',
        tools: [
          {
            id: 'undo',
            label: 'Undo',
            icon: <RotateCcw size={16} />,
            shortcut: '⌘Z',
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy size={16} />,
            shortcut: '⌘D',
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 size={16} />,
            shortcut: '⌫',
            color: 'error' as const,
          },
        ],
      },
    ];

    // Context-specific tools
    if (activeTab === 'geometry') {
      baseTools.push({
        label: 'Geometry',
        tools: [
          {
            id: 'add-node',
            label: 'Add Node',
            icon: <Crosshair size={16} />,
            shortcut: 'N',
          },
          {
            id: 'add-member',
            label: 'Add Member',
            icon: <Grid3x3 size={16} />,
            shortcut: 'M',
          },
          {
            id: 'constraints',
            label: 'Constraints',
            icon: <Lock size={16} />,
            shortcut: 'C',
          },
        ],
      });
    }

    if (activeTab === 'loading') {
      baseTools.push({
        label: 'Loads',
        tools: [
          {
            id: 'point-load',
            label: 'Point Load',
            icon: <Zap size={16} />,
            color: 'accent' as const,
          },
          {
            id: 'distributed',
            label: 'Distributed',
            icon: <Grid3x3 size={16} />,
          },
          {
            id: 'wind',
            label: 'Wind Load',
            icon: <Wind size={16} />,
          },
          {
            id: 'seismic',
            label: 'Seismic',
            icon: <Zap size={16} />,
          },
        ],
      });
    }

    if (activeTab === 'results') {
      baseTools.push({
        label: 'View',
        tools: [
          {
            id: 'stresses',
            label: 'Stresses',
            icon: <Eye size={16} />,
            color: 'accent' as const,
          },
          {
            id: 'deflections',
            label: 'Deflections',
            icon: <Eye size={16} />,
          },
          {
            id: 'reactions',
            label: 'Reactions',
            icon: <Eye size={16} />,
          },
        ],
      });
    }

    if (activeTab === 'analysis') {
      baseTools.push({
        label: 'Solver',
        tools: [
          {
            id: 'run-analysis',
            label: 'Run Analysis',
            icon: <Play size={16} />,
            color: 'success' as const,
            shortcut: '⌘R',
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={16} />,
          },
        ],
      });
    }

    return baseTools;
  }, [activeTab]);

  return (
    <div className="bg-surface border-b border-border">
      {/* Tab Bar */}
      <div className="flex items-center h-10 px-4 gap-1 border-b border-border">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            whileHover={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
              'px-4 h-full flex items-center gap-2 text-sm font-medium',
              'transition-colors duration-200',
              activeTab === tab.id
                ? 'bg-accent text-white border-b-2 border-accent'
                : 'text-muted hover:text-zinc-100'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Tool Groups */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="flex items-center h-14 px-4 gap-6 overflow-x-auto"
      >
        {toolGroups.map((group) => (
          <div key={group.label} className="flex items-center gap-2">
            {/* Group Label */}
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {group.label}
            </span>

            {/* Divider */}
            <div className="w-px h-6 bg-border" />

            {/* Tools */}
            <div className="flex items-center gap-1">
              {group.tools.map((tool) => (
                <ToolButton key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/**
 * Individual Tool Button with Tooltip
 */
interface ToolButtonProps {
  tool: RibbonTool;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool }) => {
  const colorClasses = {
    default: 'hover:bg-zinc-700 text-muted hover:text-zinc-100',
    success: 'hover:bg-success/20 text-success hover:text-success',
    warning: 'hover:bg-warning/20 text-warning hover:text-warning',
    error: 'hover:bg-error/20 text-error hover:text-error',
    accent: 'hover:bg-accent/20 text-accent hover:text-accent',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={tool.onClick}
      disabled={tool.disabled}
      className={clsx(
        'p-2 rounded transition-colors duration-150',
        'flex items-center justify-center',
        colorClasses[tool.color || 'default'],
        tool.disabled && 'opacity-40 cursor-not-allowed'
      )}
      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
    >
      {tool.icon}
    </motion.button>
  );
};

export default Ribbon;

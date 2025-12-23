/**
 * LayerManager.tsx
 * 
 * Toggle visibility of different elements in the 3D viewport:
 * - Node IDs
 * - Member Labels
 * - Load Magnitudes
 * - Local Axis Arrows
 * - Deformations
 * 
 * Uses Zustand store for state management.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

interface LayerToggle {
  id: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
  color?: string;
}

const LayerManager: React.FC = () => {
  const [layers, setLayers] = useState<LayerToggle[]>([
    {
      id: 'nodes',
      label: 'Node IDs',
      icon: '◯',
      visible: true,
      color: '#0ea5e9',
    },
    {
      id: 'members',
      label: 'Member Labels',
      icon: '▬',
      visible: true,
      color: '#22c55e',
    },
    {
      id: 'loads',
      label: 'Load Magnitudes',
      icon: '⚡',
      visible: true,
      color: '#eab308',
    },
    {
      id: 'axis',
      label: 'Local Axis Arrows',
      icon: '→',
      visible: true,
      color: '#ef4444',
    },
    {
      id: 'deformations',
      label: 'Deformed Shape',
      icon: '≈',
      visible: false,
      color: '#a78bfa',
    },
    {
      id: 'reactions',
      label: 'Reactions',
      icon: '↓',
      visible: false,
      color: '#f97316',
    },
  ]);

  const [expandedGroup, setExpandedGroup] = useState<string | null>('visibility');

  const toggleLayer = (id: string) => {
    setLayers(layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const groups = [
    {
      id: 'visibility',
      label: '👁️ Visibility',
      description: 'Toggle display layers',
      items: layers.slice(0, 4),
      itemIds: ['nodes', 'members', 'loads', 'axis'],
    },
    {
      id: 'results',
      label: '📊 Results',
      description: 'Analysis output layers',
      items: layers.slice(4, 6),
      itemIds: ['deformations', 'reactions'],
    },
  ];

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.id} className="border border-border rounded-lg overflow-hidden">
          {/* Group Header */}
          <motion.button
            onClick={() =>
              setExpandedGroup(expandedGroup === group.id ? null : group.id)
            }
            className={clsx(
              'w-full px-4 py-3 flex items-center justify-between',
              'bg-canvas/50 hover:bg-canvas transition-colors duration-150',
              'border-b border-border/50'
            )}
          >
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-accent">{group.label}</p>
              <p className="text-xs text-muted mt-0.5">{group.description}</p>
            </div>
            <motion.div
              animate={{ rotate: expandedGroup === group.id ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} className="text-muted" />
            </motion.div>
          </motion.button>

          {/* Group Items */}
          <AnimatePresence initial={false}>
            {expandedGroup === group.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 p-3 bg-surface/50">
                  {group.items.map((item) => (
                    <LayerItem
                      key={item.id}
                      item={item}
                      onToggle={() => toggleLayer(item.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

/**
 * Individual Layer Toggle Item
 */
interface LayerItemProps {
  item: LayerToggle;
  onToggle: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({ item, onToggle }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        'flex items-center justify-between p-2 rounded',
        'bg-canvas/30 hover:bg-canvas/60 transition-colors duration-150',
        'border border-border/30'
      )}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-medium"
          style={{ color: item.color || 'currentColor' }}
        >
          {item.icon}
        </span>
        <span className="text-sm text-zinc-100">{item.label}</span>
      </div>

      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={clsx(
          'p-1.5 rounded transition-all duration-150',
          item.visible
            ? 'bg-accent/20 text-accent'
            : 'bg-zinc-800/50 text-muted hover:text-zinc-300'
        )}
      >
        {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </motion.button>
    </motion.div>
  );
};

export default LayerManager;

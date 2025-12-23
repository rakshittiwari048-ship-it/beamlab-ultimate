/**
 * DenseLayout.tsx
 * 
 * Professional IDE-style layout with collapsible, resizable panels.
 * Inspired by VS Code, CAD software (AutoCAD, SkyCiv) visual density.
 * 
 * Features:
 * - React Resizable Panels for snap-to-snap resizing
 * - Context-aware Ribbon that shows tools based on active tab
 * - Collapsible sidebars (Geometry, Loading, Results)
 * - Dark HUD aesthetic with glassmorphism overlays
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ViewportManager } from '../components/ViewportManager';
import Ribbon from '../components/Ribbon';
import LayerManager from '../components/LayerManager';
import CalculationTerminal from '../components/CalculationTerminal';

export interface DenseLayoutProps {
  activeTab?: 'geometry' | 'loading' | 'results' | 'analysis';
  onTabChange?: (tab: string) => void;
  showCalculationLog?: boolean;
  onCalculationLogClose?: () => void;
}

const DenseLayout: React.FC<DenseLayoutProps> = ({
  activeTab = 'geometry',
  onTabChange,
  showCalculationLog = false,
  onCalculationLogClose,
}) => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-zinc-100 overflow-hidden">
      {/* Ribbon Interface - Context Aware */}
      <Ribbon activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar */}
        {!leftPanelCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-64 bg-surface border-r border-border overflow-y-auto"
          >
            <LeftSidebarPanel activeTab={activeTab} />
          </motion.div>
        )}

        {/* Center - 3D Viewport */}
        <div className="flex-1 relative bg-gradient-to-br from-canvas via-zinc-950 to-canvas">
          {/* 3D Canvas */}
          <ViewportManager activeTool={'select'} />

          {/* Member Tooltip HUD */}
          {/* TODO: Wire with actual member hover data from store */}

          {/* Calculation Terminal - Bottom Right Corner */}
          <AnimatePresence>
            {showCalculationLog && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute bottom-6 right-6 z-40"
              >
                <CalculationTerminal
                  onClose={onCalculationLogClose}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse/Expand Buttons */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={clsx(
              'absolute left-4 top-4 z-30',
              'p-2 rounded-lg',
              'bg-surface/80 backdrop-blur-hud border border-border',
              'hover:bg-surface hover:border-accent',
              'text-muted hover:text-accent',
              'transition-all duration-200'
            )}
          >
            {leftPanelCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={clsx(
              'absolute right-4 top-4 z-30',
              'p-2 rounded-lg',
              'bg-surface/80 backdrop-blur-hud border border-border',
              'hover:bg-surface hover:border-accent',
              'text-muted hover:text-accent',
              'transition-all duration-200'
            )}
          >
            {rightPanelCollapsed ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </motion.button>
        </div>

        {/* Right Sidebar - Layers/Results Panel */}
        {!rightPanelCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-64 bg-surface border-l border-border overflow-y-auto"
          >
            <RightSidebarPanel activeTab={activeTab} />
          </motion.div>
        )}
      </div>


    </div>
  );
};

/**
 * Left Sidebar Panel - Geometry & Properties
 */
interface LeftSidebarPanelProps {
  activeTab: string;
}

const LeftSidebarPanel: React.FC<LeftSidebarPanelProps> = ({ activeTab }) => {
  const tabVariants = {
    enter: { opacity: 0, x: -20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <motion.div
      key={activeTab}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="h-full p-4"
    >
      <h3 className="text-sm font-semibold text-accent mb-4 uppercase tracking-wide">
        {activeTab === 'geometry' && '📐 Geometry'}
        {activeTab === 'loading' && '⚡ Loading'}
        {activeTab === 'results' && '📊 Results'}
        {activeTab === 'analysis' && '🔧 Analysis'}
      </h3>

      <div className="space-y-4">
        {/* Placeholder content - will be replaced with actual panels */}
        <div className="bg-canvas/50 rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted">
            {activeTab === 'geometry' && 'Define nodes, members, materials, sections'}
            {activeTab === 'loading' && 'Apply loads, wind, seismic, point loads'}
            {activeTab === 'results' && 'View stresses, deflections, reactions'}
            {activeTab === 'analysis' && 'Member check, capacity analysis, optimizations'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Right Sidebar Panel - Layers & Visibility
 */
interface RightSidebarPanelProps {
  activeTab: string;
}

const RightSidebarPanel: React.FC<RightSidebarPanelProps> = ({ activeTab }) => {
  const tabVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <motion.div
      key={`right-${activeTab}`}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="h-full p-4"
    >
      <h3 className="text-sm font-semibold text-accent mb-4 uppercase tracking-wide">
        👁️ Layers
      </h3>

      <LayerManager />
    </motion.div>
  );
};

export default DenseLayout;

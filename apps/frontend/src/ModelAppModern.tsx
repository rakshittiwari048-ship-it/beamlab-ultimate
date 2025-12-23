/**
 * ModelAppModern.tsx
 * 
 * Modern CAD-style interface for BeamLab Ultimate.
 * Uses DenseLayout with professional IDE aesthetics and advanced 3D visualization.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DenseLayout from './layouts/DenseLayout';
import { useAppBrain } from './store/appBrain';
import { useModelStore } from './store/model';
import { useSelectionStore } from './store/selection';

const ModelAppModern: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geometry' | 'loading' | 'results' | 'analysis'>('geometry');
  const [showCalculationLog, setShowCalculationLog] = useState(false);

  // Connect to stores
  const { currentProject, createProject } = useAppBrain();
  const { nodes, members, isAnalyzing } = useModelStore((state: any) => ({
    nodes: state.getAllNodes(),
    members: state.getAllMembers(),
    isAnalyzing: state.isAnalyzing,
  }));
  const { selectedNodeIds, selectedMemberIds } = useSelectionStore((state: any) => ({
    selectedNodeIds: state.selectedNodeIds,
    selectedMemberIds: state.selectedMemberIds,
  }));

  // Initialize project
  useEffect(() => {
    if (!currentProject) {
      createProject('New Structural Model', 'Default project created by BeamLab Ultimate');
    }
  }, [currentProject, createProject]);

  // Show calculation log when analyzing
  useEffect(() => {
    if (isAnalyzing) {
      setShowCalculationLog(true);
      setActiveTab('analysis');
    }
  }, [isAnalyzing]);

  return (
    <div className="h-screen w-screen bg-canvas text-zinc-100 overflow-hidden flex flex-col">
      {/* DenseLayout with all components */}
      <DenseLayout
        activeTab={activeTab}
        onTabChange={(tab: string) => setActiveTab(tab as any)}
        showCalculationLog={showCalculationLog && isAnalyzing}
        onCalculationLogClose={() => setShowCalculationLog(false)}
      />

      {/* Status Bar */}
      <motion.footer
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        className="h-10 bg-surface border-t border-border px-4 flex items-center justify-between text-xs text-muted"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono">📊</span>
            <span>
              Elements: <span className="text-accent font-semibold">{nodes.length}</span> nodes,{' '}
              <span className="text-accent font-semibold">{members.length}</span> members
            </span>
          </div>

          {(selectedNodeIds.size > 0 || selectedMemberIds.size > 0) && (
            <div className="flex items-center gap-2 text-warning pl-4 border-l border-border">
              <span className="font-mono">✓</span>
              <span>
                Selected:{' '}
                {selectedNodeIds.size > 0 && (
                  <span className="text-accent font-semibold">{selectedNodeIds.size} nodes</span>
                )}
                {selectedNodeIds.size > 0 && selectedMemberIds.size > 0 && ', '}
                {selectedMemberIds.size > 0 && (
                  <span className="text-accent font-semibold">{selectedMemberIds.size} members</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAnalyzing && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 text-success"
            >
              <span className="w-2 h-2 bg-success rounded-full" />
              <span>Analyzing...</span>
            </motion.div>
          )}
          <span className="text-muted">Units: Metric (kN, m) | Tab: {activeTab.toUpperCase()}</span>
        </div>
      </motion.footer>
    </div>
  );
};

export default ModelAppModern;

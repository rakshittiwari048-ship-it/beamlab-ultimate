/**
 * MemberTooltip.tsx
 * 
 * Real-time HUD tooltip that displays member information on hover.
 * Shows:
 * - Member ID
 * - Section designation
 * - Current utilization % with color coding
 * - Status (Pass/Warning/Fail)
 * 
 * Uses glassmorphism effect and follows cursor.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useMousePosition } from '../hooks/useMousePosition';

interface MemberTooltipProps {
  memberId: string;
  x?: number;
  y?: number;
}

// Mock member data - replace with actual store data
const mockMemberData: Record<string, any> = {
  'M-001': {
    id: 'M-001',
    section: 'ISMB 300',
    utilization: 84,
    status: 'warning',
    type: 'Column',
    grade: 'Fe250',
  },
  'M-002': {
    id: 'M-002',
    section: 'ISWB 450',
    utilization: 62,
    status: 'pass',
    type: 'Beam',
    grade: 'Fe360',
  },
  'M-003': {
    id: 'M-003',
    section: 'L100x100x12',
    utilization: 95,
    status: 'fail',
    type: 'Brace',
    grade: 'Fe250',
  },
};

const MemberTooltip: React.FC<MemberTooltipProps> = ({ memberId }) => {
  const { x, y } = useMousePosition();
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Offset tooltip from cursor
    setTooltipPos({
      x: (x || 0) + 16,
      y: (y || 0) + 16,
    });
  }, [x, y]);

  const data = mockMemberData[memberId] || {
    id: memberId,
    section: 'Unknown',
    utilization: 0,
    status: 'unknown',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return { bg: 'bg-success/10', border: 'border-success', text: 'text-success' };
      case 'warning':
        return { bg: 'bg-warning/10', border: 'border-warning', text: 'text-warning' };
      case 'fail':
        return { bg: 'bg-error/10', border: 'border-error', text: 'text-error' };
      default:
        return { bg: 'bg-zinc-700/10', border: 'border-zinc-600', text: 'text-zinc-400' };
    }
  };

  const statusColors = getStatusColor(data.status);
  const utilizationColor = data.utilization > 90 ? 'error' : data.utilization > 75 ? 'warning' : 'success';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        left: `${tooltipPos.x}px`,
        top: `${tooltipPos.y}px`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      className="w-80"
    >
      {/* Glassmorphism Card */}
      <div
        className={clsx(
          'rounded-lg border backdrop-blur-hud',
          'bg-surface/80 border-border/60',
          'shadow-lg shadow-black/40',
          'p-4 space-y-3'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-accent">{data.id}</p>
            <p className="text-xs text-muted mt-1">{data.type}</p>
          </div>
          <div
            className={clsx(
              'px-2 py-1 rounded text-xs font-semibold',
              statusColors.bg,
              statusColors.border,
              statusColors.text,
              'border'
            )}
          >
            {data.status.toUpperCase()}
          </div>
        </div>

        {/* Section Info */}
        <div className="bg-canvas/40 rounded px-3 py-2 border border-border/30">
          <p className="text-xs text-muted">Section</p>
          <p className="text-sm font-mono text-zinc-100">{data.section}</p>
          <p className="text-xs text-muted mt-1">Grade: {data.grade}</p>
        </div>

        {/* Utilization Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-100">Utilization</p>
            <p
              className={clsx(
                'text-sm font-bold',
                utilizationColor === 'success' && 'text-success',
                utilizationColor === 'warning' && 'text-warning',
                utilizationColor === 'error' && 'text-error'
              )}
            >
              {data.utilization}%
            </p>
          </div>
          <div className="w-full h-2 bg-canvas/60 rounded-full overflow-hidden border border-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.utilization}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={clsx(
                'h-full rounded-full',
                utilizationColor === 'success' && 'bg-success',
                utilizationColor === 'warning' && 'bg-warning',
                utilizationColor === 'error' && 'bg-error'
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <p className="text-xs text-muted">Hover over member to see details</p>
          <span className="text-xs font-mono text-zinc-500">Live</span>
        </div>
      </div>
    </motion.div>
  );
};

export default MemberTooltip;

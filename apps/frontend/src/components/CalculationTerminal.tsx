/**
 * CalculationTerminal.tsx
 * 
 * Terminal-style widget showing live calculation logs during solver execution.
 * Creates a "heavy" feeling by displaying matrix iterations and computation steps.
 * 
 * Features:
 * - Live log streaming with timestamps
 * - Collapsible/draggable window
 * - Color-coded log levels (INFO, WARN, ERROR)
 * - Auto-scroll to latest entry
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { X, Maximize2, Minimize2, Copy } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface CalculationTerminalProps {
  onClose?: () => void;
  isMinimized?: boolean;
}

const CalculationTerminal: React.FC<CalculationTerminalProps> = ({
  onClose,
  isMinimized: defaultMinimized = false,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(),
      level: 'info',
      message: '🔧 Initializing solver engine...',
    },
    {
      id: '2',
      timestamp: new Date(),
      level: 'info',
      message: '📊 Building global stiffness matrix (size: 45x45)',
    },
    {
      id: '3',
      timestamp: new Date(),
      level: 'info',
      message: '🔄 Applying boundary conditions...',
    },
  ]);

  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulate live log entries
  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        'Assembling stiffness matrix rows...',
        'Computing member forces (Iteration 5)',
        'Solving linear system via LU decomposition',
        'Convergence achieved: 0.0001 < 0.001',
        'Calculating reactions at supports',
        'Stress analysis in progress...',
      ];

      const levels: Array<'info' | 'warn' | 'error' | 'success'> = [
        'info',
        'info',
        'info',
        'success',
        'info',
        'info',
      ];

      const random = Math.floor(Math.random() * messages.length);

      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date(),
          level: levels[random],
          message: messages[random],
        },
      ]);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-success';
      case 'warn':
        return 'text-warning';
      case 'error':
        return 'text-error';
      case 'info':
      default:
        return 'text-zinc-300';
    }
  };

  const getLogPrefix = (level: string) => {
    switch (level) {
      case 'success':
        return '✓';
      case 'warn':
        return '⚠';
      case 'error':
        return '✗';
      case 'info':
      default:
        return '→';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={clsx(
        'bg-canvas/90 backdrop-blur-hud border border-border rounded-lg',
        'shadow-2xl shadow-black/50',
        'flex flex-col overflow-hidden',
        isMinimized ? 'w-80 h-12' : 'w-96 h-80'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs font-mono text-zinc-300">SOLVER_ENGINE</span>
          <span className="text-xs text-muted">v1.0</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-zinc-700 rounded transition-colors text-muted hover:text-zinc-100"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded transition-colors text-muted hover:text-error"
          >
            <X size={14} />
          </motion.button>
        </div>
      </div>

      {/* Logs Container */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto bg-canvas/50 font-mono text-xs p-3 space-y-1"
          >
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex gap-2 text-xs"
              >
                <span className="text-muted flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={clsx('flex-shrink-0 w-1', getLogColor(log.level))}>
                  {getLogPrefix(log.level)}
                </span>
                <span className={getLogColor(log.level)}>{log.message}</span>
              </motion.div>
            ))}
            <div ref={logsEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {!isMinimized && (
        <div className="px-3 py-2 bg-surface/50 border-t border-border/30 flex items-center justify-between">
          <span className="text-xs text-muted">
            {logs.length} operations logged
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1 hover:bg-zinc-700 rounded text-muted hover:text-zinc-100"
            title="Copy logs"
          >
            <Copy size={12} />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default CalculationTerminal;

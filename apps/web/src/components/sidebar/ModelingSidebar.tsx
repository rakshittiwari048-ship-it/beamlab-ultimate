/**
 * ModelingSidebar.tsx
 *
 * Sidebar component displaying 50 "Bank" problems categorized by type
 * Users can click on any item to load a template structure
 *
 * Categories:
 * - Beams (15 problems)
 * - Trusses (20 problems)
 * - Frames (15 problems)
 */

import React, { useState } from 'react';
import { fetchTemplate, type TemplateParams, type StructuralModel } from '../../services/factoryService';

// ============================================================================
// Types
// ============================================================================

interface BankProblem {
  id: string;
  name: string;
  description: string;
  type: 'beam' | 'truss' | 'frame';
  params: TemplateParams;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'loading' | 'success' | 'error';
}

// ============================================================================
// Bank Problems Data
// ============================================================================

const BANK_PROBLEMS: BankProblem[] = [
  // ───────────────────────────────────────────────────────────────────────
  // BEAMS (15 problems)
  // ───────────────────────────────────────────────────────────────────────

  {
    id: 'beam-01',
    name: 'Simple Beam (5m)',
    description: 'Pin-Roller support, uniformly distributed load',
    type: 'beam',
    params: { span: 5, supports: 'pin-roller' },
  },
  {
    id: 'beam-02',
    name: 'Simple Beam (8m)',
    description: 'Pin-Roller support, point load at center',
    type: 'beam',
    params: { span: 8, supports: 'pin-roller' },
  },
  {
    id: 'beam-03',
    name: 'Simple Beam (10m)',
    description: 'Pin-Roller support, multiple loads',
    type: 'beam',
    params: { span: 10, supports: 'pin-roller' },
  },
  {
    id: 'beam-04',
    name: 'Cantilever Beam (4m)',
    description: 'Fixed at left end, free at right',
    type: 'beam',
    params: { span: 4, supports: 'cantilever' },
  },
  {
    id: 'beam-05',
    name: 'Cantilever Beam (6m)',
    description: 'Fixed support with distributed load',
    type: 'beam',
    params: { span: 6, supports: 'cantilever' },
  },
  {
    id: 'beam-06',
    name: 'Fixed Beam (5m)',
    description: 'Both ends fixed, symmetric loading',
    type: 'beam',
    params: { span: 5, supports: 'fixed' },
  },
  {
    id: 'beam-07',
    name: 'Fixed Beam (7m)',
    description: 'Both ends fixed, asymmetric loading',
    type: 'beam',
    params: { span: 7, supports: 'fixed' },
  },
  {
    id: 'beam-08',
    name: 'Continuous Beam (3×5m)',
    description: 'Three equal spans, 15m total',
    type: 'beam',
    params: { span: 15, supports: 'continuous' },
  },
  {
    id: 'beam-09',
    name: 'Overhang Beam (6m + 2m)',
    description: 'Support at 6m, cantilever beyond',
    type: 'beam',
    params: { span: 8, supports: 'overhang' },
  },
  {
    id: 'beam-10',
    name: 'Built-up Beam (12m)',
    description: 'I-section, composite loading',
    type: 'beam',
    params: { span: 12, supports: 'pin-roller' },
  },
  {
    id: 'beam-11',
    name: 'Steel Beam (9m) - ISMB 300',
    description: 'Industrial standard section, factory roof',
    type: 'beam',
    params: { span: 9, supports: 'pin-roller', section: 'ISMB300' },
  },
  {
    id: 'beam-12',
    name: 'Steel Beam (6m) - ISMB 400',
    description: 'Heavier section for high loads',
    type: 'beam',
    params: { span: 6, supports: 'pin-roller', section: 'ISMB400' },
  },
  {
    id: 'beam-13',
    name: 'Pedestrian Bridge (20m)',
    description: 'Long span with distributed crowd load',
    type: 'beam',
    params: { span: 20, supports: 'pin-roller' },
  },
  {
    id: 'beam-14',
    name: 'Balcony (3m Cantilever)',
    description: 'Residential cantilevered deck',
    type: 'beam',
    params: { span: 3, supports: 'cantilever' },
  },
  {
    id: 'beam-15',
    name: 'Gantry Beam (18m)',
    description: 'Heavy industrial with point load',
    type: 'beam',
    params: { span: 18, supports: 'pin-roller' },
  },

  // ───────────────────────────────────────────────────────────────────────
  // TRUSSES (20 problems)
  // ───────────────────────────────────────────────────────────────────────

  {
    id: 'truss-01',
    name: 'Pratt Truss (12m, 4 bays)',
    description: 'Small warehouse roof truss',
    type: 'truss',
    params: { span: 12, height: 3, bays: 4 },
  },
  {
    id: 'truss-02',
    name: 'Pratt Truss (18m, 6 bays)',
    description: 'Medium span industrial roof',
    type: 'truss',
    params: { span: 18, height: 4.5, bays: 6 },
  },
  {
    id: 'truss-03',
    name: 'Pratt Truss (24m, 8 bays)',
    description: 'Large span warehouse',
    type: 'truss',
    params: { span: 24, height: 6, bays: 8 },
  },
  {
    id: 'truss-04',
    name: 'Pratt Truss (30m, 10 bays)',
    description: 'Long span building roof',
    type: 'truss',
    params: { span: 30, height: 7.5, bays: 10 },
  },
  {
    id: 'truss-05',
    name: 'Warren Truss (15m, 5 bays)',
    description: 'Triangulated pattern, light roof',
    type: 'truss',
    params: { span: 15, height: 2, bays: 5 },
  },
  {
    id: 'truss-06',
    name: 'Bowstring Truss (20m)',
    description: 'Curved top chord design',
    type: 'truss',
    params: { span: 20, height: 5, bays: 5 },
  },
  {
    id: 'truss-07',
    name: 'Howe Truss (16m, 4 bays)',
    description: 'Classic H-pattern, medium load',
    type: 'truss',
    params: { span: 16, height: 4, bays: 4 },
  },
  {
    id: 'truss-08',
    name: 'Stadium Truss (40m, 8 bays)',
    description: 'Large clear span, arena roof',
    type: 'truss',
    params: { span: 40, height: 10, bays: 8 },
  },
  {
    id: 'truss-09',
    name: 'Scissor Truss (10m, 3 bays)',
    description: 'Sloped ceiling residential',
    type: 'truss',
    params: { span: 10, height: 4, bays: 3 },
  },
  {
    id: 'truss-10',
    name: 'Attic Truss (14m, 2 bays)',
    description: 'Residential attic space design',
    type: 'truss',
    params: { span: 14, height: 5, bays: 2 },
  },
  {
    id: 'truss-11',
    name: 'Hammer Truss (12m, 3 bays)',
    description: 'Residential roof with central support',
    type: 'truss',
    params: { span: 12, height: 4, bays: 3 },
  },
  {
    id: 'truss-12',
    name: 'Raised Heel Truss (13m)',
    description: 'Improved insulation design',
    type: 'truss',
    params: { span: 13, height: 3, bays: 4 },
  },
  {
    id: 'truss-13',
    name: 'Lattice Truss (25m, 5 bays)',
    description: 'Bridge deck framework',
    type: 'truss',
    params: { span: 25, height: 2, bays: 5 },
  },
  {
    id: 'truss-14',
    name: 'Space Frame (20m × 20m)',
    description: 'Planar Pratt for architectural grid',
    type: 'truss',
    params: { span: 20, height: 5, bays: 4 },
  },
  {
    id: 'truss-15',
    name: 'Double Layer Grid (30m)',
    description: 'Pultruded fiber composite',
    type: 'truss',
    params: { span: 30, height: 4, bays: 6 },
  },
  {
    id: 'truss-16',
    name: 'Cable-Stayed (35m)',
    description: 'Stay-cable support system',
    type: 'truss',
    params: { span: 35, height: 12, bays: 7 },
  },
  {
    id: 'truss-17',
    name: 'Tied Arch (28m)',
    description: 'Arch with tension tie',
    type: 'truss',
    params: { span: 28, height: 8, bays: 6 },
  },
  {
    id: 'truss-18',
    name: 'Vierendeel Truss (22m)',
    description: 'Moment-resistant frame joints',
    type: 'truss',
    params: { span: 22, height: 6, bays: 4 },
  },
  {
    id: 'truss-19',
    name: 'Portal Truss (18m × 12m)',
    description: 'Building entrance portal',
    type: 'truss',
    params: { span: 18, height: 12, bays: 3 },
  },
  {
    id: 'truss-20',
    name: 'Cantilevered Truss (15m)',
    description: 'Overhang design for signage',
    type: 'truss',
    params: { span: 15, height: 4, bays: 5 },
  },

  // ───────────────────────────────────────────────────────────────────────
  // FRAMES (15 problems)
  // ───────────────────────────────────────────────────────────────────────

  {
    id: 'frame-01',
    name: 'Warehouse Frame (20m wide)',
    description: 'Single story industrial, gable roof 20°',
    type: 'frame',
    params: { width: 20, height: 6, roof_angle: 20 },
  },
  {
    id: 'frame-02',
    name: 'Office Building (15m wide)',
    description: 'Multi-story frame core, flat roof',
    type: 'frame',
    params: { width: 15, height: 12, roof_angle: 0 },
  },
  {
    id: 'frame-03',
    name: 'Retail Store (25m wide)',
    description: 'Large span retail, 15° roof',
    type: 'frame',
    params: { width: 25, height: 5, roof_angle: 15 },
  },
  {
    id: 'frame-04',
    name: 'Residential Frame (10m wide)',
    description: 'Small home structure, pitched roof 30°',
    type: 'frame',
    params: { width: 10, height: 8, roof_angle: 30 },
  },
  {
    id: 'frame-05',
    name: 'Church Frame (18m wide)',
    description: 'High cathedral, steep roof 45°',
    type: 'frame',
    params: { width: 18, height: 15, roof_angle: 45 },
  },
  {
    id: 'frame-06',
    name: 'Gymnasium (32m wide)',
    description: 'Sports facility, large clear span 10° roof',
    type: 'frame',
    params: { width: 32, height: 10, roof_angle: 10 },
  },
  {
    id: 'frame-07',
    name: 'Hospital Block (12m wide)',
    description: 'Medical facility frame, flat roof',
    type: 'frame',
    params: { width: 12, height: 20, roof_angle: 0 },
  },
  {
    id: 'frame-08',
    name: 'Parking Structure (30m wide)',
    description: 'Multi-level parking, modular design',
    type: 'frame',
    params: { width: 30, height: 4, roof_angle: 0 },
  },
  {
    id: 'frame-09',
    name: 'Shopping Mall (40m wide)',
    description: 'Large commercial, atrium roof 5°',
    type: 'frame',
    params: { width: 40, height: 8, roof_angle: 5 },
  },
  {
    id: 'frame-10',
    name: 'School Building (22m wide)',
    description: 'Educational facility, classroom spans',
    type: 'frame',
    params: { width: 22, height: 10, roof_angle: 20 },
  },
  {
    id: 'frame-11',
    name: 'Data Center (28m wide)',
    description: 'Heavy load infrastructure, flat roof',
    type: 'frame',
    params: { width: 28, height: 7, roof_angle: 0 },
  },
  {
    id: 'frame-12',
    name: 'Manufacturing Plant (35m wide)',
    description: 'Industrial production facility, 12° roof',
    type: 'frame',
    params: { width: 35, height: 9, roof_angle: 12 },
  },
  {
    id: 'frame-13',
    name: 'Convention Center (50m wide)',
    description: 'Large span event venue, curved roof 8°',
    type: 'frame',
    params: { width: 50, height: 12, roof_angle: 8 },
  },
  {
    id: 'frame-14',
    name: 'Greenhouse (16m wide)',
    description: 'Horticultural structure, steep glass roof 35°',
    type: 'frame',
    params: { width: 16, height: 6, roof_angle: 35 },
  },
  {
    id: 'frame-15',
    name: 'Bridge Superstructure (45m span)',
    description: 'Highway bridge frame, minimal slope',
    type: 'frame',
    params: { width: 45, height: 3, roof_angle: 2 },
  },
];

// ============================================================================
// ModelingSidebar Component
// ============================================================================

interface ModelingSidebarProps {
  onModelLoad?: (model: StructuralModel) => void;
}

export const ModelingSidebar: React.FC<ModelingSidebarProps> = ({ onModelLoad }) => {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'loading' });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Show toast notification
  const showToast = (message: string, type: ToastState['type'] = 'loading') => {
    setToast({ visible: true, message, type });
    if (type !== 'loading') {
      setTimeout(() => setToast({ ...toast, visible: false }), 3000);
    }
  };

  // Handle bank problem selection
  const handleSelectProblem = async (problem: BankProblem) => {
    setLoadingId(problem.id);
    showToast(`Loading ${problem.name}...`, 'loading');

    const result = await fetchTemplate(problem.type, problem.params);

    if (result.success && result.model) {
      showToast(`✓ ${problem.name} loaded successfully`, 'success');
      onModelLoad?.(result.model);
    } else {
      showToast(`✗ Failed to load ${problem.name}: ${result.error}`, 'error');
    }

    setLoadingId(null);
  };

  // Group problems by category
  const beams = BANK_PROBLEMS.filter((p) => p.type === 'beam');
  const trusses = BANK_PROBLEMS.filter((p) => p.type === 'truss');
  const frames = BANK_PROBLEMS.filter((p) => p.type === 'frame');

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Bank Problems</h2>
        <p className="text-xs text-zinc-400 mt-1">50 Standard Problems</p>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* BEAMS Section */}
        <Section title="Beams (15)" count={beams.length}>
          {beams.map((problem) => (
            <ProblemItem
              key={problem.id}
              problem={problem}
              isLoading={loadingId === problem.id}
              onSelect={() => handleSelectProblem(problem)}
            />
          ))}
        </Section>

        {/* TRUSSES Section */}
        <Section title="Trusses (20)" count={trusses.length}>
          {trusses.map((problem) => (
            <ProblemItem
              key={problem.id}
              problem={problem}
              isLoading={loadingId === problem.id}
              onSelect={() => handleSelectProblem(problem)}
            />
          ))}
        </Section>

        {/* FRAMES Section */}
        <Section title="Frames (15)" count={frames.length}>
          {frames.map((problem) => (
            <ProblemItem
              key={problem.id}
              problem={problem}
              isLoading={loadingId === problem.id}
              onSelect={() => handleSelectProblem(problem)}
            />
          ))}
        </Section>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <Toast message={toast.message} type={toast.type} />
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, count, children }) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="border-b border-zinc-800">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span className="text-xs font-semibold text-white">{title}</span>
        </div>
        <span className="text-xs text-zinc-500">{count}</span>
      </button>

      {/* Items */}
      {expanded && <div className="bg-zinc-800/20">{children}</div>}
    </div>
  );
};

interface ProblemItemProps {
  problem: BankProblem;
  isLoading: boolean;
  onSelect: () => void;
}

const ProblemItem: React.FC<ProblemItemProps> = ({ problem, isLoading, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className="w-full px-4 py-2 text-left hover:bg-zinc-700/50 active:bg-blue-900/30 transition-colors disabled:opacity-50 cursor-pointer border-l-2 border-transparent hover:border-blue-500"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{problem.name}</p>
          <p className="text-xs text-zinc-400 truncate">{problem.description}</p>
        </div>
        {isLoading && (
          <span className="inline-block text-xs text-blue-400 animate-pulse">⟳</span>
        )}
      </div>
    </button>
  );
};

interface ToastProps {
  message: string;
  type: ToastState['type'];
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const bgColor =
    type === 'success'
      ? 'bg-green-900/80'
      : type === 'error'
        ? 'bg-red-900/80'
        : 'bg-blue-900/80';

  const textColor =
    type === 'success'
      ? 'text-green-100'
      : type === 'error'
        ? 'text-red-100'
        : 'text-blue-100';

  return (
    <div className={`px-4 py-3 border-t border-zinc-800 ${bgColor} ${textColor} text-xs`}>
      {message}
    </div>
  );
};

// @ts-nocheck
/**
 * useAIWorkflow.ts
 *
 * Orchestrates the AI → Model → Solver flow for the web app.
 * Steps:
 * 1) Call Model Generator (backend AI endpoint)
 * 2) Validate returned model (orphan/member reference checks)
 * 3) Assign default supports (pinned at nodes with y = 0)
 * 4) Assign default self-weight load case (placeholder)
 * 5) Trigger Solver Worker
 * 6) Notify caller to switch viewport to Deformed Shape when results arrive
 */

import { useState, useCallback } from 'react';
import { SolverWorkerClient } from '../workers/useSolverWorker';
import type {
  SolverNode,
  SolverMember,
  SolverSupport,
  NodalLoad,
} from '@beamlab/analysis-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedModel {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  members: Array<{ id: string; startNodeId: string; endNodeId: string; section?: string }>;
}

interface GenerateResponse {
  success: boolean;
  model?: GeneratedModel;
  error?: string;
  rawResponse?: string;
}

export type ViewModeSetter = (mode: 'DEFORMED_SHAPE' | string) => void;

export interface ExecuteOptions {
  /** Called when we want to show deformed shape results */
  setViewMode?: ViewModeSetter;
  /** Called for progress updates */
  onProgress?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateModel(model?: GeneratedModel): { valid: boolean; error?: string } {
  if (!model) return { valid: false, error: 'No model returned from AI' };

  const nodeIds = new Set(model.nodes.map((n) => n.id));

  // Orphan/member reference checks
  for (const m of model.members) {
    if (!nodeIds.has(m.startNodeId)) {
      return { valid: false, error: `Member ${m.id} references missing start node ${m.startNodeId}` };
    }
    if (!nodeIds.has(m.endNodeId)) {
      return { valid: false, error: `Member ${m.id} references missing end node ${m.endNodeId}` };
    }
  }

  return { valid: true };
}

function assignDefaultSupports(nodes: GeneratedModel['nodes']): SolverSupport[] {
  // Pinned supports at all nodes where y = 0
  return nodes
    .filter((n) => Math.abs(n.y) < 1e-6)
    .map((n) => ({
      nodeId: n.id,
      dx: true,
      dy: true,
      dz: true,
      rx: true,
      ry: true,
      rz: true,
    }));
}

function assignSelfWeightLoadCase(): NodalLoad[] {
  // Placeholder: self-weight handled by solver/materials (no nodal loads here)
  return [];
}

function toSolverNodes(nodes: GeneratedModel['nodes']): SolverNode[] {
  return nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z }));
}

function toSolverMembers(members: GeneratedModel['members']): SolverMember[] {
  // Minimal member properties; real sections/materials would enrich this
  return members.map((m) => ({
    id: m.id,
    startNodeId: m.startNodeId,
    endNodeId: m.endNodeId,
    // Default properties (placeholder values)
    E: 200e9,
    A: 0.01,
    Iy: 0.0001,
    Iz: 0.0001,
    G: 80e9,
    J: 0.00015,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIWorkflow() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAIGeneratedDesign = useCallback(
    async (
      userPrompt: string,
      options: ExecuteOptions = {}
    ): Promise<{ success: boolean; message?: string }> => {
      const { setViewMode, onProgress } = options;

      const report = (msg: string) => {
        if (onProgress) onProgress(msg);
      };

      if (!userPrompt.trim()) {
        return { success: false, message: 'Please provide a prompt' };
      }

      setIsRunning(true);
      setError(null);

      try {
        // Step 1: Call Model Generator
        report('Calling AI Model Generator...');
        const response = await fetch('http://localhost:6000/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userPrompt.trim(), maxNodes: 200, maxMembers: 600 }),
        });

        const data: GenerateResponse = await response.json();
        if (!data.success || !data.model) {
          throw new Error(data.error || 'Model generator failed');
        }

        // Step 2: Validate model
        report('Validating AI-generated model...');
        const validation = validateModel(data.model);
        if (!validation.valid) {
          throw new Error(validation.error || 'Model validation failed');
        }

        // Step 3: Assign default supports
        report('Assigning default supports (pinned at Y=0)...');
        const supports = assignDefaultSupports(data.model.nodes);

        // Step 4: Default self-weight load case (placeholder)
        report('Applying self-weight load case...');
        const loads = assignSelfWeightLoadCase();

        // Convert model to solver format
        const solverNodes = toSolverNodes(data.model.nodes);
        const solverMembers = toSolverMembers(data.model.members);

        // Step 5: Trigger Solver Worker
        report('Running solver in worker...');
        const workerClient = new SolverWorkerClient({
          onProgress: (p) => report(`Solver: ${p.stage} ${p.progress?.toFixed?.(1) ?? ''}% - ${p.message}`),
        });

        const solverResult = await workerClient.solve({
          nodes: solverNodes,
          members: solverMembers,
          supports,
          loads,
          config: {
            forceSparse: true,
          },
        });

        workerClient.terminate();

        // Step 6: Set viewport to deformed shape
        if (setViewMode) {
          report('Switching viewport to Deformed Shape...');
          setViewMode('DEFORMED_SHAPE');
        }

        report('Workflow completed successfully');
        return { success: true, message: 'Analysis complete' };
      } catch (err: any) {
        console.error('AI workflow error:', err);
        const message = err?.message || 'Failed to execute AI workflow';
        setError(message);
        return { success: false, message };
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return {
    isRunning,
    error,
    executeAIGeneratedDesign,
  };
}

import { type Section } from '../store/sections';

export interface OptimizationInput {
  memberId: string;
  currentSectionId: string;
  sections: Section[];
  /**
   * Callback to compute utilization ratio for the member given a section.
   * Should return a ratio where 1.0 = just at capacity.
   */
  check: (sectionId: string) => Promise<number> | number;
  targetMin?: number; // default 0.8
  targetMax?: number; // default 1.0
  maxIterations?: number; // default 25
}

export interface OptimizationResult {
  recommendedSectionId: string;
  weightSavings: number; // kg/m, positive means lighter than starting section
  iterations: Array<{ sectionId: string; ratio: number }>; // trace of the search
  reason: string;
}

function sortSectionsByWeight(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
}

function findIndexById(sections: Section[], id: string): number {
  return sections.findIndex((s) => s.id === id);
}

function getWeight(section?: Section): number {
  return section?.weight ?? 0;
}

/**
 * Iteratively find an efficient section based on utilization ratio.
 * - If ratio > targetMax: move to next heavier section.
 * - If ratio < targetMin: move to next lighter section.
 * Stops when targetMin < ratio < targetMax or no better section exists.
 */
export async function optimizeSection({
  currentSectionId,
  sections,
  check,
  targetMin = 0.8,
  targetMax = 1.0,
  maxIterations = 25,
}: OptimizationInput): Promise<OptimizationResult> {
  const ordered = sortSectionsByWeight(sections);
  let idx = findIndexById(ordered, currentSectionId);
  if (idx === -1) {
    throw new Error(`Section ${currentSectionId} not found in database`);
  }

  const iterations: Array<{ sectionId: string; ratio: number }> = [];
  let currentId = currentSectionId;

  for (let step = 0; step < maxIterations; step++) {
    const ratio = await Promise.resolve(check(currentId));
    iterations.push({ sectionId: currentId, ratio });

    if (ratio > targetMin && ratio < targetMax) {
      const startWeight = getWeight(ordered[findIndexById(ordered, currentSectionId)]);
      const finalWeight = getWeight(ordered[findIndexById(ordered, currentId)]);
      return {
        recommendedSectionId: currentId,
        weightSavings: startWeight - finalWeight,
        iterations,
        reason: 'Within target utilization band',
      };
    }

    if (ratio > targetMax) {
      // Need heavier
      if (idx < ordered.length - 1) {
        idx += 1;
        currentId = ordered[idx].id;
        continue;
      }
      return {
        recommendedSectionId: currentId,
        weightSavings: 0,
        iterations,
        reason: 'At heaviest section; cannot increase',
      };
    }

    // ratio < targetMin
    if (idx > 0) {
      idx -= 1;
      currentId = ordered[idx].id;
      continue;
    }
    return {
      recommendedSectionId: currentId,
      weightSavings: 0,
      iterations,
      reason: 'At lightest section; cannot reduce',
    };
  }

  const startWeight = getWeight(ordered[findIndexById(ordered, currentSectionId)]);
  const finalWeight = getWeight(ordered[idx]);
  return {
    recommendedSectionId: ordered[idx].id,
    weightSavings: startWeight - finalWeight,
    iterations,
    reason: 'Max iterations reached',
  };
}

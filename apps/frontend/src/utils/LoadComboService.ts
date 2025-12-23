/**
 * LoadComboService
 * 
 * Generates load combinations according to ASCE 7-16 LRFD
 * (Load and Resistance Factor Design)
 */

import type { LoadCase } from '../store/model';

// ============================================================================
// INTERFACES
// ============================================================================

export interface LoadCombination {
  id: string;
  name: string;
  description?: string;
  factors: Record<string, number>; // Map of loadCaseId -> factor
}

export type LoadCaseType = 'Dead' | 'Live' | 'Wind' | 'Snow' | 'Roof Live' | 'Seismic' | 'Other';

// ============================================================================
// LOAD CASE TYPE DETECTION
// ============================================================================

/**
 * Detect load case type from its name using common keywords
 */
export function detectLoadCaseType(caseName: string): LoadCaseType {
  const name = caseName.toLowerCase();
  
  if (name.includes('dead') || name.includes('dl') || name === 'd') {
    return 'Dead';
  }
  if (name.includes('live') && name.includes('roof')) {
    return 'Roof Live';
  }
  if (name.includes('live') || name.includes('ll') || name === 'l') {
    return 'Live';
  }
  if (name.includes('wind') || name === 'w') {
    return 'Wind';
  }
  if (name.includes('snow') || name === 's') {
    return 'Snow';
  }
  if (name.includes('seismic') || name.includes('earthquake') || name === 'e') {
    return 'Seismic';
  }
  
  return 'Other';
}

/**
 * Categorize load cases by type
 */
export function categorizeLoadCases(cases: LoadCase[]): Map<LoadCaseType, LoadCase[]> {
  const categorized = new Map<LoadCaseType, LoadCase[]>();
  
  for (const loadCase of cases) {
    const type = detectLoadCaseType(loadCase.name);
    const existing = categorized.get(type) || [];
    existing.push(loadCase);
    categorized.set(type, existing);
  }
  
  return categorized;
}

// ============================================================================
// ASCE 7-16 LRFD LOAD COMBINATIONS GENERATOR
// ============================================================================

/**
 * Generate standard ASCE 7-16 LRFD load combinations
 * 
 * Standard combinations:
 * 1. 1.4D
 * 2. 1.2D + 1.6L + 0.5(Lr or S)
 * 3. 1.2D + 1.6(Lr or S) + (L or 0.5W)
 * 4. 1.2D + 1.0W + L + 0.5(Lr or S)
 * 5. 1.2D + 1.0E + L + 0.2S
 * 6. 0.9D + 1.0W
 * 7. 0.9D + 1.0E
 * 
 * @param cases - Array of load cases
 * @returns Array of load combinations
 */
export function generateASCE7_LRFD(cases: LoadCase[]): LoadCombination[] {
  if (cases.length === 0) {
    return [];
  }
  
  const categorized = categorizeLoadCases(cases);
  const combinations: LoadCombination[] = [];
  
  // Get cases by type
  const deadCases = categorized.get('Dead') || [];
  const liveCases = categorized.get('Live') || [];
  const windCases = categorized.get('Wind') || [];
  const snowCases = categorized.get('Snow') || [];
  const roofLiveCases = categorized.get('Roof Live') || [];
  const seismicCases = categorized.get('Seismic') || [];
  
  // Helper to create a combination
  let comboCounter = 1;
  const createCombo = (
    name: string, 
    description: string, 
    factorMap: Array<[LoadCase[], number]>
  ): LoadCombination | null => {
    const factors: Record<string, number> = {};
    let hasAnyCase = false;
    
    for (const [caseList, factor] of factorMap) {
      for (const loadCase of caseList) {
        factors[loadCase.id] = factor;
        hasAnyCase = true;
      }
    }
    
    if (!hasAnyCase) return null;
    
    return {
      id: `combo_${comboCounter++}`,
      name,
      description,
      factors,
    };
  };
  
  // -------------------------------------------------------------------------
  // COMBO 1: 1.4D
  // -------------------------------------------------------------------------
  if (deadCases.length > 0) {
    const combo = createCombo(
      'LC1: 1.4D',
      'Dead load only',
      [[deadCases, 1.4]]
    );
    if (combo) combinations.push(combo);
  }
  
  // -------------------------------------------------------------------------
  // COMBO 2: 1.2D + 1.6L + 0.5(Lr or S)
  // -------------------------------------------------------------------------
  if (deadCases.length > 0 && liveCases.length > 0) {
    // 1.2D + 1.6L + 0.5Lr
    if (roofLiveCases.length > 0) {
      const combo = createCombo(
        'LC2a: 1.2D + 1.6L + 0.5Lr',
        'Dead + Live + Roof Live',
        [
          [deadCases, 1.2],
          [liveCases, 1.6],
          [roofLiveCases, 0.5],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.6L + 0.5S
    if (snowCases.length > 0) {
      const combo = createCombo(
        'LC2b: 1.2D + 1.6L + 0.5S',
        'Dead + Live + Snow',
        [
          [deadCases, 1.2],
          [liveCases, 1.6],
          [snowCases, 0.5],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.6L (if no Lr or S)
    if (roofLiveCases.length === 0 && snowCases.length === 0) {
      const combo = createCombo(
        'LC2: 1.2D + 1.6L',
        'Dead + Live',
        [
          [deadCases, 1.2],
          [liveCases, 1.6],
        ]
      );
      if (combo) combinations.push(combo);
    }
  }
  
  // -------------------------------------------------------------------------
  // COMBO 3: 1.2D + 1.6(Lr or S) + (L or 0.5W)
  // -------------------------------------------------------------------------
  if (deadCases.length > 0) {
    // 1.2D + 1.6Lr + L
    if (roofLiveCases.length > 0 && liveCases.length > 0) {
      const combo = createCombo(
        'LC3a: 1.2D + 1.6Lr + L',
        'Dead + Roof Live + Live',
        [
          [deadCases, 1.2],
          [roofLiveCases, 1.6],
          [liveCases, 1.0],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.6S + L
    if (snowCases.length > 0 && liveCases.length > 0) {
      const combo = createCombo(
        'LC3b: 1.2D + 1.6S + L',
        'Dead + Snow + Live',
        [
          [deadCases, 1.2],
          [snowCases, 1.6],
          [liveCases, 1.0],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.6S + 0.5W
    if (snowCases.length > 0 && windCases.length > 0) {
      const combo = createCombo(
        'LC3c: 1.2D + 1.6S + 0.5W',
        'Dead + Snow + Wind',
        [
          [deadCases, 1.2],
          [snowCases, 1.6],
          [windCases, 0.5],
        ]
      );
      if (combo) combinations.push(combo);
    }
  }
  
  // -------------------------------------------------------------------------
  // COMBO 4: 1.2D + 1.0W + L + 0.5(Lr or S)
  // -------------------------------------------------------------------------
  if (deadCases.length > 0 && windCases.length > 0) {
    // 1.2D + 1.0W + L + 0.5Lr
    if (liveCases.length > 0 && roofLiveCases.length > 0) {
      const combo = createCombo(
        'LC4a: 1.2D + 1.0W + L + 0.5Lr',
        'Dead + Wind + Live + Roof Live',
        [
          [deadCases, 1.2],
          [windCases, 1.0],
          [liveCases, 1.0],
          [roofLiveCases, 0.5],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.0W + L + 0.5S
    if (liveCases.length > 0 && snowCases.length > 0) {
      const combo = createCombo(
        'LC4b: 1.2D + 1.0W + L + 0.5S',
        'Dead + Wind + Live + Snow',
        [
          [deadCases, 1.2],
          [windCases, 1.0],
          [liveCases, 1.0],
          [snowCases, 0.5],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.0W + L (if no Lr or S)
    if (liveCases.length > 0 && roofLiveCases.length === 0 && snowCases.length === 0) {
      const combo = createCombo(
        'LC4: 1.2D + 1.0W + L',
        'Dead + Wind + Live',
        [
          [deadCases, 1.2],
          [windCases, 1.0],
          [liveCases, 1.0],
        ]
      );
      if (combo) combinations.push(combo);
    }
    
    // 1.2D + 1.0W (if no L)
    if (liveCases.length === 0) {
      const combo = createCombo(
        'LC4: 1.2D + 1.0W',
        'Dead + Wind',
        [
          [deadCases, 1.2],
          [windCases, 1.0],
        ]
      );
      if (combo) combinations.push(combo);
    }
  }
  
  // -------------------------------------------------------------------------
  // COMBO 5: 1.2D + 1.0E + L + 0.2S
  // -------------------------------------------------------------------------
  if (deadCases.length > 0 && seismicCases.length > 0) {
    const comboFactors: Array<[LoadCase[], number]> = [
      [deadCases, 1.2],
      [seismicCases, 1.0],
    ];
    
    if (liveCases.length > 0) {
      comboFactors.push([liveCases, 1.0]);
    }
    
    if (snowCases.length > 0) {
      comboFactors.push([snowCases, 0.2]);
    }
    
    const combo = createCombo(
      'LC5: 1.2D + 1.0E + L + 0.2S',
      'Dead + Seismic + Live + Snow',
      comboFactors
    );
    if (combo) combinations.push(combo);
  }
  
  // -------------------------------------------------------------------------
  // COMBO 6: 0.9D + 1.0W (Uplift/Overturning)
  // -------------------------------------------------------------------------
  if (deadCases.length > 0 && windCases.length > 0) {
    const combo = createCombo(
      'LC6: 0.9D + 1.0W',
      'Wind uplift/overturning',
      [
        [deadCases, 0.9],
        [windCases, 1.0],
      ]
    );
    if (combo) combinations.push(combo);
  }
  
  // -------------------------------------------------------------------------
  // COMBO 7: 0.9D + 1.0E (Seismic uplift/overturning)
  // -------------------------------------------------------------------------
  if (deadCases.length > 0 && seismicCases.length > 0) {
    const combo = createCombo(
      'LC7: 0.9D + 1.0E',
      'Seismic uplift/overturning',
      [
        [deadCases, 0.9],
        [seismicCases, 1.0],
      ]
    );
    if (combo) combinations.push(combo);
  }
  
  return combinations;
}

// ============================================================================
// COMBINATION UTILITIES
// ============================================================================

/**
 * Get a human-readable description of a load combination
 */
export function getCombinationSummary(combo: LoadCombination, cases: LoadCase[]): string {
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const terms: string[] = [];
  
  for (const [caseId, factor] of Object.entries(combo.factors)) {
    const loadCase = caseMap.get(caseId);
    if (loadCase) {
      const factorStr = Math.abs(factor - 1.0) < 0.001 
        ? '' 
        : `${factor.toFixed(1)}×`;
      terms.push(`${factorStr}${loadCase.name}`);
    }
  }
  
  return terms.join(' + ') || 'Empty combination';
}

/**
 * Validate that a combination references valid load cases
 */
export function validateCombination(combo: LoadCombination, cases: LoadCase[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const caseIds = new Set(cases.map(c => c.id));
  
  if (!combo.name || combo.name.trim() === '') {
    errors.push('Combination must have a name');
  }
  
  if (Object.keys(combo.factors).length === 0) {
    errors.push('Combination must include at least one load case');
  }
  
  for (const caseId of Object.keys(combo.factors)) {
    if (!caseIds.has(caseId)) {
      errors.push(`Load case ${caseId} not found`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

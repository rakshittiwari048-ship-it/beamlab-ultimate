/**
 * Performance Configuration
 * 
 * Controls rendering quality and analysis behavior based on structure size.
 * Automatically adjusts to maintain 30+ FPS and prevent crashes.
 */

export const PERFORMANCE_CONFIG = {
  // LOD (Level of Detail) Thresholds
  // Switch to simpler geometry above these member counts
  LOD: {
    HIGH_DETAIL: 100,    // < 100 members: use detailed I-beam geometry
    MEDIUM: 500,         // 100-500: use simple 6-segment cylinders
    LOW: 1000,           // 500-1000: use 4-segment cylinders
    ULTRA_LOW: 2000,     // 1000-2000: use 3-segment cylinders
    // > 2000: use 3-segment cylinders (same as ULTRA_LOW)
  },
  
  // Maximum recommended members before showing warning
  MAX_RECOMMENDED_MEMBERS: 2000,
  
  // Analysis configuration
  ANALYSIS: {
    TIMEOUT_MS: 120000, // 2 minutes max for analysis
    SHOW_PROGRESS_AFTER_MS: 1000, // Show loading indicator after 1s
    CHUNK_SIZE: 100, // Process nodes in chunks for large structures
  },
  
  // Rendering features
  FEATURES: {
    shadows: true,
    antialiasing: true,
    frustumCulling: true,
    instancedRendering: true,
  },
  
  // FPS targets
  FPS: {
    TARGET: 30,
    MIN_ACCEPTABLE: 15,
  },
};

/**
 * Get recommended geometry type based on structure size
 */
export type GeometryLOD = 'ibeam' | 'cylinder-6' | 'cylinder-4' | 'cylinder-3';

export function getGeometryLOD(memberCount: number): GeometryLOD {
  if (memberCount < PERFORMANCE_CONFIG.LOD.HIGH_DETAIL) {
    return 'ibeam'; // Detailed I-beam cross-section
  } else if (memberCount < PERFORMANCE_CONFIG.LOD.MEDIUM) {
    return 'cylinder-6'; // 6-segment cylinder
  } else if (memberCount < PERFORMANCE_CONFIG.LOD.LOW) {
    return 'cylinder-4'; // 4-segment cylinder
  } else {
    return 'cylinder-3'; // 3-segment cylinder (minimal)
  }
}

/**
 * Check if structure size exceeds recommendations
 */
export function shouldShowPerformanceWarning(
  memberCount: number,
  nodeCount: number
): { show: boolean; message: string } {
  if (memberCount > PERFORMANCE_CONFIG.MAX_RECOMMENDED_MEMBERS) {
    return {
      show: true,
      message: `Large structure detected (${memberCount} members). Rendering has been optimized for performance. Some visual detail may be reduced.`,
    };
  }
  
  if (nodeCount > PERFORMANCE_CONFIG.MAX_RECOMMENDED_MEMBERS * 2) {
    return {
      show: true,
      message: `Large structure detected (${nodeCount} nodes). Performance may be impacted.`,
    };
  }
  
  return { show: false, message: '' };
}

/**
 * Get cylinder segment count based on LOD
 */
export function getCylinderSegments(lod: GeometryLOD): number {
  switch (lod) {
    case 'ibeam':
      return 6; // Not used for I-beam, but fallback
    case 'cylinder-6':
      return 6;
    case 'cylinder-4':
      return 4;
    case 'cylinder-3':
      return 3;
    default:
      return 6;
  }
}

/**
 * Estimate memory usage for structure (MB)
 */
export function estimateMemoryUsage(memberCount: number, nodeCount: number): number {
  // Rough estimate based on geometry complexity
  const bytesPerMember = 1024; // ~1KB per member instance
  const bytesPerNode = 512;    // ~0.5KB per node instance
  
  const totalBytes = memberCount * bytesPerMember + nodeCount * bytesPerNode;
  return Math.round(totalBytes / (1024 * 1024)); // Convert to MB
}

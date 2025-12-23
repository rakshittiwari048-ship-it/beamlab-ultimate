import { create } from 'zustand';
import isSections from '../data/is-sections.json';

// ============================================================================
// SECTION TYPES (IS 808:1989 Indian Standard Sections)
// ============================================================================

export interface ISSection {
  id: string;
  name: string;
  type: 'ISMB' | 'ISWB' | 'ISLB' | 'ISJB';  // IS section types
  depth: number;           // mm
  flangeWidth: number;     // mm
  flangeThickness: number; // mm
  webThickness: number;    // mm
  area: number;            // mm²
  Ixx: number;             // mm⁴ (Major axis)
  Iyy: number;             // mm⁴ (Minor axis)
  weight: number;          // kg/m
}

export type Section = ISSection;

// ============================================================================
// SECTIONS STORE
// ============================================================================

interface SectionsState {
  // Data
  sections: Section[];
  defaultSectionId: string;
  
  // Actions
  getSectionById: (id: string) => Section | undefined;
  getAllSections: () => Section[];
  searchSections: (query: string) => Section[];
  getSectionsByDepthRange: (minDepth: number, maxDepth: number) => Section[];
  getDefaultSection: () => Section;
  setDefaultSectionId: (id: string) => void;
}

export const useSectionsStore = create<SectionsState>((set, get) => ({
  // Initialize with IS standard sections data
  sections: isSections.sections as Section[],
  defaultSectionId: 'ISJB150', // Smallest section (ISJB 150)
  
  // Get a section by its ID
  getSectionById: (id: string) => {
    return get().sections.find(s => s.id === id);
  },
  
  // Get all sections
  getAllSections: () => {
    return get().sections;
  },
  
  // Search sections by query (matches name, id, type, or depth)
  searchSections: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().sections;
    
    return get().sections.filter(section => {
      // Match by name (e.g., "ISMB 300")
      if (section.name.toLowerCase().includes(q)) return true;
      
      // Match by type (e.g., "ismb", "iswb", "islb", "isjb")
      if (section.type.toLowerCase().includes(q)) return true;
      
      // Match by depth (e.g., "300" matches ISMB300, ISLB300, etc.)
      const depthMatch = q.match(/(\d+)/);
      if (depthMatch) {
        const searchDepth = parseInt(depthMatch[1], 10);
        if (section.depth === searchDepth) return true;
      }
      
      return false;
    });
  },
  
  // Filter sections by depth range
  getSectionsByDepthRange: (minDepth: number, maxDepth: number) => {
    return get().sections.filter(s => s.depth >= minDepth && s.depth <= maxDepth);
  },
  
  // Get the default section
  getDefaultSection: () => {
    const defaultSection = get().sections.find(s => s.id === get().defaultSectionId);
    return defaultSection || get().sections[0];
  },
  
  // Set the default section
  setDefaultSectionId: (id: string) => {
    set({ defaultSectionId: id });
  },
}));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert section dimensions from mm to meters for Three.js
 * Standard conversion: 1 mm = 0.001 meters
 */
export function mmToMeters(mm: number): number {
  return mm * 0.001;
}

/**
 * Get scaled section dimensions for 3D rendering
 * Returns dimensions in meters, optionally scaled for visibility
 * IS sections are in mm, so we convert to meters
 */
export function getScaledSectionDimensions(section: Section, scale: number = 1) {
  return {
    depth: mmToMeters(section.depth) * scale,
    flangeWidth: mmToMeters(section.flangeWidth) * scale,
    flangeThickness: mmToMeters(section.flangeThickness) * scale,
    webThickness: mmToMeters(section.webThickness) * scale,
  };
}

/**
 * Parse an IS section name to extract type and depth
 * e.g., "ISMB 300" => { type: "ISMB", depth: 300 }
 * e.g., "ISWB450" => { type: "ISWB", depth: 450 }
 */
export function parseISSectionName(name: string): { type: string; depth: number } | null {
  const match = name.match(/^(ISMB|ISWB|ISLB|ISJB)\s*(\d+)$/i);
  if (!match) return null;
  return {
    type: match[1].toUpperCase(),
    depth: parseInt(match[2], 10),
  };
}

/**
 * Get section type description
 */
export function getSectionTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'ISMB': 'Indian Standard Medium Weight Beam',
    'ISWB': 'Indian Standard Wide Flange Beam',
    'ISLB': 'Indian Standard Light Weight Beam',
    'ISJB': 'Indian Standard Junior Beam',
  };
  return descriptions[type] || type;
}

/**
 * useReportCapture.tsx
 * 
 * Hook for capturing 3D views, charts, and generating comprehensive PDF reports
 * 
 * Features:
 * - Capture Three.js canvas with proper frame rendering
 * - Screenshot chart elements using html2canvas
 * - Orchestrate full report generation with ReportGenerator
 * - Integration with Zustand store for structural data
 */

import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { ReportGenerator, ProjectData } from '../../services/ReportGenerator';
import { useModelStore } from '../../store/model';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CaptureOptions {
  quality?: number; // 0-1, default 1.0
  format?: 'png' | 'jpeg';
}

export interface ChartCaptureResult {
  chartId: string;
  imageData: string;
  width: number;
  height: number;
}

export interface ReportCaptureData {
  view3D: string;
  charts: ChartCaptureResult[];
  nodes: any[];
  members: any[];
  loads: any[];
  analysisResults?: any;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for capturing views and generating reports
 * 
 * Usage:
 * ```tsx
 * const { capture3DView, captureCharts, generateFullReport } = useReportCapture();
 * 
 * // Capture just the 3D view
 * const imageData = await capture3DView();
 * 
 * // Capture charts
 * const chartImages = await captureCharts(['shear-diagram', 'moment-diagram']);
 * 
 * // Generate full report
 * await generateFullReport({
 *   name: 'My Project',
 *   clientName: 'ABC Corp'
 * });
 * ```
 */
export const useReportCapture = () => {
  const captureInProgress = useRef(false);
  
  // Access store data
  const nodes = useModelStore(state => Array.from(state.nodes.values()));
  const members = useModelStore(state => Array.from(state.members.values()));
  const analysisResults = useModelStore(state => state.analysisResults);
  const solverResult = useModelStore(state => state.solverResult);

  /**
   * Capture the Three.js 3D view
   * CRITICAL: Renders a frame before capturing to ensure buffer isn't empty
   * 
   * @param options - Capture quality and format options
   * @returns Base64 image data URL
   */
  const capture3DView = useCallback(async (
    canvasRef?: React.RefObject<HTMLCanvasElement>,
    options: CaptureOptions = {}
  ): Promise<string> => {
    const { quality = 1.0, format = 'png' } = options;
    
    try {
      // Find the Three.js canvas element
      let canvas: HTMLCanvasElement | null = null;
      
      if (canvasRef?.current) {
        canvas = canvasRef.current;
      } else {
        // Fallback: Find canvas in DOM
        canvas = document.querySelector('canvas') as HTMLCanvasElement;
      }
      
      if (!canvas) {
        throw new Error('Three.js canvas not found. Make sure the 3D view is rendered.');
      }
      
      // Get the WebGL rendering context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) {
        throw new Error('WebGL context not available');
      }
      
      // CRUCIAL: Force a render to ensure the buffer has content
      // This prevents capturing an empty/black image
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Trigger a render by marking the canvas as dirty
          if (canvas) {
            canvas.dispatchEvent(new Event('webglcontextrestored'));
          }
          
          // Wait one more frame to ensure render completes
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      
      // Capture the canvas to Base64
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const imageData = canvas.toDataURL(mimeType, quality);
      
      if (!imageData || imageData === 'data:,') {
        throw new Error('Failed to capture canvas - empty data');
      }
      
      console.log('✓ 3D view captured successfully');
      return imageData;
      
    } catch (error) {
      console.error('Error capturing 3D view:', error);
      throw error;
    }
  }, []);

  /**
   * Capture multiple chart elements as images
   * Uses html2canvas to screenshot specific DOM elements
   * 
   * @param chartIds - Array of element IDs to capture (e.g., ['shear-diagram', 'moment-diagram'])
   * @returns Array of captured chart images with metadata
   */
  const captureCharts = useCallback(async (
    chartIds: string[]
  ): Promise<ChartCaptureResult[]> => {
    const results: ChartCaptureResult[] = [];
    
    for (const chartId of chartIds) {
      try {
        const element = document.getElementById(chartId);
        
        if (!element) {
          console.warn(`Chart element with ID "${chartId}" not found, skipping`);
          continue;
        }
        
        // Capture using html2canvas
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        
        // Convert to Base64
        const imageData = canvas.toDataURL('image/png', 1.0);
        
        results.push({
          chartId,
          imageData,
          width: canvas.width,
          height: canvas.height,
        });
        
        console.log(`✓ Chart "${chartId}" captured successfully`);
        
      } catch (error) {
        console.error(`Error capturing chart "${chartId}":`, error);
        // Continue with other charts even if one fails
      }
    }
    
    return results;
  }, []);

  /**
   * Generate a comprehensive PDF report
   * Orchestrates:
   * 1. Capturing 3D view
   * 2. Capturing charts
   * 3. Collecting store data
   * 4. Assembling PDF with ReportGenerator
   * 
   * @param projectData - Project metadata (name, client, engineer, description)
   * @param canvasRef - Optional ref to Three.js canvas
   * @param chartIds - Optional array of chart IDs to include
   * @returns Promise that resolves when PDF is generated and downloaded
   */
  const generateFullReport = useCallback(async (
    projectData: ProjectData,
    canvasRef?: React.RefObject<HTMLCanvasElement>,
    chartIds: string[] = ['shear-diagram', 'moment-diagram', 'deflection-chart']
  ): Promise<void> => {
    // Prevent concurrent report generation
    if (captureInProgress.current) {
      console.warn('Report generation already in progress');
      return;
    }
    
    captureInProgress.current = true;
    
    try {
      console.log('Starting full report generation...');
      
      // Step 1: Capture 3D view
      console.log('📸 Capturing 3D view...');
      const view3D = await capture3DView(canvasRef);
      
      // Step 2: Capture charts (non-blocking if charts don't exist)
      console.log('📊 Capturing charts...');
      const charts = await captureCharts(chartIds);
      
      // Step 3: Initialize ReportGenerator
      console.log('📄 Generating PDF...');
      const generator = new ReportGenerator();
      
      // Add header
      generator.addHeader();
      
      // Add project information
      generator.addProjectInfo(projectData);
      
      // Add 3D model snapshot
      if (view3D) {
        generator.add3DSnapshot(view3D, 'Figure 1: 3D Structural Model', 160);
      }
      
      // Add structural data tables
      if (nodes.length > 0) {
        const nodeData = nodes.map(node => ({
          id: node.id.slice(0, 8),
          x: node.x.toFixed(2),
          y: node.y.toFixed(2),
          z: node.z.toFixed(2),
          notes: node.notes || '-',
        }));
        
        generator.addResultsTable(
          nodeData,
          [
            { header: 'Node ID', dataKey: 'id' },
            { header: 'X (m)', dataKey: 'x' },
            { header: 'Y (m)', dataKey: 'y' },
            { header: 'Z (m)', dataKey: 'z' },
            { header: 'Notes', dataKey: 'notes' },
          ],
          'Node Coordinates'
        );
      }
      
      if (members.length > 0) {
        const memberData = members.map(member => ({
          id: member.id.slice(0, 8),
          startNode: member.startNodeId.slice(0, 8),
          endNode: member.endNodeId.slice(0, 8),
          section: member.sectionId?.slice(0, 8) || '-',
        }));
        
        generator.addResultsTable(
          memberData,
          [
            { header: 'Member ID', dataKey: 'id' },
            { header: 'Start Node', dataKey: 'startNode' },
            { header: 'End Node', dataKey: 'endNode' },
            { header: 'Section', dataKey: 'section' },
          ],
          'Member Connectivity'
        );
      }
      
      // Add analysis results if available
      if (solverResult && solverResult.nodalDisplacements) {
        generator.addPageBreak();
        generator.addSection(
          'Analysis Results',
          'The following tables show the calculated displacements and member forces.'
        );
        
        // Nodal displacements
        const dispEntries = Array.from(solverResult.nodalDisplacements.entries()).slice(0, 50);
        if (dispEntries.length > 0) {
          const dispData = dispEntries.map(([nodeId, disp]) => ({
            nodeId: nodeId.slice(0, 8),
            dx: (disp.dx * 1000).toFixed(4), // Convert m to mm
            dy: (disp.dy * 1000).toFixed(4),
            dz: (disp.dz * 1000).toFixed(4),
            magnitude: (Math.sqrt(disp.dx ** 2 + disp.dy ** 2 + disp.dz ** 2) * 1000).toFixed(4),
          }));
          
          generator.addResultsTable(
            dispData,
            [
              { header: 'Node ID', dataKey: 'nodeId' },
              { header: 'Δx (mm)', dataKey: 'dx' },
              { header: 'Δy (mm)', dataKey: 'dy' },
              { header: 'Δz (mm)', dataKey: 'dz' },
              { header: '|Δ| (mm)', dataKey: 'magnitude' },
            ],
            'Nodal Displacements'
          );
        }
        
        // Member forces (end forces)
        if (analysisResults && analysisResults.memberEndForces) {
          const forceEntries = Array.from(analysisResults.memberEndForces.entries()).slice(0, 50);
          const forceData = forceEntries.map(([memberId, forces]) => ({
            memberId: memberId.slice(0, 8),
            axial: forces.Nx_i.toFixed(2),
            shearY: forces.Vy_i.toFixed(2),
            shearZ: forces.Vz_i.toFixed(2),
            momentY: forces.My_i.toFixed(2),
            momentZ: forces.Mz_i.toFixed(2),
          }));
          
          generator.addResultsTable(
            forceData,
            [
              { header: 'Member ID', dataKey: 'memberId' },
              { header: 'Axial (kN)', dataKey: 'axial' },
              { header: 'Shear-Y (kN)', dataKey: 'shearY' },
              { header: 'Shear-Z (kN)', dataKey: 'shearZ' },
              { header: 'Moment-Y (kN·m)', dataKey: 'momentY' },
              { header: 'Moment-Z (kN·m)', dataKey: 'momentZ' },
            ],
            'Member End Forces (i-end)'
          );
        }
      }
      
      // Add captured charts
      if (charts.length > 0) {
        generator.addPageBreak();
        generator.addSection('Force Diagrams', 'Shear and moment diagrams for structural members.');
        
        charts.forEach((chart, index) => {
          const caption = `Figure ${index + 2}: ${chart.chartId.replace(/-/g, ' ').toUpperCase()}`;
          generator.add3DSnapshot(chart.imageData, caption, 150);
        });
      }
      
      // Add footer to all pages
      generator.addFooter();
      
      // Save the PDF
      const filename = projectData.name.replace(/\s+/g, '_') || 'BeamLab_Report';
      generator.save(filename);
      
      console.log('✅ Report generated successfully!');
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    } finally {
      captureInProgress.current = false;
    }
  }, [capture3DView, captureCharts, nodes, members, analysisResults, solverResult]);

  return {
    capture3DView,
    captureCharts,
    generateFullReport,
    isCapturing: captureInProgress.current,
  };
};

// ============================================================================
// HELPER: Canvas Ref Hook for Three.js
// ============================================================================

/**
 * Helper hook to get a ref to the Three.js canvas
 * Use this in your Canvas component:
 * 
 * ```tsx
 * const canvasRef = useThreeCanvas();
 * 
 * <Canvas ref={canvasRef}>
 *   ...
 * </Canvas>
 * ```
 */
export const useThreeCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return canvasRef;
};

export default useReportCapture;

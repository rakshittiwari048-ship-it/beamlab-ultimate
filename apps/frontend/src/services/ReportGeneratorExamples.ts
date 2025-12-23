/**
 * ReportGenerator Usage Examples
 * 
 * Demonstrates how to use the ReportGenerator class
 * for creating professional PDF reports in BeamLab Ultimate
 */

import ReportGenerator, { ProjectData, TableColumn } from './ReportGenerator';

// ============================================================================
// EXAMPLE 1: Basic Report with Project Info
// ============================================================================

export function generateBasicReport(): void {
  const generator = new ReportGenerator();
  
  // Add header
  generator.addHeader('Structural Analysis Report');
  
  // Add project information
  const projectData: ProjectData = {
    name: 'Steel Frame Design - Mumbai Office',
    clientName: 'ABC Construction Ltd.',
    engineerName: 'Rajesh Tiwari, P.E.',
    description: 'Design and analysis of a 5-story steel frame for office building with earthquake resistance.'
  };
  
  generator.addProjectInfo(projectData);
  
  // Add section
  generator.addSection(
    'Project Overview',
    'This report presents the structural analysis results for the proposed office building. ' +
    'The analysis includes static load cases, material stress checks, and displacement calculations. ' +
    'All results comply with Indian Standards (IS 800, IS 1893).'
  );
  
  // Save
  generator.save('basic_report');
}

// ============================================================================
// EXAMPLE 2: Report with 3D Snapshot and Tables
// ============================================================================

export function generateAnalysisReport(
  projectName: string,
  imageDataUrl: string,
  nodalResults: any[],
  memberResults: any[]
): void {
  const generator = new ReportGenerator();
  
  // Header
  generator.addHeader();
  
  // Project Info
  const projectData: ProjectData = {
    name: projectName,
    clientName: 'ABC Construction Ltd.',
    engineerName: 'Rajesh Tiwari, P.E.',
  };
  generator.addProjectInfo(projectData);
  
  // 3D Snapshot
  generator.add3DSnapshot(
    imageDataUrl,
    'Figure 1: 3D Structural Model with Applied Loads'
  );
  
  // New page for results
  generator.addPageBreak();
  
  // Nodal Displacements Table
  const nodalColumns: TableColumn[] = [
    { header: 'Node ID', dataKey: 'nodeId' },
    { header: 'dx (mm)', dataKey: 'dx' },
    { header: 'dy (mm)', dataKey: 'dy' },
    { header: 'dz (mm)', dataKey: 'dz' },
    { header: 'Magnitude (mm)', dataKey: 'magnitude' },
  ];
  
  generator.addResultsTable(
    nodalResults,
    nodalColumns,
    'Table 1: Nodal Displacements'
  );
  
  // Member Forces Table
  generator.addPageBreak();
  
  const memberColumns: TableColumn[] = [
    { header: 'Member ID', dataKey: 'memberId' },
    { header: 'Axial (kN)', dataKey: 'axialForce' },
    { header: 'Shear (kN)', dataKey: 'shearForce' },
    { header: 'Moment (kN-m)', dataKey: 'bendingMoment' },
    { header: 'Utilization %', dataKey: 'utilization' },
  ];
  
  generator.addResultsTable(
    memberResults,
    memberColumns,
    'Table 2: Member End Forces'
  );
  
  // Summary
  generator.addPageBreak();
  generator.addSection(
    'Analysis Summary',
    'The structural analysis shows that all members are within safe limits. ' +
    'Maximum nodal displacement is 15.4 mm in the vertical direction. ' +
    'Highest member utilization is 78% at Column C4. ' +
    'The structure is adequate for the applied loads.'
  );
  
  // Save
  generator.save(projectName.replace(/\s+/g, '_'));
}

// ============================================================================
// EXAMPLE 3: Capture 3D Viewport and Generate Report
// ============================================================================

export function generateReportWithScreenshot(
  canvas: HTMLCanvasElement,
  projectName: string,
  analysisData: {
    nodes: any[];
    members: any[];
  }
): void {
  // Convert canvas to image
  const imageDataUrl = canvas.toDataURL('image/png');
  
  // Generate report
  generateAnalysisReport(
    projectName,
    imageDataUrl,
    analysisData.nodes,
    analysisData.members
  );
}

// ============================================================================
// EXAMPLE 4: Advanced Multi-Page Report
// ============================================================================

export function generateComprehensiveReport(
  projectData: ProjectData,
  viewport3DImageUrl: string,
  loadCaseName: string,
  nodalDisplacements: any[],
  memberForces: any[],
  designResults: any[],
  comments: string
): void {
  const generator = new ReportGenerator();
  
  // ---- PAGE 1: COVER PAGE ----
  generator.addHeader('Cover Page');
  generator.addProjectInfo(projectData);
  
  generator.addSection(
    'Report Type',
    'Structural Analysis and Design Report'
  );
  
  // ---- PAGE 2: STRUCTURAL MODEL ----
  generator.addPageBreak();
  generator.add3DSnapshot(
    viewport3DImageUrl,
    'Figure 1: 3D Structural Model Showing All Members and Supports'
  );
  
  // ---- PAGE 3: ANALYSIS RESULTS - DISPLACEMENTS ----
  generator.addPageBreak();
  
  const displacementColumns: TableColumn[] = [
    { header: 'Node', dataKey: 'nodeId' },
    { header: 'ΔX (mm)', dataKey: 'dx' },
    { header: 'ΔY (mm)', dataKey: 'dy' },
    { header: 'ΔZ (mm)', dataKey: 'dz' },
    { header: '|Δ| (mm)', dataKey: 'magnitude' },
  ];
  
  generator.addResultsTable(
    nodalDisplacements,
    displacementColumns,
    `Nodal Displacements (${loadCaseName})`
  );
  
  // ---- PAGE 4: ANALYSIS RESULTS - MEMBER FORCES ----
  generator.addPageBreak();
  
  const forceColumns: TableColumn[] = [
    { header: 'Member', dataKey: 'memberId' },
    { header: 'Axial (kN)', dataKey: 'axial' },
    { header: 'Vy (kN)', dataKey: 'vy' },
    { header: 'Vz (kN)', dataKey: 'vz' },
    { header: 'My (kN-m)', dataKey: 'my' },
    { header: 'Mz (kN-m)', dataKey: 'mz' },
  ];
  
  generator.addResultsTable(
    memberForces,
    forceColumns,
    `Member End Forces (${loadCaseName})`
  );
  
  // ---- PAGE 5: DESIGN CHECKS ----
  generator.addPageBreak();
  
  const designColumns: TableColumn[] = [
    { header: 'Member', dataKey: 'memberId' },
    { header: 'Section', dataKey: 'section' },
    { header: 'Check Type', dataKey: 'checkType' },
    { header: 'Demand (kN)', dataKey: 'demand' },
    { header: 'Capacity (kN)', dataKey: 'capacity' },
    { header: 'Utilization %', dataKey: 'utilization' },
    { header: 'Status', dataKey: 'status' },
  ];
  
  generator.addResultsTable(
    designResults,
    designColumns,
    'Steel Member Design Checks (IS 800:2007)'
  );
  
  // ---- PAGE 6: SUMMARY & COMMENTS ----
  generator.addPageBreak();
  generator.addSection('Engineer Comments', comments);
  
  // Save
  const filename = projectData.name.replace(/\s+/g, '_').toLowerCase();
  generator.save(filename);
}

// ============================================================================
// INTEGRATION EXAMPLE: React Component Hook
// ============================================================================

/**
 * Example hook for generating a report from BeamLab analysis
 * 
 * Usage in React component:
 * const generateReport = useBeamLabReportGenerator();
 * 
 * In event handler:
 * await generateReport({
 *   projectName: currentProject.name,
 *   canvas3D: canvasRef.current,
 *   analysisResults: modelState.analysisResults,
 * });
 */

export function useBeamLabReportGenerator() {
  return async (options: {
    projectName: string;
    canvas3D: HTMLCanvasElement | null;
    analysisResults: any;
    projectData?: ProjectData;
  }) => {
    const {
      projectName,
      canvas3D,
      analysisResults,
      projectData: customProjectData,
    } = options;
    
    if (!canvas3D || !analysisResults) {
      console.error('Missing required data for report generation');
      return;
    }
    
    // Default project data
    const projectData: ProjectData = customProjectData || {
      name: projectName,
      clientName: 'BeamLab User',
      engineerName: 'Structural Engineer',
    };
    
    // Generate image
    const imageUrl = canvas3D.toDataURL('image/png');
    
    // Extract nodal displacements
    const nodalResults = (analysisResults?.nodalDisplacements || []).map(
      (disp: any) => ({
        nodeId: disp.nodeId.slice(0, 8),
        dx: disp.dx.toFixed(2),
        dy: disp.dy.toFixed(2),
        dz: disp.dz.toFixed(2),
        magnitude: Math.sqrt(disp.dx ** 2 + disp.dy ** 2 + disp.dz ** 2).toFixed(2),
      })
    );
    
    // Generate report
    generateAnalysisReport(
      projectData.name,
      imageUrl,
      nodalResults,
      []
    );
  };
}

export default {
  generateBasicReport,
  generateAnalysisReport,
  generateReportWithScreenshot,
  generateComprehensiveReport,
  useBeamLabReportGenerator,
};

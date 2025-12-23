/**
 * ReportGenerator.ts
 *
 * Professional PDF Report Generation for BeamLab Ultimate
 *
 * Features:
 * - Page 1: Title & 3D Model Screenshot
 * - Page 2: Input Data (Nodes & Members Tables)
 * - Page 3: Analysis Results (Hand Calc Steps & Reactions)
 * - Page 4: Pass/Fail Design Check
 * - BeamLab Ultimate watermark on every page
 * - Professional Helvetica typography
 *
 * Dependencies: jspdf, jspdf-autotable
 *
 * Author: BeamLab Team
 */

import jsPDF from 'jspdf';
import autoTable, { RowInput, CellInput, Styles } from 'jspdf-autotable';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NodeData {
  id: number | string;
  x: number;
  y: number;
  z: number;
  support?: 'PINNED' | 'ROLLER' | 'FIXED' | 'FREE' | null;
}

export interface MemberData {
  id: number | string;
  startNode: number | string;
  endNode: number | string;
  section: string;
  material: string;
  length?: number;
}

export interface ReactionData {
  nodeId: number | string;
  Fx: number;  // kN
  Fy: number;  // kN
  Fz: number;  // kN
  Mx?: number; // kNm
  My?: number; // kNm
  Mz?: number; // kNm
}

export interface DesignCheckData {
  memberId: number | string;
  force: number;       // kN
  capacity: number;    // kN
  ratio: number;       // 0.0 - 1.0+
  status: 'PASS' | 'FAIL';
  checkType: string;   // e.g., "Axial", "Bending", "Shear"
}

export interface AnalysisResultsData {
  maxMoment: { value: number; location: string; unit: string };
  maxShear: { value: number; location: string; unit: string };
  maxDeflection?: { value: number; location: string; unit: string };
  handCalcSteps: string[];
  reactions: ReactionData[];
}

export interface ReportData {
  projectName: string;
  projectDescription?: string;
  author?: string;
  date?: string;
  nodes: NodeData[];
  members: MemberData[];
  analysisResults?: AnalysisResultsData;
  designChecks?: DesignCheckData[];
  canvasScreenshot?: string; // Base64 data URL from gl.domElement.toDataURL()
}

// ============================================================================
// COLORS & STYLING
// ============================================================================

const COLORS = {
  primary: [41, 98, 255] as [number, number, number],        // BeamLab Blue
  secondary: [100, 100, 100] as [number, number, number],    // Gray
  success: [34, 197, 94] as [number, number, number],        // Green
  danger: [239, 68, 68] as [number, number, number],         // Red
  warning: [245, 158, 11] as [number, number, number],       // Amber
  dark: [30, 30, 30] as [number, number, number],            // Near black
  light: [245, 245, 245] as [number, number, number],        // Light gray
  white: [255, 255, 255] as [number, number, number],
  tableHeader: [41, 98, 255] as [number, number, number],
  tableAlt: [248, 250, 252] as [number, number, number],
};

const FONTS = {
  title: 'helvetica',
  body: 'helvetica',
};

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

export class ReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;
  private pageNumber: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.contentWidth = this.pageWidth - 2 * this.margin;
    this.currentY = this.margin;
    this.pageNumber = 1;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Add the BeamLab Ultimate watermark to the current page
   */
  private addWatermark(): void {
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.primary);
    this.doc.setFont(FONTS.body, 'bold');
    
    const watermark = 'BeamLab Ultimate';
    const textWidth = this.doc.getTextWidth(watermark);
    
    // Top right corner
    this.doc.text(watermark, this.pageWidth - this.margin - textWidth + 15, 12);
    
    // Add a small line under the watermark
    this.doc.setDrawColor(...COLORS.primary);
    this.doc.setLineWidth(0.3);
    this.doc.line(
      this.pageWidth - this.margin - textWidth + 15,
      14,
      this.pageWidth - this.margin + 15,
      14
    );

    // Reset text color
    this.doc.setTextColor(...COLORS.dark);
  }

  /**
   * Add page footer with page number
   */
  private addFooter(): void {
    this.doc.setFontSize(9);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.setFont(FONTS.body, 'normal');
    
    const footer = `Page ${this.pageNumber}`;
    const footerWidth = this.doc.getTextWidth(footer);
    
    this.doc.text(footer, (this.pageWidth - footerWidth) / 2, this.pageHeight - 10);
    
    // Date on the left
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.doc.text(date, this.margin, this.pageHeight - 10);
    
    // Confidential notice on the right
    this.doc.setFontSize(7);
    this.doc.text('Confidential - For Review Only', this.pageWidth - this.margin - 35, this.pageHeight - 10);
  }

  /**
   * Add a new page with watermark
   */
  private addNewPage(): void {
    this.addFooter();
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = this.margin + 10;
    this.addWatermark();
  }

  /**
   * Check if we need a new page and add one if necessary
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 25) {
      this.addNewPage();
    }
  }

  /**
   * Add a section title
   */
  private addSectionTitle(title: string, icon?: string): void {
    this.checkPageBreak(15);
    
    this.doc.setFontSize(14);
    this.doc.setTextColor(...COLORS.primary);
    this.doc.setFont(FONTS.title, 'bold');
    
    const displayTitle = icon ? `${icon}  ${title}` : title;
    this.doc.text(displayTitle, this.margin, this.currentY);
    
    // Underline
    this.doc.setDrawColor(...COLORS.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 2, this.margin + 60, this.currentY + 2);
    
    this.currentY += 10;
    this.doc.setTextColor(...COLORS.dark);
  }

  /**
   * Add a subsection title
   */
  private addSubsectionTitle(title: string): void {
    this.checkPageBreak(10);
    
    this.doc.setFontSize(11);
    this.doc.setTextColor(...COLORS.dark);
    this.doc.setFont(FONTS.body, 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 6;
  }

  /**
   * Add body text
   */
  private addText(text: string, indent: number = 0): void {
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.dark);
    this.doc.setFont(FONTS.body, 'normal');
    
    const lines = this.doc.splitTextToSize(text, this.contentWidth - indent);
    
    for (const line of lines) {
      this.checkPageBreak(6);
      this.doc.text(line, this.margin + indent, this.currentY);
      this.currentY += 5;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 1: TITLE & MODEL
  // ──────────────────────────────────────────────────────────────────────────

  private generateTitlePage(data: ReportData): void {
    this.addWatermark();

    // Large logo area (placeholder box)
    this.doc.setFillColor(...COLORS.primary);
    this.doc.roundedRect(this.margin, 30, this.contentWidth, 8, 2, 2, 'F');
    
    this.doc.setFontSize(16);
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont(FONTS.title, 'bold');
    this.doc.text('STRUCTURAL ANALYSIS REPORT', this.margin + 5, 36);

    // Project Title
    this.currentY = 55;
    this.doc.setFontSize(24);
    this.doc.setTextColor(...COLORS.dark);
    this.doc.setFont(FONTS.title, 'bold');
    this.doc.text(data.projectName || 'Untitled Project', this.margin, this.currentY);
    
    this.currentY += 12;

    // Project metadata
    this.doc.setFontSize(11);
    this.doc.setFont(FONTS.body, 'normal');
    this.doc.setTextColor(...COLORS.secondary);

    if (data.projectDescription) {
      const descLines = this.doc.splitTextToSize(data.projectDescription, this.contentWidth);
      descLines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }

    // Metadata table
    const metaData: string[][] = [];
    if (data.author) metaData.push(['Author:', data.author]);
    metaData.push(['Generated:', data.date || new Date().toLocaleDateString()]);
    metaData.push(['Nodes:', String(data.nodes.length)]);
    metaData.push(['Members:', String(data.members.length)]);

    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.dark);
    
    metaData.forEach(([label, value]) => {
      this.doc.setFont(FONTS.body, 'bold');
      this.doc.text(label, this.margin, this.currentY);
      this.doc.setFont(FONTS.body, 'normal');
      this.doc.text(value, this.margin + 30, this.currentY);
      this.currentY += 6;
    });

    // 3D Model Screenshot
    this.currentY += 10;
    
    if (data.canvasScreenshot) {
      this.doc.setFontSize(12);
      this.doc.setFont(FONTS.title, 'bold');
      this.doc.setTextColor(...COLORS.dark);
      this.doc.text('3D Model Preview', this.margin, this.currentY);
      this.currentY += 5;

      // Add the screenshot
      const imgWidth = this.contentWidth;
      const imgHeight = 90; // Fixed height for consistent layout
      
      try {
        this.doc.addImage(
          data.canvasScreenshot,
          'PNG',
          this.margin,
          this.currentY,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
        
        // Border around image
        this.doc.setDrawColor(...COLORS.secondary);
        this.doc.setLineWidth(0.3);
        this.doc.rect(this.margin, this.currentY, imgWidth, imgHeight);
        
        this.currentY += imgHeight + 10;
      } catch (error) {
        console.error('Failed to add screenshot:', error);
        // Placeholder if image fails
        this.doc.setFillColor(...COLORS.light);
        this.doc.rect(this.margin, this.currentY, imgWidth, imgHeight, 'F');
        this.doc.setFontSize(10);
        this.doc.setTextColor(...COLORS.secondary);
        this.doc.text('[3D Model Preview - Screenshot not available]', 
          this.margin + imgWidth / 2 - 40, this.currentY + imgHeight / 2);
        this.currentY += imgHeight + 10;
      }
    } else {
      // No screenshot provided
      this.doc.setFillColor(...COLORS.light);
      const placeholderHeight = 80;
      this.doc.rect(this.margin, this.currentY, this.contentWidth, placeholderHeight, 'F');
      this.doc.setFontSize(10);
      this.doc.setTextColor(...COLORS.secondary);
      this.doc.text('[3D Model Preview]', 
        this.margin + this.contentWidth / 2 - 20, this.currentY + placeholderHeight / 2);
      this.currentY += placeholderHeight + 10;
    }

    // Software info
    this.doc.setFontSize(8);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(
      'Generated with BeamLab Ultimate - Professional Structural Analysis Software',
      this.margin,
      this.pageHeight - 25
    );

    this.addFooter();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 2: INPUT DATA
  // ──────────────────────────────────────────────────────────────────────────

  private generateInputDataPage(data: ReportData): void {
    this.addNewPage();

    this.addSectionTitle('Input Data', '📋');
    this.currentY += 5;

    // Nodes Table
    this.addSubsectionTitle('Node Coordinates');
    
    const nodeHeaders = ['Node ID', 'X (m)', 'Y (m)', 'Z (m)', 'Support'];
    const nodeRows: RowInput[] = data.nodes.map(node => [
      String(node.id),
      node.x.toFixed(3),
      node.y.toFixed(3),
      node.z.toFixed(3),
      node.support || 'FREE',
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [nodeHeaders],
      body: nodeRows,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: FONTS.body,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.tableAlt,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
      },
    });

    // Get the final Y position after the table
    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Members Table
    this.addSubsectionTitle('Member Definitions');
    
    const memberHeaders = ['Member ID', 'Start Node', 'End Node', 'Section', 'Material', 'Length (m)'];
    const memberRows: RowInput[] = data.members.map(member => [
      String(member.id),
      String(member.startNode),
      String(member.endNode),
      member.section || '-',
      member.material || '-',
      member.length?.toFixed(3) || '-',
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [memberHeaders],
      body: memberRows,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: FONTS.body,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.tableAlt,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'left' },
        4: { halign: 'left' },
        5: { halign: 'right' },
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 3: ANALYSIS RESULTS
  // ──────────────────────────────────────────────────────────────────────────

  private generateAnalysisResultsPage(data: ReportData): void {
    this.addNewPage();

    this.addSectionTitle('Analysis Results', '📊');
    this.currentY += 5;

    if (!data.analysisResults) {
      this.addText('No analysis results available. Please run the analysis first.');
      return;
    }

    const results = data.analysisResults;

    // Summary Box
    this.doc.setFillColor(...COLORS.light);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 35, 3, 3, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont(FONTS.body, 'bold');
    this.doc.setTextColor(...COLORS.dark);
    
    const summaryY = this.currentY + 8;
    
    // Max Moment
    this.doc.text('Maximum Moment:', this.margin + 5, summaryY);
    this.doc.setFont(FONTS.body, 'normal');
    this.doc.setTextColor(...COLORS.danger);
    this.doc.text(
      `${results.maxMoment.value.toFixed(2)} ${results.maxMoment.unit} @ ${results.maxMoment.location}`,
      this.margin + 45, summaryY
    );

    // Max Shear
    this.doc.setFont(FONTS.body, 'bold');
    this.doc.setTextColor(...COLORS.dark);
    this.doc.text('Maximum Shear:', this.margin + 5, summaryY + 8);
    this.doc.setFont(FONTS.body, 'normal');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(
      `${results.maxShear.value.toFixed(2)} ${results.maxShear.unit} @ ${results.maxShear.location}`,
      this.margin + 45, summaryY + 8
    );

    // Max Deflection (if available)
    if (results.maxDeflection) {
      this.doc.setFont(FONTS.body, 'bold');
      this.doc.setTextColor(...COLORS.dark);
      this.doc.text('Maximum Deflection:', this.margin + 5, summaryY + 16);
      this.doc.setFont(FONTS.body, 'normal');
      this.doc.setTextColor(...COLORS.warning);
      this.doc.text(
        `${results.maxDeflection.value.toFixed(4)} ${results.maxDeflection.unit} @ ${results.maxDeflection.location}`,
        this.margin + 50, summaryY + 16
      );
    }

    this.currentY += 45;

    // Hand Calculation Steps
    this.addSubsectionTitle('Hand Calculation Steps');
    this.currentY += 2;

    this.doc.setFillColor(255, 255, 240); // Light yellow background for steps
    const stepsStartY = this.currentY;
    
    // Calculate height needed for steps
    const stepLineHeight = 5;
    let totalStepsHeight = 0;
    
    results.handCalcSteps.forEach(step => {
      const lines = this.doc.splitTextToSize(step, this.contentWidth - 15);
      totalStepsHeight += lines.length * stepLineHeight + 2;
    });

    // Check if we need a new page
    this.checkPageBreak(Math.min(totalStepsHeight + 10, 100));

    this.doc.setFontSize(9);
    this.doc.setFont('courier', 'normal');
    this.doc.setTextColor(...COLORS.dark);

    let stepIndex = 1;
    for (const step of results.handCalcSteps) {
      const lines = this.doc.splitTextToSize(step, this.contentWidth - 15);
      
      this.checkPageBreak(lines.length * stepLineHeight + 5);
      
      // Step number badge
      this.doc.setFillColor(...COLORS.primary);
      this.doc.circle(this.margin + 3, this.currentY - 1, 2.5, 'F');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...COLORS.white);
      this.doc.setFont(FONTS.body, 'bold');
      this.doc.text(String(stepIndex), this.margin + 1.8, this.currentY + 0.5);
      
      // Step text
      this.doc.setFontSize(9);
      this.doc.setFont('courier', 'normal');
      this.doc.setTextColor(...COLORS.dark);
      
      for (let i = 0; i < lines.length; i++) {
        this.doc.text(lines[i], this.margin + 10, this.currentY);
        this.currentY += stepLineHeight;
      }
      
      this.currentY += 2;
      stepIndex++;
    }

    this.currentY += 10;

    // Support Reactions Table
    this.checkPageBreak(50);
    this.addSubsectionTitle('Support Reactions');

    const reactionHeaders = ['Node', 'Fx (kN)', 'Fy (kN)', 'Fz (kN)', 'Mx (kNm)', 'My (kNm)', 'Mz (kNm)'];
    const reactionRows: RowInput[] = results.reactions.map(r => [
      String(r.nodeId),
      r.Fx.toFixed(2),
      r.Fy.toFixed(2),
      r.Fz.toFixed(2),
      (r.Mx ?? 0).toFixed(2),
      (r.My ?? 0).toFixed(2),
      (r.Mz ?? 0).toFixed(2),
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [reactionHeaders],
      body: reactionRows,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: FONTS.body,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.tableAlt,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE 4: PASS/FAIL DESIGN CHECK
  // ──────────────────────────────────────────────────────────────────────────

  private generateDesignCheckPage(data: ReportData): void {
    this.addNewPage();

    this.addSectionTitle('Design Check Results', '✅');
    this.currentY += 5;

    if (!data.designChecks || data.designChecks.length === 0) {
      this.addText('No design checks available. Please run the design module first.');
      return;
    }

    // Summary stats
    const passCount = data.designChecks.filter(c => c.status === 'PASS').length;
    const failCount = data.designChecks.filter(c => c.status === 'FAIL').length;
    const totalChecks = data.designChecks.length;
    const overallStatus = failCount === 0 ? 'PASS' : 'FAIL';

    // Overall status box
    const statusColor = overallStatus === 'PASS' ? COLORS.success : COLORS.danger;
    this.doc.setFillColor(...statusColor);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 20, 3, 3, 'F');
    
    this.doc.setFontSize(14);
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont(FONTS.title, 'bold');
    
    const statusText = `OVERALL DESIGN: ${overallStatus}`;
    const statusWidth = this.doc.getTextWidth(statusText);
    this.doc.text(statusText, (this.pageWidth - statusWidth) / 2, this.currentY + 10);
    
    this.doc.setFontSize(10);
    const summaryText = `${passCount} Passed | ${failCount} Failed | ${totalChecks} Total Checks`;
    const summaryWidth = this.doc.getTextWidth(summaryText);
    this.doc.text(summaryText, (this.pageWidth - summaryWidth) / 2, this.currentY + 16);

    this.currentY += 30;

    // Design Check Table with color coding
    this.addSubsectionTitle('Member Design Checks');

    const checkHeaders = ['Member ID', 'Check Type', 'Force (kN)', 'Capacity (kN)', 'Ratio', 'Status'];
    
    // Create rows with custom styling for PASS/FAIL
    const checkRows: RowInput[] = data.designChecks.map(check => {
      const ratioFormatted = (check.ratio * 100).toFixed(1) + '%';
      const statusCell: CellInput = {
        content: check.status,
        styles: {
          fillColor: check.status === 'PASS' ? COLORS.success : COLORS.danger,
          textColor: COLORS.white,
          fontStyle: 'bold',
          halign: 'center',
        } as Styles,
      };

      // Color-code ratio based on utilization
      let ratioColor: [number, number, number] = COLORS.success;
      if (check.ratio > 1.0) {
        ratioColor = COLORS.danger;
      } else if (check.ratio > 0.9) {
        ratioColor = COLORS.warning;
      } else if (check.ratio > 0.7) {
        ratioColor = [255, 193, 7]; // Yellow-ish
      }

      const ratioCell: CellInput = {
        content: ratioFormatted,
        styles: {
          textColor: ratioColor,
          fontStyle: 'bold',
          halign: 'center',
        } as Styles,
      };

      return [
        String(check.memberId),
        check.checkType,
        check.force.toFixed(2),
        check.capacity.toFixed(2),
        ratioCell,
        statusCell,
      ];
    });

    autoTable(this.doc, {
      startY: this.currentY,
      head: [checkHeaders],
      body: checkRows,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: FONTS.body,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.tableAlt,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center', cellWidth: 20 },
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Utilization Legend
    this.checkPageBreak(30);
    this.addSubsectionTitle('Utilization Legend');
    
    const legendItems = [
      { color: COLORS.success, label: '< 70% - Low Utilization (Efficient)' },
      { color: [255, 193, 7] as [number, number, number], label: '70-90% - Moderate Utilization' },
      { color: COLORS.warning, label: '90-100% - High Utilization (Acceptable)' },
      { color: COLORS.danger, label: '> 100% - OVER-STRESSED (FAIL)' },
    ];

    legendItems.forEach((item, index) => {
      this.doc.setFillColor(...item.color);
      this.doc.rect(this.margin, this.currentY + index * 7, 10, 5, 'F');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...COLORS.dark);
      this.doc.setFont(FONTS.body, 'normal');
      this.doc.text(item.label, this.margin + 15, this.currentY + index * 7 + 4);
    });

    this.currentY += 35;

    // Disclaimer
    this.checkPageBreak(20);
    this.doc.setFillColor(255, 250, 240);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 18, 2, 2, 'F');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.setFont(FONTS.body, 'italic');
    
    const disclaimer = 'DISCLAIMER: This report is for preliminary design purposes only. All results should be verified by a licensed Professional Engineer before construction. BeamLab Ultimate is not liable for any errors or omissions.';
    const disclaimerLines = this.doc.splitTextToSize(disclaimer, this.contentWidth - 10);
    disclaimerLines.forEach((line: string, i: number) => {
      this.doc.text(line, this.margin + 5, this.currentY + 5 + i * 4);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a complete PDF report from the provided data
   */
  public generate(data: ReportData): jsPDF {
    // Page 1: Title & Model
    this.generateTitlePage(data);

    // Page 2: Input Data
    this.generateInputDataPage(data);

    // Page 3: Analysis Results (if available)
    if (data.analysisResults) {
      this.generateAnalysisResultsPage(data);
    }

    // Page 4: Design Checks (if available)
    if (data.designChecks && data.designChecks.length > 0) {
      this.generateDesignCheckPage(data);
    }

    // Final footer on last page
    this.addFooter();

    return this.doc;
  }

  /**
   * Generate and immediately download the PDF
   */
  public generateAndDownload(data: ReportData, filename?: string): void {
    this.generate(data);
    const name = filename || `${data.projectName.replace(/\s+/g, '_')}_Report.pdf`;
    this.doc.save(name);
  }

  /**
   * Generate and return as Blob (for preview or upload)
   */
  public generateAsBlob(data: ReportData): Blob {
    this.generate(data);
    return this.doc.output('blob');
  }

  /**
   * Generate and return as Base64 data URL
   */
  public generateAsDataUrl(data: ReportData): string {
    this.generate(data);
    return this.doc.output('dataurlstring');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Capture a screenshot from a Three.js canvas
 *
 * @param gl - The WebGLRenderer from useThree()
 * @returns Base64 data URL of the canvas
 *
 * @example
 * const { gl } = useThree();
 * const screenshot = captureCanvasScreenshot(gl);
 */
export function captureCanvasScreenshot(gl: THREE.WebGLRenderer): string {
  // Ensure the frame is rendered
  gl.domElement.toDataURL('image/png');
  return gl.domElement.toDataURL('image/png');
}

/**
 * Quick function to generate and download a report
 */
export function downloadReport(data: ReportData, filename?: string): void {
  const generator = new ReportGenerator();
  generator.generateAndDownload(data, filename);
}

/**
 * Generate a report preview as a Blob URL (for iframe preview)
 */
export function generateReportPreview(data: ReportData): string {
  const generator = new ReportGenerator();
  const blob = generator.generateAsBlob(data);
  return URL.createObjectURL(blob);
}

// Export types
export type { RowInput, CellInput };

// Default export
export default ReportGenerator;

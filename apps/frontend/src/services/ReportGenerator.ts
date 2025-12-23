/**
 * ReportGenerator.ts
 * 
 * Professional PDF Report Generator for BeamLab Ultimate
 * Handles:
 * - Header and footer styling
 * - Project information display
 * - 3D model snapshots
 * - Analysis results tables
 * - Multi-page document generation
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProjectData {
  name: string;
  clientName?: string;
  engineerName?: string;
  description?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface DesignResult {
  memberId?: string;
  section?: string;
  utilization: number;
  governingEquation?: string;
  clause?: string;
  components?: {
    tension?: number;
    compression?: number;
    flexureMajor?: number;
    flexureMinor?: number;
    interaction?: number;
    [key: string]: number | undefined;
  };
}

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

export class ReportGenerator {
  private doc: jsPDF;
  private currentPage: number = 1;
  private currentY: number = 20;
  private readonly pageHeight: number = 297; // A4 height in mm
  private readonly pageWidth: number = 210;  // A4 width in mm
  private readonly margin: number = 10;
  private readonly headerHeight: number = 20;
  private readonly footerHeight: number = 10;

  /**
   * Initialize ReportGenerator with jsPDF document
   * Default: A4 size, helvetica font
   */
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentPage = 1;
    
    // Set default font
    this.doc.setFont('helvetica', 'normal');
  }

  /**
   * Add professional header to page
   * Top Left: "BeamLab Ultimate" (Bold, Size 12)
   * Top Right: Current date/time
   * Horizontal line separator
   * 
   * @param title - Optional title to display
   */
  addHeader(_title?: string): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    
    // Top Left: BeamLab Ultimate
    this.doc.text('BeamLab Ultimate', this.margin, this.margin + 5);
    this.currentY = this.margin + 5;
    
    // Top Right: Current date/time
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const timestamp = format(new Date(), 'MMM dd, yyyy, HH:mm a');
    const dateText = `Generated: ${timestamp}`;
    const dateWidth = this.doc.getTextWidth(dateText);
    this.doc.text(dateText, this.pageWidth - this.margin - dateWidth, this.margin + 5);
    
    // Horizontal line separator
    this.doc.setDrawColor(100, 100, 100);
    this.doc.setLineWidth(0.5);
    this.doc.line(
      this.margin,
      this.margin + 10,
      this.pageWidth - this.margin,
      this.margin + 10
    );
    
    this.currentY = this.margin + 15;
  }

  /**
   * Add professional footer with page numbers
   * Bottom Center: "Page X of Y"
   * 
   * Note: Call after all content is added to know total pages
   */
  addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    // Iterate through all pages to add footers
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(100, 100, 100);
      
      const pageText = `Page ${i} of ${pageCount}`;
      const textWidth = this.doc.getTextWidth(pageText);
      const centerX = this.pageWidth / 2 - textWidth / 2;
      
      this.doc.text(pageText, centerX, this.pageHeight - this.margin + 2);
    }
    
    // Reset to last page
    this.doc.setPage(pageCount);
  }

  /**
   * Add project information at the top of the first page
   * Displays: Project Name, Client Name, Engineer Name in a grid
   * 
   * @param project - Project data
   */
  addProjectInfo(project: ProjectData): void {
    const startY = this.margin + this.headerHeight + 5;
    const lineHeight = 8;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    
    // Title
    this.doc.text('Project Information', this.margin, startY);
    
    // Project details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    let currentY = startY + lineHeight + 2;
    
    // Project Name
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.text('Project:', this.margin, currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(project.name, this.margin + 40, currentY);
    currentY += lineHeight;
    
    // Client Name
    if (project.clientName) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Client:', this.margin, currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(project.clientName, this.margin + 40, currentY);
      currentY += lineHeight;
    }
    
    // Engineer Name
    if (project.engineerName) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Engineer:', this.margin, currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(project.engineerName, this.margin + 40, currentY);
      currentY += lineHeight;
    }
    
    // Description
    if (project.description) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Description:', this.margin, currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      
      const maxWidth = this.pageWidth - 2 * this.margin - 40;
      const wrappedText = this.doc.splitTextToSize(project.description, maxWidth);
      this.doc.text(wrappedText, this.margin + 40, currentY);
    }
    
    // Divider line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(
      this.margin,
      currentY + lineHeight + 3,
      this.pageWidth - this.margin,
      currentY + lineHeight + 3
    );
  }

  /**
   * Add 3D model snapshot image to the report
   * Centered on page with caption below
   * Auto-scales to fit within margins
   * 
   * @param imageDataUrl - Base64 encoded image data URL
   * @param caption - Optional caption for the image (e.g., "Figure 1: 3D Structural Model")
   * @param width - Optional width in mm (default: 180)
   */
  add3DSnapshot(imageDataUrl: string, caption?: string, width: number = 180): void {
    // Check if we need a new page
    if (this.currentPage > 1 && this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.addHeader();
    }
    
    const imageWidth = width;
    const imageHeight = (width * 3) / 4; // Assume 4:3 aspect ratio
    
    // Center horizontally
    const xPosition = (this.pageWidth - imageWidth) / 2;
    let yPosition = this.currentY + 5;
    
    // Check if image fits on current page
    if (yPosition + imageHeight > this.pageHeight - this.footerHeight - 20) {
      this.doc.addPage();
      this.addHeader();
      yPosition = this.margin + this.headerHeight + 5;
    }
    
    try {
      // Add image
      this.doc.addImage(
        imageDataUrl,
        'PNG',
        xPosition,
        yPosition,
        imageWidth,
        imageHeight
      );
      
      // Add caption
      if (caption) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(9);
        this.doc.setTextColor(100, 100, 100);
        
        const captionY = yPosition + imageHeight + 3;
        const captionWidth = this.doc.getTextWidth(caption);
        const captionX = (this.pageWidth - captionWidth) / 2;
        
        this.doc.text(caption, captionX, captionY);
      }
      
      this.currentY = yPosition + imageHeight + (caption ? 8 : 5);
    } catch (error) {
      console.error('Error adding image to report:', error);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.text('[Image could not be loaded]', xPosition, yPosition);
      this.currentY = yPosition + 10;
    }
  }

  /**
   * Add a data table to the report using autoTable
   * Styled with striped rows and grey headers
   * 
   * @param data - Array of data objects
   * @param columns - Column definitions
   * @param title - Optional table title
   */
  addResultsTable(
    data: any[],
    columns: TableColumn[],
    title?: string
  ): void {
    // Add new page if needed
    if (this.currentY > this.pageHeight - 100) {
      this.doc.addPage();
      this.addHeader();
    }
    
    // Add title if provided
    if (title) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      this.doc.text(title, this.margin, this.currentY + 5);
      this.currentY += 8;
    }
    
    // Prepare table columns
    const tableColumns = columns.map((col) => ({
      header: col.header,
      dataKey: col.dataKey,
    }));
    
    // Generate table using autoTable
    autoTable(this.doc, {
      columns: tableColumns,
      body: data,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      didDrawPage: () => {
        // Update currentY after table is drawn
        this.currentY = this.doc.internal.pageSize.getHeight() - this.footerHeight - 10;
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'center',
      },
      headStyles: {
        fillColor: [80, 120, 160],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [240, 245, 250],
      },
      columnStyles: {
        // Right-align numeric columns
        ...Object.fromEntries(
          tableColumns.map((_, idx) => [
            idx,
            { halign: 'right' as const },
          ])
        ),
      },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
    });
  }

  /**
   * Add steel design check summary and detailed notes
   * Highlights failed members with light red rows
   *
   * @param designResults - Array of design check results
   */
  addDesignSection(designResults: DesignResult[]): void {
    if (!designResults || designResults.length === 0) {
      this.addSection('Design Checks (IS 800:2007 / AISC 360)', 'No design results available.');
      return;
    }

    // Ensure space for heading
    if (this.currentY > this.pageHeight - 60) {
      this.addPageBreak();
    }

    // Section title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Design Checks (IS 800:2007 / AISC 360)', this.margin, this.currentY + 5);
    this.currentY += 8;

    // Build table rows
    const tableRows = designResults.map((res, idx) => {
      const ratio = res.utilization ?? 0;
      const status = ratio > 1.0 ? 'FAIL' : 'PASS';
      return {
        idx: idx + 1,
        memberId: res.memberId ?? `M${idx + 1}`,
        section: res.section ?? '-\u00a0-',
        ratio: ratio.toFixed(3),
        status,
        clause: res.clause ?? res.governingEquation ?? 'N/A',
      };
    });

    // Render table with conditional row coloring
    autoTable(this.doc, {
      columns: [
        { header: '#', dataKey: 'idx' },
        { header: 'Member ID', dataKey: 'memberId' },
        { header: 'Section', dataKey: 'section' },
        { header: 'Critical Ratio', dataKey: 'ratio' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Clause', dataKey: 'clause' },
      ],
      body: tableRows,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        halign: 'center',
      },
      headStyles: {
        fillColor: [80, 120, 160],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
      columnStyles: {
        idx: { halign: 'right' },
        ratio: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const status = (data.row.raw as any)?.status;
          if (status === 'FAIL') {
            data.cell.styles.fillColor = [255, 204, 204]; // light red
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }
      },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
    });

    // Update currentY after table
    const lastTable = (this.doc as any).lastAutoTable;
    if (lastTable?.finalY) {
      this.currentY = lastTable.finalY + 6;
    } else {
      this.currentY += 40;
    }

    // Detailed breakdown for failed members
    const failed = designResults.filter((res) => res.utilization > 1.0);
    if (failed.length > 0) {
      // Add a small subtitle
      if (this.currentY > this.pageHeight - 50) {
        this.addPageBreak();
      }
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.text('Failure Notes:', this.margin, this.currentY + 4);
      this.currentY += 6;

      failed.forEach((res, idx) => {
        if (this.currentY > this.pageHeight - 40) {
          this.addPageBreak();
        }

        const ratio = res.utilization ?? 0;
        const memberLabel = res.memberId ?? `Member ${idx + 1}`;
        const governing = res.governingEquation ?? 'Governing check exceeded capacity';

        // Pick top contributing components (up to 2)
        const componentPairs = res.components
          ? Object.entries(res.components)
              .filter(([, v]) => typeof v === 'number')
              .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
              .slice(0, 2)
          : [];

        const componentText = componentPairs.length
          ? `Dominant components: ${componentPairs
              .map(([k, v]) => `${k}: ${(v ?? 0).toFixed(3)}`)
              .join(', ')}.`
          : '';

        const text = `${memberLabel} failed in ${governing} with ratio ${ratio.toFixed(3)}. ${componentText} Consider checking compression buckling (slenderness), lateral torsional buckling, and section capacity per IS 800:2007 / AISC 360.`;

        const wrapped = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(9);
        this.doc.setTextColor(60, 60, 60);
        this.doc.text(wrapped, this.margin, this.currentY + 3);
        this.currentY += wrapped.length * 5 + 6;
      });
    }
  }

  /**
   * Add a simple text section
   * 
   * @param title - Section title
   * @param content - Section content (supports multiline)
   */
  addSection(title: string, content: string): void {
    // Check page space
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.addHeader();
    }
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title, this.margin, this.currentY + 5);
    this.currentY += 8;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(50, 50, 50);
    
    const maxWidth = this.pageWidth - 2 * this.margin;
    const wrappedText = this.doc.splitTextToSize(content, maxWidth);
    this.doc.text(wrappedText, this.margin, this.currentY);
    
    // Update currentY based on wrapped text height
    this.currentY += wrappedText.length * 5 + 5;
  }

  /**
   * Add a page break
   */
  addPageBreak(): void {
    this.doc.addPage();
    this.addHeader();
  }

  /**
   * Save the generated PDF
   * Automatically adds footers before saving
   * 
   * @param filename - Base filename (without extension)
   * @example
   * generator.save('beamlab_analysis') // Saves as 'beamlab_analysis_Report.pdf'
   */
  save(filename: string): void {
    // Add footers to all pages
    this.addFooter();
    
    // Save with timestamp suffix
    const finalFilename = `${filename}_Report.pdf`;
    this.doc.save(finalFilename);
  }

  /**
   * Get the current jsPDF document for advanced manipulation
   * 
   * @returns jsPDF instance
   */
  getDocument(): jsPDF {
    return this.doc;
  }

  /**
   * Get current page number
   * 
   * @returns Current page number
   */
  getCurrentPage(): number {
    return this.doc.getNumberOfPages();
  }

  /**
   * Get remaining space on current page
   * 
   * @returns Remaining height in mm
   */
  getRemainingHeight(): number {
    return this.pageHeight - this.currentY - this.footerHeight;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default ReportGenerator;

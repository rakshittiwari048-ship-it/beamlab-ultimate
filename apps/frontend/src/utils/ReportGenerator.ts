import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useModelStore } from '../store/model';
import { useSectionsStore } from '../store/sections';

type GLLike = { domElement: HTMLCanvasElement };

export interface ReportOptions {
  projectName: string;
  /** Optional company logo as a data URL (PNG/JPEG) */
  logoDataUrl?: string;
  /** Optional project/company label to show in header */
  companyName?: string;
  /** Optional date override */
  date?: Date;
  /** Optional R3F gl object (from useThree()) for screenshot capture */
  gl?: GLLike;
  /** If true, immediately saves the PDF */
  save?: boolean;
  /** Filename when save=true */
  filename?: string;
}

/**
 * captureCanvas
 * Uses gl.domElement.toDataURL() to capture the current 3D view.
 */
export function captureCanvas(gl: GLLike, type: 'image/png' | 'image/jpeg' = 'image/png', quality?: number): string {
  // Note: quality is ignored for PNG by browsers
  return gl.domElement.toDataURL(type, quality);
}

function inferImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
}

function formatDate(d: Date): string {
  // Locale-safe but stable enough for reports
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function safeNumber(n: number, decimals = 3): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function computeTotalWeightKg(): number {
  const model = useModelStore.getState();
  const sections = useSectionsStore.getState();

  const nodes = model.getAllNodes();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let totalKg = 0;
  for (const m of model.getAllMembers()) {
    const a = nodeMap.get(m.startNodeId);
    const b = nodeMap.get(m.endNodeId);
    if (!a || !b) continue;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz); // meters

    const section = sections.getSectionById(m.sectionId) ?? sections.getDefaultSection();
    const w = section?.weight ?? 0; // kg/m

    totalKg += w * L;
  }

  return totalKg;
}

/**
 * Generates a PDF report using current model + analysis state.
 */
export function generateReport(options: ReportOptions): jsPDF {
  const {
    projectName,
    logoDataUrl,
    companyName,
    date = new Date(),
    gl,
  } = options;

  const model = useModelStore.getState();
  const nodes = model.getAllNodes();
  const members = model.getAllMembers();
  const loadCases = model.loadCases;
  const solverResult = model.solverResult;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // -------------------------------------------------------------------------
  // HEADER
  // -------------------------------------------------------------------------
  const headerY = 12;
  const logoSize = 16;

  let textX = margin;
  if (logoDataUrl) {
    try {
      const fmt = inferImageFormat(logoDataUrl);
      doc.addImage(logoDataUrl, fmt, margin, headerY - 6, logoSize, logoSize);
      textX = margin + logoSize + 6;
    } catch {
      // ignore logo if it fails
      textX = margin;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(projectName, textX, headerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (companyName) {
    doc.text(companyName, textX, headerY + 6);
  }

  doc.text(`Date: ${formatDate(date)}`, pageWidth - margin, headerY, { align: 'right' });

  // A subtle divider line
  doc.setDrawColor(80);
  doc.setLineWidth(0.2);
  doc.line(margin, headerY + 10, pageWidth - margin, headerY + 10);

  let cursorY = headerY + 16;

  // -------------------------------------------------------------------------
  // SCREENSHOT (optional)
  // -------------------------------------------------------------------------
  if (gl) {
    try {
      const dataUrl = captureCanvas(gl);
      const imgFmt = inferImageFormat(dataUrl);

      const imgMaxW = pageWidth - margin * 2;
      const imgH = 60; // fixed height for consistency

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('3D View Snapshot', margin, cursorY);
      cursorY += 4;

      doc.addImage(dataUrl, imgFmt, margin, cursorY, imgMaxW, imgH);
      cursorY += imgH + 6;
    } catch {
      // ignore screenshot failures
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: MODEL STATISTICS
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Model Statistics', margin, cursorY);
  cursorY += 2;

  const totalWeightKg = computeTotalWeightKg();

  autoTable(doc, {
    startY: cursorY + 2,
    theme: 'grid',
    styles: { fontSize: 9 },
    head: [['Metric', 'Value']],
    body: [
      ['Nodes', String(nodes.length)],
      ['Members', String(members.length)],
      ['Total Weight (kg)', safeNumber(totalWeightKg, 2)],
    ],
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? (cursorY + 20);
  cursorY += 8;

  // -------------------------------------------------------------------------
  // SECTION 2: LOAD CASES TABLE
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Load Cases', margin, cursorY);

  const loadCaseRows = loadCases.map((lc) => {
    const typeCounts = lc.loads.reduce<Record<string, number>>((acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    }, {});

    const typesSummary = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t}×${c}`)
      .join(', ');

    return [lc.name, String(lc.loads.length), typesSummary || '—'];
  });

  autoTable(doc, {
    startY: cursorY + 4,
    theme: 'grid',
    styles: { fontSize: 9 },
    head: [['Load Case', '# Loads', 'Types']],
    body: loadCaseRows.length ? loadCaseRows : [['—', '0', '—']],
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? (cursorY + 20);
  cursorY += 8;

  // -------------------------------------------------------------------------
  // SECTION 3: REACTION SUMMARY TABLE
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Reaction Summary', margin, cursorY);

  const reactionRows: Array<(string | number)[]> = [];
  if (solverResult) {
    const entries = Array.from(solverResult.nodalReactions.entries())
      .map(([nodeId, r]) => ({
        nodeId,
        ...r,
        mag: Math.sqrt(r.fx * r.fx + r.fy * r.fy + r.fz * r.fz),
      }))
      .sort((a, b) => b.mag - a.mag);

    for (const r of entries) {
      reactionRows.push([
        `Node ${r.nodeId}`,
        safeNumber(r.fx),
        safeNumber(r.fy),
        safeNumber(r.fz),
        safeNumber(r.mx),
        safeNumber(r.my),
        safeNumber(r.mz),
      ]);
    }
  }

  autoTable(doc, {
    startY: cursorY + 4,
    theme: 'grid',
    styles: { fontSize: 9 },
    head: [['Node', 'Fx (kN)', 'Fy (kN)', 'Fz (kN)', 'Mx (kN·m)', 'My (kN·m)', 'Mz (kN·m)']],
    body: reactionRows.length ? reactionRows : [['—', '—', '—', '—', '—', '—', '—']],
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? (cursorY + 20);
  cursorY += 8;

  // -------------------------------------------------------------------------
  // SECTION 4: MEMBER END FORCES TABLE
  // -------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Member End Forces (Local Axes)', margin, cursorY);

  const memberForceRows: Array<(string | number)[]> = [];
  const analysisResults = model.analysisResults;
  if (analysisResults && analysisResults.memberEndForces.size > 0) {
    for (const m of members) {
      const ef = analysisResults.memberEndForces.get(m.id);
      if (ef) {
        memberForceRows.push([
          m.id,
          safeNumber(ef.Nx_i),
          safeNumber(ef.Vy_i),
          safeNumber(ef.Mz_i),
          safeNumber(ef.Nx_j),
          safeNumber(ef.Vy_j),
          safeNumber(ef.Mz_j),
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: cursorY + 4,
    theme: 'grid',
    styles: { fontSize: 8 },
    head: [['Member', 'N_i (kN)', 'Vy_i (kN)', 'Mz_i (kN·m)', 'N_j (kN)', 'Vy_j (kN)', 'Mz_j (kN·m)']],
    body: memberForceRows.length ? memberForceRows : [['—', '—', '—', '—', '—', '—', '—']],
    margin: { left: margin, right: margin },
  });

  return doc;
}

/**
 * Convenience helper: generate and immediately download the report.
 */
export function generateAndSaveReport(options: ReportOptions): void {
  const doc = generateReport(options);
  const filename = options.filename ?? `${options.projectName.replace(/\s+/g, '_')}_report.pdf`;
  doc.save(filename);
}

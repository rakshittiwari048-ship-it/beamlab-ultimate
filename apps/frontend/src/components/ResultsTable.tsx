import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';
import { useModelStore } from '../store/model';
import { useSelectionStore } from '../store/selection';

// ============================================================================
// TYPES
// ============================================================================

interface DisplacementRow {
  nodeId: string;
  dx: number;
  dy: number;
  dz: number;
  rx: number;
  ry: number;
  rz: number;
  magnitude: number;
}

interface ReactionRow {
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
  magnitude: number;
}

interface BeamForceRow {
  memberId: string;
  startNode: string;
  endNode: string;
  axialStart: number;
  axialEnd: number;
  shearYStart: number;
  shearYEnd: number;
  momentZStart: number;
  momentZEnd: number;
}

type TabType = 'displacements' | 'reactions' | 'beamForces';

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (v: number, decimals = 3) => v.toFixed(decimals);

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        return typeof val === 'number' ? fmt(val, 6) : String(val);
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const displacementColumnHelper = createColumnHelper<DisplacementRow>();
const displacementColumns: ColumnDef<DisplacementRow, any>[] = [
  displacementColumnHelper.accessor('nodeId', {
    header: 'Node',
    cell: (info) => <span className="font-semibold text-blue-300">Node {info.getValue()}</span>,
  }),
  displacementColumnHelper.accessor('dx', {
    header: 'dx (mm)',
    cell: (info) => <span className="font-mono text-green-300">{fmt(info.getValue() * 1000)}</span>,
  }),
  displacementColumnHelper.accessor('dy', {
    header: 'dy (mm)',
    cell: (info) => <span className="font-mono text-green-300">{fmt(info.getValue() * 1000)}</span>,
  }),
  displacementColumnHelper.accessor('dz', {
    header: 'dz (mm)',
    cell: (info) => <span className="font-mono text-green-300">{fmt(info.getValue() * 1000)}</span>,
  }),
  displacementColumnHelper.accessor('rx', {
    header: 'rx (rad)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue(), 5)}</span>,
  }),
  displacementColumnHelper.accessor('ry', {
    header: 'ry (rad)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue(), 5)}</span>,
  }),
  displacementColumnHelper.accessor('rz', {
    header: 'rz (rad)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue(), 5)}</span>,
  }),
  displacementColumnHelper.accessor('magnitude', {
    header: '|u| (mm)',
    cell: (info) => <span className="font-mono text-yellow-300 font-semibold">{fmt(info.getValue() * 1000)}</span>,
  }),
];

const reactionColumnHelper = createColumnHelper<ReactionRow>();
const reactionColumns: ColumnDef<ReactionRow, any>[] = [
  reactionColumnHelper.accessor('nodeId', {
    header: 'Node',
    cell: (info) => <span className="font-semibold text-orange-300">Node {info.getValue()}</span>,
  }),
  reactionColumnHelper.accessor('fx', {
    header: 'Fx (kN)',
    cell: (info) => <span className="font-mono text-red-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('fy', {
    header: 'Fy (kN)',
    cell: (info) => <span className="font-mono text-red-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('fz', {
    header: 'Fz (kN)',
    cell: (info) => <span className="font-mono text-red-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('mx', {
    header: 'Mx (kN·m)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('my', {
    header: 'My (kN·m)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('mz', {
    header: 'Mz (kN·m)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue())}</span>,
  }),
  reactionColumnHelper.accessor('magnitude', {
    header: '|R| (kN)',
    cell: (info) => <span className="font-mono text-yellow-300 font-semibold">{fmt(info.getValue())}</span>,
  }),
];

const beamForceColumnHelper = createColumnHelper<BeamForceRow>();
const beamForceColumns: ColumnDef<BeamForceRow, any>[] = [
  beamForceColumnHelper.accessor('memberId', {
    header: 'Member',
    cell: (info) => <span className="font-semibold text-cyan-300">{info.getValue()}</span>,
  }),
  beamForceColumnHelper.accessor('startNode', {
    header: 'Start',
    cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
  }),
  beamForceColumnHelper.accessor('endNode', {
    header: 'End',
    cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
  }),
  beamForceColumnHelper.accessor('axialStart', {
    header: 'N_i (kN)',
    cell: (info) => <span className="font-mono text-green-300">{fmt(info.getValue())}</span>,
  }),
  beamForceColumnHelper.accessor('axialEnd', {
    header: 'N_j (kN)',
    cell: (info) => <span className="font-mono text-green-300">{fmt(info.getValue())}</span>,
  }),
  beamForceColumnHelper.accessor('shearYStart', {
    header: 'Vy_i (kN)',
    cell: (info) => <span className="font-mono text-red-300">{fmt(info.getValue())}</span>,
  }),
  beamForceColumnHelper.accessor('shearYEnd', {
    header: 'Vy_j (kN)',
    cell: (info) => <span className="font-mono text-red-300">{fmt(info.getValue())}</span>,
  }),
  beamForceColumnHelper.accessor('momentZStart', {
    header: 'Mz_i (kN·m)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue())}</span>,
  }),
  beamForceColumnHelper.accessor('momentZEnd', {
    header: 'Mz_j (kN·m)',
    cell: (info) => <span className="font-mono text-purple-300">{fmt(info.getValue())}</span>,
  }),
];

// ============================================================================
// GENERIC TABLE COMPONENT
// ============================================================================

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  filename: string;
}

function DataTable<T>({
  data,
  columns,
  onRowClick,
  filename,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Export button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => downloadCSV(data as Record<string, unknown>[], filename)}
          className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
          disabled={data.length === 0}
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-700 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-800 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-left text-gray-300 font-semibold cursor-pointer hover:bg-gray-700 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="w-3 h-3" />,
                        desc: <ChevronDown className="w-3 h-3" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-4 text-center text-gray-500">
                  No data available. Run analysis first.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-gray-800 hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// RESULTS TABLE COMPONENT
// ============================================================================

export const ResultsTable = () => {
  const [activeTab, setActiveTab] = useState<TabType>('displacements');
  const solverResult = useModelStore((s) => s.solverResult);
  const members = useModelStore((s) => s.getAllMembers());
  const analysisResults = useModelStore((s) => s.analysisResults);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const selectMember = useSelectionStore((s) => s.selectMember);

  // Transform solver results to table rows
  const displacementData = useMemo<DisplacementRow[]>(() => {
    if (!solverResult) return [];
    return Array.from(solverResult.nodalDisplacements.entries())
      .map(([nodeId, d]) => ({
        nodeId,
        dx: d.dx,
        dy: d.dy,
        dz: d.dz,
        rx: d.rx,
        ry: d.ry,
        rz: d.rz,
        magnitude: Math.sqrt(d.dx ** 2 + d.dy ** 2 + d.dz ** 2),
      }))
      .filter((r) => r.magnitude > 1e-12);
  }, [solverResult]);

  const reactionData = useMemo<ReactionRow[]>(() => {
    if (!solverResult) return [];
    return Array.from(solverResult.nodalReactions.entries()).map(([nodeId, r]) => ({
      nodeId,
      fx: r.fx,
      fy: r.fy,
      fz: r.fz,
      mx: r.mx,
      my: r.my,
      mz: r.mz,
      magnitude: Math.sqrt(r.fx ** 2 + r.fy ** 2 + r.fz ** 2),
    }));
  }, [solverResult]);

  const beamForceData = useMemo<BeamForceRow[]>(() => {
    return members.map((m) => {
      const ef = analysisResults?.memberEndForces.get(m.id);
      return {
        memberId: m.id,
        startNode: m.startNodeId,
        endNode: m.endNodeId,
        axialStart: ef?.Nx_i ?? 0,
        axialEnd: ef?.Nx_j ?? 0,
        shearYStart: ef?.Vy_i ?? 0,
        shearYEnd: ef?.Vy_j ?? 0,
        momentZStart: ef?.Mz_i ?? 0,
        momentZEnd: ef?.Mz_j ?? 0,
      } as BeamForceRow;
    });
  }, [members, analysisResults]);

  const handleDisplacementRowClick = useCallback(
    (row: DisplacementRow) => {
      selectNode(row.nodeId, false);
    },
    [selectNode]
  );

  const handleReactionRowClick = useCallback(
    (row: ReactionRow) => {
      selectNode(row.nodeId, false);
    },
    [selectNode]
  );

  const handleBeamForceRowClick = useCallback(
    (row: BeamForceRow) => {
      selectMember(row.memberId, false);
    },
    [selectMember]
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'displacements', label: 'Node Displacements' },
    { key: 'reactions', label: 'Reactions' },
    { key: 'beamForces', label: 'Beam Forces' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 rounded-lg border border-gray-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table content */}
      <div className="flex-1 p-3 overflow-hidden">
        {activeTab === 'displacements' && (
          <DataTable
            data={displacementData}
            columns={displacementColumns}
            onRowClick={handleDisplacementRowClick}
            filename="node_displacements.csv"
          />
        )}
        {activeTab === 'reactions' && (
          <DataTable
            data={reactionData}
            columns={reactionColumns}
            onRowClick={handleReactionRowClick}
            filename="support_reactions.csv"
          />
        )}
        {activeTab === 'beamForces' && (
          <DataTable
            data={beamForceData}
            columns={beamForceColumns}
            onRowClick={handleBeamForceRowClick}
            filename="beam_forces.csv"
          />
        )}
      </div>
    </div>
  );
};

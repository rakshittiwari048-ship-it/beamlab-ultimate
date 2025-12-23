// @ts-nocheck
/**
 * data-table.tsx
 *
 * High-Performance Virtualized Data Table for Engineering Data
 * - Built with @tanstack/react-table and @tanstack/react-virtual
 * - Supports 10,000+ rows without performance degradation
 * - Features: Sticky header, bordered cells, striped rows, sorting, selection
 */

import {
  useRef,
  useMemo,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DataTableProps<TData> {
  /** Table data array */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData, any>[];
  /** Optional row key accessor */
  getRowId?: (row: TData) => string;
  /** Enable row selection */
  enableSelection?: boolean;
  /** Selection state (controlled) */
  rowSelection?: RowSelectionState;
  /** Selection change handler */
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** Enable sorting */
  enableSorting?: boolean;
  /** Initial sorting state */
  initialSorting?: SortingState;
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  /** Row double-click handler */
  onRowDoubleClick?: (row: TData) => void;
  /** Custom row class name */
  rowClassName?: (row: TData) => string;
  /** Table height (required for virtualization) */
  height?: number | string;
  /** Estimated row height for virtualization */
  estimateRowHeight?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/** Sort indicator icon */
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | false }) => {
  if (direction === 'asc') return <ArrowUp className="w-3 h-3" />;
  if (direction === 'desc') return <ArrowDown className="w-3 h-3" />;
  return <ArrowUpDown className="w-3 h-3 opacity-30" />;
};

/** Loading skeleton row */
const SkeletonRow = ({ columns }: { columns: number }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-3 py-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </td>
    ))}
  </tr>
);

// ============================================================================
// DATA TABLE COMPONENT
// ============================================================================

/**
 * High-performance virtualized DataTable component.
 * Handles 10,000+ rows with smooth scrolling via @tanstack/react-virtual.
 *
 * Features:
 * - Sticky header with z-10
 * - Bordered cells
 * - Striped rows (even:bg-zinc-50)
 * - Column sorting
 * - Row selection
 * - Virtual scrolling
 */
export function DataTable<TData>({
  data,
  columns,
  getRowId,
  enableSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  enableSorting = true,
  initialSorting = [],
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  height = 400,
  estimateRowHeight = 36,
  emptyMessage = 'No data available',
  isLoading = false,
  className,
}: DataTableProps<TData>) {
  // ─────────────────────────────────────────────────────────────────────────
  // Table State
  // ─────────────────────────────────────────────────────────────────────────

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  // ─────────────────────────────────────────────────────────────────────────
  // Table Instance
  // ─────────────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange as any,
    enableRowSelection: enableSelection,
    enableSorting,
  });

  const { rows } = table.getRowModel();

  // ─────────────────────────────────────────────────────────────────────────
  // Virtualization
  // ─────────────────────────────────────────────────────────────────────────

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => estimateRowHeight,
    getScrollElement: () => tableContainerRef.current,
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Padding for virtual scroll positioning
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleRowClick = useCallback(
    (row: Row<TData>) => {
      onRowClick?.(row.original);
    },
    [onRowClick]
  );

  const handleRowDoubleClick = useCallback(
    (row: Row<TData>) => {
      onRowDoubleClick?.(row.original);
    },
    [onRowDoubleClick]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={tableContainerRef}
      className={clsx(
        'overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-lg',
        'bg-white dark:bg-zinc-900',
        className
      )}
      style={{ height }}
    >
      <table className="w-full text-sm border-collapse">
        {/* ─────────────────────────────────────────────────────────────────
            Sticky Header
        ───────────────────────────────────────────────────────────────── */}
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 shadow-[0_1px_0_0] shadow-zinc-200 dark:shadow-zinc-700">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-3 py-2 text-left text-xs font-semibold tracking-tight',
                      'text-zinc-600 dark:text-zinc-400',
                      'border-r border-zinc-100 dark:border-zinc-800 last:border-r-0',
                      'bg-zinc-50 dark:bg-zinc-800/50',
                      canSort && 'cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                    style={{ width: header.getSize() }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon direction={sortDirection} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* ─────────────────────────────────────────────────────────────────
            Body with Virtual Scrolling
        ───────────────────────────────────────────────────────────────── */}
        <tbody>
          {/* Loading State */}
          {isLoading && (
            <>
              <SkeletonRow columns={columns.length} />
              <SkeletonRow columns={columns.length} />
              <SkeletonRow columns={columns.length} />
            </>
          )}

          {/* Empty State */}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}

          {/* Virtual Padding Top */}
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} />
            </tr>
          )}

          {/* Virtual Rows */}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isSelected = row.getIsSelected();

            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={(node) => rowVirtualizer.measureElement(node)}
                className={clsx(
                  // Base styles
                  'transition-colors',
                  // Striped rows
                  virtualRow.index % 2 === 0
                    ? 'bg-white dark:bg-zinc-900'
                    : 'bg-zinc-50/50 dark:bg-zinc-800/30',
                  // Hover state
                  'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                  // Selected state
                  isSelected && 'bg-blue-100 dark:bg-blue-900/40',
                  // Clickable
                  (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                  // Custom class
                  rowClassName?.(row.original)
                )}
                onClick={() => handleRowClick(row)}
                onDoubleClick={() => handleRowDoubleClick(row)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={clsx(
                      'px-3 py-2 text-sm',
                      'text-zinc-900 dark:text-zinc-100',
                      'border-r border-zinc-100 dark:border-zinc-800 last:border-r-0',
                      'truncate'
                    )}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Virtual Padding Bottom */}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// HELPER: COLUMN DEFINITIONS
// ============================================================================

import React from 'react';

/**
 * Helper to create a text column with common styling.
 */
export function createTextColumn<TData>(
  accessorKey: keyof TData & string,
  header: string,
  options?: {
    size?: number;
    cell?: (value: any) => ReactNode;
    enableSorting?: boolean;
  }
): ColumnDef<TData> {
  return {
    accessorKey,
    header,
    size: options?.size ?? 150,
    enableSorting: options?.enableSorting ?? true,
    cell: options?.cell
      ? ({ getValue }) => options.cell!(getValue())
      : undefined,
  };
}

/**
 * Helper to create a numeric column with mono font and right alignment.
 */
export function createNumericColumn<TData>(
  accessorKey: keyof TData & string,
  header: string,
  options?: {
    size?: number;
    precision?: number;
    unit?: string;
    enableSorting?: boolean;
  }
): ColumnDef<TData> {
  const precision = options?.precision ?? 3;
  const unit = options?.unit;

  return {
    accessorKey,
    header,
    size: options?.size ?? 100,
    enableSorting: options?.enableSorting ?? true,
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return (
        <span className="font-mono text-right block">
          {typeof value === 'number' ? value.toFixed(precision) : value}
          {unit && <span className="ml-1 text-zinc-400 text-xs">{unit}</span>}
        </span>
      );
    },
  };
}

/**
 * Helper to create a checkbox selection column.
 */
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    size: 40,
    enableSorting: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        ref={(ref) => {
          if (ref) {
            ref.indeterminate = table.getIsSomeRowsSelected();
          }
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
      />
    ),
  };
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
import { DataTable, createTextColumn, createNumericColumn, createSelectionColumn } from './data-table';

interface Node {
  id: number;
  x: number;
  y: number;
  z: number;
  restraint: string;
}

const columns = [
  createSelectionColumn<Node>(),
  createTextColumn<Node>('id', 'ID', { size: 60 }),
  createNumericColumn<Node>('x', 'X (m)', { precision: 3 }),
  createNumericColumn<Node>('y', 'Y (m)', { precision: 3 }),
  createNumericColumn<Node>('z', 'Z (m)', { precision: 3 }),
  createTextColumn<Node>('restraint', 'Restraint'),
];

function NodesTable() {
  const nodes = useNodesStore((s) => s.nodes);
  const [selection, setSelection] = useState<RowSelectionState>({});

  return (
    <DataTable
      data={nodes}
      columns={columns}
      getRowId={(row) => String(row.id)}
      enableSelection
      rowSelection={selection}
      onRowSelectionChange={setSelection}
      height={400}
      onRowClick={(node) => console.log('Clicked:', node)}
    />
  );
}
*/

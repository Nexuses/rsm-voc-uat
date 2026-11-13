"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import styles from "./dashboard.module.css";

export type CompactTableColumnMeta = {
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
};

type CompactDataTableProps<T> = {
  ariaLabel: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId: (row: T) => string;
  emptyState?: React.ReactNode;
  minWidth?: number;
  maxHeight?: number | "none";
};

export default function CompactDataTable<T>({
  ariaLabel,
  columns,
  data,
  getRowId,
  emptyState,
  minWidth = 1120,
  maxHeight = 480,
}: CompactDataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div
      className={styles.tableWrap}
      style={{
        maxHeight: maxHeight === "none" ? undefined : maxHeight,
      }}
    >
      <table
        aria-label={ariaLabel}
        className={styles.compactTable}
        style={minWidth > 0 ? { minWidth } : undefined}
      >
        <colgroup>
          {table.getAllLeafColumns().map((column) => {
            const meta = column.columnDef.meta as CompactTableColumnMeta | undefined;
            return (
              <col
                key={column.id}
                style={meta?.width ? { width: meta.width } : undefined}
              />
            );
          })}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | CompactTableColumnMeta
                  | undefined;
                return (
                  <th key={header.id} className={meta?.headerClassName}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | CompactTableColumnMeta
                    | undefined;
                  return (
                    <td key={cell.id} className={meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : emptyState ? (
            <tr className={styles.tableEmptyRow}>
              <td colSpan={columnCount}>{emptyState}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import type * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";
import { formatPracticeType, formatProgress } from "@/lib/practice";
import { cn } from "@/lib/utils";

export type MyPracticeExam = {
  id: Id<"practiceExams">;
  examName: string;
  examYear: number | null;
  examMonth: number | null;
  progress: "not_started" | "in_progress" | "completed";
  scoreCorrect: number;
  questionCount: number;
  type: "multipleChoice";
  actionKind: "start" | "continue" | "retry";
  allowRetries: boolean;
  repeatIncorrectQuestionsLater: boolean;
  questionSelectionMode: string;
};

type MyPracticeExamRow = MyPracticeExam & {
  examLabel: string;
  progressLabel: string;
  typeLabel: string;
  scorePercentage: number;
};

function formatExamLabel(
  name: string,
  year: number | null,
  month: number | null,
) {
  if (year === null || month === null) {
    return name;
  }

  return `${name} (${year}-${String(month).padStart(2, "0")})`;
}

function DataTableFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <option value="">Alle</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MyPracticeExamsDataTable({
  practiceExams,
  renderAction,
}: {
  practiceExams: MyPracticeExam[];
  renderAction: (practiceExam: MyPracticeExam) => React.ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [progressFilter, setProgressFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const rows: MyPracticeExamRow[] = practiceExams.map((practiceExam) => ({
    ...practiceExam,
    examLabel: formatExamLabel(
      practiceExam.examName,
      practiceExam.examYear,
      practiceExam.examMonth,
    ),
    progressLabel: formatProgress(practiceExam.progress),
    typeLabel: formatPracticeType(practiceExam.type),
    scorePercentage:
      practiceExam.questionCount === 0
        ? 0
        : practiceExam.scoreCorrect / practiceExam.questionCount,
  }));

  const progressOptions = Array.from(
    new Set(rows.map((row) => row.progressLabel)),
  );
  const typeOptions = Array.from(new Set(rows.map((row) => row.typeLabel)));

  const columns: ColumnDef<MyPracticeExamRow>[] = [
    {
      accessorKey: "examLabel",
      header: "Examen",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.examLabel}</span>
      ),
    },
    {
      accessorKey: "progressLabel",
      header: "Voortgang",
    },
    {
      accessorKey: "scorePercentage",
      enableSorting: true,
      sortingFn: "basic",
      header: ({ column }) => (
        <button
          type="button"
          className="-ml-2"
          onClick={column.getToggleSortingHandler()}
        >
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium hover:bg-muted">
            Score
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="size-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="size-4" />
            ) : (
              <ArrowUpDown className="size-4" />
            )}
          </span>
        </button>
      ),
      cell: ({ row }) => (
        <span>
          {row.original.scoreCorrect} / {row.original.questionCount}
        </span>
      ),
    },
    {
      accessorKey: "typeLabel",
      header: "Type",
    },
    {
      id: "action",
      header: () => <div className="text-right">Actie</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">{renderAction(row.original)}</div>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnFilters: [
        {
          id: "progressLabel",
          value: progressFilter,
        },
        {
          id: "typeLabel",
          value: typeFilter,
        },
      ],
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Mijn oefentoetsen</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DataTableFilter
            label="Voortgang"
            value={progressFilter}
            options={progressOptions}
            onChange={(value) => {
              setProgressFilter(value);
              table.setPageIndex(0);
            }}
          />
          <DataTableFilter
            label="Type"
            value={typeFilter}
            options={typeOptions}
            onChange={(value) => {
              setTypeFilter(value);
              table.setPageIndex(0);
            }}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                Geen oefentoetsen gevonden met de huidige filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Pagina {table.getState().pagination.pageIndex + 1} van{" "}
          {Math.max(table.getPageCount(), 1)}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Vorige
          </Button>
          <Button
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Volgende
          </Button>
        </div>
      </div>
    </section>
  );
}

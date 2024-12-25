"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Student from "@/types/student";
import StudentApi from "@/types/studentApi";
import { useSession } from "next-auth/react";
import PaginationApi from "./PaginationApi";
import { Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";

export function StudentTable({
  selectedStudents,
  setSelectedStudents,
}: {
  selectedStudents: Student[];
  setSelectedStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}) {
  const t = useTranslations("StudentTable");
  const tName = useTranslations("names");
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>("");
  const { data } = useApiQuery<StudentApi>(
    `student/list?page=${page}&name=${search}`,
    ["students", page, search]
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const { data: selectedStudentsData } = useQuery<{ studentList: Student[] }>({
    queryKey: ["selectedStudents", rowSelection],
    queryFn: async () => {
      const studentIds = Object.keys(rowSelection).map((e) => Number(e));
      if (studentIds.length === 0) {
        return { studentList: [] };
      }
      const data = { studentIds };
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/student/ids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      return response.json();
    },
    enabled: !!session,
  });

  useEffect(() => {
    if (!selectedStudentsData) return;
    setSelectedStudents(selectedStudentsData.studentList);
  }, [selectedStudentsData, setSelectedStudents]);

  const columns: ColumnDef<Student>[] = [
    {
      id: "selectStudent",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => (
        <div className="capitalize">
          {tName("name", { ...row?.original, parents: "" })}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <div className="text-left">{t("email")}</div>,
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "student_number",
      header: () => <div className="text-left">{t("studentId")}</div>,
      cell: ({ row }) => {
        return (
          <div className="text-left font-medium">
            {row.getValue("student_number")}
          </div>
        );
      },
    },
    {
      accessorKey: "phone_number",
      header: t("phoneNumber"),
      cell: ({ row }) => (
        <div className="text-left">{row.getValue("phone_number")}</div>
      ),
    },
  ];

  const table = useReactTable({
    data: React.useMemo(() => data?.students ?? [], [data]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
    },
  });

  useEffect(() => {
    table.getRowModel().rows.forEach((row) => {
      if (selectedStudents.find((student) => student.id === row.original.id)) {
        row.toggleSelected(true);
      } else {
        row.toggleSelected(false);
      }
    });
  }, [selectedStudents, table]);

  function handleDeleteStudent(student: Student) {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== student.id));
  }

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedStudents.map((student) => (
            <Badge
              key={student.id}
              className="cursor-pointer"
              onClick={() => handleDeleteStudent(student)}
            >
              {tName("name", { ...student, parents: "" })}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
      </div>
      <div className="rounded-md border dark:bg-black">
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
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!data ? (
              <SkeletonLoader rowCount={5} columnCount={columns.length} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {t("rowsSelected", {
            count: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </div>
        <div className="space-x-2">
          <PaginationApi data={data?.pagination ?? null} setPage={setPage} />
        </div>
      </div>
    </div>
  );
}

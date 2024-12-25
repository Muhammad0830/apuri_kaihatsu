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
import Parent from "@/types/parent";
import ParentApi from "@/types/parentApi";
import { useSession } from "next-auth/react";
import PaginationApi from "./PaginationApi";
import { Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";

export function ParentTable({
  selectedParents,
  setSelectedParents,
}: {
  selectedParents: Parent[];
  setSelectedParents: React.Dispatch<React.SetStateAction<Parent[]>>;
}) {
  const t = useTranslations("ParentTable");
  const tName = useTranslations("names");
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>("");
  const [rowSelection, setRowSelection] = React.useState({});
  const { data, isLoading } = useApiQuery<ParentApi>(
    `parent/list?page=${page}&name=${search}`,
    ["parents", page, search]
  );
  const { data: selectedParentsData } = useQuery<{ parents: Parent[] }>({
    queryKey: ["selectedParents", rowSelection],
    queryFn: async () => {
      const parentIds = Object.keys(rowSelection).map((e) => Number(e));
      const data = { parentIds };
      if (parentIds.length === 0) {
        return { parents: [] };
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/parent/ids`,
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
        setSelectedParents(data.error);
      }
      return response.json();
    },
    enabled: !!session,
  });

  useEffect(() => {
    if (selectedParentsData) {
      setSelectedParents(selectedParentsData.parents);
    }
  }, [selectedParentsData, setSelectedParents]);

  const columns: ColumnDef<Parent>[] = [
    {
      id: "selectParent",
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
        <div className="capitalize">{tName("name", { ...row?.original })}</div>
      ),
    },
    {
      accessorKey: "email",
      header: t("email"),
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
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
    data: React.useMemo(() => data?.parents ?? [], [data]),
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
      if (selectedParents.find((parent) => parent.id === row.original.id)) {
        row.toggleSelected(true);
      } else {
        row.toggleSelected(false);
      }
    });
  }, [selectedParents, table]);

  function handleDeleteParent(parent: Parent) {
    setSelectedParents((prev) => prev.filter((s) => s.id !== parent.id));
  }

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedParents.map((parent) => (
            <Badge
              key={parent.id}
              className="cursor-pointer"
              onClick={() => handleDeleteParent(parent)}
            >
              {tName("name", { ...parent })}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
            {isLoading ? (
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

      <div className="flex items-center justify-end space-x-2">
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

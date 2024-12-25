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
import Group from "@/types/group";
import { useSession } from "next-auth/react";
import GroupApi from "@/types/groupApi";
import PaginationApi from "./PaginationApi";
import { Badge } from "./ui/badge";
import { Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SkeletonLoader } from "./TableApi";
import useApiQuery from "@/lib/useApiQuery";

export function GroupTable({
  selectedGroups,
  setSelectedGroups,
}: {
  selectedGroups: Group[];
  setSelectedGroups: React.Dispatch<React.SetStateAction<Group[]>>;
}) {
  const t = useTranslations("GroupTable");
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const { data } = useApiQuery<GroupApi>(
    `group/list?page=${page}&name=${searchName}`,
    ["groups", page, searchName]
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const { data: selectedGroupData } = useQuery<{ groupList: Group[] }>({
    queryKey: ["selectedGroups", rowSelection],
    queryFn: async () => {
      const groupIds = Object.keys(rowSelection).map((e) => Number(e));
      if (groupIds.length === 0) {
        return { groupList: [] };
      }
      const data = { groupIds };
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/group/ids`,
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
    enabled: !!session?.sessionToken,
  });

  useEffect(() => {
    if (selectedGroupData) {
      setSelectedGroups(selectedGroupData.groupList);
    }
  }, [selectedGroupData, setSelectedGroups]);

  const columns: ColumnDef<Group>[] = [
    {
      id: "select",
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
      header: t("groupName"),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "member_count",
      header: ({ column }) => (
        <div className="capitalize">{t("studentCount")}</div>
      ),
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("member_count")}</div>
      ),
    },
  ];

  const table = useReactTable({
    data: React.useMemo(() => data?.groups ?? [], [data]),
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
      if (selectedGroups.find((group) => group.id === row.original.id)) {
        row.toggleSelected(true);
      } else {
        row.toggleSelected(false);
      }
    });
  }, [selectedGroups, table]);

  function handleDeleteGroup(group: Group) {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== group.id));
  }

  return (
    <div className="w-full space-y-4 mt-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-start content-start">
          {selectedGroups.map((group) => (
            <Badge
              key={group.id}
              className="cursor-pointer"
              onClick={() => handleDeleteGroup(group)}
            >
              {group?.name}
              <Trash2 className="h-4" />
            </Badge>
          ))}
        </div>
        <div className="flex items-center">
          <Input
            placeholder={t("filter")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchName(e.target.value);
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
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!data ? (
              <SkeletonLoader columnCount={columns.length} rowCount={5} />
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

import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import pagination from "@/types/pagination";

const PaginationApi = ({
  data,
  setPage,
}: {
  data: pagination | null;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) => {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setPage(Number(data?.prev_page))}
            className="dark:bg-black cursor-pointer" 
          />
        </PaginationItem>
        {data &&
          data?.links.map((page, index) =>
            page === "..." ? (
              <PaginationItem key={page + index}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page} >
                <PaginationLink
                  onClick={() => setPage(+page)}
                  isActive={page === data?.current_page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}
        <PaginationItem >
          <PaginationNext
            onClick={() => {
              setPage(Number(data?.next_page));
            }}
            className="dark:bg-black cursor-pointer"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationApi;

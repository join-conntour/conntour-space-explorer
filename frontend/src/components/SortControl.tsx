import React from "react";
import { useExplorer } from "../context/ExplorerContext";
import type { SortKey } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export const SortControl: React.FC = () => {
  const { sort, setSort, submittedQuery } = useExplorer();

  return (
    <Select
      value={sort}
      onValueChange={(value) => setSort(value as SortKey)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="most_recent">Most Recent</SelectItem>
        <SelectItem value="most_viewed">Most Viewed</SelectItem>
        <SelectItem value="highest_confidence" disabled={!submittedQuery}>
          Highest Confidence
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

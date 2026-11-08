import React from "react";
import { Search, X } from "lucide-react";
import { useExplorer } from "../context/ExplorerContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const SearchBar: React.FC = () => {
  const { query, setQuery, submitSearch, clearSearch, submittedQuery } = useExplorer();

  return (
    <form
      className="flex w-full max-w-2xl items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!query.trim()) {
          clearSearch();
          return;
        }
        void submitSearch();
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search NASA images, e.g. "mars rover" or "astronaut"'
          className="pl-9 pr-9"
        />
        {(query || submittedQuery) && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
};

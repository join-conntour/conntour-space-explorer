import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useExplorer } from "../context/ExplorerContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

interface FilterSidebarProps {
  showHeading?: boolean;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ showHeading = true }) => {
  const {
    facets,
    filters,
    toggleCenter,
    toggleKeyword,
    toggleObjectTag,
    setDateRange,
    clearFilters,
  } = useExplorer();
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);

  const selectedRange: DateRange | undefined = useMemo(() => {
    if (!filters.dateFrom && !filters.dateTo) return undefined;
    return {
      from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
      to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
    };
  }, [filters.dateFrom, filters.dateTo]);

  const hasFilters =
    filters.centers.length > 0 ||
    filters.keywords.length > 0 ||
    filters.objectTags.length > 0 ||
    Boolean(filters.dateFrom || filters.dateTo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {showHeading ? (
          <h2 className="text-lg font-semibold">Filters</h2>
        ) : (
          <span className="sr-only">Filters</span>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {(filters.centers.length > 0 ||
        filters.keywords.length > 0 ||
        filters.objectTags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {filters.centers.map((center) => (
            <Badge key={`c-${center}`} variant="secondary" className="gap-1">
              {center}
              <button type="button" onClick={() => toggleCenter(center)} aria-label={`Remove ${center}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.objectTags.map((tag) => (
            <Badge key={`t-${tag}`} variant="default" className="gap-1">
              {tag}
              <button type="button" onClick={() => toggleObjectTag(tag)} aria-label={`Remove ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.keywords.map((keyword) => (
            <Badge key={`k-${keyword}`} variant="outline" className="gap-1">
              {keyword}
              <button type="button" onClick={() => toggleKeyword(keyword)} aria-label={`Remove ${keyword}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium">NASA Center</h3>
        <ScrollArea className="h-40 pr-2">
          <div className="space-y-2">
            {(facets?.centers || []).map((facet) => (
              <label key={facet.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.centers.includes(facet.value)}
                  onCheckedChange={() => toggleCenter(facet.value)}
                />
                <span className="flex-1">{facet.value}</span>
                <span className="text-muted-foreground">{facet.count}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Detected Objects</h3>
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              Select object tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search object tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {(facets?.object_tags || []).map((facet) => (
                    <CommandItem
                      key={facet.value}
                      value={facet.value}
                      onSelect={() => toggleObjectTag(facet.value)}
                    >
                      <Checkbox
                        checked={filters.objectTags.includes(facet.value)}
                        className="mr-2"
                      />
                      <span className="flex-1">{facet.value}</span>
                      <span className="text-muted-foreground">{facet.count}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Keywords</h3>
        <Popover open={keywordOpen} onOpenChange={setKeywordOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              Select keywords
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search keywords..." />
              <CommandList>
                <CommandEmpty>No keywords found.</CommandEmpty>
                <CommandGroup>
                  {(facets?.keywords || []).slice(0, 120).map((facet) => (
                    <CommandItem
                      key={facet.value}
                      value={facet.value}
                      onSelect={() => toggleKeyword(facet.value)}
                    >
                      <Checkbox
                        checked={filters.keywords.includes(facet.value)}
                        className="mr-2"
                      />
                      <span className="flex-1 truncate">{facet.value}</span>
                      <span className="text-muted-foreground">{facet.count}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Date Range</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? (
                filters.dateTo ? (
                  <>
                    {format(parseISO(filters.dateFrom), "LLL dd, y")} -{" "}
                    {format(parseISO(filters.dateTo), "LLL dd, y")}
                  </>
                ) : (
                  format(parseISO(filters.dateFrom), "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={selectedRange}
              numberOfMonths={1}
              onSelect={(range) => {
                setDateRange(
                  range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
                  range?.to ? format(range.to, "yyyy-MM-dd") : undefined
                );
              }}
            />
          </PopoverContent>
        </Popover>
        {(filters.dateFrom || filters.dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined, undefined)}>
            Clear dates
          </Button>
        )}
      </div>
    </div>
  );
};

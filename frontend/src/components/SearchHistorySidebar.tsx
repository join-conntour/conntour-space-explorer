import React from "react";
import { History, Trash2 } from "lucide-react";
import { useExplorer } from "../context/ExplorerContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

interface SearchHistorySidebarProps {
  showHeading?: boolean;
}

export const SearchHistorySidebar: React.FC<SearchHistorySidebarProps> = ({
  showHeading = true,
}) => {
  const {
    history,
    loadHistory,
    restoreHistory,
    removeHistory,
    clearAllHistory,
    activeHistoryId,
  } = useExplorer();
  const totalPages = Math.max(1, Math.ceil(history.total / 10));
  const hasItems = history.items.length > 0;

  return (
    <div className="space-y-4">
      {showHeading ? (
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Search History</h2>
        </div>
      ) : (
        <span className="sr-only">Search History</span>
      )}

      {history.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : !hasItems ? (
        <p className="text-sm text-muted-foreground">No searches yet. Try “mars rover”.</p>
      ) : (
        <>
          <ScrollArea className="h-[62vh] pr-2">
            <div className="space-y-3">
              {history.items.map((item) => (
                <Card
                  key={item.id}
                  className={activeHistoryId === item.id ? "border-primary" : undefined}
                >
                  <CardHeader className="space-y-1 p-4 pb-2">
                    <CardTitle className="line-clamp-2 text-base font-medium leading-snug">
                      {item.query}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()} · {item.result_count} results
                    </p>
                  </CardHeader>
                  <CardFooter className="flex gap-2 p-4 pt-0">
                    <Button size="sm" variant="secondary" onClick={() => restoreHistory(item)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void removeHistory(item.id)}
                      aria-label="Delete search"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={history.page <= 1}
                onClick={() => void loadHistory(history.page - 1)}
              >
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                {history.page}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={history.page >= totalPages}
                onClick={() => void loadHistory(history.page + 1)}
              >
                Next
              </Button>
            </div>
          )}

          <Separator />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Clear history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear search history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all {history.total} saved{" "}
                  {history.total === 1 ? "search" : "searches"} from this device session. You cannot
                  undo this action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void clearAllHistory()}>
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

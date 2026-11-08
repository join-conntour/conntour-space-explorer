import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Filter, History, BarChart3 } from "lucide-react";
import { AddImageDialog } from "./AddImageDialog";
import { FilterSidebar } from "./FilterSidebar";
import { ImageDetailsModal } from "./ImageDetailsModal";
import { ImageGallery } from "./ImageGallery";
import { SearchBar } from "./SearchBar";
import { SearchHistorySidebar } from "./SearchHistorySidebar";
import { SortControl } from "./SortControl";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { TooltipProvider } from "./ui/tooltip";

export const ExplorerPage: React.FC = () => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef8_0%,_#f8fafc_42%,_#f1f5f9_100%)]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  NASA Space Explorer
                </h1>
                <p className="text-sm text-slate-500">
                  Search by meaning, filter by what the image shows
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <FilterSidebar showHeading={false} />
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="mr-2 h-4 w-4" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Search History</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <SearchHistorySidebar showHeading={false} />
                    </div>
                  </SheetContent>
                </Sheet>

                <AddImageDialog />
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <SearchBar />
              <SortControl />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <ImageGallery />
        </main>

        <ImageDetailsModal />
      </div>
    </TooltipProvider>
  );
};

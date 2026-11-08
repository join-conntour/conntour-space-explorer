import React, { useEffect, useRef } from "react";
import { CalendarDays, Eye, MapPin, Tag, User, Building2, Hash, Sparkles } from "lucide-react";
import { recordView, fetchSource } from "../api/client";
import { useExplorer } from "../context/ExplorerContext";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

function viewKeyFor(id: number): string {
  const storageKey = `view-key-${id}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(storageKey, created);
  return created;
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-foreground">{value}</p>
      </div>
    </div>
  );
}

export const ImageDetailsModal: React.FC = () => {
  const {
    selectedSource,
    selectedConfidence,
    closeSource,
    updateSelectedViewCount,
    openSource,
  } = useExplorer();
  const recordedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedSource) {
      recordedRef.current = null;
      return;
    }

    let cancelled = false;
    const sourceId = selectedSource.id;

    const hydrate = async () => {
      try {
        if (!selectedSource.description || selectedSource.object_tags.length === 0) {
          const full = await fetchSource(sourceId);
          if (!cancelled) {
            openSource(full, selectedConfidence);
          }
        }
      } catch {
        // Keep the snapshot payload if detail fetch fails.
      }

      if (recordedRef.current === sourceId) {
        return;
      }
      recordedRef.current = sourceId;
      try {
        const response = await recordView(sourceId, viewKeyFor(sourceId));
        if (!cancelled) {
          updateSelectedViewCount(response.view_count);
        }
      } catch {
        // Viewing still works without a successful counter update.
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [selectedSource?.id]);

  const imageSrc = selectedSource?.image_full_url || selectedSource?.image_url || "";
  const captureLabel = selectedSource?.creation_date
    ? new Date(selectedSource.creation_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : selectedSource?.launch_date || undefined;

  return (
    <Dialog open={Boolean(selectedSource)} onOpenChange={(open) => !open && closeSource()}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden border-0 p-0 sm:rounded-2xl">
        {selectedSource && (
          <div className="grid max-h-[92vh] md:grid-cols-[1.35fr_1fr]">
            <div className="relative min-h-[240px] bg-slate-950 md:min-h-[92vh]">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={selectedSource.name}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No image available
                </div>
              )}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {selectedSource.center && (
                  <Badge className="bg-white/90 text-slate-900 hover:bg-white">
                    {selectedSource.center}
                  </Badge>
                )}
                {typeof selectedConfidence === "number" && (
                  <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-500">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {selectedConfidence.toFixed(1)}% match
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[92vh]">
              <div className="space-y-6 p-6 md:p-8">
                <DialogHeader className="space-y-3 text-left">
                  <DialogTitle className="pr-8 text-2xl leading-tight tracking-tight">
                    {selectedSource.name}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      {selectedSource.view_count} views
                    </span>
                    {captureLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {captureLabel}
                      </span>
                    )}
                    {selectedSource.status && (
                      <Badge variant="outline">{selectedSource.status}</Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Overview
                  </h3>
                  <p className="text-sm leading-7 text-foreground/90">
                    {selectedSource.description || "No description provided."}
                  </p>
                  {selectedSource.description_508 && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {selectedSource.description_508}
                    </p>
                  )}
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Classifications
                  </h3>
                  {selectedSource.object_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSource.object_tags.map((tag) => (
                        <Badge key={tag} className="rounded-md px-2.5 py-1">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No object tags classified yet.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Keywords
                  </h3>
                  {(selectedSource.keywords_raw.length > 0 || selectedSource.keywords.length > 0) ? (
                    <div className="flex flex-wrap gap-2">
                      {(selectedSource.keywords_raw.length
                        ? selectedSource.keywords_raw
                        : selectedSource.keywords
                      ).map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="rounded-md">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No keywords on this record.</p>
                  )}
                </section>

                <Separator />

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Record
                  </h3>
                  <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                    <MetaRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="NASA center"
                      value={selectedSource.center}
                    />
                    <MetaRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="Location"
                      value={selectedSource.location}
                    />
                    <MetaRow
                      icon={<User className="h-4 w-4" />}
                      label="Photographer"
                      value={selectedSource.photographer}
                    />
                    <MetaRow
                      icon={<User className="h-4 w-4" />}
                      label="Secondary creator"
                      value={selectedSource.secondary_creator}
                    />
                    <MetaRow
                      icon={<Hash className="h-4 w-4" />}
                      label="NASA ID"
                      value={selectedSource.nasa_id}
                    />
                    {selectedSource.album.length > 0 && (
                      <div className="flex gap-3 text-sm">
                        <div className="mt-0.5 text-muted-foreground">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Album</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {selectedSource.album.map((entry) => (
                              <Badge key={entry} variant="outline">
                                {entry}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

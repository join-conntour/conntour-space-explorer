import React from "react";
import { Eye } from "lucide-react";
import type { SearchHit, Source } from "../types";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

interface ImageCardProps {
  source: Source;
  confidence?: number | null;
  onOpen: (source: Source, confidence?: number | null) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ source, confidence, onOpen }) => {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition hover:shadow-md"
      onClick={() => onOpen(source, confidence)}
    >
      {source.image_url ? (
        <img src={source.image_url} alt={source.name} className="h-44 w-full object-cover" />
      ) : (
        <div className="flex h-44 items-center justify-center bg-muted text-sm text-muted-foreground">
          No image
        </div>
      )}
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold">{source.name}</h3>
          {typeof confidence === "number" && (
            <Badge variant="success">{confidence.toFixed(1)}%</Badge>
          )}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{source.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {source.center && <Badge variant="outline">{source.center}</Badge>}
          {source.creation_date && (
            <span>{new Date(source.creation_date).toLocaleDateString()}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {source.view_count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export function confidenceForSource(hits: SearchHit[], sourceId: number): number | null {
  const hit = hits.find((item) => item.source.id === sourceId);
  return hit ? hit.confidence : null;
}

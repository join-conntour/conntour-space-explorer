import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { createSource, previewClassification } from "../api/client";
import { useExplorer } from "../context/ExplorerContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    if (!values.includes(next)) {
      onChange([...values, next]);
    }
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export const AddImageDialog: React.FC = () => {
  const { refreshCatalog, facets } = useExplorer();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [nasaId, setNasaId] = useState("");
  const [center, setCenter] = useState("");
  const [location, setLocation] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [objectTags, setObjectTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [visualTags, setVisualTags] = useState<string[]>([]);
  const [appearanceChoices, setAppearanceChoices] = useState<string[]>([]);
  const [novelCandidates, setNovelCandidates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const centers = useMemo(
    () => (facets?.centers || []).map((item) => item.value),
    [facets]
  );

  const pinTag = (tag: string) => {
    const next = tag.trim().toLowerCase();
    if (!next) return;
    setObjectTags((current) => (current.includes(next) ? current : [...current, next]));
  };

  useEffect(() => {
    if (open) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void previewClassification({
        name,
        description,
        nasa_id: nasaId || undefined,
        keywords,
        object_tags: objectTags,
      })
        .then((preview) => {
          setSuggestedTags(preview.object_tags);
          setVisualTags(preview.visual_tags);
          setAppearanceChoices(preview.appearance_tags || []);
          setNovelCandidates(preview.novel_candidates || []);
        })
        .catch(() => {
          setSuggestedTags([]);
          setVisualTags([]);
          setAppearanceChoices([]);
          setNovelCandidates([]);
        });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, name, description, nasaId, keywords, objectTags]);

  const reset = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setNasaId("");
    setCenter("");
    setLocation("");
    setKeywords([]);
    setObjectTags([]);
    setSuggestedTags([]);
    setVisualTags([]);
    setAppearanceChoices([]);
    setNovelCandidates([]);
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await createSource(
        {
          name,
          description,
          image_url: imageUrl,
          image_full_url: imageUrl,
          nasa_id: nasaId || undefined,
          center: center || undefined,
          location: location || undefined,
          keywords,
          object_tags: objectTags,
          launch_date: new Date().toISOString(),
        },
        idempotencyKey
      );
      if (result.status === "accepted" && !result.source) {
        setError("Ingest accepted on the Kafka bus. Refresh shortly once the worker applies it.");
        return;
      }
      reset();
      setOpen(false);
      refreshCatalog();
    } catch {
      setError("Failed to add image. Check required fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add NASA image</DialogTitle>
          <DialogDescription>
            Same pipeline as seed: text lexicon tags plus curated visuals when the NASA ID matches.
            Pin what you see in the photo (people, clothing, smile). Novel pinned tags join Filters
            after save.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="add-image-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="add-image-title"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="add-image-url" className="text-sm font-medium">
              Image URL
            </label>
            <Input
              id="add-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://images-assets.nasa.gov/..."
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="add-image-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="add-image-description"
              className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="add-image-nasa-id" className="text-sm font-medium">
                NASA ID
              </label>
              <Input
                id="add-image-nasa-id"
                value={nasaId}
                onChange={(event) => setNasaId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-image-center" className="text-sm font-medium">
                Center
              </label>
              <Input
                id="add-image-center"
                list="nasa-centers"
                value={center}
                onChange={(event) => setCenter(event.target.value)}
                placeholder="JPL, KSC, MSFC..."
              />
              <datalist id="nasa-centers">
                {centers.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="add-image-location" className="text-sm font-medium">
              Location
            </label>
            <Input
              id="add-image-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <ChipInput
            label="Keywords"
            values={keywords}
            onChange={setKeywords}
            placeholder="Add a keyword and press Enter"
          />
          <ChipInput
            label="Extra object tags"
            values={objectTags}
            onChange={setObjectTags}
            placeholder="Add a category/tag and press Enter"
          />

          <Separator />

          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">What do you see?</p>
              <p className="text-xs text-muted-foreground">
                Appearance tags are visual-only — pin them from the photo, never from the caption
                alone. New tags expand Filters after save.
              </p>
              <div className="flex flex-wrap gap-2">
                {appearanceChoices.map((tag) => {
                  const pinned = objectTags.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={() => pinTag(tag)}>
                      <Badge variant={pinned ? "default" : "secondary"}>
                        {tag}
                        {pinned ? " · pinned" : ""}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {novelCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">New objects from keywords</p>
                <p className="text-xs text-muted-foreground">
                  Not in the lexicon yet — pin to classify this image and add the facet.
                </p>
                <div className="flex flex-wrap gap-2">
                  {novelCandidates.map((tag) => (
                    <button key={tag} type="button" onClick={() => pinTag(tag)}>
                      <Badge variant={objectTags.includes(tag) ? "default" : "outline"}>
                        {tag}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Classification preview</p>
              <p className="text-xs text-muted-foreground">
                These tags are saved with the image. Click to pin; curated visuals are marked.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No tags suggested yet.</span>
                ) : (
                  suggestedTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => pinTag(tag)}>
                      <Badge variant={visualTags.includes(tag) ? "default" : "outline"}>
                        {tag}
                        {visualTags.includes(tag) ? " · visual" : ""}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save image"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

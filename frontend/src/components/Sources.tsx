import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "../hooks/use-debounce";
import { SearchField } from "./SearchField";
import { memoizeByKey, prop, takeWhile } from "../utils/stdlib";
import {
  CompiledSearchQuery,
  countWords,
  prepareSearchQuery,
} from "../utils/text-handling";
import { useHistory } from "../hooks/use-history";
import { buttonBaseStyle, HistoryControls } from "./HistoryControls";
import { ImageGallery } from "./ImageGallery";
import { HistoryModal } from "./HistoryModal";

export interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string;
  type: string;
  status: string;
}

export type ImageSet = { id: number; key: number }[]; // list of [image-id,key] (key is score,date,etc) - sorted by the key (descending)

// Prepares a memoized search function over the images dataset (there's a cache for search results)
// the search function takes CompiledSearchQuery, returns ImageSet
const createSearcher = (images: Source[]) =>
  memoizeByKey(prop("hashKey"), ({ normalized }: CompiledSearchQuery) => {
    const numWords = normalized.length;
    if (numWords == 0) {
      return images.map((image) => ({ id: image.id, key: 1 }));
    }
    let results = images.map((image) => ({
      id: image.id,
      key: countWords(image.description, normalized) / numWords,
    }));
    results.sort((a, b) => b.key - a.key); //sort descending
    return takeWhile(results, ({ key }) => key > 0);
  });


// Main images display + search bar
export const Sources: React.FC<{ images: Source[] }> = ({ images }) => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const history = useHistory<CompiledSearchQuery>({
    query: "",
    normalized: [],
    hashKey: "",
  });
  const searcher = useMemo(() => createSearcher(images), [images]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // make a function that can always reference the current history state
  // (probably a reducer would be a better idea at this point...)
  const ref = useRef<any>(null);
  ref.current = (debounced: string) => {
    const query = prepareSearchQuery(debounced);
    if (
      history.current?.query != debounced &&
      history.latest?.hashKey != query.hashKey
    ) {
      history.push(query);
    }
  };

  useEffect(() => {
    if (debounced) {
      ref.current(debounced);
    }
  }, [debounced]);

  // when history.value changes, the search field should reflect it
  useEffect(() => {
    setSearch(history.current?.query ?? "");
  }, [history.current]);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">NASA Space Images</h1>

        <div className="flex items-end justify-between gap-4 w-full border-b border-gray-200 pb-2">
          {/* Left: History Controls */}
          <HistoryControls
            onBack={history.back}
            onForward={history.forward}
            onDelete={history.deleteAt}
            backDisabled={!history.hasPrev}
            forwardDisabled={!history.hasNext}
            deleteDisabled={!history.current || history.current.hashKey == ""}
          />
          <div className="inline-flex rounded-lg shadow-sm border border-gray-200 overflow-hidden w-fit">
            <button
              type="button"
              className={buttonBaseStyle}
              disabled={history.all.length == 1}
              onClick={() => setHistoryOpen(true)}
            >
              Show history
            </button>
          </div>
          {/* Middle: Search Field */}
          <div className="flex-grow flex justify-center">
            <div className="w-full max-w-md">
              <SearchField
                search={search}
                setSearch={(value) => setSearch(value)}
              />
            </div>
          </div>
        </div>

        {/* Main: image gallery */}
        <ImageGallery
          images={images}
          chosenSet={history.current ? searcher(history.current) : undefined}
        />
      </div>
      {historyOpen && (
        <HistoryModal
          history={history.all}
          onClose={() => setHistoryOpen(false)}
          onDelete={history.deleteAt}
        />
      )}
    </>
  );
};


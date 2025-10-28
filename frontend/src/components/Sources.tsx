import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "../hooks/use-debounce";
import { SearchField } from "./SearchField";
import { ImageCard } from "./ImageCard";
import { indexBy, memoizeByKey, prop, takeWhile } from "../utils/stdlib";
import {
  CompiledSearchQuery,
  countWords,
  prepareSearchQuery,
} from "../utils/text-handling";
import { useHistory } from "../hooks/use-history";
import { buttonBaseStyle, HistoryControls } from "./HistoryControls";
import { Modal } from "./Modal";

export interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string;
  type: string;
  status: string;
}

type ImageSet = { id: number; key: number }[]; // list of [image-id,key] (key is score,date,etc) - sorted by the key (descending)

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
  console.log(history.current)
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

const ImageGallery = React.memo(
  ({ images, chosenSet }: { images: Source[]; chosenSet?: ImageSet }) => {
    if (!chosenSet) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map(
            (image) => image && <ImageCard key={image.id} image={image} />,
          )}
        </div>
      );
    }
    const indexById = indexBy("id" as const, images);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chosenSet.map(({ id, key }) => {
          const image = indexById.get(id)!;
          return <ImageCard key={id} image={image} score={key} />;
        })}
      </div>
    );
  },
);

// Prepares a search function over the images dataset
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
    return takeWhile(results, ({ key }) => key > 0); //take only results that include all words
    // can also take images that include any search work, with key>0
  });


const paginationButtonStyle = "px-3 py-1 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";
function HistoryModal({
  history,
  onClose,
  onDelete,
  maxEntriesInPage = 10,
}: {
  history: readonly { query: string }[];
  onClose: () => void;
  onDelete: (i: number) => void;
  maxEntriesInPage?: number;
}) {
  const [page, setPage] = useState(0);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * maxEntriesInPage < history.length;

  const start = page * maxEntriesInPage;
  const end = Math.min(history.length, start + maxEntriesInPage);
  const thisPage = history.slice(start, end + 1);

  return (
    <Modal onClose={onClose}>
      <button
        onClick={onClose}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded absolute top-[10px] right-[20px]"
      >
        X
      </button>

      <div className="flex flex-col  w-full ">
        {/* Header */}
        <h2 className="text-base font-semibold text-gray-800 truncate text-center">
          Past searches
        </h2>

        {/* Body: List */}
        <div className="flex-1 overflow-y-auto max-h-full divide-y divide-gray-100">
          {history.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No items found.
            </div>
          ) : (
            thisPage.map((item, i) =>
              i == 0 ? null : (
                <div
                  key={i}
                  className="flex items-center justify-start px-4 py-2"
                >
                  <button
                    onClick={() => onDelete(i)}
                    className="inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 transition-colors p-2 text-base text-red-600 hover:bg-red-50 focus-visible:ring-red-500 active:bg-red-100"
                  >
                    <img src="trash.svg" alt="delete" />
                  </button>

                  <span className="text-sm text-gray-800 truncate pr-2">
                    {item.query}
                  </span>
                </div>
              ),
            )
          )}
        </div>

        {/* Footer: Pagination */}
        {(hasNext || hasPrev) && (
          <div className="flex items-center justify-end border-t border-gray-200 px-4 py-2 gap-1">
            <span className="flex-1">
              Showing {start + 1}-{end} out of {history.length - 1}
            </span>

            <button
              onClick={() => setPage((i) => i - 1)}
              disabled={!hasPrev}
              className={paginationButtonStyle}
            >
              Previous page
            </button>

            <button
              onClick={() => setPage((i) => i + 1)}
              disabled={!hasNext}
              className={paginationButtonStyle}
            >
              Next page
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

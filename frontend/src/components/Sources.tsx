import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/use-debounce';
import { SearchField } from './search-field';
import { ImageCard } from './image-card';
import { stopWords } from '../utils/stop-words';


// history:
// history should save the entire query the user typed.
// to use it: clean up (lowercase, remove stop-words) -> cache key is the words sorted and joined
// to calc matches I take a list of clean words, match them with description of image
// that is memoized - that way if users types the same query twice, results are there already.
// when typing a new query, move future to past and insert to future (only if it's different that latest)
// even if user changes a single letter I insert into the history
//
// navigating the history
//
// deleting from history

// check History API of the browser.



export interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string;
  type: string;
  status: string;
}


// response of fetch of remote resource
interface RemoteRes<T> {
  data?: T;
  error?: string;
}

type ImageSet = { id: number, key: number }[] // list of [image-id,key] (key is score,date,etc) - sorted by the key (descending)

interface SearchAndResults {
  search: string;
  results: ImageSet;
}

function indexBy<T, S extends keyof T>(key: S, list: T[]) {
  return new Map(list.map((item) => [item[key], item]));
}

type History = {
  searches: string[];
  cur: number;
}
function history_create() {
  return {
    searches: [''],
    cur: 0
  }
};
function history_current(h: History) {
  return h.searches[h.cur];
}
function history_forward(h: History) {
  return {
    searches: h.searches,
    cur: Math.min(h.cur + 1, h.searches.length - 1)
  }
}
function history_back(h: History) {
  return {
    searches: h.searches,
    cur: Math.max(h.cur - 1, 0)
  }
}
function history_hasNext(h: History) {
  return h.cur < h.searches.length - 1;
}
function history_hasPrev(h: History) {
  return h.cur > 0;
}

// The role of this component is to fetch data from server, show error/loading/data-display
export const Head: React.FC = () => {
  const [data, setData] = useState<RemoteRes<Source[]>>();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data } = await axios.get('/api/sources');
        setData({ data })
      } catch (err) {
        setData({
          error: 'Failed to fetch space images'
        });
      }
    };

    fetchImages();
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  } else if (data.error) {
    return (
      <div className="text-red-500 text-center p-4">
        {data.error}
      </div>
    );
  } else if (data.data) {
    return <Sources images={data.data} />;
  }
  return null;
}

// Main images display + search bar
const Sources: React.FC<{ images: Source[] }> = ({ images }) => {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [history, setHistory] = useState<SearchAndResults[]>(() => [{ search: '', results: images.map(({ id }) => ({ id, key: 0 })) }]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // -1 means we're not showing history view

  useEffect(() => {
    if (debounced) {
      const matcher = compileSearchTerm(debounced);
      const results: ImageSet = images.map((image) => ({ id: image.id, key: matcher(image) }));
      results.sort((a, b) => b.key - a.key); // sort by confidence score - descending
      const mostRelevant: ImageSet = []
      for (const result of results) {
        if (result.key < 0.5) break;
        mostRelevant.push(result);
      }
      //todo: never push the same query
      setHistory((prev) => [...prev, { search: debounced, results: mostRelevant }]);
      setHistoryIndex(history.length);
    }
  }, [debounced, images]);

  // prepare a function to extract images
  const extractResultsCached = useMemo(() => extractImageSet(images), [images])

  function onBack() {
    if (historyIndex == -1) {
      if (history.length > 0)
        setHistoryIndex(history.length - 1);
    } else {
      setHistoryIndex(Math.max(0, historyIndex - 1));
    }
  }

  function onNext() {
    if (historyIndex == -1) {
      // pass
    } else {
      setHistoryIndex(Math.min(history.length - 1, historyIndex + 1));
    }
  }

  let searchQueryToShow = '', itemsToShow = null;
  if (historyIndex != -1) {
    const { results, search } = history[historyIndex];
    searchQueryToShow = search;
    itemsToShow = extractResultsCached(results);
  } else {
    searchQueryToShow = search;
    itemsToShow = images;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">NASA Space Images</h1>

      <div className="flex items-center max-w-sm mx-auto">
        <SearchField search={searchQueryToShow} setSearch={(value) => { setSearch(value); setHistoryIndex(-1); }} />
      </div>

      Search History:
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button type="button" disabled={historyIndex == 0 || history.length == 0} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onBack}>
          <img width="24px" height="24px" src="left-arrow-back-svgrepo-com.svg" alt='back' />
        </button>
        <button type="button" disabled={historyIndex == -1 || historyIndex == history.length - 1} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onNext}>
          <img width="24px" height="24px" src="right-arrow-next-svgrepo-com.svg" alt='next' />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itemsToShow.map((image) => image && <ImageCard key={image.id} image={image} />)}
      </div>
    </div>
  );
};



const compileSearchTerm = (term: string) => {
  const words = term.toLowerCase().split(/\W/).filter(Boolean); // split on anything that isn't word, filter out empties
  // remove common words (google stop-words)
  const interestingWords = words.filter((word) => !stopWords.has(word));
  // remove duplicates -> hashkey (sort+join)
  // return a function that will match image's description to the search query
  return (image: Source): number => {
    return interestingWords.some((word) => image.description.includes(word)) ? 0.9 : 0;
  }
}

function memoizeByObject<T extends object, R>(fn: (arg: T) => R) {
  let cache = new WeakMap<T, R>();
  return (arg: T): R => {
    if (cache.has(arg))
      return cache.get(arg)!;
    const value = fn(arg)
    cache.set(arg, value)
    return value;
  }
}

// this function takes images, and returns a (memoized) function to extract set of images by id.
// this way we can extract some images, and it's memoized so we can get it again immediately
const extractImageSet = (images: Source[]) => {
  const indexById = indexBy('id' as const, images);
  return memoizeByObject((results: ImageSet) => {
    return results.reduce((acc, cur) => {
      const image = indexById.get(cur.id);
      if (image) {
        acc.push(image);
      }
      return acc;
    }, [] as Source[])
  });
}

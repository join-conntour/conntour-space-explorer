import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/use-debounce';
import { SearchField } from './search-field';
import { ImageCard } from './image-card';
import { indexBy, memoizeByKey, prop, takeWhile } from '../utils/stdlib';
import { CompiledSearchQuery, countWords, prepareSearchQuery } from '../utils/text-handling';
import { useHistory } from '../hooks/use-history';


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

// The role of this component is to fetch data from server, show error/loading/data-display
export const DataLoader: React.FC = () => {
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

  const history = useHistory<CompiledSearchQuery>({ query: '', normalized: [], hashKey: '' });

  const searcher = useMemo(() => createSearcher(images), [images]);

  useEffect(() => {
    if (debounced) {
      const query = prepareSearchQuery(debounced);
      if (history.value.query != debounced && history.latest.hashKey != query.hashKey) {
        history.push(query);
      }
    }
  }, [debounced, history]);

  function updateSearchWithHistoryItem(h: CompiledSearchQuery) {
    setSearch(h.query);
  }
  function onBack() {
    history.back(updateSearchWithHistoryItem);
  }

  function onNext() {
    history.forward(updateSearchWithHistoryItem);
  }

  function onDeleteCur() {
    history.deleteCur(updateSearchWithHistoryItem);
  }

  //todo: can be simpler
  const extractor = useMemo(() => extractImageSet(images), [images])
  let itemsToShow = extractor(searcher(history.value));


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">NASA Space Images</h1>

      <div className="flex items-center max-w-sm mx-auto">
        <SearchField search={search} setSearch={(value) => setSearch(value)} />
      </div>

      Search History:
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button type="button" disabled={!history.hasPrev} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onBack}>
          <img width="24px" height="24px" src="left-arrow-back-svgrepo-com.svg" alt='back' />
        </button>
        <button type="button" disabled={!history.hasNext} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onNext}>
          <img width="24px" height="24px" src="right-arrow-next-svgrepo-com.svg" alt='next' />
        </button>
        <button type="button" disabled={debounced == search && history.value.hashKey != ''} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onDeleteCur}>
          <img width="24px" height="24px" src="red-x-10333.svg" alt='delete' />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itemsToShow.map((image) => image && <ImageCard key={image.id} image={image} />)}
      </div>
    </div>
  );
};


// preparing a search query for use:
// split to words (remove empty entries)
// remove stop-words of english (google it)
// remove duplicates
//
// match algorithm: number of keywords in image.description / total number of keywords
// cache results: cache key is words,sorted,joined with "-"


const createSearcher = (images: Source[]) =>
  memoizeByKey(prop('hashKey'),
    (({ normalized }) => {
      const numWords = normalized.length;
      if (numWords == 0) {
        return images.map((image) => ({ id: image.id, key: 1 }));
      }
      let results = images.map((image) => ({ id: image.id, key: countWords(image.description, normalized) / numWords }));
      results.sort((a, b) => b.key - a.key); //sort descending
      return takeWhile(results, ({ key }) => key > 0);//take only results with positive score  
    }));

function memoizeByObject<T extends object, R>(fn: (arg: T) => R) {
  let cache = new Map<T, R>();
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

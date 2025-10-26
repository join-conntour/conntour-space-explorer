import React, { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/use-debounce';

interface Source {
  id: number;
  name: string;
  description: string;
  launch_date: string;
  image_url: string;
  type: string;
  status: string;
}

//todo: if this was [id,T][] where T is any comparable, I could have results sorted
// by score, creation-date, or anything else
type SearchResults = Array<{ id: number; score: number }>;
type SearchTermWithResults = {
  searchTerm: string;
  results: SearchResults;
};

interface AppState {
  searchTerm?: string;
  sources: Source[];
  history: SearchTermWithResults[];
}

interface DataState {
  error?: string;
  images?: Source[];
}
const Sources: React.FC = () => {
  const [data, setData] = useState<DataState>({});
  // const [appstate, setAppstate] = useState<AppState>({});
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [searchResults, setSearchResults] = useState<SearchResults | undefined>();
  const stableSearchResults = useDebounce(searchResults, 1500);
  const [history, setHistory] = useState<SearchTermWithResults[]>([]);
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get('/api/sources');
        setData({
          images: response.data
        })
      } catch (err) {
        setData({
          error: 'Failed to fetch space images'
        });
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    if (data.images && debounced) {
      const matcher = compileSearchTerm(debounced);
      //todo this should be an async operation since it can take awhile
      const results: SearchResults = data.images.map((image) => ({ id: image.id, score: matcher(image) })).filter(({ id, score }) => score > 0.75)
      results.sort((a, b) => a.score - b.score);
      setSearchResults(results);
      setIndex(-1);
      const timer = setTimeout(() => setHistory((prev) => [...prev, { searchTerm: debounced, results }]), 1500)
      return () => clearTimeout(timer);
    }
  }, [debounced, data.images]);

  const { images, error } = data;

  if (error) {
    return <div className="text-red-500 text-center p-4">{data.error}</div>;
  }

  if (!images) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }


  let resultSet = index != -1 ? history[index].results : searchResults;
  const itemsToShow = (resultSet ? gatherSearchResults(resultSet, images) : images);

  function dosearch(e: FormEvent<HTMLFormElement>) {
    e.stopPropagation();
    e.preventDefault();
    const searchTerm = e.currentTarget["simple-search"].value;
    setSearch(searchTerm);
  }


  function onBack() {
    if (index > 0)
      setIndex(index - 1);
    else
      setIndex(history.length - 1);
  }

  function onNext() {
    if (index >= 0 && index < history.length)
      setIndex(index + 1);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">NASA Space Images</h1>

      <form className="flex items-center max-w-sm mx-auto" onSubmit={dosearch}>
        <label htmlFor="simple-search" className="sr-only">Search</label>
        <div className="relative w-full">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="lightgrey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input type="search" id="simple-search"
            value={search} onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Type to search"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 outline-none" />
        </div>
        <button type="submit" className="p-2.5 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          Search
        </button>
      </form>
      Browse history
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button type="button" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
          onClick={onBack}>
          <img width="24px" height="24px" src="left-arrow-back-svgrepo-com.svg" alt='back' />
        </button>
        <button type="button" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
          onClick={onNext}>
          <img width="24px" height="24px" src="right-arrow-next-svgrepo-com.svg" alt='next' />
        </button>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itemsToShow.map((image) => image && <ImageCard image={image} />)}
      </div>
    </div>
  );
};

const ImageCard: React.FC<{ image: Source }> = ({ image }) =>
  <div key={image.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
    {image.image_url && (
      <img
        src={image.image_url}
        alt={image.name}
        className="w-full h-48 object-cover"
      />
    )}
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">{image.name}</h2>
      <p className="text-gray-600 mb-2 line-clamp-3">{image.description}</p>
      <p className="text-sm text-gray-500 mb-4">
        {image.launch_date && new Date(image.launch_date).toLocaleDateString()}
      </p>
      {image.image_url && (
        <a
          href={image.image_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          View Full Image
        </a>
      )}
    </div>
  </div>;


const compileSearchTerm = (term: string) => {
  // can normalize search term (lowercase, split to words), find most relevant words, etc.
  return (image: Source): number => {
    return Math.random();//todo
  }
}

// can memoize this function by results (assuming images is the more constant)
const gatherSearchResults = (results: SearchResults, images: Source[]) => {
  const imagesMap = new Map(images.map((image) => [image.id, image])) // can also be done once outside ! and used to fetch images by sort order
  return results.map(({ id }) => imagesMap.get(id));
}

export default Sources;
// items + search-term + results -> debounce and insert into history /


// app state:
// items (raw list + indexes) / error
// past: list of searchterm, result-index
// future: same type as past
// cur-search
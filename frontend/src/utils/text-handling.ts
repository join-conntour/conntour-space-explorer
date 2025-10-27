import { memoizeByKey } from "./stdlib";
import { stopWords } from "./stop-words";

export interface CompiledSearchQuery {
  query: string;
  normalized: string[];
  hashKey: string;
}

function internal_prepareSearchQuery(query: string): CompiledSearchQuery {
  const words = query.toLowerCase().split(/\W/).filter((word) =>
    !!word && !stopWords.has(word)
  );
  const normalized = [...new Set(words)].sort();
  const hashKey = normalized.join("-");
  return { query, normalized, hashKey };
}

export const prepareSearchQuery: (query: string) => CompiledSearchQuery =
  memoizeByKey(
    (x) => x,
    internal_prepareSearchQuery,
  );

export function countWords(text: string, searchWords: string[]) {
  const wordsInText = new Set(text.toLowerCase().split(/\W/));
  return searchWords.reduce(
    (sum, curWord) => sum + (wordsInText.has(curWord) ? 1 : 0),
    0,
  );
}

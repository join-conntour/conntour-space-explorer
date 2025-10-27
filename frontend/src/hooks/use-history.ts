import { useCallback, useState } from "react";

type History<T> = {
  past: T[];
  cur: number;
};

export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<History<T>>({
    past: [initial],
    cur: 0,
  });

  const push = useCallback((value: T) => {
    setHistory((h) => ({
      past: [...h.past, value],
      cur: h.past.length,
    }));
  }, []);

  const deleteCur = useCallback((andThenDo?: (h: T) => void) => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const copy = h.past.slice();
      copy.splice(h.cur, 1);
      const newCur = Math.min(copy.length - 1, h.cur);
      andThenDo?.(copy[newCur]);
      return { past: copy, cur: newCur };
    });
  }, []);

  const back = useCallback((andThenDo?: (h: T) => void) => {
    setHistory((h) => {
      const newInstance = {
        past: h.past,
        cur: Math.max(h.cur - 1, 0),
      };
      andThenDo?.(h.past[newInstance.cur]);
      return newInstance;
    });
  }, []);

  const forward = useCallback((andThenDo?: (h: T) => void) => {
    setHistory((h) => {
      const newInstance = {
        past: h.past,
        cur: Math.min(h.cur + 1, h.past.length - 1),
      };
      andThenDo?.(h.past[newInstance.cur]);
      return newInstance;
    });
  }, []);

  const hasPrev = history.cur > 0;
  const hasNext = history.cur < history.past.length - 1;
  const current = history.past[history.cur];

  return {
    value: current,
    latest: history.past.at(-1)!,
    push,
    deleteCur,
    back,
    forward,
    hasPrev,
    hasNext,
    history,
  } as const;
}

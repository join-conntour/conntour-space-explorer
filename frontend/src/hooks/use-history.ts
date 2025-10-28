import { useMemo, useState } from "react";

type History<T> = {
	past: T[];
	cur: number;
};

export function useHistory<T>(initial: T) {
	const [history, setHistory] = useState<History<T>>({
		past: [initial],
		cur: 0,
	});

	const actions = useMemo(() => ({
		push: (value: T) => {
			setHistory((h) => ({
				past: [...h.past, value],
				cur: h.past.length,
			}));
		},

		deleteAt: (i?: number) => {
			setHistory((h) => {
				if (h.past.length === 0 || i == 0) return h;
				const newPast = h.past.slice();
				i ??= h.cur;
				newPast.splice(i, 1);
				const newCur = Math.min(newPast.length - 1, h.cur);
				return { past: newPast, cur: newCur };
			});
		},

		back: () => {
			setHistory((h) => ({
				past: h.past,
				cur: Math.max(h.cur - 1, 0),
			}));
		},

		forward: () => {
			setHistory((h) => ({
				past: h.past,
				cur: Math.min(h.cur + 1, h.past.length - 1),
			}));
		},
	}), []);

	const hasPrev = history.cur > 0;
	const hasNext = history.cur < history.past.length - 1;
	const current = history.past[history.cur];

	return {
		current,
		latest: history.past.at(-1)!,
		all: history.past as ReadonlyArray<T>,
		...actions,
		hasPrev,
		hasNext,
		history,
	} as const;
}

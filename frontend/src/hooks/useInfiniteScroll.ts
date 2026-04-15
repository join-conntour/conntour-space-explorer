import { useCallback, useRef, useState } from 'react';

export function useInfiniteScroll<T>(items: T[], pageSize = 12) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const observer = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (!node) return;

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
        }
      });

      observer.current.observe(node);
    },
    [visibleCount, items.length, pageSize],
  );

  return {
    visible: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    sentinelRef,
  };
}

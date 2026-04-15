import { useEffect, useState } from 'react';
import { sourcesApi } from '../services/api';
import type { RelatedResult } from '../types';

export function useRelated(sourceId: number | null) {
  const [related, setRelated] = useState<RelatedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sourceId === null) {
      setRelated([]);
      return;
    }
    setLoading(true);
    setError(null);
    sourcesApi
      .getRelated(sourceId)
      .then(setRelated)
      .catch(() => setError('Failed to load related images.'))
      .finally(() => setLoading(false));
  }, [sourceId]);

  return { related, loading, error };
}

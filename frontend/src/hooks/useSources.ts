import { useEffect, useState } from 'react';
import { sourcesApi } from '../services/api';
import type { Source } from '../types';

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sourcesApi
      .getAll()
      .then(setSources)
      .catch(() => setError('Failed to load images. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return { sources, loading, error };
}

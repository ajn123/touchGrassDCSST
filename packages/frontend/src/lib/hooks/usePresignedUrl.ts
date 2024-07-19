import { useState, useEffect } from 'react';

interface UsePresignedUrlOptions {
  expiresIn?: number;
  autoFetch?: boolean;
  artificialDelay?: number;
}

interface UsePresignedUrlReturn {
  url: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePresignedUrl(
  key: string | null,
  options: UsePresignedUrlOptions = {}
): UsePresignedUrlReturn {
  const { expiresIn = 3600, autoFetch = true, artificialDelay = 0 } = options;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = async () => {
    if (!key) {
      setUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (artificialDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, artificialDelay));
      }

      const response = await fetch(`/api/s3/presigned-url?key=${encodeURIComponent(key)}&expiresIn=${expiresIn}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate presigned URL');
      }

      const data = await response.json();
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && key) {
      fetchUrl();
    }
  }, [key, autoFetch, expiresIn]);

  return {
    url,
    loading,
    error,
    refetch: fetchUrl,
  };
}

export function useMultiplePresignedUrls(
  keys: string[],
  options: UsePresignedUrlOptions = {}
): UsePresignedUrlReturn & { urls: Record<string, string> } {
  const { expiresIn = 3600, autoFetch = true, artificialDelay = 0 } = options;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrls = async () => {
    if (!keys.length) {
      setUrls({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (artificialDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, artificialDelay));
      }

      const response = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys,
          expiresIn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate presigned URLs');
      }

      const data = await response.json();
      setUrls(data.urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUrls({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && keys.length > 0) {
      fetchUrls();
    }
  }, [keys.join(','), autoFetch, expiresIn]);

  return {
    url: null, // Not applicable for multiple URLs
    urls,
    loading,
    error,
    refetch: fetchUrls,
  };
} 
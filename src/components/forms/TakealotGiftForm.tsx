'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CauseImpact = {
  amountCents: number;
  description: string;
};

type Cause = {
  id: string;
  name: string;
  impacts: CauseImpact[];
};

type TakealotProduct = {
  url: string;
  name: string;
  priceCents: number;
  imageUrl: string;
};

type TakealotGiftFormProps = {
  action: (formData: FormData) => void;
  causes: Cause[];
  defaultProductUrl: string;
  selectedOverflow?: string;
  error?: string;
};

export function TakealotGiftForm({
  action,
  causes,
  defaultProductUrl,
  selectedOverflow,
  error,
}: TakealotGiftFormProps) {
  const [productUrl, setProductUrl] = useState(defaultProductUrl);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TakealotProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setSearchError(null);
    setResults([]);

    if (!query.trim()) {
      setSearchError('Please enter a search term.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/internal/products/takealot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setSearchError(payload?.error ?? 'Search failed.');
        return;
      }

      const payload = await response.json();
      if (!payload?.data?.length) {
        setSearchError('No results found. Try a different search.');
        return;
      }

      setResults(payload.data as TakealotProduct[]);
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={action} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'overflow'
            ? 'Please choose a charity overflow option.'
            : error === 'fetch_failed'
              ? 'We could not fetch that product. Please try another link.'
              : 'Please enter a valid Takealot link.'}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search Takealot for a product"
          />
          <Button type="button" variant="outline" disabled={loading} onClick={handleSearch}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </div>
        {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}
        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((result) => (
              <button
                key={result.url}
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left"
                onClick={() => setProductUrl(result.url)}
              >
                <Image
                  src={result.imageUrl}
                  alt={result.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-text">{result.name}</p>
                  <p className="text-sm text-text-muted">R{(result.priceCents / 100).toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="productUrl" className="text-sm font-medium text-text">
          Takealot product URL
        </label>
        <Input
          id="productUrl"
          name="productUrl"
          placeholder="https://www.takealot.com/..."
          required
          value={productUrl}
          onChange={(event) => setProductUrl(event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-text">
          If the gift is fully funded early, which charity should we support?
        </p>
        <div className="grid gap-3">
          {causes.map((cause) =>
            cause.impacts.map((impact, index) => {
              const value = `${cause.id}::${index}`;
              return (
                <label
                  key={value}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4"
                >
                  <input
                    type="radio"
                    name="overflowSelection"
                    value={value}
                    defaultChecked={selectedOverflow === value}
                    className="mt-1"
                    required
                  />
                  <div>
                    <p className="text-sm font-semibold text-text">{cause.name}</p>
                    <p className="text-xs text-text-muted">{impact.description}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <Button type="submit">Continue to payout details</Button>
    </form>
  );
}

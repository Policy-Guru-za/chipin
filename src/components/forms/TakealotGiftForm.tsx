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

const getTakealotErrorMessage = (error?: string) => {
  if (!error) return null;
  if (error === 'overflow') return 'Please choose a charity overflow option.';
  if (error === 'fetch_failed') return 'We could not fetch that product. Please try another link.';
  return 'Please enter a valid Takealot link.';
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {message}
  </div>
);

type SearchSectionProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  searchError: string | null;
  results: TakealotProduct[];
  onSelect: (url: string) => void;
};

const SearchSection = ({
  query,
  onQueryChange,
  onSearch,
  loading,
  searchError,
  results,
  onSelect,
}: SearchSectionProps) => (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSearch();
          }
        }}
        placeholder="Search Takealot for a product"
      />
      <Button type="button" variant="outline" disabled={loading} onClick={onSearch}>
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
            onClick={() => onSelect(result.url)}
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
);

type OverflowSelectionProps = {
  causes: Cause[];
  selectedOverflow?: string;
};

const OverflowSelection = ({ causes, selectedOverflow }: OverflowSelectionProps) => (
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
);

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
  const errorMessage = getTakealotErrorMessage(error);

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
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SearchSection
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        loading={loading}
        searchError={searchError}
        results={results}
        onSelect={setProductUrl}
      />

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

      <OverflowSelection causes={causes} selectedOverflow={selectedOverflow} />

      <Button type="submit">Continue to payout details</Button>
    </form>
  );
}

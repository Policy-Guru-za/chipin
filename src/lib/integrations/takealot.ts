import { createHash } from 'crypto';
import { kv } from '@vercel/kv';
import { z } from 'zod';

export type TakealotProduct = {
  url: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  productId: string | null;
  inStock: boolean;
};

export type TakealotSearchResult = TakealotProduct;

const TAKEALOT_CACHE_TTL_SECONDS = 60 * 60 * 24;

const buildCacheKey = (prefix: string, value: string) => {
  const hashed = createHash('sha256').update(value).digest('hex');
  return `takealot:${prefix}:${hashed}`;
};

export const isTakealotUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.replace(/^www\./, '');
    return host === 'takealot.com' || host.endsWith('.takealot.com');
  } catch {
    return false;
  }
};

// Allow extra JSON-LD fields so Takealot schema changes don't break parsing.
const jsonLdOfferSchema = z
  .object({
    price: z.union([z.string(), z.number()]).optional(),
    lowPrice: z.union([z.string(), z.number()]).optional(),
    availability: z.string().optional(),
  })
  .passthrough();

const jsonLdProductSchema = z
  .object({
    '@type': z.union([z.string(), z.array(z.string())]).optional(),
    name: z.string().optional(),
    image: z.union([z.string(), z.array(z.string())]).optional(),
    offers: jsonLdOfferSchema.optional(),
    url: z.string().optional(),
  })
  .passthrough();

const jsonLdItemListSchema = z
  .object({
    '@type': z.union([z.string(), z.array(z.string())]).optional(),
    itemListElement: z.array(z.unknown()).optional(),
  })
  .passthrough();

const jsonLdListItemSchema = z
  .object({
    '@type': z.union([z.string(), z.array(z.string())]).optional(),
    item: z.unknown().optional(),
    url: z.string().optional(),
  })
  .passthrough();

type JsonLdProduct = z.infer<typeof jsonLdProductSchema>;
type JsonLdItemList = z.infer<typeof jsonLdItemListSchema>;

const hasJsonLdType = (value: string | string[] | undefined, target: string) => {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.includes(target);
  }
  return value === target;
};

const extractProductId = (url: string) => {
  const match = url.match(/PLID(\d+)/i);
  return match ? match[1] : null;
};

const parseAvailability = (availability: string | undefined) => {
  if (!availability) return true;
  const normalized = availability.toLowerCase();
  if (normalized.includes('outofstock') || normalized.includes('out of stock')) {
    return false;
  }
  if (normalized.includes('soldout') || normalized.includes('sold out')) {
    return false;
  }
  return true;
};

const parsePriceCents = (price: string | number | undefined) => {
  if (price === undefined || price === null) return null;
  const value = typeof price === 'number' ? price : parseFloat(price.toString().replace(',', ''));
  if (Number.isNaN(value) || value <= 0) return null;
  return Math.round(value * 100);
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonLdItems = (html: string) => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const items: unknown[] = [];

  scripts.forEach((match) => {
    const parsed = safeJsonParse(match[1]);
    if (!parsed) return;
    if (Array.isArray(parsed)) {
      items.push(...parsed);
    } else {
      items.push(parsed);
    }
  });

  return items;
};

const normalizeTakealotUrl = (value: unknown, fallbackUrl?: string) => {
  let url = value ?? fallbackUrl;
  if (typeof url === 'string' && url.startsWith('/')) {
    url = `https://www.takealot.com${url}`;
  }
  if (typeof url !== 'string' || !isTakealotUrl(url)) {
    return null;
  }
  return url;
};

const getImageUrl = (item: JsonLdProduct) =>
  Array.isArray(item.image) ? item.image[0] : (item.image ?? null);

const getProductName = (item: JsonLdProduct) => (typeof item.name === 'string' ? item.name : null);

const getProductPriceCents = (item: JsonLdProduct) =>
  parsePriceCents(item.offers?.price ?? item.offers?.lowPrice);

const extractProduct = (item: unknown, fallbackUrl?: string): TakealotProduct | null => {
  const parsed = jsonLdProductSchema.safeParse(item);
  if (!parsed.success) return null;

  const priceCents = getProductPriceCents(parsed.data);
  const image = getImageUrl(parsed.data);
  const url = normalizeTakealotUrl(parsed.data.url, fallbackUrl);
  const name = getProductName(parsed.data);
  if (!url || !name || !priceCents || !image) {
    return null;
  }

  return {
    url,
    name,
    priceCents,
    imageUrl: image,
    productId: extractProductId(url),
    inStock: parseAvailability(parsed.data.offers?.availability),
  };
};

const extractProductFromJsonLd = (item: unknown, url: string) => {
  const parsed = jsonLdProductSchema.safeParse(item);
  if (!parsed.success || !hasJsonLdType(parsed.data['@type'], 'Product')) return null;

  const priceCents = getProductPriceCents(parsed.data);
  const image = getImageUrl(parsed.data);
  const name = getProductName(parsed.data);
  if (name && priceCents && image) {
    return {
      url,
      name,
      priceCents,
      imageUrl: image,
      productId: extractProductId(url),
      inStock: parseAvailability(parsed.data.offers?.availability),
    };
  }
  return null;
};

const parseOpenGraphProduct = (html: string, url: string) => {
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
  const priceMatch = html.match(/R\s*([\d,]+(?:\.\d{2})?)/);
  const priceCents = parsePriceCents(priceMatch?.[1]);

  if (!ogTitle || !priceCents || !ogImage) {
    return null;
  }

  return {
    url,
    name: ogTitle.replace(' | Takealot.com', ''),
    priceCents,
    imageUrl: ogImage,
    productId: extractProductId(url),
    inStock: true,
  };
};

export const parseTakealotHtml = (html: string, url: string): TakealotProduct | null => {
  const items = extractJsonLdItems(html);
  for (const item of items) {
    const product = extractProductFromJsonLd(item, url);
    if (product) return product;
  }

  return parseOpenGraphProduct(html, url);
};

const appendUniqueProduct = (
  product: TakealotProduct | null,
  results: TakealotSearchResult[],
  seen: Set<string>
) => {
  if (product && !seen.has(product.url)) {
    seen.add(product.url);
    results.push(product);
  }
};

const collectItemListProducts = (
  item: JsonLdItemList,
  results: TakealotSearchResult[],
  seen: Set<string>
) => {
  const list = Array.isArray(item.itemListElement) ? item.itemListElement : [];
  list.forEach((entry) => {
    const listItemParsed = jsonLdListItemSchema.safeParse(entry);
    if (listItemParsed.success && hasJsonLdType(listItemParsed.data['@type'], 'ListItem')) {
      const product = extractProduct(listItemParsed.data.item ?? entry, listItemParsed.data.url);
      appendUniqueProduct(product, results, seen);
      return;
    }

    appendUniqueProduct(extractProduct(entry), results, seen);
  });
};

const collectProductsFromJsonLd = (items: unknown[]) => {
  const results: TakealotSearchResult[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    const itemListParsed = jsonLdItemListSchema.safeParse(item);
    if (itemListParsed.success && hasJsonLdType(itemListParsed.data['@type'], 'ItemList')) {
      collectItemListProducts(itemListParsed.data, results, seen);
    }

    const productParsed = jsonLdProductSchema.safeParse(item);
    if (productParsed.success && hasJsonLdType(productParsed.data['@type'], 'Product')) {
      appendUniqueProduct(
        extractProduct(productParsed.data, productParsed.data.url),
        results,
        seen
      );
    }
  });

  return results;
};

export const parseTakealotSearchHtml = (html: string): TakealotSearchResult[] => {
  const items = extractJsonLdItems(html);
  return collectProductsFromJsonLd(items);
};

export async function fetchTakealotSearch(
  query: string,
  limit = 6
): Promise<TakealotSearchResult[]> {
  const normalizedQuery = query.trim();
  const cacheKey = buildCacheKey('search', normalizedQuery.toLowerCase());
  const cached = await kv.get<TakealotSearchResult[]>(cacheKey);
  if (cached) {
    return cached.slice(0, limit);
  }

  const searchUrl = `https://www.takealot.com/all?search=${encodeURIComponent(normalizedQuery)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'ChipIn/1.0 (+https://chipin.co.za)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Takealot search results');
  }

  const html = await response.text();
  const results = parseTakealotSearchHtml(html);
  await kv.set(cacheKey, results, { ex: TAKEALOT_CACHE_TTL_SECONDS });
  return results.slice(0, limit);
}

export async function fetchTakealotProduct(rawUrl: string): Promise<TakealotProduct> {
  if (!isTakealotUrl(rawUrl)) {
    throw new Error('Invalid Takealot URL');
  }

  const cacheKey = buildCacheKey('product', rawUrl);
  const cached = await kv.get<TakealotProduct>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(rawUrl, {
    headers: {
      'User-Agent': 'ChipIn/1.0 (+https://chipin.co.za)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Takealot product');
  }

  const html = await response.text();
  const parsed = parseTakealotHtml(html, rawUrl);
  if (!parsed) {
    throw new Error('Could not extract product details');
  }

  await kv.set(cacheKey, parsed, { ex: TAKEALOT_CACHE_TTL_SECONDS });
  return parsed;
}

export type TakealotProduct = {
  url: string;
  name: string;
  priceCents: number;
  imageUrl: string;
};

export type TakealotSearchResult = TakealotProduct;

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

const getImageUrl = (item: any) => (Array.isArray(item?.image) ? item.image[0] : item?.image);

const getProductName = (item: any) => (typeof item?.name === 'string' ? item.name : null);

const getProductPriceCents = (item: any) =>
  parsePriceCents(item?.offers?.price ?? item?.offers?.lowPrice);

const extractProduct = (item: any, fallbackUrl?: string): TakealotProduct | null => {
  const priceCents = getProductPriceCents(item);
  const image = getImageUrl(item);
  const url = normalizeTakealotUrl(item?.url, fallbackUrl);
  const name = getProductName(item);
  if (!url || !name || !priceCents || !image) {
    return null;
  }

  return { url, name, priceCents, imageUrl: image };
};

const extractProductFromJsonLd = (item: any, url: string) => {
  if (item?.['@type'] !== 'Product') return null;
  const priceCents = parsePriceCents(item?.offers?.price);
  const image = getImageUrl(item);
  const name = getProductName(item);
  if (name && priceCents && image) {
    return { url, name, priceCents, imageUrl: image };
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

const collectItemListProducts = (item: any, results: TakealotSearchResult[], seen: Set<string>) => {
  const list = Array.isArray(item?.itemListElement) ? item.itemListElement : [];
  list.forEach((entry: any) => {
    const product = extractProduct(entry?.item ?? entry, entry?.item?.url ?? entry?.url);
    appendUniqueProduct(product, results, seen);
  });
};

const collectProductsFromJsonLd = (items: unknown[]) => {
  const results: TakealotSearchResult[] = [];
  const seen = new Set<string>();

  items.forEach((item: any) => {
    if (item?.['@type'] === 'ItemList') {
      collectItemListProducts(item, results, seen);
    }
    if (item?.['@type'] === 'Product') {
      appendUniqueProduct(extractProduct(item, item?.url), results, seen);
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
  const searchUrl = `https://www.takealot.com/all?search=${encodeURIComponent(query)}`;
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
  return results.slice(0, limit);
}

export async function fetchTakealotProduct(rawUrl: string): Promise<TakealotProduct> {
  if (!isTakealotUrl(rawUrl)) {
    throw new Error('Invalid Takealot URL');
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

  return parsed;
}

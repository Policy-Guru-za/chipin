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

const extractProduct = (item: any, fallbackUrl?: string): TakealotProduct | null => {
  const priceCents = parsePriceCents(item?.offers?.price ?? item?.offers?.lowPrice);
  const image = Array.isArray(item?.image) ? item.image[0] : item?.image;
  let url = item?.url ?? fallbackUrl;
  if (typeof url === 'string' && url.startsWith('/')) {
    url = `https://www.takealot.com${url}`;
  }
  if (typeof url !== 'string' || !isTakealotUrl(url)) {
    return null;
  }
  if (!item?.name || !priceCents || !image) {
    return null;
  }

  return {
    url,
    name: item.name,
    priceCents,
    imageUrl: image,
  };
};

export const parseTakealotHtml = (html: string, url: string): TakealotProduct | null => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const match of scripts) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item?.['@type'] === 'Product') {
          const priceCents = parsePriceCents(item?.offers?.price);
          const image = Array.isArray(item?.image) ? item.image[0] : item?.image;
          if (item?.name && priceCents && image) {
            return {
              url,
              name: item.name,
              priceCents,
              imageUrl: image,
            };
          }
        }
      }
    } catch {
      continue;
    }
  }

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

export const parseTakealotSearchHtml = (html: string): TakealotSearchResult[] => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const results: TakealotSearchResult[] = [];
  const seen = new Set<string>();

  for (const match of scripts) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item?.['@type'] === 'ItemList') {
          const list = item?.itemListElement ?? [];
          for (const entry of list) {
            const product = extractProduct(entry?.item ?? entry, entry?.item?.url ?? entry?.url);
            if (product && !seen.has(product.url)) {
              seen.add(product.url);
              results.push(product);
            }
          }
        }
        if (item?.['@type'] === 'Product') {
          const product = extractProduct(item, item?.url);
          if (product && !seen.has(product.url)) {
            seen.add(product.url);
            results.push(product);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return results;
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

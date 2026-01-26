import { describe, expect, it } from 'vitest';

import {
  isTakealotUrl,
  parseTakealotHtml,
  parseTakealotSearchHtml,
} from '../../src/lib/integrations/takealot';

describe('isTakealotUrl', () => {
  it('accepts https takealot urls', () => {
    expect(isTakealotUrl('https://www.takealot.com/item')).toBe(true);
  });

  it('rejects non-https or non-takealot urls', () => {
    expect(isTakealotUrl('http://www.takealot.com/item')).toBe(false);
    expect(isTakealotUrl('https://example.com/item')).toBe(false);
  });
});

describe('parseTakealotHtml', () => {
  it('parses product json-ld', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Product","name":"LEGO Set","image":"https://img","offers":{"price":"2499.00"}}
      </script>
    `;
    const result = parseTakealotHtml(html, 'https://www.takealot.com/item');

    expect(result?.name).toBe('LEGO Set');
    expect(result?.priceCents).toBe(249900);
    expect(result?.imageUrl).toBe('https://img');
  });

  it('falls back to og tags', () => {
    const html = `
      <meta property="og:title" content="Toy | Takealot.com" />
      <meta property="og:image" content="https://img" />
      <span>R 599.00</span>
    `;
    const result = parseTakealotHtml(html, 'https://www.takealot.com/item');
    expect(result?.name).toBe('Toy');
    expect(result?.priceCents).toBe(59900);
  });

  it('ignores invalid json-ld and falls back to og tags', () => {
    const html = `
      <script type="application/ld+json">{not json}</script>
      <meta property="og:title" content="Blocks | Takealot.com" />
      <meta property="og:image" content="https://img" />
      <span>R 799.00</span>
    `;
    const result = parseTakealotHtml(html, 'https://www.takealot.com/item');
    expect(result?.name).toBe('Blocks');
    expect(result?.priceCents).toBe(79900);
  });
});

describe('parseTakealotSearchHtml', () => {
  it('parses item list json-ld', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"ItemList","itemListElement":[
          {"@type":"ListItem","item":{"@type":"Product","name":"Doll","image":"https://img","offers":{"price":"399.00"},"url":"https://www.takealot.com/doll"}}
        ]}
      </script>
    `;

    const results = parseTakealotSearchHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Doll');
    expect(results[0].priceCents).toBe(39900);
  });

  it('dedupes and normalizes product urls', () => {
    const html = `
      <script type="application/ld+json">
        [
          {"@type":"ItemList","itemListElement":[
            {"@type":"ListItem","item":{"@type":"Product","name":"Blocks","image":"https://img","offers":{"price":"499.00"},"url":"/blocks"}}
          ]},
          {"@type":"Product","name":"Blocks","image":"https://img","offers":{"price":"499.00"},"url":"https://www.takealot.com/blocks"}
        ]
      </script>
    `;

    const results = parseTakealotSearchHtml(html);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://www.takealot.com/blocks');
  });
});

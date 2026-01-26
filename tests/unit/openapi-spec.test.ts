import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openApiSpec } from '@/lib/api/openapi';

describe('openapi spec', () => {
  it('public spec matches the generated builder', () => {
    const content = readFileSync(resolve(process.cwd(), 'public', 'v1', 'openapi.json'), 'utf8');
    const json = JSON.parse(content);
    expect(json).toEqual(openApiSpec);
  });
});

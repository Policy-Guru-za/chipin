import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { openApiSpec } from '../src/lib/api/openapi';

const outputPath = resolve(process.cwd(), 'public', 'v1', 'openapi.json');
mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(outputPath, `${JSON.stringify(openApiSpec, null, 2)}\n`);
console.log(`OpenAPI spec written to ${outputPath}`);

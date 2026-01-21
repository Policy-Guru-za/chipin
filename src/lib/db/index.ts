import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema';

type Database = NeonHttpDatabase<typeof schema>;

let dbInstance: Database | null = null;

const initDb = (): Database => {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(connectionString);
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
};

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    return Reflect.get(initDb(), prop);
  },
});

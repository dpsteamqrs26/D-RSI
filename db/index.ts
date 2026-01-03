// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

if (!process.env.EXPO_PUBLIC_DATABASE_URL) {
  throw new Error('EXPO_PUBLIC_DATABASE_URL is not set');
}

const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL);
export const db = drizzle(sql);
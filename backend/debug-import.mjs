import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const steps = [
  'config/env.ts',
  'config/logger.ts',
  'config/database.ts',
  'config/redis.ts',
  'jobs/queues.ts',
  'jobs/workers.ts',
  'app.ts',
];

for (const step of steps) {
  const p = join(__dirname, 'src', step);
  try {
    await import(pathToFileURL(p).href);
    console.log('OK:', step);
  } catch (e) {
    console.error('FAIL:', step);
    console.error(e);
    process.exit(1);
  }
}

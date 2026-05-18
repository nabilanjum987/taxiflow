async function main(): Promise<void> {
  const steps = [
    () => import('./src/config/env'),
    () => import('./src/config/logger'),
    () => import('./src/config/database'),
    () => import('./src/config/redis'),
    () => import('./src/jobs/queues'),
    () => import('./src/jobs/workers'),
    () => import('./src/app'),
  ];

  for (const load of steps) {
    try {
      await load();
      console.log('OK:', load.toString());
    } catch (e) {
      console.error('FAIL:', load.toString());
      console.error(e);
      process.exit(1);
    }
  }
}

void main();

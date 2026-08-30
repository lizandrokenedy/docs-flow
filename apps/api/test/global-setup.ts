import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não definida. Rode os testes com npm run test (docker compose + .env.test).',
    );
  }

  process.env.CLAMAV_ENABLED = 'false';

  const apiDir = resolve(__dirname, '..');
  const env = { ...process.env, DATABASE_URL: databaseUrl };

  execSync('npx prisma generate --schema=prisma/schema.prisma', {
    cwd: apiDir,
    stdio: 'inherit',
    env,
  });

  // No compose, migrate-test já aplicou as migrations antes do runner subir.
  if (!process.env.TEST_API_URL) {
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
      cwd: apiDir,
      stdio: 'inherit',
      env,
    });
  }
}

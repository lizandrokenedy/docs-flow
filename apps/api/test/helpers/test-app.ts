import { INestApplication } from '@nestjs/common';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../../src/app.factory';

export type TestHttp = ReturnType<typeof request>;
export type TestApp = INestApplication | null;

const apiBaseUrl = process.env.TEST_API_URL;

let inProcessApp: INestApplication | null = null;

/** Inicializa o harness: HTTP remoto (compose) ou app Nest in-process (unit/local). */
export async function initTestHarness(): Promise<TestApp> {
  if (apiBaseUrl) {
    return null;
  }

  if (!inProcessApp) {
    const uploadDir = mkdtempSync(join(tmpdir(), 'docs-flow-test-'));
    process.env.UPLOAD_DIR = uploadDir;
    process.env.CLAMAV_ENABLED = 'false';

    inProcessApp = await createApp();
    await inProcessApp.init();
  }

  return inProcessApp;
}

/** @deprecated Use initTestHarness — mantido para compatibilidade nos specs. */
export const createTestApp = initTestHarness;

export async function closeTestHarness(app: TestApp): Promise<void> {
  if (app) {
    await app.close();
    inProcessApp = null;
  }
}

export function http(app?: TestApp): TestHttp {
  if (apiBaseUrl) {
    return request(apiBaseUrl);
  }

  const target = app ?? inProcessApp;
  if (!target) {
    throw new Error('Harness de teste não inicializado');
  }

  return request(target.getHttpServer());
}

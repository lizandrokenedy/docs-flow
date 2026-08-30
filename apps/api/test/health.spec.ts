import { closeTestHarness, createTestApp, http } from './helpers/test-app';

describe('HealthController', () => {
  it('retorna status ok', async () => {
    const app = await createTestApp();

    try {
      const response = await http(app).get('/health').expect(200);
      expect(response.body.status).toBe('ok');
    } finally {
      await closeTestHarness(app);
    }
  });
});

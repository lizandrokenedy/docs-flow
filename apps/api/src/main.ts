import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp({ enableSwagger: true });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();

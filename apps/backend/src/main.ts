// Must be first — Sentry patches modules as they load (04 §7).
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Path versioning (07 §6): every route is /v1/*.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // No browser client exists — mobile isn't subject to CORS. Leaving it disabled
  // keeps the surface honest; revisit only if a web surface ever ships.

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });

  await app.listen(port, '0.0.0.0');
}

void bootstrap();

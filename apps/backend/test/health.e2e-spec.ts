import { healthResponseSchema } from '@aura/shared';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * Health e2e (Phase 0 DoD). Runs against the real AppModule with mock providers —
 * proving the module graph, env validation, versioning and the shared contract
 * all line up. Supabase probes are stubbed; reaching a real instance is not this
 * test's job.
 */
describe('GET /v1/health (e2e)', () => {
  let app: INestApplication;

  // Env is set in test/setup-e2e.ts — it has to land before AppModule is imported.
  beforeAll(async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers 200 with a body matching the shared contract', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);

    // Parsing with the shared schema is the assertion: if the server drifts from
    // @aura/shared, this fails (01 §4).
    expect(() => healthResponseSchema.parse(res.body)).not.toThrow();
    expect(res.body).toMatchObject({ status: 'ok', llm: true, tts: true });
  });

  it('is unauthenticated — the host health check sends no JWT (04 §7)', async () => {
    // Regression guard: the auth guard is global and deny-by-default, so if
    // @Public() ever falls off this route the load balancer starts reading 401 as
    // "instance down" and pulls it from rotation. That failure is silent in dev.
    await request(app.getHttpServer()).get('/v1/health').set('Authorization', '').expect(200);
  });

  it('still serves health when a garbage token is sent', async () => {
    await request(app.getHttpServer())
      .get('/v1/health')
      .set('Authorization', 'Bearer garbage')
      .expect(200);
  });

  it('does NOT leave other routes public — the guard is on', async () => {
    // Proves @Public() is scoped to health rather than the guard being inert.
    await request(app.getHttpServer()).post('/v1/account/delete').expect(401);
  });

  it('serves health only under the /v1 path version (07 §6)', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});

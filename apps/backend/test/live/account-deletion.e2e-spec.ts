import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { createTestUser, deleteTestUser, serviceClient, type TestUser } from './helpers';

/**
 * `POST /v1/account/delete` end-to-end against a LIVE stack (03 §5, 14 §6).
 *
 * "Delete means delete" is a brand promise (product 18 §4), so this asserts the
 * rows are actually gone from Postgres — not that a service method was called.
 * The whole point is that a mock could not tell us the truth here.
 *
 * Requires `pnpm db:start`.
 */
describe('POST /v1/account/delete (live)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const tokenFor = async (user: TestUser): Promise<string> => {
    const { data } = await user.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('no session token');
    return token;
  };

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).post('/v1/account/delete').expect(401);
  });

  it('rejects a garbage token', async () => {
    await request(app.getHttpServer())
      .post('/v1/account/delete')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('returns the shared error envelope on 401 (07 §5)', async () => {
    const res = await request(app.getHttpServer()).post('/v1/account/delete').expect(401);

    expect(res.body).toMatchObject({ error: { key: 'unauthorized' } });
  });

  it('deletes the caller: auth user, profile and answers all gone', async () => {
    const user = await createTestUser();
    const admin = serviceClient();

    await admin
      .from('onboarding_answers')
      .insert({ user_id: user.id, screen_id: 's10-struggle', answer: { text: 'private' } });

    await request(app.getHttpServer())
      .post('/v1/account/delete')
      .set('Authorization', `Bearer ${await tokenFor(user)}`)
      .expect(204);

    const { count: profiles } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const { count: answers } = await admin
      .from('onboarding_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const { data: authUser } = await admin.auth.admin.getUserById(user.id);

    expect(profiles).toBe(0);
    expect(answers).toBe(0);
    expect(authUser.user).toBeNull();
  });

  it("deletes only the caller — never another user's account", async () => {
    // The id comes from the verified JWT and there is no body, so there is no way
    // to aim this endpoint at someone else. This test pins that shut.
    const victim = await createTestUser();
    const attacker = await createTestUser();

    await request(app.getHttpServer())
      .post('/v1/account/delete')
      .set('Authorization', `Bearer ${await tokenFor(attacker)}`)
      .send({ userId: victim.id })
      .expect(204);

    const { data: stillThere } = await serviceClient().auth.admin.getUserById(victim.id);
    expect(stillThere.user?.id).toBe(victim.id);

    await deleteTestUser(victim.id);
  });

  it('is idempotent: a retry after deletion still succeeds', async () => {
    // Mobile may retry on a flaky connection. The user's JWT keeps verifying for
    // its remaining lifetime even though she is gone, so the retry reaches the
    // handler — and must report success, since the desired state already holds.
    const user = await createTestUser();
    const token = await tokenFor(user);

    await request(app.getHttpServer())
      .post('/v1/account/delete')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/v1/account/delete')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});

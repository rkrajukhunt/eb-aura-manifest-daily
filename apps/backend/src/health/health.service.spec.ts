import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { HealthService } from './health.service';

const CONFIG = {
  SUPABASE_URL: 'http://supabase.local',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
} as const;

describe('HealthService', () => {
  let service: HealthService;
  let llmPing: jest.Mock<Promise<boolean>, []>;
  let ttsPing: jest.Mock<Promise<boolean>, []>;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    llmPing = jest.fn().mockResolvedValue(true);
    ttsPing = jest.fn().mockResolvedValue(true);
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: (key: keyof typeof CONFIG) => CONFIG[key] },
        },
        { provide: LLM_PROVIDER, useValue: { ping: llmPing } as unknown as LlmProvider },
        { provide: TTS_PROVIDER, useValue: { ping: ttsPing } as unknown as TtsProvider },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports every dependency up when all probes succeed', async () => {
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      db: true,
      storage: true,
      llm: true,
      tts: true,
    });
  });

  it('reports a dependency down without failing the request', async () => {
    llmPing.mockRejectedValue(new Error('vendor exploded'));

    const result = await service.check();

    // Liveness stays ok: the process answered. Only the flag goes false, so the
    // host keeps the instance in rotation instead of crash-looping it.
    expect(result).toMatchObject({ status: 'ok', llm: false, tts: true });
  });

  it('caches probe results for 60s so health checks cannot amplify vendor spend', async () => {
    await service.check(0);
    await service.check(59_000);

    expect(llmPing).toHaveBeenCalledTimes(1);
  });

  it('re-probes once the 60s cache window has passed', async () => {
    await service.check(0);
    await service.check(60_001);

    expect(llmPing).toHaveBeenCalledTimes(2);
  });

  it('probes db and storage against the configured Supabase URL', async () => {
    await service.check();

    const probedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(probedUrls).toEqual(
      expect.arrayContaining([
        'http://supabase.local/rest/v1/',
        'http://supabase.local/storage/v1/bucket',
      ]),
    );
  });

  it('marks db down on a non-ok response rather than throwing', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(service.check()).resolves.toMatchObject({ db: false, storage: false });
  });
});

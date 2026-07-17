import { Test } from '@nestjs/testing';

import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let llmPing: jest.Mock<Promise<boolean>, []>;
  let ttsPing: jest.Mock<Promise<boolean>, []>;
  let dbSelect: jest.Mock;
  let listBuckets: jest.Mock;

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: jest.fn(() => ({
              select: jest.fn(() => ({ limit: dbSelect })),
            })),
            storage: { listBuckets },
          },
        },
        { provide: LLM_PROVIDER, useValue: { ping: llmPing } as unknown as LlmProvider },
        { provide: TTS_PROVIDER, useValue: { ping: ttsPing } as unknown as TtsProvider },
      ],
    }).compile();

    return moduleRef.get(HealthService);
  };

  beforeEach(async () => {
    llmPing = jest.fn().mockResolvedValue(true);
    ttsPing = jest.fn().mockResolvedValue(true);
    dbSelect = jest.fn().mockResolvedValue({ error: null });
    listBuckets = jest.fn().mockResolvedValue({ data: [], error: null });

    service = await buildService();
  });

  afterEach(() => jest.restoreAllMocks());

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

  it('probes the database with a real query, not a gateway ping', async () => {
    await service.check();

    expect(dbSelect).toHaveBeenCalled();
  });

  it('marks db down on a query error rather than throwing', async () => {
    dbSelect.mockResolvedValue({ error: { message: 'connection refused' } });

    await expect(service.check()).resolves.toMatchObject({ db: false, storage: true });
  });

  it('marks storage down on a bucket-list error', async () => {
    listBuckets.mockResolvedValue({ data: null, error: { message: 'unreachable' } });

    await expect(service.check()).resolves.toMatchObject({ db: true, storage: false });
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
});

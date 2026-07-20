import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { CreditsService, weekStartFor } from './credits.service';

/**
 * Credits (Phase 7 test list: "credit spend/refund — error paths don't consume").
 *
 * That rule is the point of the suite. Product 09 §9.2 promises "Error: retry,
 * credit not consumed", and a cap that eats a credit on a failure stops reading
 * as pacing and starts reading as theft — from the users most likely to be
 * paying attention to what they are getting for their money.
 */
describe('CreditsService', () => {
  let service: CreditsService;
  let upsert: jest.Mock;
  let creditRow: { manifest_used: number } | null;
  let momentRow: { id: string; refine_of: string | null } | null;
  let children: { id: string }[];

  const NOW = new Date('2026-07-22T12:00:00Z'); // a Wednesday

  beforeEach(async () => {
    upsert = jest.fn().mockResolvedValue({ error: null });
    creditRow = null;
    momentRow = { id: 'moment-1', refine_of: null };
    children = [];
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: (table: string) => ({
              upsert,
              select: () => ({
                eq: (_col: string, value: string) => ({
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: creditRow, error: null }),
                  }),
                  maybeSingle: () => Promise.resolve({ data: momentRow, error: null }),
                  then: (resolve: (v: unknown) => unknown) =>
                    resolve({
                      data: table === 'moments' && value === 'moment-1' ? children : [],
                      error: null,
                    }),
                }),
              }),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => ({ MANIFEST_WEEKLY_LIMIT: 3, REFINE_PER_MOMENT: 1 })[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CreditsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('weekStartFor', () => {
    it('returns the Monday of the week', () => {
      expect(weekStartFor(new Date('2026-07-22T12:00:00Z'))).toBe('2026-07-20');
    });

    it('treats Monday itself as the start', () => {
      expect(weekStartFor(new Date('2026-07-20T00:00:00Z'))).toBe('2026-07-20');
    });

    it('keeps Sunday in the week that just ended, not the next one', () => {
      // ISO weeks end on Sunday; rolling it forward would hand out a second
      // allowance a day early, every week.
      expect(weekStartFor(new Date('2026-07-26T23:59:00Z'))).toBe('2026-07-20');
    });

    it('rolls to a new week on the following Monday', () => {
      expect(weekStartFor(new Date('2026-07-27T00:00:00Z'))).toBe('2026-07-27');
    });

    it('crosses a month boundary correctly', () => {
      expect(weekStartFor(new Date('2026-08-01T12:00:00Z'))).toBe('2026-07-27');
    });
  });

  describe('check', () => {
    it('reports a full allowance for a fresh week', async () => {
      creditRow = null;

      await expect(service.check('user-1', NOW)).resolves.toEqual({
        allowed: true,
        used: 0,
        limit: 3,
        remaining: 3,
      });
    });

    it('counts what she has already spent', async () => {
      creditRow = { manifest_used: 2 };

      await expect(service.check('user-1', NOW)).resolves.toMatchObject({
        allowed: true,
        remaining: 1,
      });
    });

    it('refuses once the allowance is gone', async () => {
      creditRow = { manifest_used: 3 };

      await expect(service.check('user-1', NOW)).resolves.toMatchObject({
        allowed: false,
        remaining: 0,
      });
    });

    it('does not spend anything just by checking', async () => {
      await service.check('user-1', NOW);

      expect(upsert).not.toHaveBeenCalled();
    });
  });

  describe('spend', () => {
    it('reserves a credit and reports what is left', async () => {
      creditRow = { manifest_used: 1 };

      await expect(service.spend('user-1', NOW)).resolves.toEqual({
        allowed: true,
        used: 2,
        limit: 3,
        remaining: 1,
      });
    });

    it('writes the reservation against the right week', async () => {
      await service.spend('user-1', NOW);

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', week_start: '2026-07-20', manifest_used: 1 }),
        { onConflict: 'user_id,week_start' },
      );
    });

    it('refuses without writing when she is out', async () => {
      creditRow = { manifest_used: 3 };

      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({ allowed: false });
      expect(upsert).not.toHaveBeenCalled();
    });

    it('fails CLOSED on a database error rather than letting everything through', async () => {
      upsert.mockResolvedValue({ error: { message: 'deadlock' } });

      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({ allowed: false });
    });
  });

  describe('refund — the rule that keeps a cap honest', () => {
    it('gives the credit back', async () => {
      creditRow = { manifest_used: 2 };

      await service.refund('user-1', NOW);

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ manifest_used: 1 }),
        expect.anything(),
      );
    });

    it('does nothing when nothing has been spent', async () => {
      creditRow = { manifest_used: 0 };

      await service.refund('user-1', NOW);

      expect(upsert).not.toHaveBeenCalled();
    });

    it('never mints a credit she was not given', async () => {
      // A double refund — a retry that fails twice — must not go negative and
      // hand her a free allowance.
      creditRow = null;

      await service.refund('user-1', NOW);

      expect(upsert).not.toHaveBeenCalled();
    });

    it('round-trips: spend then refund leaves her where she started', async () => {
      creditRow = { manifest_used: 1 };
      await service.spend('user-1', NOW);

      creditRow = { manifest_used: 2 };
      await service.refund('user-1', NOW);

      expect(upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({ manifest_used: 1 }),
        expect.anything(),
      );
    });
  });

  describe('canRefine — one per moment (product 09 §9.1)', () => {
    it('allows the first refine of an original moment', async () => {
      momentRow = { id: 'moment-1', refine_of: null };
      children = [];

      await expect(service.canRefine('moment-1')).resolves.toBe(true);
    });

    it('refuses a second refine of the same moment', async () => {
      children = [{ id: 'moment-2' }];

      await expect(service.canRefine('moment-1')).resolves.toBe(false);
    });

    it('refuses to refine a refinement — the cap is on the lineage, not the hop', async () => {
      // Otherwise a chain would be an unbounded budget, one refine at a time.
      momentRow = { id: 'moment-2', refine_of: 'moment-1' };

      await expect(service.canRefine('moment-2')).resolves.toBe(false);
    });

    it('refuses for a moment that does not exist', async () => {
      momentRow = null;

      await expect(service.canRefine('nope')).resolves.toBe(false);
    });
  });
});

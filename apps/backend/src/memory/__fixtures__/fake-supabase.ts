/**
 * A minimal fake of the PostgREST query builder, enough for the memory sampler.
 *
 * Two things it must do: resolve per-table fixture rows, and RECORD the filters
 * a query applied. The second matters because several of the sampler's privacy
 * rules — active-people-only, excluded-items-out — are enforced in the query, not
 * in TypeScript. Asserting the query shape is the only way to unit-test them.
 */
export interface TableFixtures {
  profiles?: Record<string, unknown> | null;
  people?: Record<string, unknown>[];
  memory_items?: Record<string, unknown>[];
  exact_phrases?: Record<string, unknown>[];
  never_include?: Record<string, unknown>[];
  moments?: Record<string, unknown>[];
}

export interface RecordedCall {
  table: string;
  method: string;
  args: unknown[];
}

export function fakeSupabase(fixtures: TableFixtures) {
  const calls: RecordedCall[] = [];

  const from = (table: string) => {
    const rows = (fixtures[table as keyof TableFixtures] as Record<string, unknown>[]) ?? [];
    const record = (method: string, args: unknown[]) => calls.push({ table, method, args });

    const builder: Record<string, unknown> = {
      // `.single()` / `.maybeSingle()` return one row (profiles); awaiting the
      // builder directly returns the row list (everything else).
      single: () => Promise.resolve({ data: fixtures.profiles ?? null, error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    };

    for (const method of ['select', 'eq', 'not', 'order', 'limit', 'gte', 'lt', 'in']) {
      builder[method] = (...args: unknown[]) => {
        record(method, args);
        return builder;
      };
    }

    return builder;
  };

  return {
    client: { from } as never,
    calls,
    /** Did any query on `table` apply `.eq(column, value)`? */
    appliedEq(table: string, column: string, value: unknown): boolean {
      return calls.some(
        (c) =>
          c.table === table && c.method === 'eq' && c.args[0] === column && c.args[1] === value,
      );
    },
  };
}

/** ISO timestamp `days` before `now` — for building recency/cooldown fixtures. */
export function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/**
 * A stateful in-memory stand-in for the `generation_jobs` table.
 *
 * The state machine's whole contract is "the job table is the source of truth"
 * (04 §4), so testing it against a mock that only records calls would prove
 * nothing. This fake actually stores rows and applies filters, letting the suite
 * assert the row a crashed-and-retried job ends up in.
 */
export interface JobRecord {
  id: string;
  user_id: string;
  artifact: string;
  status: string;
  moment_id: string | null;
  attempt: number;
  idempotency_key: string | null;
  created_at: string;
  finished_at: string | null;
  latency_ms: number | null;
  error: string | null;
}

type Filter = (row: JobRecord) => boolean;

export function fakeJobsTable(seed: Partial<JobRecord>[] = []) {
  const rows: JobRecord[] = [];
  let nextId = 1;
  let insertError: string | null = null;

  const create = (partial: Partial<JobRecord>): JobRecord => ({
    id: partial.id ?? `job-${nextId++}`,
    user_id: partial.user_id ?? 'user-1',
    artifact: partial.artifact ?? 'letter',
    status: partial.status ?? 'queued',
    moment_id: partial.moment_id ?? null,
    attempt: partial.attempt ?? 0,
    idempotency_key: partial.idempotency_key ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    finished_at: partial.finished_at ?? null,
    latency_ms: partial.latency_ms ?? null,
    error: partial.error ?? null,
  });

  for (const row of seed) rows.push(create(row));

  const from = () => {
    const filters: Filter[] = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let payload: Partial<JobRecord> = {};

    const matching = () => rows.filter((row) => filters.every((f) => f(row)));

    // PostgREST hands back detached JSON, so every read returns a COPY. Returning
    // live references would let a later update mutate a row a caller already
    // loaded — which the real client can never do, and which would quietly
    // invalidate any assertion about attempt counting.
    const detach = (list: JobRecord[]) => list.map((row) => ({ ...row }));

    const execute = (): { data: JobRecord[]; error: { message: string } | null } => {
      if (op === 'insert') {
        if (insertError) return { data: [], error: { message: insertError } };
        const row = create(payload);
        rows.push(row);
        return { data: detach([row]), error: null };
      }
      if (op === 'update') {
        const hits = matching();
        for (const row of hits) Object.assign(row, payload);
        return { data: detach(hits), error: null };
      }
      return { data: detach(matching()), error: null };
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      insert: (row: Partial<JobRecord>) => {
        op = 'insert';
        payload = row;
        return builder;
      },
      update: (patch: Partial<JobRecord>) => {
        op = 'update';
        payload = patch;
        return builder;
      },
      eq: (column: keyof JobRecord, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: keyof JobRecord, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      lt: (column: keyof JobRecord, value: string) => {
        filters.push((row) => String(row[column]) < value);
        return builder;
      },
      single: () => {
        const { data, error } = execute();
        return Promise.resolve({ data: data[0] ?? null, error });
      },
      maybeSingle: () => {
        const { data, error } = execute();
        return Promise.resolve({ data: data[0] ?? null, error });
      },
      then: (resolve: (v: unknown) => unknown) => resolve(execute()),
    };

    return builder;
  };

  return {
    client: { from } as never,
    rows,
    get: (id: string) => rows.find((r) => r.id === id),
    failNextInsert: (message: string) => {
      insertError = message;
    },
  };
}

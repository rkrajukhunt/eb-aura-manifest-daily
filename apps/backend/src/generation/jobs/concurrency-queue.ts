/**
 * A minimal concurrency-limited queue (04 §4: "p-queue per artifact class").
 *
 * Hand-rolled rather than pulling p-queue, which is ESM-only in current versions
 * and would fight the CommonJS NestJS/Jest setup (the same trap jose set). The
 * behaviour we need — cap N in-flight, queue the rest — is a few lines, and the
 * durable record is the `generation_jobs` table, not this queue (04 §4).
 */
export class ConcurrencyQueue {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly concurrency: number) {}

  /** Runs `task` once a slot is free; resolves/rejects with its result. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      // Release the next waiter, if any — FIFO keeps a queued job from starving.
      this.waiting.shift()?.();
    }
  }

  get pending(): number {
    return this.waiting.length;
  }
}

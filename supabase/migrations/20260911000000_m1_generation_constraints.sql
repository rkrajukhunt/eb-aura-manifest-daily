-- M1: atomic one-letter-per-user and one-refine-per-moment enforcement.
--
-- The read-then-act checks (`findExistingLetterJob`, `canRefine`) race under
-- two concurrent requests: both see "none" and both enqueue.  These partial
-- unique indexes make the second insert a `23505`, which the server re-reads
-- and returns as the existing job — the same idempotent shape the rest of the
-- system already expects.

-- 1. One active Letter per user.  Failed / qa_failed rows do NOT block a
--    retry — only queued / running / succeeded / retrying count.
create unique index if not exists generation_jobs_one_active_letter
  on public.generation_jobs (user_id)
  where artifact = 'letter'
    and status not in ('failed', 'qa_failed');

-- 2. One active Refine per source moment.
--
--    `moment_id` is only populated on job *success*, so the constraint keys
--    off the JSONB `input` column — which `refineRequestSchema` always
--    populates with `momentId` at enqueue time.
--
--    `input ->> 'momentId'` is a text expression; the index condition filters
--    to `artifact = 'refine'` so it never touches Letter / Daily rows.
create unique index if not exists generation_jobs_one_active_refine
  on public.generation_jobs ((input ->> 'momentId'))
  where artifact = 'refine'
    and status not in ('failed', 'qa_failed')
    and input ->> 'momentId' is not null;

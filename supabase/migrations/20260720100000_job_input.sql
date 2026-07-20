-- Phase 7 — generation job inputs (04 §4).
--
-- `moment` needs nothing, but `refine` carries a direction and an optional note,
-- and `manifest` carries her desire text. Those have to live somewhere the
-- PIPELINE can read them, not just the request handler: the job state machine
-- re-queues jobs left `running` by a crashed instance (04 §4), and an input held
-- only in memory would come back as a generation with no idea what it was for.
--
-- jsonb rather than columns because the shape differs per artifact and this is
-- transient operational data, not queryable domain data.
alter table public.generation_jobs
  add column input jsonb;

comment on column public.generation_jobs.input is
  'Per-artifact generation input (refine direction/note, manifest desire). Read by the pipeline, including after a crash re-queue.';

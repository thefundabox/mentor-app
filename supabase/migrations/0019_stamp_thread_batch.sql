-- 0019_stamp_thread_batch.sql
--
-- Stamp a thread's batch server-side too, for the same reason 0018 stamped the
-- author's name.
--
-- 0018 fixed the name mismatch and starting a discussion still failed, now with
-- an honest "new row violates row-level security policy for table threads".
-- The remaining disagreement was the batch.
--
-- assignStudentToBatch used to write only to localStorage, so a browser can
-- still hold `batchId: 'batch_ras_2026_morning'` for a user whose profiles row
-- has batch_id null. The client then sends that batch on a new thread, the
-- policy checks `batch_id = public.batch_of(auth.uid())`, null is not equal to
-- anything, and the insert is refused. The UI compounded it: the "you are not
-- in a batch" hint is keyed on the same stale local value, so the one user who
-- needed to see it was the one user it was hidden from.
--
-- Rather than ask the client to send the right batch, take it from the caller.
-- A non-staff thread is always filed in the caller's own cohort, whatever the
-- request said, which also makes cross-batch injection impossible by
-- construction rather than by policy.
--
-- A caller with no batch who is not posting to a microtheme now trips
-- threads_anchored_check (23514) instead of the RLS policy -- a specific error
-- the client can translate into "you are not in a batch yet" rather than a
-- generic refusal.

create or replace function public.stamp_thread_author()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
begin
  new.created_by      := caller;
  new.created_by_name := public.name_of(caller);

  -- Batch rooms only. A microtheme thread is global and carries no batch.
  if new.topic_id is null then
    if public.current_role_of(caller) in ('mentor', 'admin') then
      -- Staff may name a cohort explicitly; default to their own.
      new.batch_id := coalesce(new.batch_id, public.batch_of(caller));
    else
      new.batch_id := public.batch_of(caller);
    end if;
  else
    new.batch_id := null;
  end if;

  return new;
end;
$$;

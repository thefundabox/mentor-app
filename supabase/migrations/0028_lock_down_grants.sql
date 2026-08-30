-- 0028_lock_down_grants.sql
--
-- Take back the table privileges Supabase hands out by default.
--
-- New tables in `public` inherit ALL privileges for `authenticated` from
-- Supabase's default-privilege setup. So in 0026 and 0027 the narrow grants
--
--   grant select on public.question_unlocks to authenticated;
--   grant update (answers, finished_at, score, max_score, section_scores)
--     on public.test_attempts to authenticated;
--
-- did not narrow anything: they added to a full set that was already there.
-- 0001 got this right for profiles and it is the same lesson --
--
--   revoke update on public.profiles from authenticated;
--   grant  update (name) on public.profiles to authenticated;
--
-- the revoke is what makes the grant mean something.
--
-- WHAT WAS ACTUALLY REACHABLE
--
-- question_unlocks and plan_limits were saved by RLS: both have row security on
-- and neither has an INSERT policy, so the stray grants had nothing to act
-- through. They are revoked below anyway -- a privilege whose only guard is the
-- continued absence of a policy is a trap for whoever adds the next policy.
--
-- test_attempts was genuinely exploitable. With UPDATE on every column, a free
-- student could repoint one of their own attempts at a test_id they had already
-- used. The allowance counts DISTINCT test_id, so collapsing two attempts onto
-- one test dropped the count from 3 to 2 and freed a slot -- repeatable for as
-- many tests as they liked. RLS did not catch it: `with check (student_id =
-- auth.uid())` was still satisfied, because student_id was never the column
-- being changed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- question_unlocks -- readable, never writable from a client
--
-- unlock_questions() is security definer and writes as the owner, so revoking
-- everything here does not affect it. Nothing else should ever write this
-- table: it is the record of what a student has been given.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references
  on public.question_unlocks from authenticated;
grant  select on public.question_unlocks to authenticated;

-- ---------------------------------------------------------------------------
-- plan_limits -- the caps themselves
--
-- Read by the app to render the meter. Changed by a human in the SQL editor,
-- which runs as the service role and is unaffected by this. There is no admin
-- UI for pricing, so no client needs write privilege; if one is built later,
-- grant it then and deliberately.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references
  on public.plan_limits from authenticated;
grant  select on public.plan_limits to authenticated;

-- ---------------------------------------------------------------------------
-- test_attempts -- the one that was reachable
--
-- After the revoke, a student may write only the five columns that record how
-- their sitting went. test_id, student_id, started_at and id are fixed at
-- insert by the trigger and are no longer writable at all, so the distinct-test
-- count cannot be manipulated after the fact.
-- ---------------------------------------------------------------------------

revoke update, delete, truncate, references
  on public.test_attempts from authenticated;
grant  update (answers, finished_at, score, max_score, section_scores)
  on public.test_attempts to authenticated;

-- select and insert stay as granted in 0027; insert is still gated by the
-- before-insert trigger and the "start own attempt" policy.

-- ---------------------------------------------------------------------------
-- tests -- catalogue writes stay, but only staff get through RLS
--
-- Left as granted: mentors and admins are `authenticated` too, and "staff write
-- tests" is what actually decides. Delete is revoked because nothing in the app
-- deletes a test, and an accidental cascade would take every attempt with it.
-- ---------------------------------------------------------------------------

revoke delete, truncate on public.tests from authenticated;

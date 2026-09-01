-- 0035_reconcile_access_control.sql
--
-- Re-apply 0028-0031 idempotently, and REPORT rather than abort.
--
-- WHY THIS EXISTS
--
-- Probing production shows set_plan_limits (0031) does not exist, and that the
-- free plan's daily_unlocks is still 20 even though 0030 was meant to null it.
-- Both were reported as run. The likely cause is the Supabase SQL editor's
-- single-transaction behaviour meeting a hard assertion:
--
--   0029 ends with `raise exception` if anon still holds SELECT on questions,
--   and it tests that with information_schema.column_privileges -- which does
--   NOT account for a privilege held through PUBLIC. If anon reads questions
--   via a grant to PUBLIC, `revoke select ... from anon` genuinely changes
--   nothing, the assertion fires, and the editor rolls back the WHOLE buffer --
--   taking 0030 and 0031 with it, whichever order they were pasted in.
--
-- So this file:
--   * revokes from PUBLIC as well as anon, which is what actually removes it;
--   * tests with has_table_privilege, which counts inherited and PUBLIC grants;
--   * raises NOTICE, never exception, so nothing here can roll back anything.
--
-- Safe to run repeatedly. Read the NOTICEs at the end -- they are the report.
-- ---------------------------------------------------------------------------

-- ---- 0028: writes clients must not have -----------------------------------
revoke insert, update, delete on public.plan_limits from authenticated;
grant  select                 on public.plan_limits to   authenticated;

-- ---- 0029: questions are not public ---------------------------------------
-- from PUBLIC as well: a grant to PUBLIC is why the original revoke could look
-- like it had failed. Revoking a privilege that was never granted is a no-op,
-- not an error, so both statements are safe either way.
revoke select on public.questions from anon;
revoke select on public.questions from public;

-- ---- 0030: no daily question cap on the free plan -------------------------
update public.plan_limits
   set daily_unlocks = null, updated_at = now()
 where plan = 'free' and daily_unlocks is not null;

-- ---- 0031: the admin-only door to the caps --------------------------------
create or replace function public.set_plan_limits(
  target_plan       text,
  new_daily_unlocks int,
  new_max_tests     int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if public.current_role_of(caller) <> 'admin' then
    raise exception 'Only an admin can change plan limits' using errcode = '42501';
  end if;
  if target_plan not in ('free', 'paid') then
    raise exception 'Unknown plan: %', target_plan using errcode = '22023';
  end if;
  if new_daily_unlocks is not null and new_daily_unlocks < 0 then
    raise exception 'Daily questions cannot be negative' using errcode = '22023';
  end if;
  if new_max_tests is not null and new_max_tests < 0 then
    raise exception 'Mock tests cannot be negative' using errcode = '22023';
  end if;

  update public.plan_limits
     set daily_unlocks = new_daily_unlocks,
         max_tests     = new_max_tests,
         updated_at    = now()
   where plan = target_plan;

  if not found then
    raise exception 'No such plan: %', target_plan using errcode = 'P0002';
  end if;
end $$;

revoke all     on function public.set_plan_limits(text, int, int) from public;
grant  execute on function public.set_plan_limits(text, int, int) to   authenticated;

comment on function public.set_plan_limits(text, int, int) is
  'Admin-only. The single way a client may change plan_limits; direct writes stay revoked (0028).';

-- PostgREST caches the schema and will 404 a brand-new function until told.
notify pgrst, 'reload schema';

-- ---- the report ------------------------------------------------------------
do $$
declare
  free_cap   int;
  anon_reads boolean;
  fn         text;
  pyq_pol    text;
begin
  select daily_unlocks into free_cap from public.plan_limits where plan = 'free';
  anon_reads := has_table_privilege('anon', 'public.questions', 'SELECT');
  fn := coalesce(to_regprocedure('public.set_plan_limits(text,int,int)')::text, 'MISSING');
  select policyname into pyq_pol from pg_policies
   where tablename = 'questions' and policyname = 'students read unlocked questions';

  raise notice '--------------------------------------------------';
  raise notice 'free daily cap      : %', coalesce(free_cap::text, 'none (correct)');
  raise notice 'anon reads questions: %  (expected: false)', anon_reads;
  raise notice 'set_plan_limits     : %', fn;
  raise notice 'PYQ policy present  : %', coalesce(pyq_pol, 'MISSING -- run 0029');
  raise notice '--------------------------------------------------';
end $$;

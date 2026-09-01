-- 0030_remove_free_daily_cap.sql
--
-- No daily question limit on the free plan.
--
-- 0026 put the cap in a row rather than a constant precisely so this would be
-- one statement and no deploy. NULL means unmetered, which is what 'paid'
-- has always been; 'free' now matches it.
--
-- What this does NOT remove: the metering machinery. unlock_questions still
-- resolves the plan, and the ledger still records what a student has been
-- shown, so reinstating a limit is a single UPDATE:
--
--   update public.plan_limits set daily_unlocks = 20 where plan = 'free';
--
-- The meter in the UI needs no change either -- QuotaMeter renders nothing when
-- the cap comes back null, so it disappears on its own rather than showing
-- "0 of unlimited".
--
-- The mock-test allowance (max_tests) is untouched: free still gets three.
-- That is a separate lever and was not what the limit removal was about.
-- ---------------------------------------------------------------------------

update public.plan_limits
   set daily_unlocks = null,
       updated_at = now()
 where plan = 'free';

-- Sanity: both plans unmetered on questions, free still capped on mock tests.
do $$
declare free_q int; free_t int;
begin
  select daily_unlocks, max_tests into free_q, free_t
    from public.plan_limits where plan = 'free';
  if free_q is not null then
    raise exception 'free plan still has a daily question cap of %', free_q;
  end if;
  if free_t is null then
    raise exception 'free plan lost its mock-test allowance, which this migration should not touch';
  end if;
end $$;

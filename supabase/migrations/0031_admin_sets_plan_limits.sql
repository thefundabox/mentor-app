-- 0031_admin_sets_plan_limits.sql
--
-- Let an admin change the plan limits from the app instead of the SQL editor.
--
-- 0028 revoked INSERT/UPDATE/DELETE on plan_limits from `authenticated`, on the
-- grounds that no client needed to write pricing levers and a stray permissive
-- policy should not be able to expose them. That reasoning still holds, so this
-- does not hand the grant back. It adds one security definer function instead,
-- checked for admin, exactly as 0008 did for roles and 0025 for entitlements.
--
-- Mentors are NOT included. What the free tier includes is a commercial
-- decision, not a teaching one, and a mentor changing it would silently change
-- it for every student in the institute rather than only their own.
--
-- NULL means unmetered for both columns, which is how 'paid' has always been
-- stored and how 'free' has been stored since 0030. The function takes NULL
-- through rather than treating 0 as "off": 0 is a real, different setting that
-- means "this plan gets none", and conflating the two would make it impossible
-- to express.
-- ---------------------------------------------------------------------------

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

  -- The table's own checks would catch these, but a constraint violation
  -- reaches the client as a wall of Postgres text. These say what is wrong.
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

grant execute on function public.set_plan_limits(text, int, int) to authenticated;

comment on function public.set_plan_limits(text, int, int) is
  'Admin-only. The single way a client may change plan_limits; direct writes stay revoked (0028).';

-- Sanity: the function exists and the table is still not directly writable by
-- clients. If a later migration hands the grant back, this fails loudly.
do $$
declare direct_writes int;
begin
  if to_regprocedure('public.set_plan_limits(text,int,int)') is null then
    raise exception 'set_plan_limits was not created';
  end if;
  select count(*) into direct_writes
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'plan_limits'
     and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE');
  if direct_writes > 0 then
    raise exception 'plan_limits is directly writable by authenticated (% column grants); 0028 revoked this on purpose', direct_writes;
  end if;
end $$;

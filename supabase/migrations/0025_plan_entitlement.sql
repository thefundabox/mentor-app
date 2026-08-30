-- 0025_plan_entitlement.sql
--
-- Which product a person is on.
--
-- 'free' and 'paid' are the only values. Everything that meters access reads
-- this column and nothing else, so there is exactly one place to look when a
-- student says they cannot get at something they paid for.
--
-- The column is deliberately NOT client-writable, and gets that for free from
-- the column-level grants set up in 0001: `revoke update on profiles from
-- authenticated` followed by `grant update (name)` means a new column starts
-- with no client UPDATE privilege at all. A student can read their own plan
-- and can never set it. Same guard that stops role escalation.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists plan text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'paid'));
  end if;
end $$;

comment on column public.profiles.plan is
  'Product entitlement: free | paid. Client reads, never writes. Set via set_user_plan().';

create index if not exists profiles_plan_idx on public.profiles (plan);

-- ---------------------------------------------------------------------------
-- Reading your own plan
--
-- A security definer helper so policies and functions elsewhere can ask the
-- question without every one of them needing a select on profiles (a policy on
-- profiles that selects from profiles would recurse -- same reason
-- current_role_of exists in 0001).
-- ---------------------------------------------------------------------------

create or replace function public.current_plan_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select plan from public.profiles where id = uid), 'free');
$$;

comment on function public.current_plan_of(uuid) is
  'Entitlement of a user. Defaults to free for unknown ids, so a missing row is never an upgrade.';

grant execute on function public.current_plan_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- set_user_plan(target, plan)
--
-- Admin only, and mirrors set_user_role from 0008. Clients have no UPDATE
-- privilege on the column, so this function is the only way in from the app.
--
-- Unlike set_user_role this does NOT refuse to act on the caller: an admin
-- moving their own account onto the paid plan to check something is ordinary,
-- and there is no escalation to prevent -- 'paid' grants no authority over
-- anyone else, only access to content.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_plan(target_id uuid, new_plan text)
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
    raise exception 'Only an admin can change a plan' using errcode = '42501';
  end if;

  if new_plan not in ('free', 'paid') then
    raise exception 'Unknown plan: %', new_plan using errcode = '22023';
  end if;

  update public.profiles
     set plan = new_plan
   where id = target_id;

  if not found then
    raise exception 'No such user' using errcode = 'P0002';
  end if;
end $$;

grant execute on function public.set_user_plan(uuid, text) to authenticated;

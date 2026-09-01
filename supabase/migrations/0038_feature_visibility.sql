-- 0038_feature_visibility.sql
--
-- Turn parts of the product off without a deploy.
--
-- The immediate need is the Mains tab on the topic screen: it should come down
-- while the Mains content is not ready, and go back up later, without editing
-- TopicScreen.tsx and shipping a build. The table is keyed by feature so the
-- next thing that needs hiding is a row, not another migration.
--
-- THREE STATES, NOT A BOOLEAN
--
--   visible  everyone sees it
--   hidden   students and visitors do not; mentors and admins still do, so the
--            feature can be checked before it goes back up
--   removed  nobody sees it, staff included
--
-- "hidden" is the one that earns its keep: an on/off switch forces an admin to
-- expose a half-finished feature to every student in order to look at it.
--
-- WRITTEN THROUGH AN RPC, NOT A TABLE GRANT
--
-- Deliberate, and not merely conventional. PostgREST answers an UPDATE that
-- matched no rows with 204 and no error, so a write RLS filtered out is
-- indistinguishable from one that succeeded -- which is exactly the failure
-- being chased on institute_settings right now, where the admin form reports
-- success and the row never moves. A security definer function raises instead,
-- so a refused write arrives as an error the admin can read.
-- ---------------------------------------------------------------------------

create table if not exists public.feature_flags (
  key        text primary key,
  state      text not null default 'visible'
             check (state in ('visible', 'hidden', 'removed')),
  label      text not null,
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is
  'Per-feature visibility. visible / hidden (staff only) / removed (nobody).';

insert into public.feature_flags (key, state, label) values
  ('topic_mains', 'visible', 'Mains tab on the topic screen')
on conflict (key) do nothing;

alter table public.feature_flags enable row level security;

-- Read by anyone: what is switched on is not a secret, and the client has to
-- know before it renders. Consistent with institute_settings (0037).
drop policy if exists "anyone reads feature flags" on public.feature_flags;
create policy "anyone reads feature flags"
  on public.feature_flags for select
  using (true);

-- No write policy at all. The RPC below is the only door, and it runs as owner.
revoke all    on public.feature_flags from anon, authenticated;
grant  select on public.feature_flags to   anon, authenticated;

-- ---------------------------------------------------------------------------
-- set_feature_state(key, state) -- admin only, and loud when refused
-- ---------------------------------------------------------------------------

create or replace function public.set_feature_state(target_key text, new_state text)
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
    raise exception 'Only an admin can change what is visible' using errcode = '42501';
  end if;
  if new_state not in ('visible', 'hidden', 'removed') then
    raise exception 'Unknown state: %', new_state using errcode = '22023';
  end if;

  update public.feature_flags
     set state = new_state, updated_at = now()
   where key = target_key;

  -- The whole point of the RPC: nothing matched is an error, not a shrug.
  if not found then
    raise exception 'No such feature: %', target_key using errcode = 'P0002';
  end if;
end $$;

revoke all     on function public.set_feature_state(text, text) from public;
grant  execute on function public.set_feature_state(text, text) to   authenticated;

notify pgrst, 'reload schema';

do $$
declare n int;
begin
  select count(*) into n from public.feature_flags;
  if to_regprocedure('public.set_feature_state(text,text)') is null then
    raise exception 'set_feature_state was not created';
  end if;
  raise notice 'feature_flags ready with % row(s)', n;
end $$;

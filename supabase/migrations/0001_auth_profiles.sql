-- 0001_auth_profiles.sql
--
-- Real identity for RAS Mentorship.
--
-- Until now `currentUser` (including `role`) lived in localStorage, which means
-- anyone could open devtools and make themselves an admin. This migration moves
-- role to a Postgres table that the client can read but never write, so the role
-- a user claims in the browser is irrelevant — only this table decides.
--
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'student'
             check (role in ('student', 'mentor', 'admin')),
  mentor_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table  public.profiles      is 'Application identity. Mirrors auth.users, adds role + mentor assignment.';
comment on column public.profiles.role is 'Authoritative role. Client can read but never write this column.';

create index if not exists profiles_role_idx      on public.profiles (role);
create index if not exists profiles_mentor_id_idx on public.profiles (mentor_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile whenever someone signs up
--
-- Without this, a user could authenticate but have no role, and the app would
-- have nothing to route on. `security definer` is required: the trigger runs as
-- the signing-up user, who has no insert rights on profiles.
--
-- Role is deliberately NOT read from user metadata — that is client-supplied
-- and would let anyone self-assign admin at signup. Everyone starts as a
-- student; promotion happens server-side (see the note at the bottom).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The anon key ships in the browser bundle and is readable by anyone who opens
-- the deployed site. RLS is therefore the ONLY thing protecting this data —
-- not the key, not the client code.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Helper: read a user's role without recursively triggering profile policies.
-- A policy on profiles that itself selects from profiles would recurse; the
-- security-definer wrapper breaks that cycle.
create or replace function public.current_role_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = uid;
$$;

-- Everyone signed in can read their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Mentors and admins can read every profile (mentor dashboard lists students).
drop policy if exists "staff read all profiles" on public.profiles;
create policy "staff read all profiles"
  on public.profiles for select
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

-- A user may edit their own name only. Role and mentor_id are omitted from the
-- with-check clause below on purpose: this policy permits the UPDATE, and the
-- column-level grant that follows is what actually stops role escalation.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins may change anyone's role / mentor assignment.
drop policy if exists "admins write profiles" on public.profiles;
create policy "admins write profiles"
  on public.profiles for update
  using (public.current_role_of(auth.uid()) = 'admin')
  with check (public.current_role_of(auth.uid()) = 'admin');

-- Column-level privileges: this is the real guard on role escalation.
-- Even though "update own profile" allows the row, a non-admin has no UPDATE
-- privilege on the role or mentor_id columns, so the write is rejected.
revoke update on public.profiles from authenticated;
grant  update (name) on public.profiles to authenticated;
grant  select on public.profiles to authenticated;

-- No insert/delete grants for clients at all — profiles are created by the
-- signup trigger and removed by the cascade from auth.users.

-- ---------------------------------------------------------------------------
-- Promoting a mentor or admin
--
-- Roles cannot be self-assigned from the app. To promote someone, run this
-- here in the SQL editor (which runs as the service role and bypasses RLS):
--
--   update public.profiles set role = 'mentor' where email = 'priya.mentor@example.com';
--   update public.profiles set role = 'admin'  where email = 'you@example.com';
--
-- To assign a student to a mentor:
--
--   update public.profiles
--      set mentor_id = (select id from public.profiles where email = 'priya.mentor@example.com')
--    where email = 'student@example.com';
-- ---------------------------------------------------------------------------

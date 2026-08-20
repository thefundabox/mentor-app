-- 0008_admin_role_management.sql
--
-- Let an admin change roles and mentor assignments from the app, instead of
-- only from the SQL editor.
--
-- Why this needs functions rather than a policy change
-- ----------------------------------------------------
-- 0001 already carries a policy that intends to allow this:
--
--   create policy "admins write profiles" on public.profiles for update
--     using (public.current_role_of(auth.uid()) = 'admin');
--
-- but it can never take effect, because the column grants a few lines below it
-- leave `authenticated` holding UPDATE on `name` alone. Admins authenticate as
-- that same Postgres role, so they have no privilege on `role` or `mentor_id`.
--
-- The obvious repair — granting update(role) to authenticated — would be a
-- serious mistake. The "update own profile" policy permits any user to update
-- their own row, and an RLS policy cannot restrict WHICH columns a statement
-- touches. Every student could then set role = 'admin' on themselves: exactly
-- the escalation the column grant exists to prevent.
--
-- So the grants stay locked down and the two operations are exposed as
-- security-definer functions that check the caller first. `authenticated` still
-- cannot write role or mentor_id directly.
--
-- Run this in the Supabase dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- set_user_role(target, role)
--
-- Admin-only. Refuses to change the caller's own role: one dropdown misclick
-- should not be able to lock the last admin out of the admin panel. Demote
-- yourself from the SQL editor if you really mean to.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_role(target_id uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller  uuid := auth.uid();
  updated public.profiles;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if public.current_role_of(caller) <> 'admin' then
    raise exception 'Only an admin can change roles' using errcode = '42501';
  end if;

  if target_id = caller then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;

  if new_role not in ('student', 'mentor', 'admin') then
    raise exception 'Unknown role: %', new_role using errcode = '22023';
  end if;

  update public.profiles
     set role = new_role
   where id = target_id
   returning * into updated;

  if updated.id is null then
    raise exception 'No profile with id %', target_id using errcode = 'P0002';
  end if;

  -- Someone who is no longer a mentor must not stay listed as one on their
  -- students' rows, or the mentor dashboard would keep showing a cohort to a
  -- person who can no longer read it.
  if new_role <> 'mentor' then
    update public.profiles set mentor_id = null where mentor_id = target_id;
  end if;

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_user_mentor(student, mentor)
--
-- Admin-only. Pass null to unassign. The mentor argument must actually name a
-- mentor, and the target must actually be a student.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_mentor(target_id uuid, mentor uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller  uuid := auth.uid();
  updated public.profiles;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if public.current_role_of(caller) <> 'admin' then
    raise exception 'Only an admin can assign mentors' using errcode = '42501';
  end if;

  if public.current_role_of(target_id) <> 'student' then
    raise exception 'Only a student can be assigned a mentor' using errcode = '22023';
  end if;

  if mentor is not null and public.current_role_of(mentor) <> 'mentor' then
    raise exception 'Assigned user is not a mentor' using errcode = '22023';
  end if;

  update public.profiles
     set mentor_id = mentor
   where id = target_id
   returning * into updated;

  if updated.id is null then
    raise exception 'No profile with id %', target_id using errcode = 'P0002';
  end if;

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute rights
--
-- `authenticated` may call these; the admin check inside each one is what
-- actually decides. Revoking from public first keeps anon out.
-- ---------------------------------------------------------------------------

revoke all on function public.set_user_role(uuid, text)  from public;
revoke all on function public.set_user_mentor(uuid, uuid) from public;

grant execute on function public.set_user_role(uuid, text)  to authenticated;
grant execute on function public.set_user_mentor(uuid, uuid) to authenticated;

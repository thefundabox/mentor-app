-- 0017_open_discussions.sql
--
-- Open up discussions: anyone can start a topic, mentors moderate, and a
-- discussion can hang off a syllabus microtheme as well as a batch.
--
-- What was wrong
-- --------------
-- 0002 deliberately sealed threads shut: no insert policy, `kind` checked
-- against exactly two values, and unique (batch_id, kind) capping a batch at
-- two rows forever. Four threads existed and no UI could ever add a fifth.
--
-- Worse, none of it was reachable. Thread visibility is
-- `batch_id = batch_of(auth.uid())`, and every student had a null batch_id --
-- null = null is null, not true -- so all three students saw zero threads.
-- Staff only saw them by bypassing the batch check on role. The feature has
-- never been usable by a student. 0002's own closing comment admits the cause:
-- "Assigning a student to a batch (admin action; no UI yet)". This adds the
-- function that UI needs.
--
-- Two kinds of discussion now
-- ---------------------------
--   batch room    -- batch_id set, topic_id null. Scoped to a cohort.
--   microtheme    -- topic_id set, batch_id null. Global on purpose: a doubt
--                    about Bijolia is worth the same to every student, and
--                    splitting it per batch would fragment a small cohort into
--                    rooms of one.
--
-- Moderation rather than gatekeeping: anyone may start a topic, and mentors
-- and admins can lock, pin, retitle or remove one.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.threads add column if not exists topic_id        text;
alter table public.threads add column if not exists created_by      uuid references public.profiles (id) on delete set null;
alter table public.threads add column if not exists created_by_name text not null default '';
alter table public.threads add column if not exists locked          boolean not null default false;
alter table public.threads add column if not exists pinned          boolean not null default false;

comment on column public.threads.topic_id is
  'Microtheme id (e.g. raj-hist-m20) when this is a syllabus discussion. Null for batch rooms.';

-- batch_id has to be nullable now: a microtheme thread belongs to no cohort.
alter table public.threads alter column batch_id drop not null;

-- 'topic' is what users create. The two seeded kinds stay for the standing
-- rooms so existing rows and 0002 keep their meaning.
alter table public.threads drop constraint if exists threads_kind_check;
alter table public.threads add  constraint threads_kind_check
  check (kind in ('announcements', 'doubts', 'topic'));

-- A thread must be anchored to something, or nobody can ever see it.
alter table public.threads drop constraint if exists threads_anchored_check;
alter table public.threads add  constraint threads_anchored_check
  check (batch_id is not null or topic_id is not null);

-- The old blanket unique(batch_id, kind) capped a batch at two threads. Keep
-- uniqueness only for the two standing rooms, so 0002 stays idempotent while
-- any number of 'topic' rows can exist.
alter table public.threads drop constraint if exists threads_batch_id_kind_key;
create unique index if not exists threads_standing_room_uniq
  on public.threads (batch_id, kind)
  where kind in ('announcements', 'doubts');

create index if not exists threads_topic_idx  on public.threads (topic_id) where topic_id is not null;
create index if not exists threads_batch_idx  on public.threads (batch_id) where batch_id is not null;

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------

drop policy if exists "read threads in my batch" on public.threads;
create policy "read visible threads"
  on public.threads for select
  using (
    public.current_role_of(auth.uid()) in ('mentor', 'admin')
    or topic_id is not null                       -- syllabus discussions are global
    or batch_id = public.batch_of(auth.uid())
  );

-- can_see_thread backs the comment policies; widen it the same way.
create or replace function public.can_see_thread(uid uuid, tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.threads t
     where t.id = tid
       and (
         public.current_role_of(uid) in ('mentor', 'admin')
         or t.topic_id is not null
         or t.batch_id = public.batch_of(uid)
       )
  );
$$;

-- ---------------------------------------------------------------------------
-- Creating a thread
--
-- Anyone signed in. created_by / created_by_name are checked against the real
-- profile, the same anti-spoofing 0003 applied to comments.
--
-- Two things only staff may do: create a standing room ('announcements' /
-- 'doubts'), and create one that students cannot post in. A student who could
-- set staff_only_post would be able to make a room nobody but staff can reply
-- in, which is a way to have the last word, not a discussion.
-- ---------------------------------------------------------------------------

drop policy if exists "create thread" on public.threads;
create policy "create thread"
  on public.threads for insert
  with check (
    created_by = auth.uid()
    and created_by_name = public.name_of(auth.uid())
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or (
        kind = 'topic'
        and not staff_only_post
        and not pinned
        -- Anchored to something...
        and (topic_id is not null or batch_id is not null)
        -- ...and if it names a batch, it must be the caller's own. Checking
        -- only `topic_id is not null or batch_id = mine` would have let a
        -- student set BOTH and file a thread into another cohort's room list.
        and (batch_id is null or batch_id = public.batch_of(auth.uid()))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Moderation
--
-- Staff can lock, pin, retitle or delete anything. An author may delete their
-- own thread only while nobody else has replied -- otherwise deleting it takes
-- other people's answers with it (comments cascade).
-- ---------------------------------------------------------------------------

drop policy if exists "moderate threads" on public.threads;
create policy "moderate threads"
  on public.threads for update
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'))
  with check (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

drop policy if exists "delete thread" on public.threads;
create policy "delete thread"
  on public.threads for delete
  using (
    public.current_role_of(auth.uid()) in ('mentor', 'admin')
    or (
      created_by = auth.uid()
      and not exists (
        select 1 from public.comments c
         where c.thread_id = threads.id and c.author_id <> auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Comments: respect the lock
-- ---------------------------------------------------------------------------

drop policy if exists "post comment" on public.comments;
create policy "post comment"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and author_name = public.name_of(auth.uid())
    and author_role = public.current_role_of(auth.uid())
    and public.can_see_thread(auth.uid(), thread_id)
    and not exists (
      select 1 from public.threads t
       where t.id = thread_id and t.locked
    )
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or not exists (
        select 1 from public.threads t
         where t.id = thread_id and t.staff_only_post
      )
    )
  );

grant insert, update, delete on public.threads to authenticated;

-- ---------------------------------------------------------------------------
-- set_user_batch(target, batch)
--
-- Batch assignment had no UI because `authenticated` holds UPDATE on
-- profiles.name alone -- for the reason 0008 explains at length, widening that
-- grant would let any student rewrite their own role. So this is a
-- security-definer function that checks the caller first, exactly like
-- set_user_role and set_user_mentor.
--
-- Null clears the batch. Admins only: batch decides who reads which room.
-- ---------------------------------------------------------------------------

create or replace function public.set_user_batch(target_id uuid, new_batch text)
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
    raise exception 'Only an admin can assign a batch' using errcode = '42501';
  end if;

  update public.profiles
     set batch_id = nullif(btrim(coalesce(new_batch, '')), '')
   where id = target_id
  returning * into updated;

  if updated.id is null then
    raise exception 'No such user' using errcode = 'P0002';
  end if;

  return updated;
end;
$$;

revoke all on function public.set_user_batch(uuid, text) from public;
grant execute on function public.set_user_batch(uuid, text) to authenticated;

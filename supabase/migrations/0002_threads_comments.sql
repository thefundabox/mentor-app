-- 0002_threads_comments.sql
--
-- Discussion threads with comments, scoped to a batch.
--
-- Each batch gets exactly two standing threads:
--   announcements — staff post, everyone in the batch reads
--   doubts        — anyone in the batch posts
--
-- There is no thread-creation UI and no client insert policy on threads:
-- the four rows below are the whole set, seeded here.
--
-- Run in Supabase → SQL Editor. Idempotent.

-- ---------------------------------------------------------------------------
-- Batch membership has to exist in Postgres for RLS to scope reads by batch.
-- Until now it lived only in localStorage as User.batchId, which the database
-- cannot see and a student could edit.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists batch_id text;
create index if not exists profiles_batch_id_idx on public.profiles (batch_id);

comment on column public.profiles.batch_id is
  'Cohort the user belongs to. Determines thread visibility. Admin-assigned; clients cannot write it.';

-- Read a user's batch without recursing through profiles policies.
create or replace function public.batch_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select batch_id from public.profiles where id = uid;
$$;

-- ---------------------------------------------------------------------------
-- threads
-- ---------------------------------------------------------------------------

create table if not exists public.threads (
  id              uuid primary key default gen_random_uuid(),
  batch_id        text not null,
  kind            text not null check (kind in ('announcements', 'doubts')),
  title           text not null,
  -- When true only mentors/admins may comment; students read only.
  staff_only_post boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (batch_id, kind)
);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists comments_thread_created_idx on public.comments (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Seed: two threads per batch. Batch ids mirror DEFAULT_BATCHES in src/data.
-- ---------------------------------------------------------------------------

insert into public.threads (batch_id, kind, title, staff_only_post) values
  ('batch_ras_2026_morning', 'announcements', 'Announcements', true),
  ('batch_ras_2026_morning', 'doubts',        'Doubts & discussion', false),
  ('batch_ras_2026_evening', 'announcements', 'Announcements', true),
  ('batch_ras_2026_evening', 'doubts',        'Doubts & discussion', false)
on conflict (batch_id, kind) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.threads  enable row level security;
alter table public.comments enable row level security;

-- Can this user see this thread at all?
create or replace function public.can_see_thread(uid uuid, tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.threads t
     where t.id = tid
       and (
         public.current_role_of(uid) in ('mentor', 'admin')
         or t.batch_id = public.batch_of(uid)
       )
  );
$$;

-- threads: read only, no client writes at all.
drop policy if exists "read threads in my batch" on public.threads;
create policy "read threads in my batch"
  on public.threads for select
  using (
    public.current_role_of(auth.uid()) in ('mentor', 'admin')
    or batch_id = public.batch_of(auth.uid())
  );

-- comments: read anything in a thread you can see.
drop policy if exists "read comments in visible threads" on public.comments;
create policy "read comments in visible threads"
  on public.comments for select
  using (public.can_see_thread(auth.uid(), thread_id));

-- comments: post as yourself, into a thread you can see, and only if the
-- thread is open to you. author_id = auth.uid() stops impersonation.
drop policy if exists "post comment" on public.comments;
create policy "post comment"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and public.can_see_thread(auth.uid(), thread_id)
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or not exists (
        select 1 from public.threads t
         where t.id = thread_id and t.staff_only_post
      )
    )
  );

-- comments: delete your own; staff can remove anything (moderation).
drop policy if exists "delete own or staff" on public.comments;
create policy "delete own or staff"
  on public.comments for delete
  using (
    author_id = auth.uid()
    or public.current_role_of(auth.uid()) in ('mentor', 'admin')
  );

-- No update policy: comments are immutable in v1.

grant select                 on public.threads  to authenticated;
grant select, insert, delete on public.comments to authenticated;

-- ---------------------------------------------------------------------------
-- Assigning a student to a batch (admin action; no UI yet):
--
--   update public.profiles set batch_id = 'batch_ras_2026_morning'
--    where email = 'someone@example.com';
-- ---------------------------------------------------------------------------

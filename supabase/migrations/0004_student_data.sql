-- 0004_student_data.sql
--
-- Moves student data out of localStorage into Postgres, so the app finally
-- works across devices and a mentor can see their students' real progress.
--
-- Split by WRITER, not by entity. A single JSONB document per student would be
-- simpler, but the mentor approving a chart and the student finishing a quiz
-- would then write the same row concurrently and silently clobber each other.
-- Each table below has exactly one class of writer in the common path:
--
--   student_charts    student edits + mentor approves  (turn-based: the chart
--                     locks on submit, so the two never write simultaneously)
--   student_progress  student only  — quiz attempts, points, spaced repetition
--   student_overrides student raises, mentor decides   (separate rows)
--
-- Also enables Realtime on public.comments so discussion threads update live.
--
-- Run in Supabase → SQL Editor. Idempotent.

-- ---------------------------------------------------------------------------
-- charts
-- ---------------------------------------------------------------------------

create table if not exists public.student_charts (
  student_id          uuid primary key references public.profiles (id) on delete cascade,
  chart               jsonb not null default '{}'::jsonb,
  adopted_template_id text,
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- progress — everything only the student writes
-- ---------------------------------------------------------------------------

create table if not exists public.student_progress (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on column public.student_progress.data is
  'progress, points, attempts, mainsScores, pyqsReviewed, topicRecords, confusionPairs, smartSessions, assessment, hasSeenTour.';

-- ---------------------------------------------------------------------------
-- overrides — student raises, mentor decides
-- ---------------------------------------------------------------------------

create table if not exists public.student_overrides (
  id         bigint primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  day        int  not null,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  attempts   int  not null default 0,
  best_score int  not null default 0,
  seen       boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists student_overrides_student_idx on public.student_overrides (student_id, status);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Staff (mentor/admin) can read every student's rows — the mentor dashboard is
-- the whole point. Only mentors/admins may change a chart's approval fields or
-- decide an override; only the student writes their own progress.
-- ---------------------------------------------------------------------------

alter table public.student_charts    enable row level security;
alter table public.student_progress  enable row level security;
alter table public.student_overrides enable row level security;

create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_of(uid) in ('mentor', 'admin');
$$;

-- charts
drop policy if exists "read own or staff reads all" on public.student_charts;
create policy "read own or staff reads all" on public.student_charts for select
  using (student_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "student creates own chart" on public.student_charts;
create policy "student creates own chart" on public.student_charts for insert
  with check (student_id = auth.uid());

drop policy if exists "student or staff updates chart" on public.student_charts;
create policy "student or staff updates chart" on public.student_charts for update
  using (student_id = auth.uid() or public.is_staff(auth.uid()))
  with check (student_id = auth.uid() or public.is_staff(auth.uid()));

-- progress
drop policy if exists "read own progress or staff" on public.student_progress;
create policy "read own progress or staff" on public.student_progress for select
  using (student_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "student writes own progress" on public.student_progress;
create policy "student writes own progress" on public.student_progress for insert
  with check (student_id = auth.uid());

drop policy if exists "student updates own progress" on public.student_progress;
create policy "student updates own progress" on public.student_progress for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- overrides
drop policy if exists "read own overrides or staff" on public.student_overrides;
create policy "read own overrides or staff" on public.student_overrides for select
  using (student_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "student raises override" on public.student_overrides;
create policy "student raises override" on public.student_overrides for insert
  with check (student_id = auth.uid() and status = 'pending');

-- A student may touch their own override row (to mark it seen) but must leave
-- it pending. Only staff may move it to approved/declined.
--
-- USING sees the OLD row, WITH CHECK sees the NEW one, so the check below is
-- what stops a student self-approving an override and skipping the 80% gate.
-- Column grants alone would NOT prevent this: the grant is role-wide, not
-- per-user, so `grant update (status)` to authenticated would hand every
-- student the ability to approve themselves.
drop policy if exists "student or staff updates override" on public.student_overrides;
create policy "student or staff updates override" on public.student_overrides for update
  using (student_id = auth.uid() or public.is_staff(auth.uid()))
  with check (
    public.is_staff(auth.uid())
    or (student_id = auth.uid() and status = 'pending')
  );

grant select, insert, update on public.student_charts    to authenticated;
grant select, insert, update on public.student_progress  to authenticated;
grant select, insert         on public.student_overrides to authenticated;
grant update (seen)          on public.student_overrides to authenticated;

-- The decision columns are grantable to `authenticated` as a whole; the
-- policy's WITH CHECK above is what confines them to staff in practice.
grant update (status, decided_at) on public.student_overrides to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime for discussion comments
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;

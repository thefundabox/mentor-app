-- 0034_batches_in_postgres.sql
--
-- Cohorts move out of the browser.
--
-- Batch MEMBERSHIP has been server-side since the beginning: profiles.batch_id
-- (0002) and set_user_batch (0017). The batches themselves never were. They
-- lived in `v5_batches` in whichever browser the admin used, so the name, the
-- start date, the assigned mentors and the plan a cohort runs were all invisible
-- to everyone else -- while profiles.batch_id pointed at ids only that one
-- browser could resolve.
--
-- That is the worse half of the split: a student carries a batch id the server
-- knows, to a batch row the server has never seen. batchForStudent returns
-- null, so no start date, no pacing, and no batch plan.
--
-- SEEDED WITH REAL VALUES, NOT THE DEMO DEFAULTS
--
-- The bundled DEFAULT_BATCHES compute startDate as "20 days ago" at module
-- load, which is fine for a demo and meaningless as stored data. The two rows
-- below use the published plan instead: 5 September 2026, the 80-day plan. That
-- matches the PDF, the landing page and what was asked for when both batches
-- were pointed at the 80-day plan -- and it means the dates students actually
-- see finally agree with the dates they were given.
--
-- mentor_ids is text[], not uuid[]. Local demo mode uses ids like
-- 'u_mentor_priya' and real accounts use uuids; the column has to hold both,
-- and it is a display-side list rather than a foreign key.
-- ---------------------------------------------------------------------------

create table if not exists public.batches (
  id                       text primary key,
  name                     text not null,
  vertical                 text not null default 'RAS',
  description              text,
  start_date               timestamptz not null,
  end_date                 timestamptz,
  mentor_ids               text[] not null default '{}',
  default_plan_template_id text,
  archived                 boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.batches is
  'Cohorts. Membership lives on profiles.batch_id; this is the cohort itself.';
comment on column public.batches.start_date is
  'Day 1 of every plan in this batch is anchored here (see planStartFor).';

create index if not exists batches_archived_idx on public.batches (archived, start_date);

alter table public.batches enable row level security;

-- Everyone signed in reads: a student needs their own batch to know what day
-- they are on, and a mentor needs the batches they teach.
drop policy if exists "read batches" on public.batches;
create policy "read batches"
  on public.batches for select
  using (auth.uid() is not null);

drop policy if exists "admins write batches" on public.batches;
create policy "admins write batches"
  on public.batches for all
  using (public.current_role_of(auth.uid()) = 'admin')
  with check (public.current_role_of(auth.uid()) = 'admin');

-- Stated outright rather than inherited, per the trap 0028 had to undo.
revoke all on public.batches from anon;
revoke all on public.batches from authenticated;
grant select, insert, update, delete on public.batches to authenticated;

-- ---------------------------------------------------------------------------
-- Seed the two cohorts students are already assigned to.
--
-- These ids are what profiles.batch_id already holds, so without them every
-- existing student resolves to no batch at all. on conflict do nothing, so a
-- re-run never overwrites an admin's later edits.
-- ---------------------------------------------------------------------------

insert into public.batches
  (id, name, vertical, description, start_date, mentor_ids, default_plan_template_id)
values
  ('batch_ras_2026_morning', 'RAS 2026 - Morning', 'RAS',
   'Daily 7-10 AM. Targeted at first-time aspirants.',
   timestamptz '2026-09-05 00:00:00+05:30', '{}', 'ras-80-day-balanced'),
  ('batch_ras_2026_evening', 'RAS 2026 - Evening', 'RAS',
   'Daily 7-10 PM. For working professionals.',
   timestamptz '2026-09-05 00:00:00+05:30', '{}', 'ras-80-day-balanced')
on conflict (id) do nothing;

-- Sanity: every student who carries a batch id can now resolve it. A dangling
-- reference is exactly the failure this migration exists to end, so it is
-- reported rather than left to surface as a missing start date.
do $$
declare dangling int; n int;
begin
  select count(*) into n from public.batches;
  if n < 2 then
    raise exception 'expected at least the two seeded batches, found %', n;
  end if;

  select count(*) into dangling
    from public.profiles p
   where p.batch_id is not null
     and not exists (select 1 from public.batches b where b.id = p.batch_id);
  if dangling > 0 then
    raise warning 'ATTENTION: % profile(s) point at a batch id with no row. Assign them a batch in Admin -> Batches.', dangling;
  end if;
end $$;

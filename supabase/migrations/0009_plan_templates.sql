-- 0009_plan_templates.sql
--
-- Moves study plans out of localStorage and into Postgres.
--
-- Until now `planTemplates` lived under the v5_planTemplates key, which meant
-- "the default plan" only ever existed in whichever browser last edited it. An
-- admin could rearrange every plan on their laptop and no student would see a
-- thing. Same class of problem as the subject catalog.
--
-- `version` is here from the start deliberately. Adoption currently deep-copies
-- a template's days into the student's chart, so a later edit reaches nobody who
-- already adopted. Recording which version a student took is what will make
-- propagation possible without a second migration; the behaviour itself is not
-- implemented yet.
--
-- Run in the Supabase dashboard -> SQL Editor -> New query -> Run. Idempotent.

create table if not exists public.plan_templates (
  id          text primary key,
  name        text not null,
  blurb       text not null default '',
  scope       text not null default 'week'
              check (scope in ('week', 'month', 'overall')),
  -- DaySlot[][] exactly as the client's ChartState.days: one array per day,
  -- each holding { subjectId, topicId } objects.
  days        jsonb not null default '[]'::jsonb,
  is_default  boolean not null default false,
  version     integer not null default 1,
  -- Null for an institute-wide plan; a mentor's uuid for one they own.
  owner_id    uuid references public.profiles (id) on delete cascade,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.plan_templates            is 'Study plans students can adopt. Admin-owned unless owner_id is set.';
comment on column public.plan_templates.version    is 'Bumped on every published edit, so adopted charts can be traced to a version.';
comment on column public.plan_templates.owner_id   is 'Null = institute-wide. Set = a mentor''s own plan for their students.';

create index if not exists plan_templates_owner_idx on public.plan_templates (owner_id);

-- At most one institute-wide default. A mentor's plan is never the default.
drop index if exists plan_templates_one_default;
create unique index plan_templates_one_default
  on public.plan_templates ((is_default))
  where is_default and owner_id is null and not archived;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Everyone signed in reads plans -- a student has to be able to adopt one.
-- Admins write anything; a mentor writes only their own.
-- ---------------------------------------------------------------------------

alter table public.plan_templates enable row level security;

drop policy if exists "read plans" on public.plan_templates;
create policy "read plans" on public.plan_templates for select
  using (auth.uid() is not null);

drop policy if exists "admin or owner inserts plan" on public.plan_templates;
create policy "admin or owner inserts plan" on public.plan_templates for insert
  with check (
    public.current_role_of(auth.uid()) = 'admin'
    or (owner_id = auth.uid() and public.current_role_of(auth.uid()) = 'mentor')
  );

drop policy if exists "admin or owner updates plan" on public.plan_templates;
create policy "admin or owner updates plan" on public.plan_templates for update
  using (
    public.current_role_of(auth.uid()) = 'admin'
    or (owner_id = auth.uid() and public.current_role_of(auth.uid()) = 'mentor')
  )
  with check (
    public.current_role_of(auth.uid()) = 'admin'
    or (owner_id = auth.uid() and public.current_role_of(auth.uid()) = 'mentor')
  );

-- No delete grant: plans are archived, never removed, so a student who adopted
-- one keeps a row to trace their chart back to.
grant select, insert, update on public.plan_templates to authenticated;

-- ---------------------------------------------------------------------------
-- Which version a student adopted
-- ---------------------------------------------------------------------------

alter table public.student_charts
  add column if not exists adopted_template_version integer;

comment on column public.student_charts.adopted_template_version is
  'Template version this chart was copied from. Null for a hand-built chart.';

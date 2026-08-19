-- 0005_questions.sql
--
-- Question bank in Postgres.
--
-- The 334 past-paper questions currently ship inside the JS bundle, which is
-- fine at that size. A model bank of ~24,000 is not: at ~820 bytes of source
-- each that is ~19 MB, and every student would download the entire bank on
-- first page load. Questions therefore live here and are fetched per topic.
--
-- Run in Supabase → SQL Editor. Idempotent.

create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  topic_id        text not null,                       -- microtheme id, e.g. pol-ind-m118
  subject_id      text,
  type            text not null default 'analytical'
                  check (type in ('conceptual', 'analytical')),
  question_type   text,                                -- mcq_factual | mcq_applied | mcq_reasoning | ...
  difficulty_tier int  not null default 2 check (difficulty_tier between 1 and 3),
  q               text not null,
  q_hindi         text,
  options         jsonb not null,
  correct         int  not null check (correct >= 0),
  why             text,
  /* Null for authored model questions. Set only for genuine past papers, so
     the two can never be confused in the UI or in analytics. */
  source_year     text,
  is_model        boolean not null default true,
  rajasthan_angle boolean not null default false,
  /* Set true once a subject expert has checked the answer key. Model questions
     start unreviewed on purpose — an authored key is a claim, not a fact. */
  reviewed        boolean not null default false,
  created_at      timestamptz not null default now(),
  constraint options_is_array check (jsonb_typeof(options) = 'array'),
  constraint correct_in_range check (correct < jsonb_array_length(options))
);

create index if not exists questions_topic_idx      on public.questions (topic_id);
create index if not exists questions_topic_diff_idx on public.questions (topic_id, difficulty_tier);
create index if not exists questions_model_idx      on public.questions (is_model);

-- ---------------------------------------------------------------------------
-- Coverage summary — lets the client answer "does this topic have questions?"
-- for all 243 microthemes in one small round trip, instead of 243 queries or
-- shipping the bank itself.
-- ---------------------------------------------------------------------------

create or replace view public.question_coverage as
  select topic_id,
         count(*)::int                                             as total,
         count(*) filter (where difficulty_tier = 1)::int           as easy,
         count(*) filter (where difficulty_tier = 2)::int           as moderate,
         count(*) filter (where difficulty_tier = 3)::int           as hard,
         count(*) filter (where is_model = false)::int              as past_paper,
         count(*) filter (where reviewed)::int                      as reviewed
    from public.questions
   group by topic_id;

-- ---------------------------------------------------------------------------
-- RLS — every signed-in user may read; only admins may write.
--
-- Students must not be able to insert questions (they could plant ones they
-- know the answer to) and, more importantly, must not be able to UPDATE the
-- `correct` column on an existing question.
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;

drop policy if exists "authenticated read questions" on public.questions;
create policy "authenticated read questions"
  on public.questions for select
  using (auth.uid() is not null);

drop policy if exists "admins write questions" on public.questions;
create policy "admins write questions"
  on public.questions for all
  using (public.current_role_of(auth.uid()) = 'admin')
  with check (public.current_role_of(auth.uid()) = 'admin');

grant select on public.questions          to authenticated;
grant select on public.question_coverage  to authenticated;
-- No insert/update/delete grant to `authenticated`: the admin policy above is
-- satisfied only for admins, and seeding is done from the SQL editor / service
-- role rather than from the browser.

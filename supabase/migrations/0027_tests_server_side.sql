-- 0027_tests_server_side.sql
--
-- Move mock tests into Postgres so the free allowance can actually be enforced.
--
-- Until now tests and attempts lived only in localStorage (v5_tests,
-- v5_testAttempts). "Three mocks free, more when you pay" was unenforceable:
-- a free student edits one key and has unlimited tests. Same shape as the open
-- question policy 0026 closed -- the client was being asked to assert something
-- only the server can verify.
--
-- The allowance counts DISTINCT tests a student has attempted, not attempts.
-- Re-sitting a mock you have already opened stays free forever: the thing worth
-- rationing is how many papers you get, and charging someone a second slot for
-- resuming their own half-finished attempt would be indefensible.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The allowance lives beside the question cap, same table, same reasoning:
-- a row, so it can be changed without a deploy. NULL means unmetered.
-- ---------------------------------------------------------------------------

alter table public.plan_limits
  add column if not exists max_tests int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plan_limits_tests_check') then
    alter table public.plan_limits
      add constraint plan_limits_tests_check check (max_tests is null or max_tests >= 0);
  end if;
end $$;

update public.plan_limits set max_tests = 3    where plan = 'free';
update public.plan_limits set max_tests = null where plan = 'paid';

comment on column public.plan_limits.max_tests is
  'Distinct mock tests a plan may attempt. NULL = unlimited.';

-- ---------------------------------------------------------------------------
-- tests
--
-- id is text, not uuid: the app already ships tests keyed 'test_full_mock_01'
-- and those ids are referenced by attempts already sitting in localStorage.
-- Renaming them would orphan that history for no gain.
-- ---------------------------------------------------------------------------

create table if not exists public.tests (
  id            text primary key,
  title         text not null,
  description   text,
  type          text not null default 'custom'
                check (type in ('sectional', 'full-length', 'custom')),
  sections      jsonb not null default '[]'::jsonb,
  duration_mins int  not null default 60 check (duration_mins > 0),
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint tests_sections_is_array check (jsonb_typeof(sections) = 'array')
);

comment on table public.tests is
  'Mock tests. Authored by staff; every student may read the catalog.';

alter table public.tests enable row level security;

-- The catalog is readable by everyone signed in, including free students who
-- have used their allowance. Seeing that a test exists is not the same as
-- sitting it, and hiding the catalog would make the upgrade case invisible.
drop policy if exists "read test catalog" on public.tests;
create policy "read test catalog"
  on public.tests for select
  using (auth.uid() is not null);

drop policy if exists "staff write tests" on public.tests;
create policy "staff write tests"
  on public.tests for all
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'))
  with check (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

grant select on public.tests to authenticated;
grant insert, update, delete on public.tests to authenticated;

-- ---------------------------------------------------------------------------
-- test_attempts
-- ---------------------------------------------------------------------------

create table if not exists public.test_attempts (
  id             uuid primary key default gen_random_uuid(),
  test_id        text not null references public.tests (id)    on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  answers        jsonb not null default '{}'::jsonb,
  score          numeric,
  max_score      numeric,
  section_scores jsonb
);

create index if not exists test_attempts_student_idx on public.test_attempts (student_id, started_at desc);
create index if not exists test_attempts_test_idx    on public.test_attempts (test_id);

comment on table public.test_attempts is
  'One row per sitting. student_id is stamped from auth.uid() by trigger, never trusted from the client.';

alter table public.test_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Stamp identity and enforce the allowance, on the server
--
-- Identity first, for the reason 0018 and 0019 exist: a client-supplied
-- student_id is a claim. Stamping it from auth.uid() means the allowance below
-- cannot be sidestepped by attributing an attempt to somebody else.
-- ---------------------------------------------------------------------------

create or replace function public.stamp_and_meter_test_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_cap  int;
  v_used int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  new.student_id := v_uid;

  -- Staff sitting a test to check it does not consume anyone's allowance.
  if public.current_role_of(v_uid) in ('mentor', 'admin') then
    return new;
  end if;

  select l.max_tests into v_cap
    from public.plan_limits l
   where l.plan = public.current_plan_of(v_uid);

  if v_cap is null then
    return new;
  end if;

  -- Already opened this test? Then it costs nothing: re-sitting and resuming
  -- are both free, and only opening a NEW paper draws on the allowance.
  if exists (
    select 1 from public.test_attempts a
     where a.student_id = v_uid and a.test_id = new.test_id
  ) then
    return new;
  end if;

  select count(distinct a.test_id) into v_used
    from public.test_attempts a
   where a.student_id = v_uid;

  if v_used >= v_cap then
    raise exception
      'Your free plan includes % mock test(s). Upgrade for the full set.', v_cap
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists stamp_and_meter_test_attempt on public.test_attempts;
create trigger stamp_and_meter_test_attempt
  before insert on public.test_attempts
  for each row execute function public.stamp_and_meter_test_attempt();

-- ---------------------------------------------------------------------------
-- Policies
--
-- The insert WITH CHECK is evaluated AFTER the before-insert trigger, so it
-- reads the stamped student_id rather than whatever the client sent. That
-- ordering is what makes the pair safe -- the same reasoning as 0019.
-- ---------------------------------------------------------------------------

drop policy if exists "read own attempts" on public.test_attempts;
create policy "read own attempts"
  on public.test_attempts for select
  using (student_id = auth.uid());

drop policy if exists "staff read all attempts" on public.test_attempts;
create policy "staff read all attempts"
  on public.test_attempts for select
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

drop policy if exists "start own attempt" on public.test_attempts;
create policy "start own attempt"
  on public.test_attempts for insert
  with check (student_id = auth.uid());

-- Answers and scores are written as the sitting proceeds. Restricted to the
-- student's own rows; nothing here lets them change whose attempt it is,
-- because student_id is not in the column grant below.
drop policy if exists "update own attempt" on public.test_attempts;
create policy "update own attempt"
  on public.test_attempts for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

grant select, insert on public.test_attempts to authenticated;
grant update (answers, finished_at, score, max_score, section_scores)
  on public.test_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- tests_used() -- for the meter in the UI
-- ---------------------------------------------------------------------------

create or replace function public.tests_used()
returns table (used int, cap int)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct a.test_id)::int
       from public.test_attempts a
      where a.student_id = auth.uid()),
    (select l.max_tests
       from public.plan_limits l
      where l.plan = public.current_plan_of(auth.uid()));
$$;

grant execute on function public.tests_used() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed the two tests the app already ships, so attempts have something to
-- reference. Ids match DEFAULT_TESTS in src/data/index.ts exactly.
-- ---------------------------------------------------------------------------

insert into public.tests (id, title, description, type, duration_mins, sections) values
(
  'test_full_mock_01',
  'RAS 2026 Mock #1',
  'Full-length mock - 150 questions, 3h. Three sections, RAS exam-format negative marking.',
  'full-length', 180,
  '[{"id":"sec_history","name":"History & Culture","subjectIds":["raj-hist","ind-hist"],"questionCount":50,"marksPerQuestion":2,"negativeMarks":0.66},
    {"id":"sec_polity","name":"Polity & Constitution","subjectIds":["pol-ind"],"questionCount":50,"marksPerQuestion":2,"negativeMarks":0.66},
    {"id":"sec_geo_econ","name":"Geography & Economy","subjectIds":["geo-raj","geo-wi","eco-ind"],"questionCount":50,"marksPerQuestion":2,"negativeMarks":0.66}]'::jsonb
),
(
  'test_sectional_polity_01',
  'Polity sectional - Constitutional foundations',
  '30-min sectional on Preamble, Basic Structure, Fundamental Rights, DPSP.',
  'sectional', 30,
  '[{"id":"sec_polity_only","name":"Polity","subjectIds":["pol-ind"],"questionCount":20,"marksPerQuestion":1,"negativeMarks":0.33}]'::jsonb
)
on conflict (id) do nothing;

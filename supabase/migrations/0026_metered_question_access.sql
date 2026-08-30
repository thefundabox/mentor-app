-- 0026_metered_question_access.sql
--
-- Close the open question bank and put a metered door in front of it.
--
-- Until now: `create policy "authenticated read questions" ... using (auth.uid()
-- is not null)`. Every signed-in user could read every question in one
-- PostgREST call. Any cap enforced in the client was decoration -- the same
-- client-asserts-what-the-server-verifies mistake fixed in 0018 and 0019.
--
-- After this migration a student can see a question only once it has been
-- unlocked for them, and unlocking is metered per day by their plan. Staff are
-- unmetered: mentors author and review, admins import.
--
-- WHAT IS DELIBERATELY STILL VISIBLE
--
-- Counts. How many past questions exist on a microtheme is not the content, and
-- hiding it would make the app under-report its own syllabus ("0 past
-- questions" on a microtheme with eleven). The count functions at the bottom
-- are security definer for exactly that reason: they answer "how much is
-- there" without handing over a stem, an option or a key.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- plan_limits -- the cap lives in a row, not a constant
--
-- So it can be raised as the bank grows without a deploy. NULL means unmetered.
-- ---------------------------------------------------------------------------

create table if not exists public.plan_limits (
  -- No FK: 'plan' is a small closed domain, guarded by the check below and by
  -- the identical check on profiles.plan in 0025.
  plan             text primary key,
  daily_unlocks    int,
  updated_at       timestamptz not null default now(),
  constraint plan_limits_plan_check   check (plan in ('free', 'paid')),
  constraint plan_limits_daily_check  check (daily_unlocks is null or daily_unlocks >= 0)
);

comment on table  public.plan_limits is
  'Per-plan metering. One row per plan; daily_unlocks NULL means unmetered.';
comment on column public.plan_limits.daily_unlocks is
  'New questions a plan may unlock per IST day. NULL = unlimited.';

insert into public.plan_limits (plan, daily_unlocks) values
  ('free', 20),
  ('paid', null)
on conflict (plan) do nothing;

alter table public.plan_limits enable row level security;

drop policy if exists "anyone signed in reads plan limits" on public.plan_limits;
create policy "anyone signed in reads plan limits"
  on public.plan_limits for select
  using (auth.uid() is not null);

drop policy if exists "admins write plan limits" on public.plan_limits;
create policy "admins write plan limits"
  on public.plan_limits for all
  using (public.current_role_of(auth.uid()) = 'admin')
  with check (public.current_role_of(auth.uid()) = 'admin');

grant select on public.plan_limits to authenticated;

-- ---------------------------------------------------------------------------
-- question_unlocks -- what a student has been shown, and when
--
-- (student_id, question_id) is the primary key on purpose: a question unlocks
-- once and stays unlocked. Re-reading something you have already seen costs
-- nothing, forever. The cap is on how much NEW ground you open per day, which
-- is the thing worth metering -- charging a student twice to revisit a question
-- they got wrong yesterday would be indefensible.
-- ---------------------------------------------------------------------------

create table if not exists public.question_unlocks (
  student_id  uuid not null references public.profiles (id)  on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (student_id, question_id)
);

create index if not exists question_unlocks_day_idx
  on public.question_unlocks (student_id, unlocked_at desc);

comment on table public.question_unlocks is
  'Ledger of questions revealed to a student. Written only by unlock_questions().';

alter table public.question_unlocks enable row level security;

-- Read your own ledger (the UI shows "n of 20 used today"). Nobody writes it
-- from the client at all -- there is no insert policy and no insert grant, so
-- the security definer function below is the only way a row appears.
drop policy if exists "read own unlocks" on public.question_unlocks;
create policy "read own unlocks"
  on public.question_unlocks for select
  using (student_id = auth.uid());

drop policy if exists "staff read unlocks" on public.question_unlocks;
create policy "staff read unlocks"
  on public.question_unlocks for select
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

grant select on public.question_unlocks to authenticated;

-- ---------------------------------------------------------------------------
-- The day boundary
--
-- Students sit an Indian exam on Indian time. A UTC day boundary would reset
-- the cap at 05:30 IST, mid-morning study, which reads as a bug to everyone
-- affected by it.
-- ---------------------------------------------------------------------------

create or replace function public.ist_day_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;

grant execute on function public.ist_day_start() to authenticated;

-- ---------------------------------------------------------------------------
-- questions_used_today() -- for the meter in the UI
-- ---------------------------------------------------------------------------

create or replace function public.questions_used_today()
returns table (used int, cap int, plan text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int
       from public.question_unlocks u
      where u.student_id = auth.uid()
        and u.unlocked_at >= public.ist_day_start()),
    (select l.daily_unlocks
       from public.plan_limits l
      where l.plan = public.current_plan_of(auth.uid())),
    public.current_plan_of(auth.uid());
$$;

grant execute on function public.questions_used_today() to authenticated;

-- ---------------------------------------------------------------------------
-- unlock_questions(...) -- the only door
--
-- Returns questions the caller is entitled to see for this selection: every one
-- already unlocked, plus as many new ones as today's remaining allowance
-- covers. Staff bypass the meter entirely.
--
-- The selection arguments mirror the queries the app used to run directly, so
-- one function serves both the PYQ screens and topic practice.
-- ---------------------------------------------------------------------------

create or replace function public.unlock_questions(
  p_topic_id       text    default null,
  p_subject_prefix text    default null,
  p_source_year    text    default null,
  p_pyq_only       boolean default false,
  p_min_tier       int     default null,
  p_limit          int     default 40
)
returns setof public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
  v_cap  int;
  v_used int;
  v_room int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 then p_limit := 40; end if;
  if p_limit > 600 then p_limit := 600; end if;

  v_role := public.current_role_of(v_uid);

  -- Staff read the bank unmetered: a mentor cannot review what they cannot see.
  if v_role in ('mentor', 'admin') then
    return query
      select q.*
        from public.questions q
       where (p_topic_id       is null or q.topic_id = p_topic_id)
         and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
         and (p_source_year    is null or q.source_year = p_source_year)
         and (not p_pyq_only   or q.source_year is not null)
         and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
       limit p_limit;
    return;
  end if;

  select l.daily_unlocks into v_cap
    from public.plan_limits l
   where l.plan = public.current_plan_of(v_uid);

  if v_cap is null then
    -- Unmetered plan. Still bounded by p_limit so one call cannot drag the
    -- whole table across the wire.
    v_room := p_limit;
  else
    select count(*)::int into v_used
      from public.question_unlocks u
     where u.student_id = v_uid
       and u.unlocked_at >= public.ist_day_start();
    v_room := greatest(0, least(p_limit, v_cap - v_used));
  end if;

  -- Open new ground, up to today's remaining allowance.
  --
  -- Only reviewed questions are ever unlocked for a student: an authored key
  -- that no subject expert has checked is a claim, not a fact (see 0005), and
  -- metering it would additionally mean charging a day's allowance for it.
  if v_room > 0 then
    insert into public.question_unlocks (student_id, question_id)
    select v_uid, q.id
      from public.questions q
     where q.reviewed
       and (p_topic_id       is null or q.topic_id = p_topic_id)
       and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
       and (p_source_year    is null or q.source_year = p_source_year)
       and (not p_pyq_only   or q.source_year is not null)
       and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       and not exists (
             select 1 from public.question_unlocks u
              where u.student_id = v_uid and u.question_id = q.id)
     order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
     limit v_room
    on conflict do nothing;
  end if;

  -- Return everything in this selection the student may see, new or not.
  return query
    select q.*
      from public.questions q
      join public.question_unlocks u
        on u.question_id = q.id and u.student_id = v_uid
     where q.reviewed
       and (p_topic_id       is null or q.topic_id = p_topic_id)
       and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
       and (p_source_year    is null or q.source_year = p_source_year)
       and (not p_pyq_only   or q.source_year is not null)
       and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
     order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
     limit p_limit;
end $$;

grant execute on function public.unlock_questions(text, text, text, boolean, int, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Counts stay open
--
-- These answer "how much exists", never "what does it say". Security definer so
-- they see past the new row policy.
-- ---------------------------------------------------------------------------

create or replace function public.pyq_counts_by_topic()
returns table (topic_id text, n int)
language sql
stable
security definer
set search_path = public
as $$
  select q.topic_id, count(*)::int
    from public.questions q
   where q.source_year is not null and q.reviewed
   group by q.topic_id;
$$;

create or replace function public.pyq_counts_by_year()
returns table (source_year text, n int)
language sql
stable
security definer
set search_path = public
as $$
  select q.source_year, count(*)::int
    from public.questions q
   where q.source_year is not null and q.reviewed
   group by q.source_year
   order by q.source_year desc;
$$;

grant execute on function public.pyq_counts_by_topic() to authenticated;
grant execute on function public.pyq_counts_by_year()  to authenticated;

-- ---------------------------------------------------------------------------
-- The row policy itself -- this is the change that actually closes the bank
--
-- Note the table grant stays in place. Revoking SELECT outright would break
-- the security definer functions' callers less predictably and would also lock
-- out staff tooling; restricting by row is both narrower and easier to reason
-- about.
-- ---------------------------------------------------------------------------

drop policy if exists "authenticated read questions" on public.questions;

drop policy if exists "staff read all questions" on public.questions;
create policy "staff read all questions"
  on public.questions for select
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

drop policy if exists "students read unlocked questions" on public.questions;
create policy "students read unlocked questions"
  on public.questions for select
  using (exists (
    select 1 from public.question_unlocks u
     where u.question_id = questions.id
       and u.student_id  = auth.uid()
  ));

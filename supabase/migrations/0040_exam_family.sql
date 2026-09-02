-- 0040_exam_family.sql
--
-- Past questions learn which exam they came from.
--
-- Until now `source_year is not null` meant "this is a past question", and that
-- was enough because every past question in the bank came from one exam: RAS
-- Prelims. RPSC sets many other papers -- Sr. Teacher, School Lecturer, Sub
-- Inspector, Asst. Engineer -- whose questions overlap the RAS syllabus without
-- being RAS questions, and they must never be presented as though they were.
-- A student counting "how many past questions has RPSC asked on stepwells"
-- deserves an answer about their own exam.
--
-- TWO COLUMNS, NOT ONE
--
--   exam_family   'ras' | 'other'   -- decides which tab it appears under
--   source_exam   free text          -- what to print: "Sr. Teacher (Sec. Edu.) 2025"
--
-- Deriving the tab by pattern-matching the exam name would work until the first
-- paper whose title does not contain "RAS", and then it would quietly file a
-- question in the wrong place. The family is stated, checked, and indexed.
--
-- Nothing is imported here. This is the shape the bank needs before anything
-- can be added to it, and the existing 806 are backfilled as what they are.
-- ---------------------------------------------------------------------------

alter table public.questions
  add column if not exists exam_family text not null default 'ras'
    check (exam_family in ('ras', 'other')),
  add column if not exists source_exam text;

comment on column public.questions.exam_family is
  'Which PYQ tab this belongs under. ras = the student''s own exam; other = another RPSC paper.';
comment on column public.questions.source_exam is
  'Printed name of the paper, e.g. "RAS Prelims" or "Sr. Teacher (Sec. Edu.) 2025".';

-- The 806 already in the bank are RAS Prelims. Authored questions
-- (source_year is null) are not past papers at all and are left alone.
update public.questions
   set source_exam = 'RAS Prelims'
 where source_year is not null and source_exam is null;

create index if not exists questions_exam_family_idx
  on public.questions (exam_family, source_year)
  where source_year is not null;

-- ---------------------------------------------------------------------------
-- The readers all gain a family filter.
--
-- Dropped and recreated rather than overloaded: adding a defaulted argument
-- creates a second function rather than replacing the first, and two
-- unlock_questions differing only in arity is exactly the ambiguity that gets
-- resolved wrongly at three in the morning.
-- ---------------------------------------------------------------------------

drop function if exists public.pyq_counts_by_topic();
create or replace function public.pyq_counts_by_topic(p_family text default 'ras')
returns table (topic_id text, n int)
language sql
stable
security definer
set search_path = public
as $$
  select q.topic_id, count(*)::int
    from public.questions q
   where q.source_year is not null and q.reviewed
     and (p_family is null or q.exam_family = p_family)
   group by q.topic_id;
$$;

drop function if exists public.pyq_counts_by_year();
create or replace function public.pyq_counts_by_year(p_family text default 'ras')
returns table (source_year text, n int)
language sql
stable
security definer
set search_path = public
as $$
  select q.source_year, count(*)::int
    from public.questions q
   where q.source_year is not null and q.reviewed
     and (p_family is null or q.exam_family = p_family)
   group by q.source_year
   order by q.source_year desc;
$$;

grant execute on function public.pyq_counts_by_topic(text) to authenticated;
grant execute on function public.pyq_counts_by_year(text)  to authenticated;

-- ---------------------------------------------------------------------------
-- unlock_questions gains the same filter.
--
-- Body is 0029's, unchanged except for the family predicate: past papers free
-- and unmetered, authored questions behind the unlock ledger, staff unmetered.
-- ---------------------------------------------------------------------------

drop function if exists public.unlock_questions(text, text, text, boolean, int, int);

create or replace function public.unlock_questions(
  p_topic_id       text    default null,
  p_subject_prefix text    default null,
  p_source_year    text    default null,
  p_pyq_only       boolean default false,
  p_min_tier       int     default null,
  p_limit          int     default 40,
  p_exam_family    text    default null
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
  if p_limit > 1000 then p_limit := 1000; end if;

  v_role := public.current_role_of(v_uid);

  if v_role in ('mentor', 'admin') then
    return query
      select q.* from public.questions q
       where (p_topic_id       is null or q.topic_id = p_topic_id)
         and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
         and (p_source_year    is null or q.source_year = p_source_year)
         and (not p_pyq_only   or q.source_year is not null)
         and (p_exam_family    is null or q.exam_family = p_exam_family)
         and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
       limit p_limit;
    return;
  end if;

  if p_pyq_only then
    return query
      select q.* from public.questions q
       where q.source_year is not null and q.reviewed
         and (p_topic_id       is null or q.topic_id = p_topic_id)
         and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
         and (p_source_year    is null or q.source_year = p_source_year)
         and (p_exam_family    is null or q.exam_family = p_exam_family)
         and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
       limit p_limit;
    return;
  end if;

  select l.daily_unlocks into v_cap
    from public.plan_limits l
   where l.plan = public.current_plan_of(v_uid);

  if v_cap is null then
    v_room := p_limit;
  else
    select count(*)::int into v_used
      from public.question_unlocks u
     where u.student_id = v_uid
       and u.unlocked_at >= public.ist_day_start();
    v_room := greatest(0, least(p_limit, v_cap - v_used));
  end if;

  if v_room > 0 then
    insert into public.question_unlocks (student_id, question_id)
    select v_uid, q.id
      from public.questions q
     where q.reviewed
       and q.source_year is null
       and (p_topic_id       is null or q.topic_id = p_topic_id)
       and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
       and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       and not exists (
             select 1 from public.question_unlocks u
              where u.student_id = v_uid and u.question_id = q.id)
     order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
     limit v_room
    on conflict do nothing;
  end if;

  return query
    select q.* from public.questions q
     where q.reviewed
       and (p_topic_id       is null or q.topic_id = p_topic_id)
       and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
       and (p_source_year    is null or q.source_year = p_source_year)
       and (p_exam_family    is null or q.exam_family = p_exam_family)
       and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       and (
             q.source_year is not null
             or exists (select 1 from public.question_unlocks u
                         where u.question_id = q.id and u.student_id = v_uid)
           )
     order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
     limit p_limit;
end $$;

grant execute on function
  public.unlock_questions(text, text, text, boolean, int, int, text) to authenticated;

notify pgrst, 'reload schema';

do $$
declare ras int; other int; unlabelled int;
begin
  select count(*) filter (where exam_family = 'ras'),
         count(*) filter (where exam_family = 'other'),
         count(*) filter (where source_exam is null)
    into ras, other, unlabelled
    from public.questions where source_year is not null;
  if ras <> 806 then
    raise warning 'expected 806 RAS past questions, found %', ras;
  end if;
  if unlabelled > 0 then
    raise warning '% past question(s) have no source_exam', unlabelled;
  end if;
  raise notice 'PYQ bank: % RAS, % other-exam', ras, other;
end $$;

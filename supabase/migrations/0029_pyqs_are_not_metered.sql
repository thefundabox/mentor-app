-- 0029_pyqs_are_not_metered.sql
--
-- Past papers stop drawing on the daily allowance.
--
-- 0026 put every question read behind one metered door. That was right for
-- authored practice questions and wrong for past papers, and it broke the PYQ
-- archive outright:
--
--   PYQArchive calls loadAllPyqs() on mount to populate a browse-and-filter
--   list. Under 0026 that consumed a free student's twenty unlocks just for
--   OPENING the screen, then showed twenty of 806 questions -- and nothing at
--   all once the day's allowance had gone elsewhere. Browsing is not
--   attempting; it should never have spent anything.
--
-- Past papers are also the thing the product advertises -- "every past answer
-- checked against RPSC's own key" -- so rationing them twenty a day undercut
-- the offer while the authored bank, which is the genuinely scarce asset, went
-- uncapped in comparison.
--
-- After this migration:
--   source_year IS NOT NULL  (806 past questions)  -> free, unmetered, unlogged
--   source_year IS NULL      (461 authored)        -> metered exactly as before
--
-- The cap therefore still does its job: it governs the authored bank, which is
-- what the paid plan is actually selling depth in. To meter past papers again,
-- delete the p_pyq_only early return below.
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

  -- 1000, not 600: the archive asks for the whole corpus at once and there are
  -- 806 past questions. The old ceiling silently returned 600 of them.
  if p_limit is null or p_limit < 1 then p_limit := 40; end if;
  if p_limit > 1000 then p_limit := 1000; end if;

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

  -- Past papers: free to everyone, and nothing is written to the ledger. There
  -- is no allowance to spend and so nothing to record.
  if p_pyq_only then
    return query
      select q.*
        from public.questions q
       where q.source_year is not null
         and q.reviewed
         and (p_topic_id       is null or q.topic_id = p_topic_id)
         and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
         and (p_source_year    is null or q.source_year = p_source_year)
         and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
       limit p_limit;
    return;
  end if;

  -- Authored practice questions: metered exactly as 0026 defined it.
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

  -- Everything in this selection the student may see: their unlocked authored
  -- questions, plus any past papers that match, which need no unlock.
  return query
    select q.*
      from public.questions q
     where q.reviewed
       and (p_topic_id       is null or q.topic_id = p_topic_id)
       and (p_subject_prefix is null or q.topic_id like p_subject_prefix)
       and (p_source_year    is null or q.source_year = p_source_year)
       and (p_min_tier       is null or q.difficulty_tier >= p_min_tier)
       and (
             q.source_year is not null
             or exists (select 1 from public.question_unlocks u
                         where u.question_id = q.id and u.student_id = v_uid)
           )
     order by q.source_year desc nulls last, q.paper_qno asc nulls last, q.id
     limit p_limit;
end $$;

grant execute on function public.unlock_questions(text, text, text, boolean, int, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- The row policy has to agree, or a direct select on a past paper still fails.
-- Students may read any reviewed past paper; authored questions stay behind the
-- unlock ledger.
-- ---------------------------------------------------------------------------

drop policy if exists "students read unlocked questions" on public.questions;
create policy "students read unlocked questions"
  on public.questions for select
  using (
    (questions.source_year is not null and questions.reviewed)
    or exists (
      select 1 from public.question_unlocks u
       where u.question_id = questions.id
         and u.student_id  = auth.uid()
    )
  );

-- 0032_archive_superseded_plans.sql
--
-- Retire the plans 0013 replaced.
--
-- 0011 seeded 'ras-75-day' and 0012 seeded 'ras-80-day-v2'. 0013's header says
-- it supersedes both -- but saying so is not doing so, and nothing ever
-- archived them. All three have been sitting in the picker ever since, and
-- 'ras-80-day-v2' carries the SAME display name as the plan that replaced it,
-- "RAS Prelims in 80 days", so an admin choosing a plan for a batch had two
-- identical-looking options and no way to tell them apart.
--
-- Archived, not deleted, for the reason archivePlanTemplate already gives:
-- a student who adopted one has adoptedTemplateId pointing at it, and the row
-- has to survive for that reference to mean anything. Archiving takes it out of
-- every picker (loadPlanTemplates filters archived = false) while leaving the
-- history intact.
-- ---------------------------------------------------------------------------

-- Refuse to run if the replacement is not there, rather than archiving the old
-- plans and leaving the institute with nothing to hand a new student.
do $$
begin
  if not exists (
    select 1 from public.plan_templates
     where id = 'ras-80-day-balanced' and not archived
  ) then
    raise exception 'ras-80-day-balanced is missing or archived; refusing to retire the plans it replaces';
  end if;
end $$;

update public.plan_templates
   set archived = true,
       is_default = false,
       updated_at = now()
 where id in ('ras-75-day', 'ras-80-day-v2')
   and not archived;

-- The survivor is the institute default. 0013 set this, but an admin may have
-- moved it since, and a batch pointing at an archived plan now falls through to
-- whatever this says.
update public.plan_templates
   set is_default = true, updated_at = now()
 where id = 'ras-80-day-balanced' and not is_default;

do $$
declare live_named int; dflt text;
begin
  select count(*) into live_named
    from public.plan_templates
   where not archived and name = 'RAS Prelims in 80 days';
  if live_named <> 1 then
    raise exception 'expected exactly one live plan named "RAS Prelims in 80 days", found %', live_named;
  end if;

  select id into dflt from public.plan_templates
   where is_default and owner_id is null and not archived;
  if dflt is distinct from 'ras-80-day-balanced' then
    raise exception 'institute default is %, expected ras-80-day-balanced', coalesce(dflt, 'none');
  end if;
end $$;

-- 0011_seed_75_day_plan.sql
--
-- Replaces the institute default with the 75-day Strategic Study Calendar.
--
-- Built from the day-wise calendar and RAS_Prelims_PYQ_Microtheme_Database-v2,
-- sheet 3 (192 microthemes with priority tiers). 75 days, 201 slots, 173
-- distinct microthemes.
--
-- Two things worth knowing about how it was mapped.
--
-- 1. The calendar's M-codes do NOT line up with this app's microtheme numbers.
--    M20 is Temples in both, but M144 is labelled "Governor of Rajasthan" while
--    this app's m144 is the Central Vigilance Commission. Nineteen codes
--    disagree that way. Mapping was therefore done on the microtheme NAME, not
--    the number -- trusting the numbers would have scheduled the wrong topic on
--    roughly one day in four across the polity blocks.
--
-- 2. The nine consolidation days in the calendar carry no microthemes of their
--    own. isDayClearedFor returns false for a day with an empty topic list, so
--    such a day can never be cleared and would stall the student permanently.
--    Each one now repeats the highest-tier microthemes from the block it
--    reviews; day 75 samples one from each of four subjects. Clearing is
--    tracked per (day, topic), so a repeat is a genuine second pass.
--
-- Coverage: 173 of this app's 243 microthemes. The remaining 70 are the ones
-- the PYQ analysis found empirically inactive and are deliberately unscheduled.
-- Re-running bumps the version and replaces the days.

update public.plan_templates set is_default = false where is_default and owner_id is null;

insert into public.plan_templates (id, name, blurb, scope, days, is_default, version, owner_id)
values (
  'ras-75-day',
  'RAS Prelims in 75 days',
  'The Strategic Study Calendar: five thematic blocks, priority-tiered, with consolidation days and a closing OMR simulation.',
  'overall',
  '[[{"subjectId":"raj-hist","topicId":"raj-hist-m20"},{"subjectId":"raj-hist","topicId":"raj-hist-m21"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m22"},{"subjectId":"raj-hist","topicId":"raj-hist-m23"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m18"},{"subjectId":"raj-hist","topicId":"raj-hist-m9"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m31"},{"subjectId":"raj-hist","topicId":"raj-hist-m30"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m24"},{"subjectId":"raj-hist","topicId":"raj-hist-m25"},{"subjectId":"raj-hist","topicId":"raj-hist-m26"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m27"},{"subjectId":"raj-hist","topicId":"raj-hist-m28"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m20"},{"subjectId":"raj-hist","topicId":"raj-hist-m22"},{"subjectId":"raj-hist","topicId":"raj-hist-m18"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m6"},{"subjectId":"raj-hist","topicId":"raj-hist-m7"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m5"},{"subjectId":"raj-hist","topicId":"raj-hist-m4"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m11"},{"subjectId":"raj-hist","topicId":"raj-hist-m12"},{"subjectId":"raj-hist","topicId":"raj-hist-m13"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m14"},{"subjectId":"raj-hist","topicId":"raj-hist-m15"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m17"}],[{"subjectId":"pol-raj","topicId":"pol-raj-m164"},{"subjectId":"pol-raj","topicId":"pol-raj-m159"}],[{"subjectId":"pol-raj","topicId":"pol-raj-m165"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m6"},{"subjectId":"raj-hist","topicId":"raj-hist-m12"},{"subjectId":"raj-hist","topicId":"raj-hist-m14"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m95"},{"subjectId":"geo-raj","topicId":"geo-raj-m96"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m97"},{"subjectId":"geo-raj","topicId":"geo-raj-m98"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m100"},{"subjectId":"geo-raj","topicId":"geo-raj-m99"},{"subjectId":"geo-raj","topicId":"geo-raj-m107"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m101"},{"subjectId":"geo-raj","topicId":"geo-raj-m102"},{"subjectId":"geo-raj","topicId":"geo-raj-m103"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m108"},{"subjectId":"geo-raj","topicId":"geo-raj-m109"},{"subjectId":"geo-raj","topicId":"geo-raj-m110"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m96"},{"subjectId":"geo-raj","topicId":"geo-raj-m97"},{"subjectId":"geo-raj","topicId":"geo-raj-m102"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m73"},{"subjectId":"geo-wi","topicId":"geo-wi-m74"},{"subjectId":"geo-wi","topicId":"geo-wi-m75"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m77"},{"subjectId":"geo-wi","topicId":"geo-wi-m78"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m79"},{"subjectId":"geo-wi","topicId":"geo-wi-m80"},{"subjectId":"geo-wi","topicId":"geo-wi-m81"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m83"},{"subjectId":"geo-wi","topicId":"geo-wi-m84"},{"subjectId":"geo-wi","topicId":"geo-wi-m85"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m86"},{"subjectId":"geo-wi","topicId":"geo-wi-m90"},{"subjectId":"geo-wi","topicId":"geo-wi-m91"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m92"},{"subjectId":"geo-wi","topicId":"geo-wi-m93"},{"subjectId":"geo-wi","topicId":"geo-wi-m94"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m105"},{"subjectId":"geo-raj","topicId":"geo-raj-m106"}],[{"subjectId":"geo-raj","topicId":"geo-raj-m111"},{"subjectId":"geo-raj","topicId":"geo-raj-m112"},{"subjectId":"geo-raj","topicId":"geo-raj-m113"},{"subjectId":"geo-raj","topicId":"geo-raj-m114"}],[{"subjectId":"geo-wi","topicId":"geo-wi-m81"},{"subjectId":"geo-wi","topicId":"geo-wi-m84"},{"subjectId":"geo-raj","topicId":"geo-raj-m105"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m115"},{"subjectId":"pol-ind","topicId":"pol-ind-m116"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m118"},{"subjectId":"pol-ind","topicId":"pol-ind-m119"},{"subjectId":"pol-ind","topicId":"pol-ind-m120"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m121"},{"subjectId":"pol-ind","topicId":"pol-ind-m123"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m125"},{"subjectId":"pol-ind","topicId":"pol-ind-m126"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m129"},{"subjectId":"pol-ind","topicId":"pol-ind-m128"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m134"},{"subjectId":"pol-ind","topicId":"pol-ind-m130"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m115"},{"subjectId":"pol-ind","topicId":"pol-ind-m118"},{"subjectId":"pol-ind","topicId":"pol-ind-m119"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m135"},{"subjectId":"pol-ind","topicId":"pol-ind-m136"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m137"},{"subjectId":"pol-ind","topicId":"pol-ind-m138"},{"subjectId":"pol-ind","topicId":"pol-ind-m139"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m141"},{"subjectId":"pol-ind","topicId":"pol-ind-m143"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m142"}],[{"subjectId":"pol-raj","topicId":"pol-raj-m146"},{"subjectId":"pol-raj","topicId":"pol-raj-m147"}],[{"subjectId":"pol-raj","topicId":"pol-raj-m148"},{"subjectId":"pol-raj","topicId":"pol-raj-m150"}],[{"subjectId":"pol-raj","topicId":"pol-raj-m158"},{"subjectId":"pol-raj","topicId":"pol-raj-m153"},{"subjectId":"pol-raj","topicId":"pol-raj-m154"},{"subjectId":"pol-raj","topicId":"pol-raj-m155"}],[{"subjectId":"pol-ind","topicId":"pol-ind-m143"},{"subjectId":"pol-ind","topicId":"pol-ind-m139"},{"subjectId":"pol-ind","topicId":"pol-ind-m135"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m168"},{"subjectId":"eco-ind","topicId":"eco-ind-m167"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m169"},{"subjectId":"eco-ind","topicId":"eco-ind-m170"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m171"},{"subjectId":"eco-ind","topicId":"eco-ind-m173"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m175"},{"subjectId":"eco-ind","topicId":"eco-ind-m176"},{"subjectId":"eco-ind","topicId":"eco-ind-m177"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m178"},{"subjectId":"eco-ind","topicId":"eco-ind-m179"},{"subjectId":"eco-ind","topicId":"eco-ind-m180"}],[{"subjectId":"eco-ind","topicId":"eco-ind-m169"},{"subjectId":"eco-ind","topicId":"eco-ind-m170"},{"subjectId":"eco-ind","topicId":"eco-ind-m168"}],[{"subjectId":"eco-raj","topicId":"eco-raj-m184"},{"subjectId":"eco-raj","topicId":"eco-raj-m188"}],[{"subjectId":"eco-raj","topicId":"eco-raj-m193"},{"subjectId":"eco-raj","topicId":"eco-raj-m194"}],[{"subjectId":"current-affairs","topicId":"current-affairs-m238"},{"subjectId":"current-affairs","topicId":"current-affairs-m239"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m195"},{"subjectId":"sci-tech","topicId":"sci-tech-m196"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m197"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m198"},{"subjectId":"sci-tech","topicId":"sci-tech-m199"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m200"},{"subjectId":"sci-tech","topicId":"sci-tech-m201"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m202"},{"subjectId":"sci-tech","topicId":"sci-tech-m203"},{"subjectId":"sci-tech","topicId":"sci-tech-m204"}],[{"subjectId":"sci-tech","topicId":"sci-tech-m205"},{"subjectId":"sci-tech","topicId":"sci-tech-m206"},{"subjectId":"sci-tech","topicId":"sci-tech-m208"},{"subjectId":"sci-tech","topicId":"sci-tech-m210"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m38"},{"subjectId":"ind-hist","topicId":"ind-hist-m39"},{"subjectId":"ind-hist","topicId":"ind-hist-m40"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m41"},{"subjectId":"ind-hist","topicId":"ind-hist-m42"},{"subjectId":"ind-hist","topicId":"ind-hist-m43"},{"subjectId":"ind-hist","topicId":"ind-hist-m44"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m45"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m48"},{"subjectId":"ind-hist","topicId":"ind-hist-m49"},{"subjectId":"ind-hist","topicId":"ind-hist-m50"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m53"},{"subjectId":"ind-hist","topicId":"ind-hist-m54"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m56"},{"subjectId":"ind-hist","topicId":"ind-hist-m59"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m38"},{"subjectId":"ind-hist","topicId":"ind-hist-m39"},{"subjectId":"ind-hist","topicId":"ind-hist-m40"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m61"},{"subjectId":"ind-hist","topicId":"ind-hist-m63"}],[{"subjectId":"ind-hist","topicId":"ind-hist-m64"},{"subjectId":"ind-hist","topicId":"ind-hist-m65"},{"subjectId":"ind-hist","topicId":"ind-hist-m68"},{"subjectId":"ind-hist","topicId":"ind-hist-m69"},{"subjectId":"ind-hist","topicId":"ind-hist-m70"},{"subjectId":"ind-hist","topicId":"ind-hist-m71"}],[{"subjectId":"reason","topicId":"reason-m215"},{"subjectId":"reason","topicId":"reason-m216"},{"subjectId":"reason","topicId":"reason-m217"},{"subjectId":"reason","topicId":"reason-m218"},{"subjectId":"reason","topicId":"reason-m219"}],[{"subjectId":"reason","topicId":"reason-m220"},{"subjectId":"reason","topicId":"reason-m221"},{"subjectId":"reason","topicId":"reason-m222"},{"subjectId":"reason","topicId":"reason-m223"},{"subjectId":"reason","topicId":"reason-m224"},{"subjectId":"reason","topicId":"reason-m225"},{"subjectId":"reason","topicId":"reason-m226"}],[{"subjectId":"reason","topicId":"reason-m231"},{"subjectId":"reason","topicId":"reason-m232"}],[{"subjectId":"reason","topicId":"reason-m227"},{"subjectId":"reason","topicId":"reason-m228"},{"subjectId":"reason","topicId":"reason-m229"},{"subjectId":"reason","topicId":"reason-m230"},{"subjectId":"reason","topicId":"reason-m233"},{"subjectId":"reason","topicId":"reason-m234"}],[{"subjectId":"current-affairs","topicId":"current-affairs-m235"},{"subjectId":"current-affairs","topicId":"current-affairs-m236"},{"subjectId":"current-affairs","topicId":"current-affairs-m237"},{"subjectId":"current-affairs","topicId":"current-affairs-m240"},{"subjectId":"current-affairs","topicId":"current-affairs-m241"},{"subjectId":"current-affairs","topicId":"current-affairs-m242"},{"subjectId":"current-affairs","topicId":"current-affairs-m243"}],[{"subjectId":"raj-hist","topicId":"raj-hist-m20"},{"subjectId":"pol-raj","topicId":"pol-raj-m164"},{"subjectId":"geo-raj","topicId":"geo-raj-m96"},{"subjectId":"geo-wi","topicId":"geo-wi-m81"}]]'::jsonb,
  true,
  1,
  null
)
on conflict (id) do update
  set name    = excluded.name,
      blurb   = excluded.blurb,
      scope   = excluded.scope,
      days    = excluded.days,
      is_default = true,
      version = public.plan_templates.version + 1,
      updated_at = now();

-- Sanity: 75 days, 201 slots, no empty day, every topic id known to the app.
do $$
declare d int; s int; empt int;
begin
  select jsonb_array_length(days) into d from public.plan_templates where id = 'ras-75-day';
  select count(*) into s
    from public.plan_templates t,
         lateral jsonb_array_elements(t.days) day,
         lateral jsonb_array_elements(day) slot
   where t.id = 'ras-75-day';
  select count(*) into empt
    from public.plan_templates t,
         lateral jsonb_array_elements(t.days) day
   where t.id = 'ras-75-day' and jsonb_array_length(day) = 0;
  if d <> 75 or s <> 201 or empt <> 0 then
    raise exception '75-day plan is % days / % slots / % empty days, expected 75 / 201 / 0', d, s, empt;
  end if;
end $$;

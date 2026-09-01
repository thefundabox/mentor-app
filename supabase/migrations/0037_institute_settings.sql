-- 0037_institute_settings.sql
--
-- The things that make this "RAS Prelims 2026" rather than a product.
--
-- The exam date was a constant in src/data/exam.ts, the product name was typed
-- into six components, and the landing headline was literal text in the JSX. So
-- moving the paper by a week, or running this for a different exam, meant a code
-- change and a deploy -- which is the opposite of what a configurable product
-- is for.
--
-- ONE ROW, ENFORCED
--
-- `id boolean primary key default true check (id)` allows exactly one row: the
-- only value that satisfies both the check and the primary key is true. A
-- second insert collides on the key rather than quietly creating a rival
-- settings row that half the app might read.
--
-- READABLE BY ANON, ON PURPOSE
--
-- The landing page shows the countdown and the product name to people who have
-- not signed in and may never sign in. This is the one table whose whole job is
-- to be public, so anon keeps SELECT here -- unlike questions (0029), where the
-- same grant was the bug.
-- ---------------------------------------------------------------------------

create table if not exists public.institute_settings (
  id                      boolean primary key default true check (id),
  product_name            text not null default 'RAS Mentorship',
  exam_name               text not null default 'RAS Prelims',
  exam_at                 timestamptz not null default timestamptz '2026-12-06 10:00:00+05:30',
  exam_time_label         text not null default '10:00 am IST',
  landing_headline_top    text not null default '80 days.',
  landing_headline_bottom text not null default '243 microthemes to know.',
  landing_subhead         text not null default
    'RPSC publishes 11 headings. We decoded 6 real papers into 243 studiable ideas — then built the plan that walks every one.',
  updated_at              timestamptz not null default now()
);

comment on table public.institute_settings is
  'Single row. Exam identity, product name and landing copy: everything that changes without a deploy.';
comment on column public.institute_settings.exam_at is
  'Absolute instant, not a local date. The countdown must mean the same moment to a student outside India.';

insert into public.institute_settings (id) values (true) on conflict (id) do nothing;

alter table public.institute_settings enable row level security;

-- Public by design: the countdown is on the signed-out landing page.
drop policy if exists "anyone reads settings" on public.institute_settings;
create policy "anyone reads settings"
  on public.institute_settings for select
  using (true);

drop policy if exists "admins write settings" on public.institute_settings;
create policy "admins write settings"
  on public.institute_settings for all
  using (public.current_role_of(auth.uid()) = 'admin')
  with check (public.current_role_of(auth.uid()) = 'admin');

-- Stated outright, per the trap 0028 had to undo. anon gets SELECT and nothing
-- else: a visitor may read the exam date, not move it.
revoke all on public.institute_settings from anon, authenticated;
grant select                         on public.institute_settings to anon;
grant select, insert, update         on public.institute_settings to authenticated;

notify pgrst, 'reload schema';

do $$
declare n int; d timestamptz;
begin
  select count(*), max(exam_at) into n, d from public.institute_settings;
  if n <> 1 then
    raise exception 'institute_settings must hold exactly one row, found %', n;
  end if;
  raise notice 'institute_settings ready; exam_at = %', d;
end $$;

-- 0036_announcements_in_postgres.sql
--
-- Announcements reach the people they are addressed to.
--
-- They lived in `v5_announcements` in the poster's own browser, seeded to []. A
-- mentor writing "class moved to 8am tomorrow" wrote it to their own laptop and
-- nowhere else: no student has ever seen an announcement in this product. It is
-- not a sync gap so much as a feature that has never once worked.
--
-- TWO TABLES, NOT AN ARRAY COLUMN
--
-- The client kept `dismissedBy: string[]` on the announcement itself. Putting
-- that in a column would mean granting students UPDATE on announcements so they
-- could append themselves -- and a student who may update the row may also
-- rewrite `body`, which is the whole announcement. Dismissals therefore get
-- their own table, where a student may insert exactly one row naming only
-- themselves and can touch nothing else.
--
-- posted_by is stamped by a trigger rather than accepted from the client, for
-- the reason 0018 stamped thread authors: a value the client asserts is a value
-- the client can forge, and an announcement carries the weight of whoever
-- appears to have sent it.
-- ---------------------------------------------------------------------------

create table if not exists public.announcements (
  id         text primary key,
  batch_id   text references public.batches (id) on delete cascade,
  body       text not null check (length(btrim(body)) > 0),
  posted_by  uuid references public.profiles (id) on delete set null,
  posted_at  timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.announcements.batch_id is
  'null = institute-wide, every student sees it. Otherwise scoped to one cohort.';

create index if not exists announcements_batch_idx on public.announcements (batch_id, posted_at desc);

create table if not exists public.announcement_dismissals (
  announcement_id text not null references public.announcements (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  dismissed_at    timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Stamp the author. Same reasoning as 0018/0019.
-- ---------------------------------------------------------------------------

create or replace function public.stamp_announcement_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.posted_by := auth.uid();
  new.posted_at := coalesce(new.posted_at, now());
  return new;
end $$;

drop trigger if exists stamp_announcement_author on public.announcements;
create trigger stamp_announcement_author
  before insert on public.announcements
  for each row execute function public.stamp_announcement_author();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.announcements           enable row level security;
alter table public.announcement_dismissals enable row level security;

-- A student reads institute-wide announcements and their own cohort's. Staff
-- read everything, because a mentor has to be able to see what they posted to a
-- batch they are not themselves a member of.
drop policy if exists "read announcements" on public.announcements;
create policy "read announcements"
  on public.announcements for select
  using (
    auth.uid() is not null
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or batch_id is null
      or batch_id = public.batch_of(auth.uid())
    )
  );

drop policy if exists "staff write announcements" on public.announcements;
create policy "staff write announcements"
  on public.announcements for all
  using (public.current_role_of(auth.uid()) in ('mentor', 'admin'))
  with check (public.current_role_of(auth.uid()) in ('mentor', 'admin'));

-- Dismissals are private and self-owned: you may see and create only your own.
-- with check on user_id = auth.uid() is what stops a student dismissing an
-- announcement on somebody else's behalf.
drop policy if exists "own dismissals" on public.announcement_dismissals;
create policy "own dismissals"
  on public.announcement_dismissals for select
  using (user_id = auth.uid());

drop policy if exists "dismiss for yourself" on public.announcement_dismissals;
create policy "dismiss for yourself"
  on public.announcement_dismissals for insert
  with check (user_id = auth.uid());

-- Stated outright, per the trap 0028 had to undo: Supabase's defaults grant
-- everything on a new public table, so narrowing without revoking does nothing.
revoke all on public.announcements           from anon, authenticated;
revoke all on public.announcement_dismissals from anon, authenticated;
grant select, insert, update, delete on public.announcements           to authenticated;
grant select, insert                 on public.announcement_dismissals to authenticated;

notify pgrst, 'reload schema';

do $$
begin
  if to_regclass('public.announcements') is null
     or to_regclass('public.announcement_dismissals') is null then
    raise exception 'announcement tables were not created';
  end if;
  -- A student must never be able to edit an announcement's text.
  if exists (
    select 1 from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'announcement_dismissals'
       and grantee = 'authenticated' and privilege_type in ('UPDATE', 'DELETE')
  ) then
    raise warning 'announcement_dismissals is updatable by clients; it should be insert-only';
  end if;
end $$;

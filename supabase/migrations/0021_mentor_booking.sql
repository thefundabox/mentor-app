-- 0021_mentor_booking.sql
--
-- Scheduled 1:1 sessions with a mentor.
--
-- The landing page has promised this since day one -- "Set your availability,
-- see your appointments on a calendar" for mentors, "Book sessions with your
-- mentor" for students -- and none of it existed.
--
-- Shape
-- -----
--   mentor_settings      one row per mentor: slot length, quota, booking window
--   mentor_availability  weekly recurring windows (Mon 18:00-20:00, etc.)
--   mentor_day_overrides one-off exceptions: a blocked date, or extra hours
--   bookings             a taken slot
--
-- Availability is a recurring pattern plus exceptions rather than a list of
-- dates, so a mentor sets it once instead of refilling a calendar every week.
--
-- Times as minutes from midnight
-- ------------------------------
-- Availability is wall-clock: "Mondays, 6pm to 8pm" means 6pm wherever the
-- mentor is, not a fixed instant. Storing it as timestamptz would pin it to one
-- day. Bookings, being real appointments, are timestamptz. Everyone here is in
-- one timezone; if that stops being true this is the seam to revisit.
--
-- What the database enforces, and why
-- -----------------------------------
-- Double-booking and quota are enforced here, not in the client. A UI check is
-- advisory: two students can press Book on the same slot in the same second,
-- and a crafted request can ignore the check entirely. This session has already
-- produced four bugs from trusting the client with something the server owns.

-- ---------------------------------------------------------------------------
-- Who is whose mentor, without recursing through profiles policies.
-- ---------------------------------------------------------------------------

create or replace function public.mentor_of(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select mentor_id from public.profiles where id = uid;
$$;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

create table if not exists public.mentor_settings (
  mentor_id           uuid primary key references public.profiles (id) on delete cascade,
  /* Length of one bookable slot. Availability windows are cut into these. */
  slot_minutes        int  not null default 30  check (slot_minutes between 10 and 180),
  /* "N sessions per P days" -- 15, 30, 180, 365 all expressible. 0 = blocked. */
  quota_count         int  not null default 2   check (quota_count between 0 and 100),
  quota_period_days   int  not null default 30  check (quota_period_days between 1 and 400),
  /* Nearest a student may book, so a mentor is not ambushed an hour ahead. */
  lead_time_hours     int  not null default 12  check (lead_time_hours between 0 and 336),
  /* How far ahead the calendar opens. */
  horizon_days        int  not null default 30  check (horizon_days between 1 and 180),
  /* Student self-cancel cutoff; after this only the mentor can cancel. */
  cancel_cutoff_hours int  not null default 6   check (cancel_cutoff_hours between 0 and 168),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Weekly recurring availability. weekday: 0 = Sunday .. 6 = Saturday.
-- ---------------------------------------------------------------------------

create table if not exists public.mentor_availability (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_min  smallint not null check (start_min between 0 and 1439),
  end_min    smallint not null check (end_min   between 1 and 1440),
  created_at timestamptz not null default now(),
  constraint availability_window_ordered check (end_min > start_min)
);

create index if not exists mentor_availability_mentor_idx
  on public.mentor_availability (mentor_id, weekday);

-- ---------------------------------------------------------------------------
-- One-off exceptions.
--   'blocked' with null times  -> the whole day is off
--   'blocked' with times       -> that window is off
--   'extra'                    -> an additional window on that date
-- ---------------------------------------------------------------------------

create table if not exists public.mentor_day_overrides (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles (id) on delete cascade,
  on_date    date not null,
  kind       text not null check (kind in ('blocked', 'extra')),
  start_min  smallint check (start_min between 0 and 1439),
  end_min    smallint check (end_min   between 1 and 1440),
  note       text,
  created_at timestamptz not null default now(),
  constraint override_window_ordered check (
    (start_min is null and end_min is null) or (end_min > start_min)
  ),
  /* An 'extra' window with no times would mean nothing. */
  constraint extra_needs_window check (kind <> 'extra' or start_min is not null)
);

create index if not exists mentor_day_overrides_idx
  on public.mentor_day_overrides (mentor_id, on_date);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references public.profiles (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  student_name text not null default '',
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'booked' check (status in ('booked', 'cancelled')),
  topic        text,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint booking_ordered check (ends_at > starts_at)
);

/* The whole point: two students cannot hold the same slot. A partial index so
   a cancelled booking frees the slot for somebody else. */
create unique index if not exists bookings_slot_uniq
  on public.bookings (mentor_id, starts_at)
  where status = 'booked';

create index if not exists bookings_student_idx on public.bookings (student_id, starts_at);
create index if not exists bookings_mentor_idx  on public.bookings (mentor_id,  starts_at);

-- ---------------------------------------------------------------------------
-- Stamp identity, and enforce the quota, on the server.
--
-- The quota is a rolling window: at booking time, count this student's
-- non-cancelled bookings with this mentor whose start is later than
-- now() - quota_period_days. That reads the way a person would say it -- "two
-- sessions a month" -- and counts upcoming bookings, so a student cannot take
-- the whole month's allowance twice by booking far ahead.
-- ---------------------------------------------------------------------------

create or replace function public.stamp_and_check_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller   uuid := auth.uid();
  s        public.mentor_settings;
  used     int;
  is_staff boolean := public.current_role_of(caller) in ('mentor', 'admin');
begin
  -- A student books only for themselves. Staff may book on a student's behalf.
  if not is_staff then
    new.student_id := caller;
    new.mentor_id  := public.mentor_of(caller);
  end if;
  new.student_name := public.name_of(new.student_id);
  new.status       := 'booked';

  if new.mentor_id is null then
    raise exception 'You do not have a mentor assigned yet.' using errcode = 'P0002';
  end if;

  select * into s from public.mentor_settings where mentor_id = new.mentor_id;
  if not found then
    raise exception 'This mentor has not opened any booking slots yet.' using errcode = 'P0002';
  end if;

  if s.quota_count = 0 then
    raise exception 'This mentor is not taking bookings at the moment.' using errcode = 'P0001';
  end if;

  -- Staff booking on someone's behalf bypasses the quota deliberately: a mentor
  -- adding a session for a struggling student should not be blocked by a limit
  -- the mentor set themselves.
  if not is_staff then
    select count(*) into used
      from public.bookings b
     where b.student_id = new.student_id
       and b.mentor_id  = new.mentor_id
       and b.status     = 'booked'
       and b.starts_at  > now() - make_interval(days => s.quota_period_days);

    if used >= s.quota_count then
      raise exception 'You have used all % session(s) for this % day period.',
        s.quota_count, s.quota_period_days using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_stamp_and_check on public.bookings;
create trigger bookings_stamp_and_check
  before insert on public.bookings
  for each row execute function public.stamp_and_check_booking();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.mentor_settings      enable row level security;
alter table public.mentor_availability  enable row level security;
alter table public.mentor_day_overrides enable row level security;
alter table public.bookings             enable row level security;

/* Students must read their own mentor's settings and availability to see what
   is bookable. Admins read everything. */
drop policy if exists "read mentor settings" on public.mentor_settings;
create policy "read mentor settings" on public.mentor_settings for select
  using (
    mentor_id = auth.uid()
    or mentor_id = public.mentor_of(auth.uid())
    or public.current_role_of(auth.uid()) = 'admin'
  );

drop policy if exists "write own settings" on public.mentor_settings;
create policy "write own settings" on public.mentor_settings for all
  using (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin')
  with check (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin');

drop policy if exists "read mentor availability" on public.mentor_availability;
create policy "read mentor availability" on public.mentor_availability for select
  using (
    mentor_id = auth.uid()
    or mentor_id = public.mentor_of(auth.uid())
    or public.current_role_of(auth.uid()) = 'admin'
  );

drop policy if exists "write own availability" on public.mentor_availability;
create policy "write own availability" on public.mentor_availability for all
  using (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin')
  with check (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin');

drop policy if exists "read mentor overrides" on public.mentor_day_overrides;
create policy "read mentor overrides" on public.mentor_day_overrides for select
  using (
    mentor_id = auth.uid()
    or mentor_id = public.mentor_of(auth.uid())
    or public.current_role_of(auth.uid()) = 'admin'
  );

drop policy if exists "write own overrides" on public.mentor_day_overrides;
create policy "write own overrides" on public.mentor_day_overrides for all
  using (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin')
  with check (mentor_id = auth.uid() or public.current_role_of(auth.uid()) = 'admin');

/* Bookings: both sides of the appointment can see it, plus admins.
   A student can also see that a slot is taken -- they need that to render a
   calendar -- but only rows for their own mentor, and the columns they can
   read are the whole row, so student_name is visible to a classmate sharing a
   mentor. That is the same visibility a shared timetable would give. */
drop policy if exists "read own bookings" on public.bookings;
create policy "read own bookings" on public.bookings for select
  using (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or mentor_id = public.mentor_of(auth.uid())
    or public.current_role_of(auth.uid()) = 'admin'
  );

drop policy if exists "create booking" on public.bookings;
create policy "create booking" on public.bookings for insert
  with check (auth.uid() is not null);

/* Cancelling is an update. Either side may; the trigger does not guard this
   because a mentor cancelling late is legitimate and a student cancelling late
   is a policy question the UI states rather than the database. */
drop policy if exists "cancel booking" on public.bookings;
create policy "cancel booking" on public.bookings for update
  using (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  )
  with check (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  );

grant select, insert, update, delete on public.mentor_settings      to authenticated;
grant select, insert, update, delete on public.mentor_availability  to authenticated;
grant select, insert, update, delete on public.mentor_day_overrides to authenticated;
grant select, insert, update          on public.bookings            to authenticated;

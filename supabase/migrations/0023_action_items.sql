-- 0023_action_items.sql
--
-- Directions that outlive the conversation they came from.
--
-- A mentor could already leave a discussion comment, a one-line note on an
-- override decision, or a batch announcement. None of them is trackable: a
-- comment is chat, an override note only exists when a student asked for a day
-- unlock, and an announcement is a broadcast that expires. And a booked session
-- recorded nothing at all -- `bookings` carries the student's `topic` and no
-- mentor field, so "redo Polity m118 by Friday" had nowhere to live once the
-- call ended.
--
-- One concept rather than three half-ones. An action item is a comment, a
-- direction or a task depending on whether it carries a due date, and it can
-- point back at the session or thread it came out of.
--
-- Either side may create one. A mentor setting work is the point, but a student
-- writing down what they agreed to is the same object, and created_by keeps the
-- provenance clear rather than pretending otherwise.

create table if not exists public.action_items (
  id              uuid primary key default gen_random_uuid(),
  /* Whose list this appears on. */
  student_id      uuid not null references public.profiles (id) on delete cascade,
  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text not null default '',
  body            text not null check (length(btrim(body)) between 1 and 2000),
  /* Optional anchors. All nullable: a standalone note is legitimate. */
  topic_id        text,
  booking_id      uuid references public.bookings (id) on delete set null,
  thread_id       uuid references public.threads  (id) on delete set null,
  due_on          date,
  status          text not null default 'open' check (status in ('open', 'done', 'dropped')),
  done_at         timestamptz,
  done_by         uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists action_items_student_idx
  on public.action_items (student_id, status, created_at desc);
create index if not exists action_items_booking_idx
  on public.action_items (booking_id) where booking_id is not null;

-- ---------------------------------------------------------------------------
-- Identity and completion are stamped server-side, following 0018/0019.
-- ---------------------------------------------------------------------------

create or replace function public.stamp_action_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by      := auth.uid();
    new.created_by_name := public.name_of(auth.uid());
    new.status          := coalesce(new.status, 'open');
  end if;

  -- Closing and reopening both keep an honest record of who did it.
  if new.status = 'open' then
    new.done_at := null;
    new.done_by := null;
  elsif old is null or new.status is distinct from old.status then
    new.done_at := now();
    new.done_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists action_items_stamp on public.action_items;
create trigger action_items_stamp
  before insert or update on public.action_items
  for each row execute function public.stamp_action_item();

-- ---------------------------------------------------------------------------
-- RLS
--
-- The student it is for, whoever wrote it, and that student's mentor. Not the
-- whole batch: "revise this, you got it wrong twice" is between two people.
-- ---------------------------------------------------------------------------

alter table public.action_items enable row level security;

drop policy if exists "read action items" on public.action_items;
create policy "read action items" on public.action_items for select
  using (
    student_id = auth.uid()
    or created_by = auth.uid()
    or public.mentor_of(student_id) = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  );

/* Create one for yourself, or for a student you mentor. */
drop policy if exists "create action item" on public.action_items;
create policy "create action item" on public.action_items for insert
  with check (
    student_id = auth.uid()
    or public.mentor_of(student_id) = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  );

/* A student ticks their own off; their mentor can edit or close any of theirs. */
drop policy if exists "update action item" on public.action_items;
create policy "update action item" on public.action_items for update
  using (
    student_id = auth.uid()
    or public.mentor_of(student_id) = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  )
  with check (
    student_id = auth.uid()
    or public.mentor_of(student_id) = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  );

/* Deleting is the author's or the mentor's. A student cannot make a direction
   they were given disappear -- they can mark it done, which leaves a record. */
drop policy if exists "delete action item" on public.action_items;
create policy "delete action item" on public.action_items for delete
  using (
    created_by = auth.uid()
    or public.mentor_of(student_id) = auth.uid()
    or public.current_role_of(auth.uid()) = 'admin'
  );

grant select, insert, update, delete on public.action_items to authenticated;

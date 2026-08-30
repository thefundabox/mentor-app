-- 0022_availability_no_overlap.sql
--
-- Stop a mentor adding the same availability window twice.
--
-- 0021 put no uniqueness on mentor_availability, so pressing "Add hours" twice
-- stored Monday 6-8pm twice. That is not cosmetic: buildSlots walks every
-- window and emits a slot per step, so two identical windows produce two
-- copies of every slot -- the student sees each time listed twice, and the
-- React keys collide because they are derived from the start instant.
--
-- Exact duplicates are only the visible half. Monday 6-8pm plus Monday 7-9pm
-- double-generates the 7pm and 7:30pm slots in exactly the same way, and a
-- unique index would not catch it. The real rule is that a mentor's windows on
-- a given weekday must not overlap at all.
--
-- An exclusion constraint says precisely that, and says it in the database, so
-- it holds regardless of which client is writing. int4range is half-open, so
-- 6-8pm and 8-10pm are adjacent rather than overlapping -- back-to-back
-- windows stay legal, which is what a mentor means by them.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Clear what is already stored, oldest row wins.
--
-- Any row overlapping an earlier one for the same mentor and weekday goes.
-- Both exact duplicates and partial overlaps, because the constraint below
-- refuses to be created while either exists.
-- ---------------------------------------------------------------------------

delete from public.mentor_availability a
using public.mentor_availability b
where a.mentor_id = b.mentor_id
  and a.weekday   = b.weekday
  and int4range(a.start_min, a.end_min) && int4range(b.start_min, b.end_min)
  and (b.created_at, b.id) < (a.created_at, a.id);

alter table public.mentor_availability
  drop constraint if exists mentor_availability_no_overlap;

alter table public.mentor_availability
  add constraint mentor_availability_no_overlap
  exclude using gist (
    mentor_id with =,
    weekday   with =,
    int4range(start_min::int, end_min::int) with &&
  );

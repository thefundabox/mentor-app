-- 0018_stamp_author_identity.sql
--
-- Stop asking the client to guess its own name.
--
-- The bug
-- -------
-- 0003 denormalised the author's name onto comments, and guarded it against
-- spoofing with `author_name = public.name_of(auth.uid())` in the insert
-- policy. 0017 copied the same idea onto threads. It works only while the
-- client's idea of the user's name matches the profiles row exactly.
--
-- Three of the five accounts have an EMPTY name in profiles -- including the
-- admin. The app sends a display name, the database holds '', the equality
-- fails, and the insert is rejected with a bare 42501 that surfaces as
-- "You don't have permission to start a discussion here." Permission was never
-- the problem. Comments have been broken the same way for those accounts since
-- 0003 shipped, which is why every thread has zero comments.
--
-- The fix
-- -------
-- A BEFORE INSERT trigger stamps the identity columns from auth.uid() itself,
-- overwriting whatever the client sent. That is strictly stronger than the
-- equality check it replaces -- a crafted request cannot spoof a name it is not
-- allowed to write, because the value is not taken from the request at all --
-- and it cannot be got wrong by an honest client either.
--
-- The policies then check authorisation only (who may post where), not
-- identity. Keeping the name equality as well would re-introduce a dependency
-- on trigger-vs-policy evaluation order for no added safety.

-- ---------------------------------------------------------------------------
-- Nobody should have a blank name. Fall back to the local part of the email,
-- which is at least recognisable, rather than rendering a nameless avatar.
-- ---------------------------------------------------------------------------

update public.profiles
   set name = split_part(email, '@', 1)
 where btrim(coalesce(name, '')) = '';

-- ---------------------------------------------------------------------------
-- name_of: never return blank, for the same reason.
-- ---------------------------------------------------------------------------

create or replace function public.name_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(name), ''), split_part(email, '@', 1))
    from public.profiles where id = uid;
$$;

-- ---------------------------------------------------------------------------
-- Stamp identity on insert
-- ---------------------------------------------------------------------------

create or replace function public.stamp_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id   := auth.uid();
  new.author_name := public.name_of(auth.uid());
  new.author_role := public.current_role_of(auth.uid());
  return new;
end;
$$;

drop trigger if exists comments_stamp_author on public.comments;
create trigger comments_stamp_author
  before insert on public.comments
  for each row execute function public.stamp_comment_author();

create or replace function public.stamp_thread_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by      := auth.uid();
  new.created_by_name := public.name_of(auth.uid());
  return new;
end;
$$;

drop trigger if exists threads_stamp_author on public.threads;
create trigger threads_stamp_author
  before insert on public.threads
  for each row execute function public.stamp_thread_author();

-- ---------------------------------------------------------------------------
-- Policies: authorisation only. Identity is the trigger's job now.
-- ---------------------------------------------------------------------------

drop policy if exists "post comment" on public.comments;
create policy "post comment"
  on public.comments for insert
  with check (
    public.can_see_thread(auth.uid(), thread_id)
    and not exists (
      select 1 from public.threads t
       where t.id = thread_id and t.locked
    )
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or not exists (
        select 1 from public.threads t
         where t.id = thread_id and t.staff_only_post
      )
    )
  );

drop policy if exists "create thread" on public.threads;
create policy "create thread"
  on public.threads for insert
  with check (
    auth.uid() is not null
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or (
        kind = 'topic'
        and not staff_only_post
        and not pinned
        -- Anchored to something...
        and (topic_id is not null or batch_id is not null)
        -- ...and if it names a batch, it must be the caller's own. Checking
        -- only `topic_id is not null or batch_id = mine` would have let a
        -- student set BOTH and file a thread into another cohort's room list.
        and (batch_id is null or batch_id = public.batch_of(auth.uid()))
      )
    )
  );

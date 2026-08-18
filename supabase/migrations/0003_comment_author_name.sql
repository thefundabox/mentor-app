-- 0003_comment_author_name.sql
--
-- Comments need a display name. A join to profiles will not work: students can
-- only select their own profile row, so every comment by someone else would
-- render nameless.
--
-- Widening profile visibility to the whole batch would leak email addresses to
-- classmates, so instead the name is denormalised onto the comment — and the
-- insert policy checks it against the author's real profile name, so it cannot
-- be spoofed by a crafted request.

alter table public.comments add column if not exists author_name text not null default '';
alter table public.comments add column if not exists author_role text not null default 'student';

-- Read a user's display name / role without recursing through RLS.
create or replace function public.name_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select name from public.profiles where id = uid;
$$;

-- Re-create the insert policy with the anti-spoofing checks added.
drop policy if exists "post comment" on public.comments;
create policy "post comment"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and author_name = public.name_of(auth.uid())
    and author_role = public.current_role_of(auth.uid())
    and public.can_see_thread(auth.uid(), thread_id)
    and (
      public.current_role_of(auth.uid()) in ('mentor', 'admin')
      or not exists (
        select 1 from public.threads t
         where t.id = thread_id and t.staff_only_post
      )
    )
  );

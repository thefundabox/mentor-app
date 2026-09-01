-- 0039_settings_through_rpc.sql
--
-- Save institute settings the way everything else that works is saved.
--
-- The admin form has been reporting success while the row never moved. The
-- evidence now rules out the obvious causes: the profile is `admin`, the policy
-- accepts a write carrying that account's own jwt claim, and the identical
-- feature-flag RPC -- same auth.uid(), same current_role_of check -- writes and
-- persists. What differs is the transport: settings went out as a direct
-- PostgREST PATCH, the flags go through a security definer function.
--
-- So this stops relying on the PATCH. It also removes the failure mode that hid
-- the problem for so long: PostgREST answers an UPDATE matching no rows with
-- 204 and no error, so a refused write is indistinguishable from a successful
-- one, whereas a function raises.
--
-- updated_at moves to the server as well. It was written from the browser's
-- clock, which is a value the client can get wrong -- and did get wrong enough
-- to mislead this investigation, since a skewed clock writes an audit
-- timestamp that reads as older than the write it records.
-- ---------------------------------------------------------------------------

create or replace function public.set_institute_settings(
  new_product_name            text,
  new_exam_name               text,
  new_exam_at                 timestamptz,
  new_exam_time_label         text,
  new_landing_headline_top    text,
  new_landing_headline_bottom text,
  new_landing_subhead         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if public.current_role_of(caller) <> 'admin' then
    raise exception 'Only an admin can change institute settings' using errcode = '42501';
  end if;
  if btrim(coalesce(new_product_name, '')) = '' then
    raise exception 'The product name cannot be empty' using errcode = '22023';
  end if;
  if new_exam_at is null then
    raise exception 'The exam date cannot be empty' using errcode = '22023';
  end if;

  update public.institute_settings
     set product_name            = new_product_name,
         exam_name               = new_exam_name,
         exam_at                 = new_exam_at,
         exam_time_label         = new_exam_time_label,
         landing_headline_top    = new_landing_headline_top,
         landing_headline_bottom = new_landing_headline_bottom,
         landing_subhead         = new_landing_subhead,
         -- Server clock, not the caller's.
         updated_at              = now()
   where id;

  if not found then
    raise exception 'The settings row is missing' using errcode = 'P0002';
  end if;
end $$;

revoke all     on function public.set_institute_settings(text, text, timestamptz, text, text, text, text) from public;
grant  execute on function public.set_institute_settings(text, text, timestamptz, text, text, text, text) to authenticated;

-- The direct write policy goes. Leaving it would keep a second door open that
-- fails silently, which is the whole problem being fixed.
drop policy if exists "admins write settings" on public.institute_settings;
revoke insert, update, delete on public.institute_settings from authenticated;

notify pgrst, 'reload schema';

do $$
begin
  if to_regprocedure('public.set_institute_settings(text,text,timestamptz,text,text,text,text)') is null then
    raise exception 'set_institute_settings was not created';
  end if;
  raise notice 'settings now write through set_institute_settings';
end $$;

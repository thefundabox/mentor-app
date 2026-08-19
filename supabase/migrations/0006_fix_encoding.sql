-- 0006_fix_encoding.sql
--
-- Repairs mojibake introduced when question batches were loaded through the
-- macOS clipboard: pbcopy emitted UTF-8, the paste target decoded it as
-- MacRoman, so multi-byte characters were stored as their MacRoman rendering.
--
--   ₹  (E2 82 B9) -> '‚Çπ'
--   –  (E2 80 93) -> '‚Äì'
--   ·  (C2 B7)    -> '¬∑'
--
-- Safe to re-run: each replace is a no-op once the text is already correct.

update public.questions set
  q = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(q,
      '‚Çπ','₹'),'‚Äì','–'),'‚Äî','—'),'‚Äô','’'),'‚Äò','‘'),'‚Äú','“'),'‚Äù','”'),
      '‚Ä¶','…'),'‚Ä¢','•'),'¬∑','·'),'¬†',' '),
  why = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(why,
      '‚Çπ','₹'),'‚Äì','–'),'‚Äî','—'),'‚Äô','’'),'‚Äò','‘'),'‚Äú','“'),'‚Äù','”'),
      '‚Ä¶','…'),'‚Ä¢','•'),'¬∑','·'),'¬†',' '),
  options = (replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(options::text,
      '‚Çπ','₹'),'‚Äì','–'),'‚Äî','—'),'‚Äô','’'),'‚Äò','‘'),'‚Äú','“'),'‚Äù','”'),
      '‚Ä¶','…'),'‚Ä¢','•'),'¬∑','·'),'¬†',' '))::jsonb
where q like '%‚%' or why like '%‚%' or options::text like '%‚%'
   or q like '%¬%' or why like '%¬%' or options::text like '%¬%';

-- What, if anything, is still broken — and the surrounding text so the
-- remaining sequences can be identified.
select 'remaining' as check,
       count(*) filter (where q like '%‚%' or why like '%‚%' or options::text like '%‚%') as with_marker,
       count(*) as total
  from public.questions;

select distinct substring(x from greatest(1, position('‚' in x) - 8) for 20) as context
  from (
    select q       as x from public.questions where q like '%‚%'
    union all select why           from public.questions where why like '%‚%'
    union all select options::text from public.questions where options::text like '%‚%'
  ) s
 limit 20;

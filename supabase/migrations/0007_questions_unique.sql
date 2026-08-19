-- 0007_questions_unique.sql
--
-- Make ON CONFLICT DO NOTHING mean something.
--
-- The seed scripts all ended with `on conflict do nothing`, but the table had
-- no unique key, so that clause matched nothing and a retried batch would
-- silently insert a second copy of every row. This was nearly exercised for
-- real: a batch of 49 questions failed mid-load with a transient dashboard
-- error ("Failed to fetch"), and only a manual count before retrying showed
-- that nothing had been written. A blind retry would have duplicated them.
--
-- md5(q) is indexed rather than q itself: question stems are long enough that
-- a direct btree index on the text risks exceeding the page limit.

create unique index if not exists questions_topic_question_uniq
  on public.questions (topic_id, md5(q));

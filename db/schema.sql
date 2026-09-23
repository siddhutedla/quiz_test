-- Quiz tables for the Golden Prints order-manager assessment.
-- This database is shared with the order-manager app, so everything here is
-- prefixed quiz_ and created with IF NOT EXISTS. Never run `prisma db push`
-- against this database — apply this file with `bun run db:setup`.

CREATE TABLE IF NOT EXISTS public.quiz_candidates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(255) NOT NULL,
  email        varchar(255) NOT NULL UNIQUE,
  linkedin_url varchar(500), -- required by the form; nullable here so older rows still load
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id             integer PRIMARY KEY,
  section        varchar(100) NOT NULL,
  question       text NOT NULL,
  options        jsonb NOT NULL,
  correct_answer varchar(1) NOT NULL,
  ideal_time_sec integer NOT NULL,
  max_time_sec   integer NOT NULL,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_questions_section_idx ON public.quiz_questions (section);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES public.quiz_candidates(id) ON DELETE CASCADE,
  score            integer NOT NULL,
  total_questions  integer NOT NULL,
  time_taken       integer NOT NULL,
  answers          jsonb NOT NULL,
  score_percentage numeric(5,2) NOT NULL,
  timing_score     numeric(5,2),
  weighted_score   numeric(5,2),
  grade            varchar(2),
  section_scores   jsonb,
  timing_summary   jsonb,
  tab_switches     integer DEFAULT 0,
  completed_at     timestamptz DEFAULT now()
);
-- Existing installs: CREATE TABLE IF NOT EXISTS will not add new columns
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS tab_switches integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS quiz_attempts_user_id_idx ON public.quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_completed_at_idx ON public.quiz_attempts (completed_at);

-- Row-level security: the browser uses the publishable key (anon role).
ALTER TABLE public.quiz_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz anon read questions"   ON public.quiz_questions;
CREATE POLICY "quiz anon read questions"   ON public.quiz_questions  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "quiz anon read candidates"  ON public.quiz_candidates;
CREATE POLICY "quiz anon read candidates"  ON public.quiz_candidates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "quiz anon insert candidates" ON public.quiz_candidates;
CREATE POLICY "quiz anon insert candidates" ON public.quiz_candidates FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "quiz anon read attempts"    ON public.quiz_attempts;
CREATE POLICY "quiz anon read attempts"    ON public.quiz_attempts   FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "quiz anon insert attempts"  ON public.quiz_attempts;
CREATE POLICY "quiz anon insert attempts"  ON public.quiz_attempts   FOR INSERT TO anon, authenticated WITH CHECK (true);

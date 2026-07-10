-- AI lead scoring (INT-32): store the latest likelihood-to-close score and
-- its factor breakdown on the lead itself.

alter table public.leads
  add column ai_score integer check (ai_score between 0 and 100),
  add column ai_score_factors jsonb,
  add column ai_scored_at timestamptz;

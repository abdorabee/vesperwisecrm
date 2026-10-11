-- Seller motivation (0-100) is separate from ai_score, which stays the
-- likelihood-to-close score. score_changed records when motivation changes.

alter table public.leads
  add column motivation_score integer check (motivation_score between 0 and 100);

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received',
  'sms_sent', 'sms_received',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info',
  'report_generated',
  'client_assigned', 'client_interest_updated',
  'call_started', 'call_completed', 'call_disposition_set',
  'score_changed'
));

notify pgrst, 'reload schema';

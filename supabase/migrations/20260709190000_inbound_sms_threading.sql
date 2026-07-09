-- Inbound SMS reply threading (INT-29): allow sms_received activities so
-- inbound Twilio messages can thread onto the lead activity feed like email.

alter table public.activities drop constraint activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'stage_changed', 'tag_added', 'tag_removed', 'email_sent', 'email_received',
  'sms_sent', 'sms_received',
  'note_added', 'lead_created', 'sequence_enrolled', 'sequence_step_sent',
  'lead_assigned', 'lead_unassigned', 'workflow_triggered',
  'task_created', 'task_completed',
  'lead_qualified', 'lead_rejected', 'lead_needs_info',
  'report_generated',
  'client_assigned', 'client_interest_updated'
));

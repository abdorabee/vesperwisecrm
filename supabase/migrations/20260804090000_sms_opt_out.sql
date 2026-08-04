-- Cross-channel suppression: SMS side of the do-not-contact registry.
-- Mirrors contacts.email_opted_out_at (added in 20260701170000_email_polish.sql)
-- so both channels are enforced the same way at send time.

alter table public.contacts
  add column if not exists sms_opted_out_at timestamptz;

comment on column public.contacts.sms_opted_out_at is
  'Set when the contact replies STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT to an inbound SMS. Suppresses all future SMS sends to this contact regardless of sequence marketing flag (TCPA requires honoring STOP for every message, not just marketing).';

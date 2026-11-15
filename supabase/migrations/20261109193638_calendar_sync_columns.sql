alter table public.quotes
  add column if not exists google_event_id     text,
  add column if not exists calendar_synced_at  timestamptz,
  add column if not exists calendar_sync_error text;

-- Tabella base dei preventivi. In produzione esiste già (creata a mano): su un nuovo ambiente (es. staging) la crea.
-- La policy RLS con le email autorizzate NON sta qui perché il repo è pubblico: si crea a parte nell'SQL Editor.
create table if not exists public.quotes (
  id            text primary key,
  client        text,
  type          text,
  date          text,
  location      text,
  band          text,
  total         numeric,
  status        text default 'In attesa',
  form_data     jsonb,
  created_at    timestamptz default now(),
  "prezzoLordo" numeric,
  "scontoPerTe" numeric
);

alter table public.quotes enable row level security;

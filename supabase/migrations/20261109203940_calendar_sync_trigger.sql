create extension if not exists pg_net;

create table if not exists public.calendar_sync_config (
  singleton boolean primary key default true check (singleton),
  enabled_at timestamptz not null default now()
);

insert into public.calendar_sync_config (singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on public.calendar_sync_config from anon, authenticated;

-- Gruppo evento di un preventivo (come getQuoteGroupId in App.jsx)
create or replace function public.quote_group_id(q public.quotes)
returns text
language sql
immutable
as $$
  select coalesce(nullif(q.form_data ->> '_quoteGroupId', ''), q.id::text);
$$;

-- Campi che influenzano l'evento: il trigger scatta solo se uno di questi cambia
-- (l'autosalvataggio dei campi economici, i pagamenti musicisti, ecc. non chiamano Google)
create or replace function public.quote_calendar_fields(q public.quotes)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'status',       q.status,
    'groupId',      public.quote_group_id(q),
    'version',      q.form_data -> '_quoteVersion',
    'hasContract',  (q.form_data -> 'contractData') is not null,
    'date',         q.date,
    'client',       q.client,
    'type',         q.type,
    'location',     q.location,
    'nomeLocation', q.form_data -> 'nomeLocation',
    'address',      q.form_data -> 'address',
    'momenti',      q.form_data -> 'momenti',
    'montaggio',    q.form_data -> 'montaggio',
    'contract', jsonb_build_object(
      'dataEvento',        q.form_data #> '{contractData,dataEvento}',
      'nomeCliente',       q.form_data #> '{contractData,nomeCliente}',
      'nomeLocation',      q.form_data #> '{contractData,nomeLocation}',
      'indirizzoLocation', q.form_data #> '{contractData,indirizzoLocation}',
      'oraInizio',         q.form_data #> '{contractData,oraInizio}',
      'oraFine',           q.form_data #> '{contractData,oraFine}',
      'momenti',           q.form_data #> '{contractData,momenti}',
      'montaggio',         q.form_data #> '{contractData,montaggio}'
    )
  );
$$;

create or replace function public.queue_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_groups          text[];
  v_url             text;
  v_secret          text;
  v_sync_enabled_at timestamptz;
begin
  select enabled_at into v_sync_enabled_at
  from public.calendar_sync_config
  where singleton;

  if v_sync_enabled_at is null then
    raise warning 'calendar sync non accodata: data di attivazione mancante';
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.created_at is null or old.created_at < v_sync_enabled_at then
      return old; -- non toccare preventivi esistenti prima dell'attivazione
    end if;
    if old.status = 'Archiviato' and old.google_event_id is null then
      return old; -- archiviato e senza evento: niente da fare
    end if;
    v_groups := array[public.quote_group_id(old)];
  elsif tg_op = 'INSERT' then
    if new.status = 'Archiviato' then
      return new;
    end if;
    v_groups := array[public.quote_group_id(new)];
  else -- UPDATE
    if public.quote_calendar_fields(new) is not distinct from public.quote_calendar_fields(old) then
      return new; -- nessun campo rilevante cambiato (incluse le scritture della funzione stessa)
    end if;
    if new.status = 'Archiviato' and old.status = 'Archiviato' then
      return new; -- modifiche a un preventivo che resta in archivio
    end if;
    -- se il preventivo cambia gruppo vanno risincronizzati entrambi
    v_groups := array(select distinct g from unnest(array[public.quote_group_id(old), public.quote_group_id(new)]) as g);
  end if;

  if tg_op = 'UPDATE'
    and (old.created_at is null or old.created_at < v_sync_enabled_at) then
    return new; -- gli aggiornamenti dei preventivi preesistenti non chiamano Google
  end if;

  if exists (
    select 1
    from public.quotes q
    where public.quote_group_id(q) = any(v_groups)
      and (q.created_at is null or q.created_at < v_sync_enabled_at)
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new; -- non modificare eventi di gruppi già esistenti
  end if;

  -- Un problema di sync non deve MAI bloccare il salvataggio del preventivo
  begin
    select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'calendar_sync_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'calendar_sync_secret';
    if v_url is null or v_secret is null then
      raise warning 'calendar sync: secret mancanti nel Vault';
    else
      perform net.http_post(
        url     := v_url,
        body    := jsonb_build_object('op', tg_op, 'group_ids', to_jsonb(v_groups)),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', v_secret),
        timeout_milliseconds := 15000
      );
    end if;
  exception when others then
    raise warning 'calendar sync non accodata per %: %', v_groups, sqlerrm;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_calendar_sync on public.quotes;
create trigger quotes_calendar_sync
after insert or update or delete on public.quotes
for each row execute function public.queue_calendar_sync();

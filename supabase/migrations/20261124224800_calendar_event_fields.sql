-- Campi che influenzano l'evento: aggiunti frontman e formazione (nomi musicisti + strumenti)
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
    'frontman',     q.form_data -> 'nomeFrontman',
    'formazione',   q.form_data -> 'formazione',
    'contract', jsonb_build_object(
      'dataEvento',        q.form_data #> '{contractData,dataEvento}',
      'nomeCliente',       q.form_data #> '{contractData,nomeCliente}',
      'nomeLocation',      q.form_data #> '{contractData,nomeLocation}',
      'indirizzoLocation', q.form_data #> '{contractData,indirizzoLocation}',
      'oraInizio',         q.form_data #> '{contractData,oraInizio}',
      'oraFine',           q.form_data #> '{contractData,oraFine}',
      'momenti',           q.form_data #> '{contractData,momenti}',
      'montaggio',         q.form_data #> '{contractData,montaggio}',
      'nomeFrontman',      q.form_data #> '{contractData,nomeFrontman}'
    )
  );
$$;

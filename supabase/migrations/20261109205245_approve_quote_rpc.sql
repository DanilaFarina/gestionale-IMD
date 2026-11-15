-- Approva un preventivo e rimette "In attesa" gli altri approvati dello stesso evento, in un'unica scrittura
create or replace function public.approve_quote(p_id text)
returns void
language plpgsql
security invoker          -- rispetta le RLS dell'utente loggato
set search_path = public
as $$
declare
  v_group text;
begin
  select public.quote_group_id(q) into v_group from public.quotes q where q.id = p_id;
  if v_group is null then
    raise exception 'Preventivo % non trovato', p_id;
  end if;

  update public.quotes q
  set status = case when q.id = p_id then 'Approvato' else 'In attesa' end
  where q.id = p_id
     or (q.status = 'Approvato' and public.quote_group_id(q) = v_group);
end;
$$;

grant execute on function public.approve_quote(text) to authenticated;

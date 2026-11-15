// Sincronizza gli eventi (gruppi di preventivi) con Google Calendar:
// in attesa → "Opz. IMD – …", approvato → "IMD – …", tutto archiviato/eliminato → evento rimosso.
// Chiamata dal trigger quotes_calendar_sync con { op, group_ids }, oppure a mano con { all: true }.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

const TZ = 'Europe/Rome';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://danilafarina.github.io/gestionale-IMD/';
const DEFAULT_DURATION_MIN = 180; // se c'è solo l'orario di inizio
const CALENDAR_ID = Deno.env.get('GOOGLE_CALENDAR_ID') ?? '';
const SYNC_SECRET = Deno.env.get('CALENDAR_SYNC_SECRET') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ───────────────────────── Google auth (service account → access token) ─────────────────────────

type ServiceAccount = { client_email: string; private_key: string };
let serviceAccount: ServiceAccount | null = null;
let cachedToken: { value: string; exp: number } | null = null;

const getServiceAccount = (): ServiceAccount => {
  if (!serviceAccount) {
    const b64 = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_B64');
    if (!b64) throw new Error('GOOGLE_SERVICE_ACCOUNT_B64 non configurato');
    serviceAccount = JSON.parse(atob(b64));
  }
  return serviceAccount!;
};

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const sa = getServiceAccount();
  const key = await importPKCS8(sa.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/calendar.events' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Token Google ${res.status}: ${await res.text()}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, exp: now + Number(json.expires_in || 3600) };
  return cachedToken.value;
}

// ───────────────────────── Calendar API ─────────────────────────

async function gcal(method: string, path = '', body?: unknown): Promise<Response> {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events${path}?sendUpdates=none`;
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ID evento deterministico: "imd" + esadecimale dell'id del gruppo (caratteri ammessi da Google: a-v, 0-9)
const eventIdFor = (groupId: string) =>
  'imd' + Array.from(new TextEncoder().encode(groupId)).map(b => b.toString(16).padStart(2, '0')).join('');

// PUT aggiorna (e ripristina un evento cancellato); se non esiste lo crea con POST.
async function upsertEvent(eventId: string, event: Record<string, unknown>) {
  let res = await gcal('PUT', `/${eventId}`, event);
  if (res.status === 404) {
    await res.body?.cancel();
    res = await gcal('POST', '', { ...event, id: eventId });
    if (res.status === 409) { // creato nel frattempo da un'altra chiamata
      await res.body?.cancel();
      res = await gcal('PUT', `/${eventId}`, event);
    }
  }
  if (!res.ok) throw new Error(`Calendar ${res.status}: ${await res.text()}`);
  await res.body?.cancel();
}

async function deleteEvent(eventId: string) {
  const res = await gcal('DELETE', `/${eventId}`);
  // 404 = mai esistito, 410 = già cancellato: va bene comunque
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete ${res.status}: ${await res.text()}`);
  }
  await res.body?.cancel();
}

// ───────────────────────── Preventivo → evento ─────────────────────────

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const pad = (n: number) => String(n).padStart(2, '0');

function parseDateParts(s: string): [number, number, number] | null {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);              // 2026-06-20
  if (m) return [+m[1], +m[2], +m[3]];
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);           // 20/06/2026
  if (m) return [+m[3], +m[2], +m[1]];
  m = s.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);                   // 20 giugno 2026
  if (m && MESI.includes(m[2])) return [+m[3], MESI.indexOf(m[2]) + 1, +m[1]];
  return null;
}

// Restituisce YYYY-MM-DD oppure null (es. "Da definire")
function normalizeDate(value: unknown): string | null {
  const parts = parseDateParts(String(value ?? '').trim().toLowerCase());
  if (!parts) return null;
  const [y, mo, d] = parts;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

const addDays = (date: string, days: number) => {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

// Stessa logica di parseTimeToMinutes in App.jsx: "17:00" / "17.00" / "17"
function parseTime(value: unknown): number | null {
  if (!value) return null;
  const m = String(value).match(/(\d{1,2})[:.,hH]?(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;
type Quote = { id: string; status: string | null; client: string | null; type: string | null; date: string | null; location: string | null; form_data: Json | null; created_at: string | null };

const QUOTE_COLUMNS = 'id, status, client, type, date, location, form_data, created_at';

// Stesse regole di getQuoteGroupId / pickGroupRepresentative in App.jsx (gli archiviati non contano)
const groupIdOf = (q: Quote) => String(q.form_data?._quoteGroupId || q.id);
const versionOf = (q: Quote) => Number(q.form_data?._quoteVersion) || 1;
const createdOf = (q: Quote) => Date.parse(q.form_data?._createdAt || q.created_at || '') || 0;
const STATUS_PRIORITY: Record<string, number> = { 'Approvato': 0, 'In attesa': 1 };

function pickRepresentative(list: Quote[]): Quote | null {
  return list
    .filter(q => (q.status ?? '') in STATUS_PRIORITY)
    .sort((a, b) =>
      STATUS_PRIORITY[a.status!] - STATUS_PRIORITY[b.status!]
      || Number(Boolean(b.form_data?.contractData)) - Number(Boolean(a.form_data?.contractData))
      || versionOf(b) - versionOf(a)
      || createdOf(b) - createdOf(a))[0] ?? null;
}

async function loadGroup(groupId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select(QUOTE_COLUMNS)
    .or(`id.eq."${groupId}",form_data->>_quoteGroupId.eq."${groupId}"`);
  if (error) throw error;
  return ((data ?? []) as Quote[]).filter(q => groupIdOf(q) === groupId);
}

function buildEvent(q: Quote): Json | null {
  const fd: Json = q.form_data ?? {};
  const c: Json = fd.contractData ?? {};

  const date = normalizeDate(c.dataEvento) ?? normalizeDate(q.date);
  if (!date) return null;

  // Programma: montaggio (se attivo) + momenti; il contratto, se salvato, ha la precedenza
  const montaggio: Json | undefined = c.montaggio ?? fd.montaggio;
  const setupActive = Boolean(montaggio && (montaggio.attivo ?? (montaggio.inizio || montaggio.fine || montaggio.descrizione)));
  const momenti: Json[] = ((c.momenti ?? fd.momenti ?? []) as Json[])
    .filter(m => m && (m.titolo || m.inizio || m.fine || m.descrizione));
  const program: Json[] = [
    ...(setupActive ? [{ ...montaggio, titolo: montaggio!.titolo || 'Montaggio e soundcheck' }] : []),
    ...momenti,
  ];

  const start = parseTime(program.find(m => parseTime(m.inizio) != null)?.inizio) ?? parseTime(c.oraInizio);
  const end = parseTime([...momenti].reverse().find(m => parseTime(m.fine) != null)?.fine) ?? parseTime(c.oraFine);

  let timing: Json;
  if (start == null) {
    timing = { start: { date }, end: { date: addDays(date, 1) } }; // tutto il giorno
  } else {
    const endTotal = end == null ? start + DEFAULT_DURATION_MIN : (end <= start ? end + 1440 : end);
    timing = {
      start: { dateTime: `${date}T${toHHMM(start)}:00`, timeZone: TZ },
      end: { dateTime: `${addDays(date, Math.floor(endTotal / 1440))}T${toHHMM(endTotal % 1440)}:00`, timeZone: TZ },
    };
  }

  const client = c.nomeCliente || q.client || 'Cliente';
  const venue = c.nomeLocation || fd.nomeLocation || '';
  const address = c.indirizzoLocation || fd.address || (q.location && q.location !== 'Da definire' ? q.location : '');
  const location = [venue, address].filter(Boolean).join(', ');

  const approved = q.status === 'Approvato';

  const description = [
    approved ? 'Stato: CONFERMATO' : 'Stato: OPZIONE (preventivo in attesa di approvazione)',
    q.type ? `Tipo evento: ${q.type}` : '',
    location ? `Location: ${location}` : '',
    program.length ? '\nProgramma:' : '',
    ...program.map(m => {
      const orario = [m.inizio, m.fine].filter(Boolean).join('–');
      return `• ${orario ? `${orario} ` : ''}${m.titolo || 'Momento'}`;
    }),
    start != null && end == null ? '\nOrario di fine da definire (durata indicativa 3 ore).' : '',
    `\nPreventivo ${q.id} – ${APP_URL}`,
  ].filter(Boolean).join('\n');

  return {
    summary: `${approved ? '' : 'Opz. '}IMD – ${client}${q.type ? ` (${q.type})` : ''}`,
    location,
    description,
    ...timing,
    status: 'confirmed',
    reminders: { useDefault: true },
    extendedProperties: { private: { imdQuoteId: String(q.id) } },
  };
}

// ───────────────────────── Sync ─────────────────────────

// Lo stato di sync viene scritto su tutte le versioni del gruppo (il badge in dashboard legge quello del rappresentante)
async function saveSyncState(list: Quote[], fields: Json) {
  if (!list.length) return;
  const ids = list.map(q => q.id);
  const { error } = await supabase.from('quotes').update(fields).in('id', ids);
  if (error) console.error('Stato sync non salvato', ids, error.message);
}

async function syncGroup(groupId: string): Promise<string> {
  const eventId = eventIdFor(groupId);
  let list: Quote[] = [];
  try {
    list = await loadGroup(groupId);
    const rep = pickRepresentative(list);
    const event = rep ? buildEvent(rep) : null;

    if (!rep || !event) { // niente di attivo, oppure data "Da definire"
      await deleteEvent(eventId);
      await saveSyncState(list, { google_event_id: null, calendar_synced_at: new Date().toISOString(), calendar_sync_error: null });
      return 'removed';
    }

    await upsertEvent(eventId, event);
    await saveSyncState(list, { google_event_id: eventId, calendar_synced_at: new Date().toISOString(), calendar_sync_error: null });
    return rep.status === 'Approvato' ? 'confirmed' : 'option';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sync fallita', groupId, message);
    await saveSyncState(list, { calendar_sync_error: message.slice(0, 500) });
    throw err;
  }
}

const syncGroups = async (groupIds: string[]) => {
  const results: Json[] = [];
  for (const groupId of new Set(groupIds.map(String))) {
    results.push({ groupId, result: await syncGroup(groupId).catch(e => `errore: ${e.message}`) });
  }
  return results;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SYNC_SECRET || req.headers.get('x-sync-secret') !== SYNC_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!CALENDAR_ID) return new Response('GOOGLE_CALENDAR_ID non configurato', { status: 500 });

  const body: Json = await req.json().catch(() => ({}));

  // Backfill / risincronizzazione completa: tutti gli approvati, gli in attesa da oggi in poi,
  // e tutto ciò che ha già un evento (così gli eventi orfani vengono ripuliti)
  if (body.all) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('quotes')
      .select('id, gid:form_data->>_quoteGroupId')
      .or(`status.eq.Approvato,and(status.eq."In attesa",date.gte.${today}),google_event_id.not.is.null`);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const results = await syncGroups((data ?? []).map(r => r.gid || r.id));
    return Response.json({ count: results.length, results });
  }

  // Chiamata dal trigger (o a mano per un singolo gruppo)
  const groupIds: string[] = Array.isArray(body.group_ids) ? body.group_ids : [];
  if (!groupIds.length) return new Response('group_ids mancante', { status: 400 });
  const results = await syncGroups(groupIds);
  const failed = results.some(r => String(r.result).startsWith('errore'));
  return Response.json({ results }, { status: failed ? 500 : 200 });
});

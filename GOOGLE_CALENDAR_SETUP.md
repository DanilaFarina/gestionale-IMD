# Google Calendar sync for quotes (options and confirmed events)

As soon as a quote has an event date, an event is created automatically in the Google Calendar of **italianmusicdesigner@gmail.com** on that date:

- **Pending** quote ("In attesa"): the title starts with **`Opz.`**, meaning the date is on hold. Example: `Opz. IMD – Rossi (Matrimonio)`.
- **Approved** quote ("Approvato"): the prefix is removed. Example: `IMD – Rossi (Matrimonio)`.
- All versions archived or deleted: the event is removed.

There is **one event per event**: all versions of the same quote (same `_quoteGroupId`) share a single calendar event. The event shows the approved version, or else the latest pending one, just like the dashboard row. When a quote changes, the event is kept up to date.

> **Who does what**
> - **Giovanni** (calendar owner): only step 2, sharing the calendar. It takes about 2 minutes.
> - **Developer**: all the other steps.

---

## 0. How it works

```
 App (GitHub Pages)                       Supabase                                  Google
 ──────────────────                       ────────                                  ──────
 approve / edit / archive  ──update──▶  quotes table
                                           │
                                           │ AFTER trigger "quotes_calendar_sync"
                                           │ (fires only if status/date/times/place/version changed
                                           │  and the quote isn't just sitting in the archive)
                                           ▼
                                        pg_net POST { op, group_ids }
                                           │  header x-sync-secret
                                           ▼
                                        Edge Function "sync-calendar"
                                           │ 1. re-reads all versions of the event from the DB
                                           │ 2. picks the representative version and builds the
                                           │    event ("Opz." prefix unless approved)
                                           │ 3. creates/updates/deletes  ──────────▶  Calendar API
                                           │                                          (service account,
                                           │ 4. writes back google_event_id,           calendar shared
                                           ▼    calendar_synced_at, calendar_sync_error   with it)
                                        quotes table
```

Design choices:

- **The work happens on the server, not in the browser.** Nobody has to log in to Google, no token expires on the client, the sync works whichever user approves, and the Google credentials never reach the public site.
- **A service account writes to Giovanni's calendar.** The calendar is shared with a "robot" Google account that only has permission to edit events. No password or OAuth login of Giovanni's is stored anywhere.
- **The event ID is derived from the event group ID** (`imd` + hex of the `_quoteGroupId`, or of the quote ID for quotes without a group). All versions of the same event always map to the same Google event, so repeated or concurrent calls can't create duplicates. Moving from "Opz." to approved, or switching the approved version, is just an update of the same event.
- **The function always re-reads the whole group** instead of trusting the trigger payload. Whatever order the calls arrive in, the calendar ends up matching the current state of the database.
- **Approving happens in one database transaction** (the `approve_quote` RPC, step 7c). Putting the old version back to pending and approving the new one is a single write, so the calendar never briefly sees the event as "no version approved".

### Defaults built into this guide (easy to change in step 5)

| Topic | Behaviour |
|---|---|
| Title | Pending: `Opz. IMD – {cliente} ({tipo})`. Approved: `IMD – {cliente} ({tipo})`. |
| Which version is shown | The approved one (if there are several, the one with a contract), otherwise the latest pending version. Archived versions are ignored. Same rule as `pickGroupRepresentative` in the app. |
| Date | The contract's `dataEvento` if it can be parsed, otherwise the quote's `date` |
| Time | Start = setup start (if enabled) or the first moment's start. End = the last moment's end. Crossing midnight is handled. No times at all → all-day event. Only a start time → 3 hours by default. |
| Time zone | `Europe/Rome` |
| Place | `{nomeLocation}, {address}` (contract values take priority) |
| Description | Event type, place, program, quote ID and link to the app. **No prices.** |
| New quote saved with a date | `Opz.` event created right away (autosave included) |
| Approve | Same event, prefix removed |
| Un-approve ("Annulla approvazione") | Same event, back to `Opz.` |
| Approving another version of the same event | Same event, updated with that version's data |
| All versions archived or deleted, or the date changed to "Da definire" | The event is **deleted** |
| Events edited by hand in Google Calendar | Overwritten at the next sync. The app is the source of truth. |
| Quotes already present when sync is enabled | Not synced, including when edited or when a new version is added to their group |

---

## 1. Google Cloud: create the service account

> ⚠️ Use a **personal Google account** (yours or Giovanni's), not the Shopfully Workspace account. Company organization policies often block service-account keys, and the project shouldn't belong to the employer.

1. Open <https://console.cloud.google.com/> → project picker → **New project** → name it `gestionale-imd` → **Create**. Make sure the new project is selected.
2. **APIs & Services → Library** → search for **Google Calendar API** → **Enable**.
3. **IAM & Admin → Service Accounts → + Create service account**
   - Name: `imd-calendar-sync`
   - Skip "Grant this service account access to project" and "Grant users access" (it needs no project roles) → **Done**.
4. Click the new service account → **Keys** tab → **Add key → Create new key → JSON → Create**.
   A `.json` file is downloaded. Move it **outside the repo**, for example:
   ```bash
   mkdir -p ~/secrets && mv ~/Downloads/gestionale-imd-*.json ~/secrets/imd-calendar-sa.json
   chmod 600 ~/secrets/imd-calendar-sa.json
   ```
5. Copy the service account's email address. It looks like
   `imd-calendar-sync@giovanni-489212.iam.gserviceaccount.com`. You need it in step 2.

> The JSON key gives write access to the shared calendar. Never commit it, paste it in chats, or put it in `VITE_*` variables. The repo is public.

---

## 2. Giovanni: share the calendar with the service account

This must be done from a **computer** (the mobile app has no sharing settings), logged in as **italianmusicdesigner@gmail.com**:

1. Open <https://calendar.google.com> → ⚙️ **Settings**.
2. In the left column, under **Settings for my calendars**, click the main calendar (the one with Giovanni's name).
3. **Share with specific people or groups → + Add people and groups**
   - Paste the service account email from step 1.5.
   - Permission: **Make changes to events**.
   - **Send**. Google may warn that the address is outside the organization or can't receive email. That's fine.
4. Under **Integrate calendar**, the **Calendar ID** should be `italianmusicdesigner@gmail.com`. That's the value used below.

Giovanni won't receive invitations. The events simply appear in the calendar, with the calendar's default reminders.

> **Recommended for testing:** before using the real calendar, create a secondary calendar (Settings → **Add calendar → Create new calendar**, for example "IMD test"). Share it with the service account the same way, and use its Calendar ID (`...@group.calendar.google.com`) in step 5. When everything works, switch the secret to `italianmusicdesigner@gmail.com` (step 10).

---

## 3. Supabase CLI in the repo

```bash
brew install supabase/tap/supabase
cd ~/personal/gestionale-IMD
supabase login
supabase init                                  # creates supabase/config.toml
supabase link --project-ref jcazkicbnkektaxihhmx
```

Add this to `supabase/config.toml` so the function accepts calls from the trigger without a user JWT. It checks its own shared secret instead:

```toml
[functions.sync-calendar]
verify_jwt = false
```

Add these lines to `.gitignore`:

```gitignore
# Supabase
supabase/.temp
supabase/.branches
supabase/.env
# Google credentials (should live in ~/secrets anyway)
*service-account*.json
*-sa.json
```

---

## 4. Database: sync columns

```bash
supabase migration new calendar_sync_columns
```

Paste into the generated file `supabase/migrations/<timestamp>_calendar_sync_columns.sql`:

```sql
alter table public.quotes
  add column if not exists google_event_id     text,
  add column if not exists calendar_synced_at  timestamptz,
  add column if not exists calendar_sync_error text;
```

Apply it with `supabase db push`, which asks for the database password. You can also paste the same SQL into **Dashboard → SQL Editor**.

---

## 5. Edge Function `sync-calendar`

```bash
supabase functions new sync-calendar
```

Replace `supabase/functions/sync-calendar/index.ts` with:

```ts
// Sincronizza gli eventi (gruppi di preventivi) con Google Calendar:
// in attesa → "Opz. IMD – …", approvato → "IMD – …", tutto archiviato/eliminato → evento rimosso.
// Chiamata dal trigger quotes_calendar_sync con { op, group_ids }, oppure a mano con { all: true }.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

const TZ = 'Europe/Rome';
const APP_URL = 'https://danilafarina.github.io/gestionale-IMD/';
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
```

### Secrets and deploy

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Set the other three:

```bash
cd ~/personal/gestionale-IMD
SYNC_SECRET=$(openssl rand -hex 32)
echo "$SYNC_SECRET"   # save it in a password manager: you need it again in step 7

supabase secrets set \
  GOOGLE_CALENDAR_ID="italianmusicdesigner@gmail.com" \
  CALENDAR_SYNC_SECRET="$SYNC_SECRET" \
  GOOGLE_SERVICE_ACCOUNT_B64="$(base64 -i ~/secrets/giovanni-489212-a0c831676dce.json)"

supabase functions deploy sync-calendar --no-verify-jwt
# if the CLI complains about Docker: add --use-api
```

---

## 6. Test the function by hand (before the trigger exists)

1. Pick a pending quote that has a date. Note its group ID: `form_data._quoteGroupId`, or the quote ID (for example `PRV-123`) if it has none. You can find it in the Table Editor, or with `select id, form_data->>'_quoteGroupId' from quotes where client ilike '%rossi%';`.
2. Run:

```bash
curl -s -X POST "https://jcazkicbnkektaxihhmx.supabase.co/functions/v1/sync-calendar" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -d '{"group_ids":["PRV-038"]}'
# → {"results":[{"groupId":"PRV-123","result":"option"}]}
```

3. An `Opz. IMD – …` event should appear in the calendar, and every version of that quote in `quotes` should have `google_event_id` and `calendar_synced_at` filled in.
4. Approve the quote in the app, run the same `curl` again, and check that the title loses `Opz.` (`"result":"confirmed"`).
5. If it fails, read the error in the response, in `quotes.calendar_sync_error`, or in **Dashboard → Edge Functions → sync-calendar → Logs**. Then see [Troubleshooting](#11-troubleshooting).

---

## 7. Database trigger (makes it automatic)

### 7a. Store the URL and secret in Supabase Vault

Run this **only in the SQL Editor**. Don't put it in a migration file, because the repo is public:

```sql
select vault.create_secret(
  'https://jcazkicbnkektaxihhmx.supabase.co/functions/v1/sync-calendar',
  'calendar_sync_url'
);
select vault.create_secret('<same value as $SYNC_SECRET>', 'calendar_sync_secret');
```

### 7b. Trigger migration

This installs automatic sync for quotes created from this point forward. It does not sync or update existing quotes; new versions added to an existing quote group are also left alone.

```bash
supabase migration new calendar_sync_trigger
```

```sql
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
```

Apply it with `supabase db push`, or paste it into the SQL Editor.

Notes:
- `pg_net` sends the request **after the transaction commits**, so the function always reads saved data.
- New pending quotes are synced too, so while someone edits one, autosave triggers a sync when event-related fields change. Existing quotes and groups are ignored.

### 7c. Approve in a single transaction

Right now `handleApprove` makes **two** separate writes: first it puts the old approved version back to "In attesa", then it approves the new one. Each write sends its own sync request, and the requests can arrive in any order. If the first one is processed last, it can briefly put `Opz.` back on an event that has just been approved. Doing both changes in one statement fixes this, because every sync request then reads the final state.

The migration `supabase/migrations/20261109205245_approve_quote_rpc.sql` defines this RPC. Apply it along with the other migrations using `supabase db push`:

```sql
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
```

In `handleApprove` ([src/App.jsx](src/App.jsx)), keep the confirmation dialog, the `applyStatuses` helper, and the development-mode branch. For the Supabase branch, use the RPC instead of the two separate updates:

```jsx
const { error } = await supabase.rpc('approve_quote', { p_id: id });
if (error) {
  alert('Errore: ' + error.message);
  return;
}
setQuotes(applyStatuses(quotes));
```

The confirmation dialog and `applyStatuses` stay as they are. The function demotes exactly the same rows that `previouslyApproved` computes in the app.

---

## 8. Backfill existing quotes — skip for now

This step would sync existing events. **Do not run it for the current setup**: the goal is to leave existing quotes and calendar events unchanged. The trigger in step 7 already syncs new quotes automatically.

---

## 9. App: show the sync status (optional but recommended)

Implemented in `src/App.jsx`.

### 9a. Keep the sync columns out of the quote objects

`fetchQuotes` stores `google_event_id`, `calendar_synced_at`, and `calendar_sync_error` in separate `calendarSync` state, not in quote objects. Since saves send `...rest` back to Supabase, this prevents overwriting sync values with stale data or copying them onto duplicated quotes.

### 9b. Icon in the dashboard

The app passes the status state to `Dashboard` and shows a badge next to the status icon on group, child, and single rows. The badge shows a red icon and error tooltip on failure, a blue check for an approved event, and an amber clock for an option. The function writes the sync state on **all** versions of the event.

After writes that can queue a sync, the app refreshes the status after a 3-second debounce.

> In dev mode (`npm run dev`) the app uses localStorage and never writes to Supabase, so **the sync only runs in production**.

---

## 10. Go-live checklist

Test first on the **test calendar**, then:

```bash
supabase secrets set GOOGLE_CALENDAR_ID=giovannigargini@gmail.com
supabase functions deploy sync-calendar --no-verify-jwt   # re-deploy picks up the new secret
```

Do not run the backfill in step 8. Delete the test calendar afterwards.

| # | Action in the app | Expected in Google Calendar |
|---|---|---|
| 1 | Create a new quote and set a date | `Opz. IMD – …` event created on that date |
| 2 | Create a second version of the same quote (pending) | **Still one** `Opz.` event, now showing the latest version |
| 3 | Approve one version | Same event, `Opz.` removed, data of the approved version |
| 4 | Approve the *other* version (confirm the dialog) | Same event, updated to that version, still without `Opz.` |
| 5 | Un-approve ("Annulla approvazione") | Same event, back to `Opz.` |
| 6 | Change a moment's time | Event times update |
| 7 | Last moment ends after midnight (e.g. 20:00 → 01:00) | Event ends at 01:00 the next day |
| 8 | Quote with no times | All-day event |
| 9 | Change the date to empty / "Da definire" | Event deleted |
| 10 | Archive all versions, or delete them | Event deleted |
| 11 | Archive only the approved version while a pending one exists | Event goes back to `Opz.` with the pending version |
| 12 | Fill in the contract with a different date or venue | Event follows the contract data |
| 13 | Change a price only | **Nothing** happens (no call to Google) |
| 14 | Edit a quote that existed before enabling sync | No calendar event is created or changed |

---

## 11. Troubleshooting

**Where to look**

```sql
-- latest calls from the trigger to the function
select id, status_code, timed_out, error_msg, left(content::text, 300) as body, created
from net._http_response
order by created desc
limit 20;

-- quotes with sync errors
select id, client, date, status, calendar_sync_error, calendar_synced_at
from quotes
where calendar_sync_error is not null;
```

Function logs are in **Dashboard → Edge Functions → sync-calendar → Logs**.

| Symptom | Cause / fix |
|---|---|
| `401 Unauthorized` in `net._http_response` | `calendar_sync_secret` in the Vault ≠ `CALENDAR_SYNC_SECRET`. Update it with `select vault.update_secret((select id from vault.secrets where name = 'calendar_sync_secret'), '<value>');` |
| `Calendar 404: Not Found` on every call | The calendar isn't shared with the service account, or `GOOGLE_CALENDAR_ID` is wrong. Redo step 2. |
| `Calendar 403: ... requiredAccessLevel` | Shared with "See all event details" instead of **Make changes to events** |
| `Token Google 400: invalid_grant` | Wrong or deleted key, or the computer clock is off. Create a new key (step 1.4) and set the secret again. |
| `Calendar 403: ... API has not been used` | Google Calendar API not enabled in the project (step 1.2) |
| Nothing in `net._http_response` | Trigger not created, the Vault secrets are missing (check the Postgres logs for the warning), or only irrelevant fields changed |
| Event at the wrong time | Times are always interpreted as Europe/Rome. Check the quote's time format. |
| Event on the wrong day | The contract `dataEvento` is free text: if it can't be parsed, the quote's `date` is used. Supported: `2026-06-20`, `20/06/2026`, `20-06-2026`, `20.06.2026`, `20 giugno 2026`. |

---

## 12. Security and maintenance

- **The repo is public:** the service-account key lives only in Supabase secrets (`GOOGLE_SERVICE_ACCOUNT_B64`), and the sync secret only in secrets + Vault. Neither ever appears in the code, in migrations, or in `VITE_*` variables.
- **Least privilege:** the service account has no roles on the Google project. The token only has the `calendar.events` scope, and it can only reach the calendar Giovanni shared. To revoke access instantly, Giovanni removes the service account from the calendar's sharing settings.
- **Key rotation:** Google Cloud → service account → Keys → add a new key → `supabase secrets set GOOGLE_SERVICE_ACCOUNT_B64=...` → delete the old key.
- **The function is public** (`verify_jwt = false`), but without the `x-sync-secret` header it answers 401 and does nothing.
- **Hand-made edits in Google** to IMD events are overwritten at the next sync. Other events in Giovanni's calendar can be added freely; they are never touched.

### Customising

All of these are in `buildEvent` in `supabase/functions/sync-calendar/index.ts`:
- Title or description format, including the `Opz. ` prefix in `summary`.
- A different colour for options, for example `colorId: approved ? '10' : '8'` (green confirmed, grey options).
- Default duration (`DEFAULT_DURATION_MIN`).
- A colour, for example `colorId: '10'` (green).
- Adding the agreed price to the description: `c.compensoTotale`.

After changing any of them, re-deploy the function. New quotes will use the updated format; do not run a full backfill unless you later decide to update existing events too.

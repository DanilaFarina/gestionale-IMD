# Google Calendar sync for approved quotes

When a quote is marked **Approvato**, an event is created automatically in the Google Calendar of **giovannigargini@gmail.com** on the event date. When the quote changes, the event is kept up to date. When the quote is no longer approved, the event is removed.

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
                                           │ (fires only if status/date/times/place changed
                                           │  and the quote is, or was, approved)
                                           ▼
                                        pg_net POST { op, quote_id }
                                           │  header x-sync-secret
                                           ▼
                                        Edge Function "sync-calendar"
                                           │ 1. re-reads the quote from the DB
                                           │ 2. builds the event
                                           │ 3. creates/updates/deletes  ──────────▶  Calendar API
                                           │                                          (service account,
                                           │ 4. writes back google_event_id,           calendar shared
                                           ▼    calendar_synced_at, calendar_sync_error   with it)
                                        quotes table
```

Design choices:

- **The work happens on the server, not in the browser.** Nobody has to log in to Google, no token expires on the client, the sync works whichever user approves, and the Google credentials never reach the public site.
- **A service account writes to Giovanni's calendar.** The calendar is shared with a "robot" Google account that only has permission to edit events. No password or OAuth login of Giovanni's is stored anywhere.
- **The event ID is derived from the quote ID** (`imd` + hex of `PRV-123`). The same quote always maps to the same Google event, so repeated or concurrent calls can't create duplicates, and an event deleted earlier is simply restored if the quote is approved again.
- **The function always re-reads the quote** instead of trusting the trigger payload. Whatever order the calls arrive in, the calendar ends up matching the current state of the database.

### Defaults built into this guide (easy to change in step 5)

| Topic | Behaviour |
|---|---|
| Title | `IMD – {cliente} ({tipo})`, for example `IMD – Rossi (Matrimonio)` |
| Date | The contract's `dataEvento` if it can be parsed, otherwise the quote's `date` |
| Time | Start = setup start (if enabled) or the first moment's start. End = the last moment's end. Crossing midnight is handled. No times at all → all-day event. Only a start time → 3 hours by default. |
| Time zone | `Europe/Rome` |
| Place | `{nomeLocation}, {address}` (contract values take priority) |
| Description | Event type, place, program, quote ID and link to the app. **No prices.** |
| Un-approve, archive, delete, or date changed to "Da definire" | The event is **deleted** |
| Approving another version of the same event | The old version's event is deleted and the new version's event is created |
| Events edited by hand in Google Calendar | Overwritten at the next sync. The app is the source of truth. |
| Already-approved quotes | Added once with the backfill (step 8) |

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
   `imd-calendar-sync@gestionale-imd.iam.gserviceaccount.com`. You need it in step 2.

> The JSON key gives write access to the shared calendar. Never commit it, paste it in chats, or put it in `VITE_*` variables. The repo is public.

---

## 2. Giovanni: share the calendar with the service account

This must be done from a **computer** (the mobile app has no sharing settings), logged in as **giovannigargini@gmail.com**:

1. Open <https://calendar.google.com> → ⚙️ **Settings**.
2. In the left column, under **Settings for my calendars**, click the main calendar (the one with Giovanni's name).
3. **Share with specific people or groups → + Add people and groups**
   - Paste the service account email from step 1.5.
   - Permission: **Make changes to events**.
   - **Send**. Google may warn that the address is outside the organization or can't receive email. That's fine.
4. Under **Integrate calendar**, the **Calendar ID** should be `giovannigargini@gmail.com`. That's the value used below.

Giovanni won't receive invitations. The events simply appear in the calendar, with the calendar's default reminders.

> **Recommended for testing:** before using the real calendar, create a secondary calendar (Settings → **Add calendar → Create new calendar**, for example "IMD test"). Share it with the service account the same way, and use its Calendar ID (`...@group.calendar.google.com`) in step 5. When everything works, switch the secret to `giovannigargini@gmail.com` (step 10).

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
// Sincronizza i preventivi approvati con Google Calendar.
// Chiamata dal trigger quotes_calendar_sync con { op, quote_id }, oppure a mano con { all: true }.
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

// ID evento deterministico: "imd" + esadecimale dell'id preventivo (caratteri ammessi da Google: a-v, 0-9)
const eventIdFor = (quoteId: string) =>
  'imd' + Array.from(new TextEncoder().encode(quoteId)).map(b => b.toString(16).padStart(2, '0')).join('');

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
type Quote = { id: string; status: string | null; client: string | null; type: string | null; date: string | null; location: string | null; form_data: Json | null };

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

  const description = [
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
    summary: `IMD – ${client}${q.type ? ` (${q.type})` : ''}`,
    location,
    description,
    ...timing,
    status: 'confirmed',
    reminders: { useDefault: true },
    extendedProperties: { private: { imdQuoteId: String(q.id) } },
  };
}

// ───────────────────────── Sync ─────────────────────────

async function saveSyncState(id: string, fields: Json) {
  const { error } = await supabase.from('quotes').update(fields).eq('id', id);
  if (error) console.error('Stato sync non salvato', id, error.message);
}

async function syncQuote(quoteId: string, op?: string): Promise<string> {
  const eventId = eventIdFor(quoteId);
  try {
    if (op === 'DELETE') {
      await deleteEvent(eventId);
      return 'deleted';
    }
    const { data: q, error } = await supabase
      .from('quotes')
      .select('id, status, client, type, date, location, form_data')
      .eq('id', quoteId)
      .maybeSingle();
    if (error) throw error;
    if (!q) {
      await deleteEvent(eventId);
      return 'deleted';
    }

    const event = q.status === 'Approvato' ? buildEvent(q as Quote) : null;
    if (!event) {
      await deleteEvent(eventId);
      await saveSyncState(quoteId, { google_event_id: null, calendar_synced_at: new Date().toISOString(), calendar_sync_error: null });
      return 'removed';
    }

    await upsertEvent(eventId, event);
    await saveSyncState(quoteId, { google_event_id: eventId, calendar_synced_at: new Date().toISOString(), calendar_sync_error: null });
    return 'synced';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sync fallita', quoteId, message);
    if (op !== 'DELETE') await saveSyncState(quoteId, { calendar_sync_error: message.slice(0, 500) });
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SYNC_SECRET || req.headers.get('x-sync-secret') !== SYNC_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!CALENDAR_ID) return new Response('GOOGLE_CALENDAR_ID non configurato', { status: 500 });

  const body: Json = await req.json().catch(() => ({}));

  // Backfill / risincronizzazione completa
  if (body.all) {
    const { data, error } = await supabase.from('quotes').select('id').eq('status', 'Approvato');
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const results: Json[] = [];
    for (const { id } of data ?? []) {
      results.push({ id, result: await syncQuote(String(id)).catch(e => `errore: ${e.message}`) });
    }
    return Response.json({ count: results.length, results });
  }

  if (!body.quote_id) return new Response('quote_id mancante', { status: 400 });
  try {
    const result = await syncQuote(String(body.quote_id), body.op);
    return Response.json({ quote_id: body.quote_id, result });
  } catch (err) {
    return Response.json({ quote_id: body.quote_id, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
```

### Secrets and deploy

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Set the other three:

```bash
cd ~/personal/gestionale-IMD
SYNC_SECRET=$(openssl rand -hex 32)
echo "$SYNC_SECRET"   # save it in a password manager: you need it again in step 7

supabase secrets set \
  GOOGLE_CALENDAR_ID="<test calendar ID, or giovannigargini@gmail.com>" \
  CALENDAR_SYNC_SECRET="$SYNC_SECRET" \
  GOOGLE_SERVICE_ACCOUNT_B64="$(base64 -i ~/secrets/imd-calendar-sa.json)"

supabase functions deploy sync-calendar --no-verify-jwt
# if the CLI complains about Docker: add --use-api
```

---

## 6. Test the function by hand (before the trigger exists)

1. In the app, approve a quote that has a date (or use one that is already approved). Note its ID, for example `PRV-123`.
2. Run:

```bash
curl -s -X POST "https://jcazkicbnkektaxihhmx.supabase.co/functions/v1/sync-calendar" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -d '{"quote_id":"PRV-123"}'
# → {"quote_id":"PRV-123","result":"synced"}
```

3. The event should appear in the calendar, and the row in `quotes` should have `google_event_id` and `calendar_synced_at` filled in.
4. If it fails, read the error in the response, in `quotes.calendar_sync_error`, or in **Dashboard → Edge Functions → sync-calendar → Logs**. Then see [Troubleshooting](#11-troubleshooting).

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

```bash
supabase migration new calendar_sync_trigger
```

```sql
create extension if not exists pg_net;

-- Campi che influenzano l'evento: il trigger scatta solo se uno di questi cambia
-- (l'autosalvataggio dei campi economici, i pagamenti musicisti, ecc. non chiamano Google)
create or replace function public.quote_calendar_fields(q public.quotes)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'status',       q.status,
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
  v_id     text;
  v_url    text;
  v_secret text;
begin
  if tg_op = 'DELETE' then
    if old.status is distinct from 'Approvato' and old.google_event_id is null then
      return old;
    end if;
    v_id := old.id::text;
  elsif tg_op = 'INSERT' then
    if new.status is distinct from 'Approvato' then
      return new;
    end if;
    v_id := new.id::text;
  else -- UPDATE
    if public.quote_calendar_fields(new) is not distinct from public.quote_calendar_fields(old) then
      return new; -- nessun campo rilevante cambiato (incluse le scritture della funzione stessa)
    end if;
    if new.status is distinct from 'Approvato'
       and old.status is distinct from 'Approvato'
       and new.google_event_id is null then
      return new; -- non era e non è approvato: niente da fare
    end if;
    v_id := new.id::text;
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
        body    := jsonb_build_object('op', tg_op, 'quote_id', v_id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', v_secret),
        timeout_milliseconds := 15000
      );
    end if;
  exception when others then
    raise warning 'calendar sync non accodata per %: %', v_id, sqlerrm;
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
- `handleApprove` first puts the old version back to "In attesa", then approves the new one. That produces two separate calls, one per row, and that's correct.
- While someone edits the program of an **approved** quote, autosave (about every 1.5 s) triggers a sync each time the times or titles change. That's well within the free quotas: 500k function calls/month on Supabase, 1M requests/day on the Calendar API.

---

## 8. Backfill quotes that are already approved

```bash
curl -s -X POST "https://jcazkicbnkektaxihhmx.supabase.co/functions/v1/sync-calendar" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -d '{"all":true}'
```

The same call is safe to run again at any time: it updates existing events and never duplicates them. That makes it the "resync everything" button too, for example after changing the title format in `buildEvent`.

---

## 9. App: show the sync status (optional but recommended)

### 9a. Keep the sync columns out of the quote objects

`fetchQuotes` currently spreads **every** column into the quote object, and every save sends `...rest` back to Supabase. With the new columns, that has two effects:
- Saving a quote would overwrite `google_event_id` / `calendar_sync_error` with stale values.
- **Duplicating** a quote would copy them onto the new row.

The calendar would still be correct (event IDs come from the quote ID), but the UI would be misleading. Keep them in a separate state in `App` ([src/App.jsx](src/App.jsx), `fetchQuotes`):

```jsx
const [calendarSync, setCalendarSync] = useState({});

// inside fetchQuotes, after the query:
setCalendarSync(Object.fromEntries(data.map(q => [q.id, {
  eventId: q.google_event_id,
  syncedAt: q.calendar_synced_at,
  error: q.calendar_sync_error,
}])));
setQuotes(data.map(({ form_data, created_at, google_event_id, calendar_synced_at, calendar_sync_error, ...rest }) => {
  void google_event_id; void calendar_synced_at; void calendar_sync_error;
  return {
    ...rest,
    formData: {
      ...(form_data || {}),
      _createdAt: created_at || form_data?._createdAt || ''
    }
  };
}));
```

### 9b. Icon in the dashboard

Pass `calendarSync={calendarSync}` to `<Dashboard ... />` and add it to the `Dashboard` props. Next to the status icon of approved rows (group row and single row), add:

```jsx
import { CalendarCheck, CalendarX } from 'lucide-react';

const CalendarBadge = ({ sync }) => {
  if (sync?.error) return <CalendarX size={16} className="text-red-500" title={`Calendario: ${sync.error}`} />;
  if (sync?.eventId) return <CalendarCheck size={16} className="text-blue-500" title="Nel calendario di Giovanni" />;
  return null;
};

// e.g. next to the CheckCircle of approved quotes:
{quote.status === 'Approvato' && <CalendarBadge sync={calendarSync[quote.id]} />}
```

The sync runs a second or two after the save, so the icon appears at the next data reload (`fetchQuotes`). To see it immediately, you can call `setTimeout(fetchQuotes, 3000)` at the end of `handleApprove`.

> In dev mode (`npm run dev`) the app uses localStorage and never writes to Supabase, so **the sync only runs in production**.

---

## 10. Go-live checklist

Test first on the **test calendar**, then:

```bash
supabase secrets set GOOGLE_CALENDAR_ID=giovannigargini@gmail.com
supabase functions deploy sync-calendar --no-verify-jwt   # re-deploy picks up the new secret
```

Then run the backfill (step 8) once more against the real calendar. Delete the test calendar afterwards.

| # | Action in the app | Expected in Google Calendar |
|---|---|---|
| 1 | Approve a quote with date and times | Event created on that date, with correct times (Rome time) |
| 2 | Change a moment's time on the approved quote | Event times update |
| 3 | Last moment ends after midnight (e.g. 20:00 → 01:00) | Event ends at 01:00 the next day |
| 4 | Approved quote with no times | All-day event |
| 5 | Approve another version of the same event | Old event disappears, new one appears |
| 6 | Un-approve ("Annulla approvazione") | Event deleted |
| 7 | Re-approve the same quote | Event comes back (same ID, no duplicate) |
| 8 | Archive or delete an approved quote | Event deleted |
| 9 | Fill in the contract with a different date or venue | Event follows the contract data |
| 10 | Change a price only | **Nothing** happens (no call to Google) |
| 11 | Run the backfill twice | No duplicates |

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
- Title or description format.
- Default duration (`DEFAULT_DURATION_MIN`).
- A colour, for example `colorId: '10'` (green).
- Adding the agreed price to the description: `c.compensoTotale`.

After changing any of them, re-deploy and run the backfill (step 8) to update existing events.

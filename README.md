# Lanciare in locale
npm run dev

# Build locale
npm run build

# Deploy
Il deploy su GitHub Pages parte automaticamente tramite GitHub Actions a ogni push su `main`.
Se necessario puoi avviarlo anche manualmente dalla tab Actions con il workflow `Deploy to GitHub Pages`.

# Deployato su GitHub
Per accedere usare questo link https://danilafarina.github.io/gestionale-IMD/

# Staging (ambiente di test)
Copia separata dell'app, con un proprio progetto Supabase e un calendario Google di test, così non si tocca nulla di reale.

Setup una tantum:

1. **Repo**: crea `DanilaFarina/gestionale-IMD-staging` (vuoto) e abilita Pages con *Settings → Pages → Source: GitHub Actions*.
2. **Variabili del repo staging** (*Settings → Secrets and variables → Actions*):
   - Secrets: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` del progetto Supabase **di staging**
   - Variable: `VITE_BASE_PATH` = `gestionale-IMD-staging`
3. **Supabase staging** (con la CLI collegata al progetto di staging):
   ```bash
   supabase link --project-ref <ref-staging>
   supabase db push
   supabase secrets set GOOGLE_CALENDAR_ID="<id calendario di test>" \
     CALENDAR_SYNC_SECRET="<segreto>" \
     GOOGLE_SERVICE_ACCOUNT_B64="$(base64 -i <chiave>.json)" \
     APP_URL="https://danilafarina.github.io/gestionale-IMD-staging/"
   supabase functions deploy sync-calendar --no-verify-jwt
   ```
   Poi nel SQL Editor di staging crea i secret del Vault (URL della funzione di staging e lo stesso segreto), come al punto 7a di [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md). Il calendario di test va condiviso con il service account.
4. **Auth**: in *Authentication → URL Configuration* del progetto staging imposta Site URL e Redirect URLs su `https://danilafarina.github.io/gestionale-IMD-staging/`.

Deploy su staging (dalla cartella del progetto, ad esempio dal branch da provare):

```bash
git remote add staging git@github.com:DanilaFarina/gestionale-IMD-staging.git   # solo la prima volta
git push staging <branch>:main
```

Il workflow `Deploy to GitHub Pages` del repo staging parte da solo a ogni push su `main`. L'app sarà su https://danilafarina.github.io/gestionale-IMD-staging/.

Per provare in locale contro lo staging, metti in `.env.local` (ignorato da git) `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` di staging e usa `npm run build && npm run preview`. Con `npm run dev` l'app usa invece il localStorage e non scrive su Supabase.

# Creato database
Questo è il progetto su supabase https://supabase.com/dashboard/project/jcazkicbnkektaxihhmx, mi da anche modo di autenticarmi e da accesso solo a due utenti tramite link di autenticazione inviato ad email. No username o password

## creare un sistema per nascondere le proprietà e proteggere le passwords
## fare tests della sicurezza per trovare pitfalls 
## analisi architettura da github + sviluppo + testing + sicurezza + produzione
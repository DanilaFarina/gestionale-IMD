# Guida utente – Gestionale IMD

## 1. Concetti base

- **Evento**: una data di un cliente in una location. Nella dashboard ha **una sola riga**.
- **Preventivo**: una proposta economica per un evento. Un evento può avere **più preventivi** (versioni), chiamati **Preventivo A, B, C…**
- **Contratto**: si fa a partire dall'**unico preventivo approvato** dell'evento.
- **Stati di un preventivo**: `In attesa` (giallo), `Approvato` (verde), `Archiviato` (grigio).

Regola fondamentale: **per ogni evento può essere approvato un solo preventivo.**

## 2. Dashboard

### 2.1 Righe e gruppi

- **Evento con un solo preventivo**: una riga con tutte le azioni.
- **Evento con più preventivi**: una riga riassuntiva con il badge *"N preventivi"*. Cliccandola (o con *Mostra preventivi*) si apre l'elenco dei preventivi A, B, C…, ognuno con le sue azioni.
  - **Totale**: importo del preventivo approvato; se non ce n'è, l'intervallo min–max dei preventivi non archiviati.
  - **Stato**: Approvato se ce n'è uno approvato, altrimenti In attesa, altrimenti Archiviato.
  - Se c'è un preventivo approvato, sulla riga riassuntiva c'è la scorciatoia **Crea Contratto**.
- Il totale mostra l'importo concordato nel contratto (indicato con "(contratto)") se diverso dal prezzo lordo del preventivo.

### 2.2 Filtri

Nome cliente, location, tipo evento, intervallo date evento e stato (Tutti / In attesa / Approvato / Archiviato). I filtri agiscono sui singoli preventivi: un gruppo mostra solo quelli che li soddisfano. *Azzera filtri* li rimuove. Gli archiviati si vedono solo con il filtro **Archiviato**.

### 2.3 Azioni sulla riga di un preventivo

| Icona | Azione |
|---|---|
| Stampante | Genera il PDF del preventivo |
| Documento | Crea il contratto (solo se approvato) |
| Spunta | Segna come approvato (solo se in attesa) |
| Freccia circolare arancione | Annulla l'approvazione → torna *In attesa* (solo se approvato) |
| Matita | Modifica il preventivo |
| **+** | Aggiunge una **nuova versione** (vedi 3.3) |
| Layout | Usa come **template** per un evento diverso (vedi 3.4) |
| Scatolone | **Archivia** (non elimina) |
| Freccia circolare verde | Ripristina un archiviato → *In attesa* |
| Cestino | **Elimina definitivamente** (chiede conferma, non annullabile) |

## 3. Preventivi

### 3.1 Creare un preventivo

*Crea Nuovo Preventivo* → compila il form. Il calcolo si aggiorna in tempo reale e il *Riepilogo Interno* mostra i prezzi.

- **Salvataggio automatico**: circa 1,5 secondi dopo l'ultima modifica, **appena è inserito il nome del cliente**. Lo stato è indicato sotto i pulsanti ("Salvato automaticamente ✓").
- *Salva Preventivo* salva e torna alla dashboard (stato "In attesa").
- *Scarica PDF Preventivo* genera il PDF dal form.

### 3.2 Calcolo prezzi (riassunto)

- Prezzo servizi = proposta musicale + cerimonia + impianti + DJ + coordinator + brani su richiesta + extra.
- Maggiorato con la commissione agenzia (di solito 25%), più i costi di trasferta = prezzo finale.
- Commissioni opzionali (wedding, Fix the Music) e prezzo lordo come da calcolo del form.
- "Sconto per te" = prezzo lordo × coefficiente (default 0,65).

### 3.3 Nuova versione (+)

Crea un nuovo preventivo **per lo stesso evento**: copia tutti i dati e lo apre in modifica. La lettera segue la versione più alta ancora presente nell'evento, comprese quelle archiviate, indipendentemente dal preventivo da cui si parte: per esempio, se esistono A, B e C, anche usando il + su A si crea D. Se la versione più alta viene eliminata definitivamente, la sua lettera può essere riutilizzata. Usalo per proporre alternative (formazione, durata, prezzo diversi).

### 3.4 Usa come template

Per un **evento completamente diverso**. Copia programma musicale, formazione, prezzi, costi, commissioni e impostazioni di trasferta; **azzera** cliente, data, indirizzo, nome location, numero ospiti, distanza e pedaggio manuale; **non** porta con sé contratto, pagamenti né il collegamento all'evento originale. Si apre "Nuovo Preventivo da Template": nasce come evento nuovo, preventivo A, *In attesa*, e si salva da solo appena inserisci il cliente (se esci prima, non viene creato nulla). Dopo aver inserito il nuovo indirizzo, ricalcola la distanza.

### 3.5 Differenza tra + e template

- **+** = stesso evento, altra proposta (si raggruppa con l'originale).
- **Template** = altro evento, riparte da zero come evento distinto.

### 3.6 PDF

- Dalla dashboard (stampante) si apre l'anteprima con scelta lingua **ITA / ENG** e *Scarica PDF*.
- Nome file: `AAAA-MM-GG_Cliente_Preventivo_A.pdf`, con la lettera del preventivo (A, B, …).
- Il contratto si scarica come `AAAA-MM-GG_Cliente_Contratto.pdf`.

## 4. Approvazione

1. Premi la spunta sul preventivo scelto.
2. Se **nessun altro** preventivo dell'evento è approvato, l'approvazione è immediata.
3. Se **ce n'è già un altro** approvato, compare il popup *"Sei sicuro di voler cambiare il preventivo approvato?"*. Confermando, il nuovo diventa approvato e il precedente torna *In attesa*; annullando non cambia nulla.
4. Per correggere un errore usa **Annulla approvazione**: il preventivo torna *In attesa* (i dati del contratto già compilati restano salvati).

## 5. Contratto

Disponibile per un preventivo **approvato** (icona documento). È precompilato dal preventivo (il prezzo lordo è il compenso di default, modificabile con l'importo concordato) con le sezioni: Dati Cliente, Evento e Location, Orari e Programma, Formazione, Corrispettivo e Spese. Si salva da solo come per il preventivo e i dati restano dentro il preventivo.

**Nuovo Contratto Bianco**: contratto senza preventivo, da compilare interamente. Non ha azioni di preventivo (PDF preventivo, +, template, annulla approvazione) e **non rientra nei conteggi di preventivi ed eventi** dell'Analisi (le sue entrate sì).

## 6. Pagamenti

Sezione *Pagamenti*: scegli un evento approvato e gestisci i compensi ai musicisti (importo base e aggiunte), con riepilogo del residuo netto. Premi *Salva pagamenti*. Sono elencati solo gli eventi con un preventivo approvato.

## 7. Analisi

### 7.1 Filtri (valgono per tutta la pagina)

- **Preventivi creati nel**: anno di creazione (default: tutti gli anni).
- **Eventi con data nel**: anno dell'evento (default: tutti gli anni).
- I due filtri si combinano (es. creati nel 2026 per eventi del 2027).

### 7.2 Eventi richiesti (conteggio per evento)

Numero di eventi distinti e media di preventivi per evento, suddivisi (numero e %) in:
- **Andati a contratto**: almeno un preventivo approvato. **Ogni evento conta una sola volta**, anche se in passato per errore ne sono stati approvati più d'uno.
- **In attesa**: nessuno approvato, almeno uno in attesa.
- **Non conclusi**: tutti archiviati.

### 7.3 Preventivi fatti (conteggio per preventivo)

Totale di tutte le versioni, archiviati inclusi, suddivisi (numero e %) in approvati, in attesa, archiviati. Con il filtro sull'anno di creazione contano solo i preventivi creati in quell'anno, mentre l'esito degli eventi tiene conto di tutte le loro versioni.

### 7.4 Entrate

Eventi entrati (contratti compilati con importo), entrate lorde e nette, valore medio evento, entrate per mese (ultimi sei mesi), clienti più frequenti, ultimi eventi contrattualizzati. Si usa **un solo preventivo per evento**: l'approvato (con contratto compilato, se per errore ce ne sono più d'uno).

## 8. Buone pratiche

- Usa **+** per le alternative dello stesso evento, **template** per eventi nuovi.
- Approva un solo preventivo per evento; per cambiarlo usa il popup di conferma.
- **Archivia** invece di eliminare: gli archiviati restano nelle statistiche.
- Controlla le statistiche con i filtri anno per confrontare periodi diversi.
- Preventivi creati da zero per lo stesso evento (non con **+**) risultano eventi distinti.

## 9. Accesso e uso tecnico

- Produzione: https://danilafarina.github.io/gestionale-IMD/ — accesso con **link inviato via email** (nessuna password), solo per utenti autorizzati.
- In locale (`npm run dev`) l'autenticazione è disattivata e i dati restano nel browser.
- È una PWA: può essere installata su dispositivo (vedi [PWA_SETUP.md](PWA_SETUP.md)).

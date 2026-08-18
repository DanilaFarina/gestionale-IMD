# Configurazione PWA - Gestionale IMD

## ✅ Configurazione completata

1. **vite.config.js** - Plugin PWA configurato con:
   - Service Worker auto-update
   - Cache strategy per Supabase
   - Supporto per iOS e Android
   - Maskable icons per Android Adaptive

2. **index.html** - Meta tags aggiunti per:
   - Installazione su home screen iOS e Android
   - Status bar style personalizzato
   - Tema colori
   - Capacità app mobile

3. **manifest.json** - Creato con:
   - Configurazione app standalone
   - Icons in vari formati e dimensioni
   - Screenshots per app store
   - Shortcuts per accessi rapidi

## 📱 Prossimi passi - IMPORTANTE

### 1. Generare i PNG icons necessari

Devi creare questi file e salvarli in `/public`:

**Icone base:**
- `pwa-192x192.png` (192x192)
- `pwa-512x512.png` (512x512)
- `pwa-maskable-192x192.png` (192x192 - con spazi trasparenti)
- `pwa-maskable-512x512.png` (512x512 - con spazi trasparenti)
- `apple-touch-icon.png` (180x180 - per iOS)
- `mstile-150x150.png` (150x150 - per Windows)

**Screenshots (opzionali ma consigliati):**
- `screenshot1.png` (540x720)
- `screenshot2.png` (1280x720)

**Suggerimento:** Usa un tool online come:
- https://www.pwabuilder.com/ (crea automaticamente gli icon)
- https://realfavicongenerator.net/
- O usa un tool di grafica come Figma/Canva

### 2. Build e test

```bash
npm run build
npm run preview
```

Poi apri in Chrome:
- DevTools → Application → Service Workers (verifica che sia registrato)
- Application → Manifest (verifica il file manifest.json)

### 3. Test su dispositivi reali

**iOS (iPhone):**
1. Apri l'app in Safari
2. Premi il pulsante Condividi (Share)
3. Seleziona "Aggiungi a Home Screen"
4. Accetta tutte le richieste di permessi

**Android:**
1. Apri in Chrome
2. Premi i 3 puntini (menu)
3. Seleziona "Installa app"
4. O attendi il prompt automatico

### 4. Funzionalità PWA abilitate

✅ Installazione su home screen
✅ Modalità standalone (senza browser UI)
✅ Supporto offline (tramite Service Worker)
✅ Notifiche push (opzionale, aggiungere dopo)
✅ Cache intelligente per Supabase
✅ Status bar personalizzata iOS

## 🎨 Personalizzazione colori

Cambia questi valori in vite.config.js e manifest.json:
- `theme_color`: colore barra
- `background_color`: colore sfondo

## 📚 Riferimenti

- [PWA Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [vite-plugin-pwa Docs](https://vite-pwa-org.netlify.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)


# HESSEN RP — Website

Statische Mehrseiten-Website, ausgeliefert über einen Cloudflare Worker mit
Static Assets (das aktuell empfohlene Cloudflare-Modell, Nachfolger von
"klassischem" Pages). Der Worker übernimmt zusätzlich zwei API-Routen für
die Discord-Webhooks (Notruf & Ausweis-Versand).

## Projektstruktur

| Pfad                  | Zweck                                                     |
|-----------------------|------------------------------------------------------------|
| `public/`             | Die eigentliche Website (alle `.html`, `styles.css`, `script.js`, `data.js`) |
| `worker/index.js`     | Worker-Script: beantwortet `/api/notruf` & `/api/ausweis`, alles andere geht an die statischen Dateien |
| `wrangler.jsonc`      | Cloudflare-Konfiguration (Worker-Entry-Point + Assets-Ordner) |

Seiten in `public/`: `index.html`, `regelwerk.html`, `ausweis.html`,
`fraktionen.html`, `team.html`, `immobilien.html`, `admin.html`.

## Wie Inhalte gespeichert werden

Team, Immobilien, Regelwerk und Fraktionen liegen als Default-Daten in
`public/data.js`. Der Admin-Bereich (`admin.html`) speichert Änderungen
zunächst nur **lokal im Browser** (localStorage). Damit Änderungen für
**alle** Besucher sichtbar werden: im Admin-Bereich "Als Code exportieren"
klicken, den Code in `public/data.js` einfügen, committen und pushen.

Admin-Zugang: Passphrase steht am Anfang von `public/admin.html`
(`ADMIN_PASSPHRASE`) — dort direkt ändern.

## Deployment auf Cloudflare (Workers, Git-Integration)

1. Repo auf GitHub pushen (ist hier schon als Git-Repo vorbereitet):
   ```bash
   git remote add origin https://github.com/DEIN-USERNAME/hessen-rp.git
   git push -u origin main
   ```
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** →
   **Workers** → **Connect to Git** (bzw. "Import a repository") → Repo
   auswählen.
3. Bei den Build-Einstellungen:
   - **Build command**: leer lassen
   - **Deploy command**: `npx wrangler deploy`
   - Root directory: `/` (Standard, da `wrangler.jsonc` im Projekt-Root liegt)
4. Deploy anstoßen. Cloudflare erkennt automatisch `wrangler.jsonc` und
   deployt Worker + statische Seiten zusammen.

Jeder Push auf `main` deployt danach automatisch neu.

## Discord-Webhooks einrichten (wichtig!)

Der Notruf-Button (`admin.html`) und der Ausweis-Versand (`ausweis.html`)
rufen `/api/notruf` bzw. `/api/ausweis` auf `worker/index.js` auf. Dieser
Worker leitet die Anfrage serverseitig an eure Discord-Webhooks weiter —
**die Webhook-URLs selbst stehen in keiner Datei in diesem Repo.** Würden
sie im Client-Code stehen, könnte jeder Besucher sie im Quelltext auslesen
und selbst beliebige Nachrichten an euren Discord-Kanal schicken.

Stattdessen als **verschlüsselte Variable (Secret)** direkt am Worker
hinterlegen:

1. Cloudflare Dashboard → euer Worker-Projekt (`hessen-rp`) →
   **Settings → Variables and Secrets**
2. **Add** → zwei Einträge anlegen:
   - `DISCORD_WEBHOOK_NOTRUF` → eure Notruf-Webhook-URL
   - `DISCORD_WEBHOOK_AUSWEISE` → eure Ausweis-Webhook-URL
3. Typ jeweils auf **Secret** stellen (nicht "Text/Plaintext"), damit der
   Wert verschlüsselt gespeichert wird und im Dashboard nicht mehr im
   Klartext auftaucht.
4. Speichern → danach einmal **erneut deployen**, damit der Worker die
   Variablen erhält (z. B. "Retry deployment" im Dashboard, oder einfach
   einen neuen Commit pushen).

> Falls "Settings → Variables and Secrets" weiterhin einen Fehler wie
> "Variables cannot be added to a Worker that only has static assets"
> zeigt: Das bedeutet, Cloudflare hat noch keinen echten Worker-Code
> erkannt. Prüft, dass `wrangler.jsonc` im Projekt-Root liegt und `main`
> auf `worker/index.js` zeigt, und dass der Deploy-Command wirklich
> `npx wrangler deploy` ist (nicht leer). Nach einem erneuten Deploy mit
> dieser Konfiguration sollte die Worker-Engine erkannt werden und die
> Variablen-Sektion freigeschaltet sein.

**Ohne diese zwei Variablen liefern die Buttons eine Fehlermeldung**
("Webhook nicht konfiguriert") — das ist Absicht, kein Bug.

Wichtig: Diese Buttons funktionieren **nur**, wenn die Seite tatsächlich
über Cloudflare läuft. Öffnet man `public/index.html` lokal per Doppelklick
im Browser, gibt es keinen Worker, der `/api/...` beantworten könnte.

## Lokale Entwicklung (optional)

Mit installiertem Node.js und Wrangler:

```bash
npm install -g wrangler
wrangler dev
```

Für lokale Tests der Webhook-Routen könnt ihr eine `.dev.vars`-Datei anlegen
(wird nicht committet, siehe `.gitignore`):

```
DISCORD_WEBHOOK_NOTRUF=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_AUSWEISE=https://discord.com/api/webhooks/...
```

## Bekannte Grenzen (bewusste Trade-offs)

- **Kein echtes Login/Datenbank**: Der Admin-Bereich ist eine reine
  Passphrase-Sperre, kein echtes Auth-System. Für mehr Sicherheit könnt ihr
  zusätzlich Cloudflare Access vor `/admin.html` schalten (Dashboard →
  Settings → Access Policy).
- **Kein Abuse-Schutz** auf `/api/notruf` und `/api/ausweis`: Jeder, der die
  Website erreicht, kann die Endpunkte technisch aufrufen, nicht nur über
  die Buttons. Für den Anfang meist unkritisch bei einer kleinen Community;
  bei Missbrauch könnt ihr über Cloudflare Turnstile (Captcha) oder Rate
  Limiting (Dashboard → Security) nachrüsten.
- **Bilder in Immobilien**: Aktuell keine Bild-Uploads, nur Text-Daten.

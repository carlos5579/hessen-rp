# HESSEN RP — Website

Statische Mehrseiten-Website (kein Build nötig) mit Admin-Bereich, plus zwei
Cloudflare Pages Functions für Discord-Webhooks (Notruf & Ausweis-Versand).

## Seiten

| Datei              | Zweck                                            |
|--------------------|---------------------------------------------------|
| `index.html`       | Startseite                                         |
| `regelwerk.html`   | Regelwerk (§1–§11), datengetrieben aus `data.js`   |
| `ausweis.html`     | Bürgerausweis-Generator mit Discord-Versand        |
| `fraktionen.html`  | Fraktionsübersicht                                 |
| `team.html`        | Team-Liste                                         |
| `immobilien.html`  | Immobilien-Marktplatz                              |
| `admin.html`       | Admin-Bereich (Team, Immobilien, Regelwerk, Fraktionen, Notruf) |

## Wie Inhalte gespeichert werden

Alle Inhalte (Team, Immobilien, Regelwerk, Fraktionen) liegen als Default-Daten
in `data.js`. Der Admin-Bereich (`admin.html`) speichert Änderungen zunächst nur
**lokal im Browser** (localStorage). Damit Änderungen für **alle** Besucher
sichtbar werden, im Admin-Bereich auf "Als Code exportieren" klicken, den
angezeigten Code in `data.js` einfügen und die Seite neu deployen (bei
Cloudflare + GitHub reicht ein `git push`).

Admin-Zugang: Passphrase steht am Anfang von `admin.html` im Script
(`ADMIN_PASSPHRASE`) — dort direkt ändern.

## Discord-Webhooks einrichten (wichtig!)

Der Notruf-Button und der Ausweis-Versand rufen zwei eigene Server-Endpunkte
auf (`/api/notruf` und `/api/ausweis`, siehe `functions/api/`). Diese
Cloudflare Pages Functions leiten die Anfrage serverseitig an eure
Discord-Webhooks weiter — **die Webhook-URLs selbst stehen bewusst in
keiner einzigen Datei in diesem Repo.** Würde man sie direkt im
Client-Code hinterlegen, könnte jeder Besucher sie im Quelltext auslesen und
selbst beliebige Nachrichten (z. B. gefälschte Notrufe) an euren Discord-Kanal
schicken.

Stattdessen als **verschlüsselte Umgebungsvariable** in Cloudflare hinterlegen:

1. Cloudflare Dashboard → euer Pages-Projekt → **Settings → Environment variables**
2. Zwei Variablen anlegen (Production, ggf. auch Preview):
   - `DISCORD_WEBHOOK_NOTRUF` → eure Notruf-Webhook-URL
   - `DISCORD_WEBHOOK_AUSWEISE` → eure Ausweis-Webhook-URL
3. Bei beiden **"Encrypt"** anhaken (macht Cloudflare aus dem Wert ein Secret,
   nicht mehr im Klartext einsehbar).
4. Nach dem Speichern einmal neu deployen (Retry deployment), damit die
   Functions die Variablen bekommen.

**Ohne diese zwei Variablen liefern die Buttons eine Fehlermeldung** ("Webhook
nicht konfiguriert") — das ist Absicht, kein Bug.

Wichtig: Diese Buttons funktionieren **nur**, wenn die Seite tatsächlich über
Cloudflare Pages läuft. Öffnet man `index.html`/`ausweis.html` einfach lokal
per Doppelklick im Browser, gibt es keinen Server, der `/api/...` beantworten
könnte — dann kommt eine Fehlermeldung im Kästchen unter dem jeweiligen Button.

## Bekannte Grenzen (bewusste Trade-offs)

- **Kein echtes Login/Datenbank**: Der Admin-Bereich ist eine reine
  Passphrase-Sperre, kein echtes Auth-System. Für mehr Sicherheit könnt ihr
  zusätzlich Cloudflare Access vor `/admin.html` schalten (Dashboard →
  Settings → Access Policy).
- **Kein Abuse-Schutz** auf `/api/notruf` und `/api/ausweis`: Jeder, der die
  Website erreicht, kann die Endpunkte technisch aufrufen (nicht nur über die
  Buttons). Für den Anfang meist unkritisch bei einer kleinen Community;
  bei Missbrauch könnt ihr über Cloudflare Turnstile (Captcha) oder Rate
  Limiting (Cloudflare Dashboard → Security) nachrüsten.
- **Bilder in Immobilien/Ausweis**: Es gibt aktuell keine Bild-Uploads für
  Immobilien (nur Text-Daten) und der Ausweis nutzt eine reine
  Canvas-Zeichnung statt eines Fotos aus einer Datenbank.

## Deployment (Kurzfassung)

Repo ist bereits als Git-Repo vorbereitet:

```bash
git remote add origin https://github.com/DEIN-USERNAME/hessen-rp.git
git push -u origin main
```

Dann in Cloudflare: **Workers & Pages → Create application → Pages → Connect
to Git** → Repo auswählen → Build command leer lassen, Output directory `/`.
Nach dem ersten Deploy die Umgebungsvariablen (siehe oben) setzen und neu
deployen.

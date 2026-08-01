# HESSEN RP — Website

Cloudflare Worker mit Static Assets. Alle Inhalte (Team, Immobilien, Regelwerk,
Fraktionen) liegen jetzt **zentral in Cloudflare KV** — nicht mehr im
localStorage des Browsers. Änderungen im Adminbereich sind sofort für alle
Besucher sichtbar. Immobilien-Bilder werden in Cloudflare R2 gespeichert.

## Projektstruktur    

| Pfad                  | Zweck                                                     |
|------------------------|------------------------------------------------------------|
| `public/`              | Die Website (alle `.html`, `styles.css`, `script.js`, `data.js`) |
| `worker/index.js`      | Worker-Script: API-Routen + liefert die statischen Dateien aus |
| `wrangler.jsonc`       | Cloudflare-Konfiguration (Worker, Assets, KV, R2)          |
| `package.json`         | Nur damit Wrangler sauber erkannt wird, keine echten Abhängigkeiten nötig |

## Ersteinrichtung — bitte der Reihe nach abarbeiten

### 1. KV-Namespace anlegen

Dashboard → **Storage & Databases → KV → Create instance/namespace**.
Name z. B. `hessenrp-data`. Nach dem Erstellen wird eine **ID** angezeigt —
die brauchst du gleich.

Öffne `wrangler.jsonc` und ersetze `DEINE_KV_NAMESPACE_ID` durch diese ID:

```jsonc
"kv_namespaces": [
  { "binding": "DATA_KV", "id": "hier-die-echte-id-einfügen" }
]
```

### 2. R2-Bucket anlegen

Dashboard → **Storage & Databases → R2 → Create bucket**. Name:
`hessenrp-images` (muss zum `bucket_name` in `wrangler.jsonc` passen — wenn
du einen anderen Namen wählst, `wrangler.jsonc` entsprechend anpassen).

> R2 verlangt bei manchen Konten eine hinterlegte Zahlungsmethode, auch wenn
> ihr im kostenlosen Kontingent bleibt. Das ist normal und keine Fehlkonfiguration.

### 3. Alles committen und pushen

```bash
git add -A
git commit -m "KV + R2 Anbindung, wrangler.jsonc mit echter KV-ID"
git push
```

**Wichtig:** Bitte danach auf github.com im Repo nachschauen, ob
`wrangler.jsonc`, `worker/index.js`, `package.json` und der komplette
`public/`-Ordner tatsächlich da sind. Das ist der häufigste Stolperstein.

### 4. Secrets setzen

Cloudflare Dashboard → dein Worker (`hessen-rp`) → **Settings → Variables
and Secrets** → **Add** → jeweils Typ **Secret**:

| Name                      | Wert                                  |
|----------------------------|----------------------------------------|
| `ADMIN_KEY`                | Eure eigene Admin-Zugangsphrase (frei wählbar) |
| `DISCORD_WEBHOOK_NOTRUF`   | Eure Notruf-Webhook-URL               |
| `DISCORD_WEBHOOK_AUSWEISE` | Eure Ausweis-Webhook-URL              |

`ADMIN_KEY` ersetzt die alte, fest im Code stehende Passphrase — die Eingabe
im Admin-Bereich wird jetzt direkt gegen dieses Secret geprüft. Diese
Zugangsphrase ist also gleichzeitig euer neues Admin-Passwort.

### 5. Neu deployen

Nach dem Setzen der Secrets: **Retry deployment** im Dashboard, oder einfach
einen neuen Commit pushen.

## Falls der Deploy weiterhin mit "Could not detect a directory containing
static files" fehlschlägt

Das bedeutet: Wrangler findet die `wrangler.jsonc` nicht. Prüft in dieser
Reihenfolge:

1. **Liegt `wrangler.jsonc` wirklich im Repo-Root auf GitHub?** Direkt auf
   github.com nachschauen, nicht nur lokal.
2. **Settings → Build → Root directory** muss `/` sein (nicht `public` o. ä.).
3. **Deploy command** muss exakt `npx wrangler deploy` sein.
4. Ein frischer `git push` mit allen Dateien aus diesem Zip (inkl. `.git`-
   Verlauf) behebt es in den allermeisten Fällen, wenn vorher nur eine ältere
   Version im Repo lag.

Erst wenn ein Deploy **erfolgreich** durchläuft, hat der Worker überhaupt
eigenen Code — vorher meldet Cloudflare bei den Variablen auch weiterhin
"Variables cannot be added to a Worker that only has static assets", weil
noch nie erfolgreich Worker-Code deployt wurde.

## Wie Inhalte jetzt gespeichert werden

- `GET /api/data/:type` liefert die aktuellen Daten (team, immobilien,
  regelwerk, fraktionen) aus KV — öffentlich lesbar, kein Login nötig.
- `POST /api/data/:type` speichert eine neue Liste — nur mit gültigem
  `Authorization: Bearer <ADMIN_KEY>`-Header (das macht der Admin-Bereich
  automatisch, sobald ihr euch mit der Zugangsphrase eingeloggt habt).
- Bilder: `POST /api/upload-image` (admin-only) lädt eine Datei nach R2 hoch
  und gibt eine URL wie `/api/image/<key>` zurück, die dann im Immobilien-
  Eintrag gespeichert wird.

Der alte "Als Code exportieren"-Workflow ist komplett entfallen — Änderungen
im Adminbereich sind sofort live.

## Admin-Zugang

Zugangsphrase = der Wert des `ADMIN_KEY`-Secrets. Das ist jetzt eine echte
serverseitige Prüfung, keine reine Clientseiten-Sperre mehr wie vorher.

## Discord-Webhooks

Unverändert: Die Webhook-URLs stehen in keiner Datei im Repo, sondern nur als
Secrets in Cloudflare (`DISCORD_WEBHOOK_NOTRUF`, `DISCORD_WEBHOOK_AUSWEISE`).
Der Notruf-Button sitzt auf der **öffentlichen Startseite** (`index.html`,
Abschnitt "Notruf an das Team") — er ist für Bürger/Spieler gedacht, die
einen Admin brauchen, deshalb bewusst ohne Login. Es gibt einen einfachen
30-Sekunden-Cooldown im Frontend gegen versehentliches Mehrfach-Senden, aber
keinen echten Spam-Schutz (siehe "Bekannte Grenzen" unten). Der
Ausweis-Versand bleibt ebenfalls öffentlich, da normale Spieler ihn nutzen.

## Lokale Entwicklung (optional)

```bash
npm install -g wrangler
wrangler dev
```

Für lokale Tests eine `.dev.vars`-Datei anlegen (wird nicht committet):

```
ADMIN_KEY=dein-test-passwort
DISCORD_WEBHOOK_NOTRUF=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_AUSWEISE=https://discord.com/api/webhooks/...
```

Für KV/R2 lokal braucht Wrangler zusätzlich `--local`-kompatible Bindings,
das ist optional und für den ersten Start nicht nötig — Testen direkt auf
Cloudflare nach dem Deploy ist meist einfacher.

## Bekannte Grenzen (bewusste Trade-offs)

- **Kein Rate-Limiting** auf den `/api/*`-Routen — bei Missbrauch könnt ihr
  über Cloudflare Turnstile oder Rate Limiting (Dashboard → Security)
  nachrüsten.
- **Ein einziger Admin-Schlüssel** für alle Admins — kein individuelles
  Login pro Person. Für mehr Kontrolle könnte man später Cloudflare Access
  vor `/admin.html` schalten.

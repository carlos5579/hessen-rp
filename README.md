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
| `ADMIN_KEY`                | Eure Serverleitungs-Zugangsphrase (frei wählbar) |
| `DISCORD_WEBHOOK_NOTRUF`   | Eure Notruf-Webhook-URL               |
| `DISCORD_WEBHOOK_AUSWEISE` | Eure Ausweis-Webhook-URL              |
| `DISCORD_WEBHOOK_ADMINLOG` | (optional) privater Kanal für Admin-Änderungen — siehe unten |

`ADMIN_KEY` ist jetzt die Zugangsphrase für den **Serverleitungs-Login**
(Nutzername leer lassen, nur diese Phrase eingeben) — damit könnt ihr euch
immer einloggen, auch bevor ihr einzelne Admin-Accounts angelegt habt, und
dieser Login hat automatisch Vollzugriff auf alles inklusive
Account-Verwaltung.

**Optional:** `NOTRUF_PING_ROLE_ID` — pingt bei einem Notruf eine bestimmte
Discord-Rolle (z. B. `@Admin`) statt `@here`. Kann als normale **Variable**
(kein Secret nötig, Rollen-IDs sind nicht geheim) gesetzt werden:

1. In Discord: **Einstellungen → Erweitert → Entwicklermodus** aktivieren
2. Rechtsklick auf die gewünschte Rolle im Servermenü → **ID kopieren**
3. Als Variable `NOTRUF_PING_ROLE_ID` mit dieser ID (nur die Zahl, ohne `<@&>`) hinzufügen

Ohne diese Variable wird weiterhin `@here` gepingt (alle gerade online im Kanal).

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

## Admin-Zugang & Berechtigungen

Es gibt jetzt zwei Arten, sich im Adminbereich (`/admin.html`) anzumelden:

- **Serverleitung**: Nutzername leer lassen, nur die `ADMIN_KEY`-Zugangsphrase
  eingeben → voller Zugriff auf alles, inklusive Account-Verwaltung.
- **Einzelne Admin-Accounts**: Nutzername + eigenes Passwort, mit genau den
  Berechtigungen, die ihr diesem Account gegeben habt (Team, Immobilien,
  Regelwerk, Fraktionen, Roblox-Lookup, Strafen eintragen, Admins verwalten).

Accounts werden im Tab **"Accounts"** angelegt (nur sichtbar für Serverleitung
oder Accounts mit der Berechtigung "Admins verwalten"). Passwörter werden
gesalzen gehasht in KV gespeichert (nie im Klartext). Logins sind auf 8
Versuche pro 15 Minuten und IP begrenzt.

Ein Account sieht im Adminbereich nur die Tabs, für die er eine Berechtigung
hat — z. B. kann ein Account mit nur "Immobilien" gar nicht ans Regelwerk ran.

## Strafen-System (Roblox-Lookup)

Im Tab "Roblox-Lookup" könnt ihr nach einem Roblox-Nutzer suchen und direkt
darunter dessen Verlauf sehen: Verwarnungen, Kicks, Bans — mit Grund, wer es
eingetragen hat und wann. Neue Einträge über das Formular darunter (braucht
die Berechtigung "Strafen eintragen"). Gespeichert unter dem Schlüssel
`strafen:<roblox-id>` in KV, dauerhaft.

## Admin-Änderungslog (privat, nur für euer Team)

Mit `DISCORD_WEBHOOK_ADMINLOG` gesetzt, postet der Worker bei **jeder**
Admin-Änderung (Team/Immobilien/Regelwerk/Fraktionen hinzugefügt, bearbeitet,
gelöscht, sortiert, zurückgesetzt; Strafe eingetragen; Admin-Account
angelegt/bearbeitet/gelöscht) eine kurze Zeile in diesen Kanal, mit dem
Namen des Admins, der es gemacht hat. Kein Setup außer dem Secret nötig —
ohne `DISCORD_WEBHOOK_ADMINLOG` läuft alles wie gewohnt, nur ohne
Discord-Meldung.

Legt dafür am besten einen **eigenen, nicht-öffentlichen** Discord-Kanal an,
den nur euer Team sieht (z. B. `#admin-log`) — das ist bewusst getrennt vom
Deploy-Log unten, damit normale Mitglieder nicht sehen, wer wann welche
Immobilie bearbeitet hat.

## Update-Ankündigungen (öffentlich, für alle sichtbar)

Es gibt jetzt **zwei** Wege, öffentliche Update-Meldungen zu posten — beide
landen im selben Kanal, sind aber unabhängig voneinander:

### A) Manuell über den Admin-Bereich (empfohlen, immer verfügbar)

Tab **"Update posten"** (Berechtigung: `changelog`): Text eintippen, Knopf
drücken, geht sofort raus. Braucht nur ein **Cloudflare-Secret**:

- Name: `DISCORD_WEBHOOK_BUILDLOG`
- Typ: **Secret**
- Wert: die Webhook-URL eures **öffentlichen** Kanals (z. B. `#updates`)

Das ist der zuverlässigste Weg, weil er nicht von GitHub Actions abhängt —
funktioniert sofort, sobald das Secret in Cloudflare gesetzt ist.

### B) Automatisch bei jedem Push (optional, zusätzlich)

`.github/workflows/notify-deploy.yml` postet bei jedem Push auf `main` eine
Nachricht mit Commit-Beschreibung und Autor. Braucht ein **eigenes Secret in
GitHub** (nicht dasselbe wie oben, weil GitHub Actions keinen Zugriff auf
Cloudflares Secrets hat):

1. GitHub Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `DISCORD_WEBHOOK_BUILDLOG`, Wert: dieselbe oder eine andere
   öffentliche Kanal-URL

Ohne dieses GitHub-Secret überspringt die Action die Benachrichtigung einfach
(kein Fehler) — der manuelle Weg (A) funktioniert davon komplett unabhängig.

> Falls Weg B bei euch partout nicht ankommt (GitHub Actions Debugging kann
> mühsam sein — Root Directory, Secrets, Branch-Namen, alles kann
> dazwischenfunken): einfach Weg A nutzen. Der braucht kein GitHub Actions
> überhaupt und funktioniert unabhängig davon.

## Discord-Webhooks — Übersicht

| Secret                        | Wo gesetzt              | Kanal-Sichtbarkeit        | Inhalt |
|--------------------------------|--------------------------|----------------------------|--------|
| `DISCORD_WEBHOOK_NOTRUF`       | Cloudflare               | Team (z. B. `#notruf`)    | Notrufe von Spielern |
| `DISCORD_WEBHOOK_AUSWEISE`     | Cloudflare               | Team (z. B. `#ausweise`)  | Neue Bürgerausweise |
| `DISCORD_WEBHOOK_ADMINLOG`     | Cloudflare               | **Privat**, nur Team      | Admin-Änderungen (wer hat was gemacht) |
| `DISCORD_WEBHOOK_BUILDLOG`     | Cloudflare **und/oder** GitHub Actions | **Öffentlich**, für alle | Update-Ankündigungen (manuell aus dem Admin-Bereich und/oder automatisch bei Push) |

Keine dieser URLs steht in einer Datei im Repo — nur als Secrets an den
jeweiligen Stellen. Der Notruf-Button sitzt auf der **öffentlichen
Startseite** (`index.html`, Abschnitt "Notruf an das Team") — er ist für
Bürger/Spieler gedacht, die einen Admin brauchen, deshalb bewusst ohne
Login. Es gibt einen einfachen 30-Sekunden-Cooldown im Frontend gegen
versehentliches Mehrfach-Senden, aber keinen echten Spam-Schutz (siehe
"Bekannte Grenzen" unten). Der Ausweis-Versand bleibt ebenfalls öffentlich,
da normale Spieler ihn nutzen.

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

## Server-Links (In-Game-Server-Codes)

Die Roblox-Server-Links stehen nicht mehr fest im Code, sondern im Admin-Tab
"Server-Links" (Berechtigung: `serverlinks`). Der **erste** Eintrag
(Reihenfolge per ↑/↓ steuerbar) wird automatisch der große "▶ Jetzt
spielen"-Button auf der Startseite, alle weiteren erscheinen als kleine
Zusatzlinks darunter ("Weitere Server: ..."). Ändert sich der Server-Code,
einfach im Admin bearbeiten — kein Redeploy nötig.

## Roblox-Lookup

`/api/roblox-lookup` (admin-only) nutzt Robloxs öffentliche APIs, um zu
einem Username die User-ID, den Anzeigenamen und ein Avatar-Bild zu holen.
Zwei Stellen im Admin-Bereich nutzen das:

- **Team-Formular**: Roblox-Username eintragen → "Avatar laden" → Avatar
  wird gespeichert und erscheint auf `/team.html`. Es wird nur die
  Avatar-**URL** gespeichert (ein paar Bytes Text), nicht das Bild selbst —
  das braucht keine zusätzliche KV-Namespace, der bestehende Speicher
  reicht dafür locker.
- **Eigenständiges "Roblox-Lookup"-Tab**: Username eingeben, direkt
  Anzeigename/User-ID/Avatar/Profil-Link bekommen, unabhängig vom Team.

Team-Reihenfolge (Hierarchie): Die ↑/↓-Pfeile in der Team-Tabelle im Admin
steuern, in welcher Reihenfolge Mitglieder auf `/team.html` erscheinen —
das ist schon die "von oben nach unten"-Hierarchie.

## Sicherheit

- **HTML-Escaping**: Alle aus KV geladenen Texte (Team-Bios, Immobilien-
  Beschreibungen, Regelwerk, Fraktionen) werden vor der Anzeige escaped
  (`escapeHtml()` in `script.js`), das verhindert gespeichertes XSS. Das
  Regelwerk-Textfeld erlaubt zusätzlich `<br>` für Zeilenumbrüche, alles
  andere wird auch dort neutralisiert.
- **Admin-Login**: Passwörter werden gesalzen mit SHA-256 gehasht in KV
  gespeichert (nie im Klartext), Vergleiche laufen timing-safe. Sessions
  sind Zufalls-Tokens mit 12h-Gültigkeit, keine JWTs mit einsehbarem Inhalt.
  Brute-Force-Schutz: max. 8 Login-Versuche pro 15 Minuten und IP, für
  Serverleitungs- und Account-Login gemeinsam.
- **Berechtigungen**: Jeder Endpunkt prüft serverseitig die passende
  Berechtigung der Session (nicht nur, ob überhaupt eingeloggt) — ein
  Immobilien-Account kann z. B. technisch nicht ans Regelwerk, auch nicht
  über direkte API-Aufrufe.
- **Schreibzugriffe** (`/api/data/*`, Bild-Upload) sind zusätzlich zur
  Berechtigungsprüfung rate-limitiert, als Verteidigung falls eine Session
  doch mal geleakt wird.
- **Bild-Uploads**: nur PNG/JPEG/WEBP/GIF, max. 4 MB, Typ wird geprüft
  (keine SVGs — die könnten eingebettetes JavaScript enthalten).

Wichtigste verbleibende Empfehlung: Wählt einen **langen, zufälligen**
`ADMIN_KEY` und ebenso starke Passwörter für einzelne Accounts — die Limits
helfen, ersetzen aber kein starkes Passwort. Salted-SHA-256 ist solide für
diesen Rahmen, aber kein bcrypt/Argon2 — für eine größere Community mit
vielen Accounts wäre ein echter Auth-Provider langfristig die robustere Wahl.

## Bekannte Grenzen (bewusste Trade-offs)

- **Einfaches IP-Rate-Limit** auf `/api/notruf` (3 pro 10 Min.) und
  `/api/ausweis` (5 pro 10 Min.), gespeichert in KV. Das ist ein weicher,
  bester-Versuch-Schutz (KV ist "eventually consistent", also nicht
  hundertprozentig atomar) — reicht für eine normale Community, ist aber
  keine harte Sicherheitsgarantie. Bei ernsthaftem Missbrauch (z. B. über
  viele verschiedene IPs) könnt ihr zusätzlich Cloudflare Turnstile oder das
  Rate-Limiting-Produkt im Dashboard (Security → WAF) davorschalten.
- **Individuelle Admin-Accounts** sind jetzt möglich (Tab "Accounts"), aber
  optional — ohne angelegte Accounts funktioniert weiterhin nur der
  Serverleitungs-Login mit `ADMIN_KEY`.
- **Roblox-Avatare** sind nur eine gespeicherte URL vom Roblox-CDN — falls
  Roblox diese URLs irgendwann ändert/invalidiert, müsste der Avatar im
  Admin neu geladen werden (kein automatisches Refresh).
- **Immobilien-Bilder direkt nach dem Hochladen**: KV ist "eventually
  consistent" — in seltenen Fällen kann ein gerade hochgeladenes Bild ein
  paar Sekunden brauchen, bis es überall abrufbar ist. Die Admin-Vorschau
  zeigt deshalb sofort die lokale Datei (unabhängig vom Server), und die
  öffentliche Immobilien-Seite versucht ein fehlgeschlagenes Bild nach 2
  Sekunden automatisch neu zu laden, bevor sie aufgibt.
- **Wichtig nach diesem Update**: Der alte `/api/admin/verify`-Endpunkt
  wurde durch `/api/admin/login` ersetzt. Falls irgendwo noch eine alte
  Version von `admin.html` im Einsatz ist, muss sie durch die neue ersetzt
  werden — alte gespeicherte Zugangsdaten im Browser werden automatisch
  ungültig und verlangen einmalig ein neues Einloggen.

// Cloudflare Worker for HESSEN RP
//
// Responsibilities:
//   1. Serve the static site from /public (via the ASSETS binding)
//   2. GET/POST /api/data/:type      — team / immobilien / regelwerk / fraktionen
//   3. POST /api/upload-image        — Immobilien photos, stored as base64 in KV
//   4. POST /api/notruf              — public panic button -> Discord webhook
//   5. POST /api/ausweis             — Bürgerausweis -> Discord webhook
//   6. POST /api/admin/login         — username+password OR master ADMIN_KEY -> session token
//   7. GET/POST /api/admin/accounts  — manage admin accounts + their permissions
//   8. GET/POST /api/roblox-strafen/:id — warn/kick/ban history per Roblox user
//   9. POST /api/roblox-lookup       — Roblox username -> id/displayName/avatar
//  10. POST /api/changelog           — manually post an update/announcement to the public build-log channel
//
// Auth model: individual admin accounts (username + password, hashed with
// salted SHA-256) each have their own permission flags (team, immobilien,
// regelwerk, fraktionen, roblox, strafen, manageAdmins). Logging in with an
// empty username + the ADMIN_KEY secret gives a superadmin session with all
// permissions — that's also how the very first admin account gets created.
// Sessions are opaque tokens stored in KV with a 12h TTL.
//
// Every admin write action posts a short line to DISCORD_WEBHOOK_ADMINLOG
// (optional) so the team has a change history in Discord.
//
// Required bindings/secrets (see README.md for exact setup steps):
//   - KV namespace  bound as DATA_KV
//   - Secret        ADMIN_KEY               (master/owner passphrase)
//   - Secret        DISCORD_WEBHOOK_NOTRUF
//   - Secret        DISCORD_WEBHOOK_AUSWEISE
//   - Secret        DISCORD_WEBHOOK_ADMINLOG (optional — private admin change log)
//   - Secret        DISCORD_WEBHOOK_BUILDLOG (optional — public updates, for the manual "Update posten" tool)
//   - Variable      NOTRUF_PING_ROLE_ID     (optional — Discord role ID to
//                                            ping on /api/notruf; falls back
//                                            to @here if not set)
//
// Abuse protection: /api/notruf and /api/ausweis are rate-limited per IP via
// KV (3 notrufe / 10 min, 5 ausweise / 10 min), admin login is limited to 8
// attempts / 15 min. This is a soft, best-effort limit (KV is eventually
// consistent) — good enough for a small community, not a hard guarantee.

const DATA_TYPES = ['team', 'immobilien', 'regelwerk', 'fraktionen', 'serverlinks'];

const DEFAULTS = {
  team: [
    { id: 't1', name: 'Jonas', rolle: 'Serverleitung', rang: 'Owner', seit: '2024', bio: 'Verantwortlich für Ausrichtung, Team und technische Infrastruktur.' },
    { id: 't2', name: 'Lea', rolle: 'Co-Leitung', rang: 'Co-Owner', seit: '2024', bio: 'Kümmert sich um Community-Management und Events.' },
    { id: 't3', name: 'Finn', rolle: 'Teamleitung', rang: 'Head-Admin', seit: '2025', bio: 'Leitet das Support- und Moderationsteam.' },
    { id: 't4', name: 'Mara', rolle: 'Fraktionsbetreuung', rang: 'Admin', seit: '2025', bio: 'Ansprechpartnerin für Polizei- und Rettungsdienst-Fraktionen.' },
    { id: 't5', name: 'Elias', rolle: 'Entwicklung', rang: 'Developer', seit: '2025', bio: 'Baut und pflegt Server-Skripte und Tools.' },
    { id: 't6', name: 'Nora', rolle: 'Support', rang: 'Moderator', seit: '2026', bio: 'Erste Anlaufstelle bei Fragen und Problemen im Discord.' },
  ],
  immobilien: [
    { id: 'i1', titel: 'Altbauwohnung Innenstadt', stadt: 'Frankfurt am Main', preis: 185000, zimmer: 3, flaeche: 92, status: 'verfügbar', beschreibung: 'Helle Altbauwohnung mit Balkon, zentrale Lage.', bild: '' },
    { id: 'i2', titel: 'Reihenhaus am Stadtrand', stadt: 'Wiesbaden', preis: 265000, zimmer: 5, flaeche: 130, status: 'verfügbar', beschreibung: 'Familienfreundliches Reihenhaus mit kleinem Garten.', bild: '' },
    { id: 'i3', titel: 'Loft im Industriegebiet', stadt: 'Kassel', preis: 210000, zimmer: 2, flaeche: 78, status: 'reserviert', beschreibung: 'Modernes Loft mit offener Küche und hohen Decken.', bild: '' },
    { id: 'i4', titel: 'Stadtvilla mit Garage', stadt: 'Darmstadt', preis: 420000, zimmer: 6, flaeche: 210, status: 'verkauft', beschreibung: 'Repräsentative Villa mit Doppelgarage und großem Grundstück.', bild: '' },
  ],
  serverlinks: [
    { id: 'sl1', label: 'Jetzt spielen', url: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6x9zjz6', beschreibung: 'Hauptserver mit RP-Paket' },
    { id: 'sl2', label: 'Server 2', url: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6n1db5p', beschreibung: 'Alternativer Server ohne RP-Paket' },
  ],
  fraktionen: [
    { id: 'f1', name: 'Polizei Hessen', kuerzel: 'LPH', typ: 'Behörde', leitung: 'Mara', status: 'offen', slots: '12', beschreibung: 'Zuständig für Recht und Ordnung im gesamten Bundesland.', raenge: 'Anwärter, Polizeimeister, Polizeiobermeister, Kommissar, Revierleiter' },
    { id: 'f2', name: 'Rettungsdienst Hessen', kuerzel: 'RDH', typ: 'Behörde', leitung: 'Nora', status: 'offen', slots: '10', beschreibung: 'Rettungssanitäter und Notärzte für den gesamten Server.', raenge: 'Praktikant, Rettungssanitäter, Notfallsanitäter, Leitender Notarzt' },
    { id: 'f3', name: 'Stadtverwaltung', kuerzel: 'SV', typ: 'Behörde', leitung: 'Jonas', status: 'bewerbung', slots: '6', beschreibung: 'Verwaltet Immobilien, Gewerbe und städtische Angelegenheiten.', raenge: 'Sachbearbeiter, Amtsleiter, Bürgermeister' },
    { id: 'f4', name: 'Hafenring-Familie', kuerzel: 'HRF', typ: 'Kriminell', leitung: '—', status: 'geschlossen', slots: '8', beschreibung: 'Eine der einflussreichsten kriminellen Organisationen in Frankfurt.', raenge: 'Prospect, Mitglied, Vertrauter, Anführer' },
    { id: 'f5', name: 'Wirtschaftsverband Hessen', kuerzel: 'WVH', typ: 'Wirtschaft', leitung: 'Elias', status: 'offen', slots: '—', beschreibung: 'Dachverband für Unternehmer, Läden und Gewerbetreibende.', raenge: 'Mitglied, Vorstand' },
  ],
  regelwerk: [
    { id: 'r1', section: '§1', sectionTitle: 'Allgemeines', num: '§1.1', title: 'Geltungsbereich', text: 'Mit dem Betreten des Servers akzeptiert jeder Spieler automatisch dieses Regelwerk.' },
    { id: 'r2', section: '§1', sectionTitle: 'Allgemeines', num: '§1.2', title: 'Weisungsrecht', text: 'Anweisungen des Serverteams sind Folge zu leisten. Diskussionen über Teamentscheidungen sind außerhalb laufender RP-Situationen und vorzugsweise im Support zu führen.' },
    { id: 'r3', section: '§1', sectionTitle: 'Allgemeines', num: '§1.3', title: 'Fairplay', text: 'Jeder Spieler ist verpflichtet, zum positiven Spielerlebnis der Community beizutragen.' },
    { id: 'r4', section: '§1', sectionTitle: 'Allgemeines', num: '§1.4', title: 'Regelkenntnis', text: 'Unwissenheit über Regeln schützt nicht vor Sanktionen.' },
    { id: 'r5', section: '§2', sectionTitle: 'Roleplay-Grundsätze', num: '§2.1', title: 'Realistisches Roleplay (RRP)', text: 'Alle Handlungen müssen möglichst realistisch dargestellt werden.<br>Nicht erlaubt sind unter anderem:<br>• Unrealistische Verletzungen ignorieren<br>• Unrealistische Fahrzeugnutzung<br>• Unrealistische Fluchtmöglichkeiten<br>• Unrealistische Kommunikation' },
    { id: 'r6', section: '§2', sectionTitle: 'Roleplay-Grundsätze', num: '§2.2', title: 'FearRP', text: 'Spieler müssen auf lebensbedrohliche Situationen angemessen reagieren.<br>Beispiele:<br>✅ Hände heben, wenn mehrere bewaffnete Personen auf dich zielen.<br>❌ Bewaffneten Tätern gegenüber grundlos provozierend auftreten.' },
    { id: 'r7', section: '§2', sectionTitle: 'Roleplay-Grundsätze', num: '§2.3', title: 'Value of Life (VoL)', text: 'Das eigene Leben und das Leben anderer Charaktere ist stets zu schützen. Selbstmörderische oder lebensmüde Handlungen ohne RP-Hintergrund sind untersagt.' },
    { id: 'r8', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.1', title: 'FailRP', text: 'FailRP beschreibt unrealistische oder regelwidrige Handlungen.<br>Beispiele:<br>• Von hohen Gebäuden springen und weiterlaufen<br>• Schwere Unfälle ignorieren<br>• Unrealistische Fahrzeugmanöver' },
    { id: 'r9', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.2', title: 'PowerRP', text: 'Kein Spieler darf Handlungen erzwingen.<br>❌ „Ich schlage dich bewusstlos.“<br>✅ „Ich versuche, dich bewusstlos zu schlagen.“' },
    { id: 'r10', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.3', title: 'Meta-Gaming', text: 'Informationen außerhalb des Spiels dürfen nicht im RP genutzt werden.<br>Beispiele:<br>• Discord-Nachrichten<br>• Streams<br>• Private Nachrichten' },
    { id: 'r11', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.4', title: 'Combat Logging', text: 'Das absichtliche Verlassen des Spiels während einer RP-Situation ist verboten.' },
    { id: 'r12', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.5', title: 'RDM (Random Deathmatch)', text: 'Das grundlose Verletzen oder Töten anderer Spieler ist verboten.' },
    { id: 'r13', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.6', title: 'VDM (Vehicle Deathmatch)', text: 'Das absichtliche Anfahren oder Überfahren von Spielern ohne RP-Hintergrund ist verboten.' },
    { id: 'r14', section: '§3', sectionTitle: 'Verbotene RP-Handlungen', num: '§3.7', title: 'Trolling', text: 'Das absichtliche Stören von RP-Situationen ist verboten.' },
    { id: 'r15', section: '§4', sectionTitle: 'Kommunikation', num: '§4.1', title: 'Sprachverhalten', text: 'Folgende Inhalte sind untersagt:<br>• Beleidigungen<br>• Diskriminierung<br>• Rassismus<br>• Sexismus<br>• Extremistische Inhalte' },
    { id: 'r16', section: '§4', sectionTitle: 'Kommunikation', num: '§4.2', title: 'Voice Chat', text: 'Verboten sind:<br>• Earrape<br>• Soundboards<br>• Störgeräusche<br>• Absichtliches Überschreien anderer Spieler' },
    { id: 'r17', section: '§4', sectionTitle: 'Kommunikation', num: '§4.3', title: 'RP-Kommunikation', text: 'Während RP-Situationen muss die Kommunikation zur Rolle passen.' },
    { id: 'r18', section: '§5', sectionTitle: 'Einsatzkräfte', num: '§5.1', title: 'Allgemeines', text: 'Polizei, Feuerwehr und Rettungsdienst haben ihre Rollen realistisch auszuführen.' },
    { id: 'r19', section: '§5', sectionTitle: 'Einsatzkräfte', num: '§5.2', title: 'Dienstmissbrauch', text: 'Nicht erlaubt sind:<br>• Grundlose Festnahmen<br>• Missbrauch von Sonderrechten<br>• Zweckentfremdung von Einsatzfahrzeugen' },
    { id: 'r20', section: '§5', sectionTitle: 'Einsatzkräfte', num: '§5.3', title: 'Korruption', text: 'Korruption ist nur erlaubt, wenn dies durch die Serverleitung ausdrücklich freigegeben wurde.' },
    { id: 'r21', section: '§6', sectionTitle: 'Kriminalität', num: '§6.1', title: 'Straftaten', text: 'Straftaten müssen einen nachvollziehbaren RP-Hintergrund besitzen.' },
    { id: 'r22', section: '§6', sectionTitle: 'Kriminalität', num: '§6.2', title: 'Geiselnahmen', text: 'Geiseln sind realistisch zu behandeln. Unnötige Gewaltanwendung ist untersagt.' },
    { id: 'r23', section: '§6', sectionTitle: 'Kriminalität', num: '§6.3', title: 'Überfälle', text: 'Überfälle müssen realistisch und fair durchgeführt werden. Betroffene Spieler müssen angemessen reagieren können.' },
    { id: 'r24', section: '§7', sectionTitle: 'Fahrzeuge', num: '§7.1', title: 'Realistische Fahrweise', text: 'Spieler haben ihre Fahrzeuge situationsgerecht zu führen.' },
    { id: 'r25', section: '§7', sectionTitle: 'Fahrzeuge', num: '§7.2', title: 'Unrealistisches Fahren', text: 'Verboten sind:<br>• Dauerhaftes Offroad-Fahren mit ungeeigneten Fahrzeugen<br>• Unrealistische Sprünge<br>• Absichtliche Fahrzeugzerstörung' },
    { id: 'r26', section: '§7', sectionTitle: 'Fahrzeuge', num: '§7.3', title: 'Fahrzeugspam', text: 'Das absichtliche Spawnen großer Fahrzeugmengen ist untersagt.' },
    { id: 'r27', section: '§8', sectionTitle: 'New-Life-Regel (NLR)', num: '§8', title: 'New-Life-Regel (NLR)', text: 'Nach dem Tod gilt:<br>• Die direkte Situation gilt als vergessen.<br>• Eine sofortige Rückkehr zum Einsatzort ist untersagt.<br>• Rachehandlungen aufgrund des vorherigen Todes sind verboten.<br>Empfohlene Sperrzeit: 15 Minuten.' },
    { id: 'r28', section: '§9', sectionTitle: 'Support-Regelungen', num: '§9.1', title: 'Supportpflicht', text: 'Wer von einem Teammitglied in den Support gebeten wird, hat dieser Aufforderung zeitnah nachzukommen.' },
    { id: 'r29', section: '§9', sectionTitle: 'Support-Regelungen', num: '§9.2', title: 'Supportverhalten', text: 'Während eines Supportgesprächs sind folgende Dinge untersagt:<br>• Lügen<br>• Beleidigungen<br>• Unterbrechungen<br>• Verlassen des Supports ohne Erlaubnis' },
    { id: 'r30', section: '§10', sectionTitle: 'Sanktionen', num: '§10', title: 'Sanktionen', text: 'Verstöße gegen dieses Regelwerk können entsprechend des Kick-, Verwarnungs- und Bannregelwerks sanktioniert werden.<br>Mögliche Maßnahmen:<br>• Hinweis<br>• Kick<br>• Verwarnung<br>• Temporärer Bann<br>• Permanenter Bann<br>Die genaue Sanktion richtet sich nach Schwere, Häufigkeit und Vorsatz des Verstoßes.' },
    { id: 'r31', section: '§11', sectionTitle: 'Schlussbestimmungen', num: '§11', title: 'Schlussbestimmungen', text: 'Die Serverleitung behält sich das Recht vor, dieses Regelwerk jederzeit anzupassen oder zu erweitern. In nicht ausdrücklich geregelten Fällen entscheidet die Serverleitung nach bestem Wissen und Gewissen. Das Ziel des Servers ist ein realistisches, faires und respektvolles Roleplay-Erlebnis für alle Spieler.' },
  ],
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}),
  });
}

var ALL_PERMISSIONS = { team: true, immobilien: true, regelwerk: true, fraktionen: true, roblox: true, strafen: true, manageAdmins: true, serverlinks: true, changelog: true };
var TYPE_LABELS = { team: 'Team', immobilien: 'Immobilien', regelwerk: 'Regelwerk', fraktionen: 'Fraktionen', serverlinks: 'Server-Links' };

// Constant-time string comparison so an attacker can't infer a secret
// byte-by-byte from response timing differences.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  var maxLen = Math.max(a.length, b.length);
  var result = a.length === b.length ? 0 : 1;
  for (var i = 0; i < maxLen; i++) {
    var charA = i < a.length ? a.charCodeAt(i) : 0;
    var charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function randomHex(len) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(len)));
}
async function sha256Hex(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return bytesToHex(new Uint8Array(buf));
}
// Salted SHA-256 — not bcrypt-level, but far better than plaintext, no
// external dependency, and combined with login rate-limiting is solid for
// this project's scope.
async function hashPassword(password, salt) {
  return sha256Hex(salt + ':' + password);
}

async function getAdmins(env) {
  if (!env.DATA_KV) return [];
  var list = await env.DATA_KV.get('admins', 'json');
  return Array.isArray(list) ? list : [];
}

async function createSession(env, info) {
  var token = randomHex(32);
  var session = Object.assign({}, info, { expires: Date.now() + 12 * 3600 * 1000 });
  await env.DATA_KV.put('session:' + token, JSON.stringify(session), { expirationTtl: 12 * 3600 });
  return json({ ok: true, token: token, username: info.username, isSuperAdmin: info.isSuperAdmin, permissions: info.permissions });
}

// Looks up the bearer token as an active session. Returns null if missing/expired.
async function authenticate(request, env) {
  if (!env.DATA_KV) return null;
  var auth = request.headers.get('Authorization') || '';
  var token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return await env.DATA_KV.get('session:' + token, 'json');
}
function can(session, perm) {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return !!(session.permissions && session.permissions[perm]);
}

// Simple IP-based rate limiter backed by KV (fail-open if KV isn't configured,
// so a misconfiguration never fully blocks the site — it just loses the
// abuse protection until DATA_KV is set up).
async function checkRateLimit(env, bucket, request, limit, windowSeconds) {
  if (!env.DATA_KV) return true;
  var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  var key = 'rl:' + bucket + ':' + ip;
  var now = Date.now();
  var windowMs = windowSeconds * 1000;
  var raw = await env.DATA_KV.get(key, 'json');
  var timestamps = Array.isArray(raw) ? raw.filter(function (t) { return now - t < windowMs; }) : [];
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  await env.DATA_KV.put(key, JSON.stringify(timestamps), { expirationTtl: windowSeconds });
  return true;
}

// Posts a short change-log entry to Discord. Best-effort — never throws,
// so a logging hiccup can't break the actual admin action.
async function postAuditLog(env, actor, message) {
  var webhook = env.DISCORD_WEBHOOK_ADMINLOG;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HESSEN RP · Änderungslog',
        embeds: [{
          description: '**' + actor + '** — ' + message,
          color: 0x8991A3,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (e) {
    // ignore — logging must never block the real action
  }
}

async function handleAdminLogin(request, env) {
  var allowed = await checkRateLimit(env, 'adminlogin', request, 8, 900);
  if (!allowed) return json({ error: 'Zu viele Versuche. Bitte warte ein paar Minuten.' }, 429);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var username = String(data.username || '').trim();
  var password = String(data.password || '');

  // Empty username = master login with the ADMIN_KEY (full access, no
  // account needed — this is how you create the very first admin account).
  if (!username) {
    if (!env.ADMIN_KEY || !password || !timingSafeEqual(password, env.ADMIN_KEY)) {
      return json({ error: 'Falsche Zugangsphrase.' }, 401);
    }
    return createSession(env, { adminId: 'owner', username: 'Serverleitung', isSuperAdmin: true, permissions: ALL_PERMISSIONS });
  }

  var accounts = await getAdmins(env);
  var account = accounts.find(function (a) { return a.username.toLowerCase() === username.toLowerCase(); });
  if (!account) return json({ error: 'Nutzername oder Passwort falsch.' }, 401);
  var hash = await hashPassword(password, account.salt);
  if (!timingSafeEqual(hash, account.passwordHash)) return json({ error: 'Nutzername oder Passwort falsch.' }, 401);
  return createSession(env, { adminId: account.id, username: account.username, isSuperAdmin: false, permissions: account.permissions || {} });
}

async function handleGetAdmins(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'manageAdmins')) return json({ error: 'Nicht autorisiert.' }, 401);
  var accounts = await getAdmins(env);
  return json(accounts.map(function (a) { return { id: a.id, username: a.username, permissions: a.permissions, createdAt: a.createdAt }; }));
}

async function handleSaveAdmin(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'manageAdmins')) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var username = String(data.username || '').trim();
  if (!username) return json({ error: 'Bitte einen Nutzernamen angeben.' }, 400);

  var accounts = await getAdmins(env);
  var editId = data.id;
  var idx = accounts.findIndex(function (a) { return a.id === editId; });
  var permissions = data.permissions && typeof data.permissions === 'object' ? data.permissions : {};
  var entry;

  if (idx > -1) {
    entry = accounts[idx];
    entry.username = username;
    entry.permissions = permissions;
    if (data.password) {
      var salt = randomHex(16);
      entry.salt = salt;
      entry.passwordHash = await hashPassword(data.password, salt);
    }
    accounts[idx] = entry;
  } else {
    if (!data.password) return json({ error: 'Bitte ein Passwort vergeben.' }, 400);
    var newSalt = randomHex(16);
    entry = {
      id: 'a' + Date.now(),
      username: username,
      salt: newSalt,
      passwordHash: await hashPassword(data.password, newSalt),
      permissions: permissions,
      createdAt: new Date().toISOString(),
    };
    accounts.push(entry);
  }

  await env.DATA_KV.put('admins', JSON.stringify(accounts));
  await postAuditLog(env, session.username, (idx > -1 ? 'Admin-Konto bearbeitet: ' : 'Admin-Konto erstellt: ') + username);
  return json({ ok: true });
}

async function handleDeleteAdmin(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'manageAdmins')) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var accounts = await getAdmins(env);
  var target = accounts.find(function (a) { return a.id === data.id; });
  accounts = accounts.filter(function (a) { return a.id !== data.id; });
  await env.DATA_KV.put('admins', JSON.stringify(accounts));
  if (target) await postAuditLog(env, session.username, 'Admin-Konto gelöscht: ' + target.username);
  return json({ ok: true });
}

async function handleGetData(type, env) {
  if (DATA_TYPES.indexOf(type) === -1) return json({ error: 'Unbekannter Datentyp.' }, 404);
  if (!env.DATA_KV) return json(DEFAULTS[type]);
  var stored = await env.DATA_KV.get(type, 'json');
  if (stored === null) {
    await env.DATA_KV.put(type, JSON.stringify(DEFAULTS[type]));
    return json(DEFAULTS[type]);
  }
  return json(stored);
}

async function handleSaveData(type, request, env) {
  if (DATA_TYPES.indexOf(type) === -1) return json({ error: 'Unbekannter Datentyp.' }, 404);
  var session = await authenticate(request, env);
  if (!can(session, type)) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);
  var allowed = await checkRateLimit(env, 'adminwrite', request, 60, 600);
  if (!allowed) return json({ error: 'Zu viele Änderungen in kurzer Zeit. Bitte kurz warten.' }, 429);

  var list;
  try {
    list = await request.json();
  } catch (e) {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }
  if (!Array.isArray(list)) return json({ error: 'Erwartet ein Array.' }, 400);

  await env.DATA_KV.put(type, JSON.stringify(list));
  var actionLabel = request.headers.get('X-Action-Label') || (TYPE_LABELS[type] + ' aktualisiert');
  await postAuditLog(env, session.username, actionLabel);
  return json({ ok: true });
}

async function handleResetData(type, request, env) {
  if (DATA_TYPES.indexOf(type) === -1) return json({ error: 'Unbekannter Datentyp.' }, 404);
  var session = await authenticate(request, env);
  if (!can(session, type)) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);
  await env.DATA_KV.put(type, JSON.stringify(DEFAULTS[type]));
  await postAuditLog(env, session.username, TYPE_LABELS[type] + ' auf Standard zurückgesetzt');
  return json({ ok: true });
}

async function handleUploadImage(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'immobilien')) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);
  var uploadAllowed = await checkRateLimit(env, 'upload', request, 20, 600);
  if (!uploadAllowed) return json({ error: 'Zu viele Uploads in kurzer Zeit. Bitte kurz warten.' }, 429);

  var contentType = request.headers.get('Content-Type') || '';
  if (contentType.indexOf('multipart/form-data') === -1) {
    return json({ error: 'Erwartet multipart/form-data.' }, 400);
  }

  var form = await request.formData();
  var file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Keine Datei gefunden.' }, 400);
  // KV values are base64-encoded here (~33% larger than the original file),
  // so keep a conservative cap well under KV's per-value limit.
  if (file.size > 4 * 1024 * 1024) return json({ error: 'Bild zu groß (max. 4 MB).' }, 413);

  var allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  var fileType = file.type || 'application/octet-stream';
  if (allowedTypes.indexOf(fileType) === -1) return json({ error: 'Nur PNG, JPEG, WEBP oder GIF erlaubt.' }, 415);

  var buffer = await file.arrayBuffer();
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  var base64 = btoa(binary);

  var key = 'img:' + crypto.randomUUID();
  await env.DATA_KV.put(key, JSON.stringify({ contentType: fileType, data: base64 }));

  return json({ ok: true, url: '/api/image/' + key.slice(4) });
}

async function handleGetImage(id, env) {
  if (!env.DATA_KV) return new Response('Not configured', { status: 500 });
  var stored = await env.DATA_KV.get('img:' + id, 'json');
  if (!stored) return new Response('Not found', { status: 404 });
  var binary = atob(stored.data);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      'Content-Type': stored.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

async function handleGetStrafen(robloxId, request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'roblox') && !can(session, 'strafen')) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json([]);
  var list = await env.DATA_KV.get('strafen:' + robloxId, 'json');
  return json(Array.isArray(list) ? list : []);
}

async function handleChangelog(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'changelog')) return json({ error: 'Nicht autorisiert.' }, 401);
  var webhook = env.DISCORD_WEBHOOK_BUILDLOG;
  if (!webhook) return json({ error: 'DISCORD_WEBHOOK_BUILDLOG ist auf dem Server nicht konfiguriert.' }, 500);

  var allowed = await checkRateLimit(env, 'changelog', request, 10, 3600);
  if (!allowed) return json({ error: 'Zu viele Updates in kurzer Zeit. Bitte kurz warten.' }, 429);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var message = String(data.message || '').trim().slice(0, 1500);
  if (!message) return json({ error: 'Bitte einen Text eingeben.' }, 400);

  var payload = {
    username: 'HESSEN RP · Updates',
    embeds: [{
      title: '📢 Neues Update',
      description: message,
      color: 0x3EDC81,
      footer: { text: 'Gepostet von ' + session.username },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    var res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return json({ error: 'Discord hat die Anfrage abgelehnt.' }, 502);
  } catch (e) {
    return json({ error: 'Verbindung zu Discord fehlgeschlagen.' }, 502);
  }
  await postAuditLog(env, session.username, 'Update-Ankündigung gepostet: ' + message.slice(0, 100) + (message.length > 100 ? '…' : ''));
  return json({ ok: true });
}

async function handleAddStrafe(robloxId, request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'strafen')) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var typ = String(data.typ || '').trim();
  if (['warn', 'kick', 'ban'].indexOf(typ) === -1) return json({ error: 'Ungültiger Strafentyp.' }, 400);
  var grund = String(data.grund || '').trim().slice(0, 300);
  if (!grund) return json({ error: 'Bitte einen Grund angeben.' }, 400);
  var dauer = String(data.dauer || '').trim().slice(0, 100);
  var username = String(data.username || '').slice(0, 50);

  var list = await env.DATA_KV.get('strafen:' + robloxId, 'json');
  list = Array.isArray(list) ? list : [];
  list.unshift({ id: 's' + Date.now(), typ: typ, grund: grund, dauer: dauer, von: session.username, datum: new Date().toISOString() });
  await env.DATA_KV.put('strafen:' + robloxId, JSON.stringify(list));

  var typLabel = { warn: 'Verwarnung', kick: 'Kick', ban: 'Bann' }[typ] || typ;
  var logLine = 'Strafe eingetragen (' + typLabel + (dauer ? ', Dauer: ' + dauer : '') + ') für Roblox-Nutzer ' + (username || robloxId) + ': ' + grund;
  await postAuditLog(env, session.username, logLine);
  return json({ ok: true });
}

async function handleNotruf(request, env) {
  var webhook = env.DISCORD_WEBHOOK_NOTRUF;
  if (!webhook) return json({ error: 'Notruf-Webhook ist auf dem Server nicht konfiguriert.' }, 500);

  var allowed = await checkRateLimit(env, 'notruf', request, 3, 600);
  if (!allowed) {
    return json({ error: 'Zu viele Notrufe von deiner Verbindung. Bitte warte ein paar Minuten und versuch es erneut.' }, 429);
  }

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }

  var grund = String(data.grund || 'Kein Grund angegeben').slice(0, 500);
  var ort = String(data.ort || 'Nicht angegeben').slice(0, 200);
  var absender = String(data.absender || 'Unbekannt').slice(0, 100);

  // Ping target is configurable: set NOTRUF_PING_ROLE_ID to a Discord role ID
  // to ping that role specifically. Falls back to @here if not set.
  var pingMention = '@here';
  var allowedMentions = { parse: ['everyone'] };
  if (env.NOTRUF_PING_ROLE_ID) {
    pingMention = '<@&' + env.NOTRUF_PING_ROLE_ID + '>';
    allowedMentions = { roles: [env.NOTRUF_PING_ROLE_ID], parse: [] };
  }

  var payload = {
    content: pingMention + ' 🚨 **Neuer Notruf eingegangen!**',
    username: 'HESSEN RP · Notruf',
    allowed_mentions: allowedMentions,
    embeds: [{
      title: '🚨🚨 NOTRUF — SOFORT REAGIEREN 🚨🚨',
      description: '**' + grund + '**',
      color: 0xFF0000,
      fields: [
        { name: '👤 Von', value: absender, inline: true },
        { name: '📍 Ort / Situation', value: ort, inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '✅ Übernahme', value: 'Reagiere mit ✅ auf diese Nachricht, wenn du dich kümmerst — dann sehen alle sofort, dass jemand unterwegs ist.' },
      ],
      footer: { text: 'HESSEN RP · Notrufsystem' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    var discordRes = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!discordRes.ok) return json({ error: 'Discord hat die Anfrage abgelehnt.' }, 502);
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Verbindung zu Discord fehlgeschlagen.' }, 502);
  }
}

async function handleRobloxLookup(request, env) {
  var session = await authenticate(request, env);
  if (!can(session, 'roblox')) return json({ error: 'Nicht autorisiert.' }, 401);
  var allowed = await checkRateLimit(env, 'roblox', request, 30, 600);
  if (!allowed) return json({ error: 'Zu viele Roblox-Anfragen in kurzer Zeit. Bitte kurz warten.' }, 429);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }
  var username = String(data.username || '').trim();
  if (!username) return json({ error: 'Bitte einen Roblox-Benutzernamen angeben.' }, 400);
  if (username.length > 50) return json({ error: 'Benutzername zu lang.' }, 400);

  try {
    var userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });
    if (!userRes.ok) return json({ error: 'Roblox-API nicht erreichbar (Status ' + userRes.status + '). Bitte kurz erneut versuchen.' }, 502);
    var userData = await userRes.json();
    var user = userData.data && userData.data[0];
    if (!user) return json({ error: 'Roblox-Nutzer "' + username + '" nicht gefunden.' }, 404);

    var avatarUrl = null;
    try {
      var avatarRes = await fetch(
        'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + user.id + '&size=150x150&format=Png&isCircular=false'
      );
      if (avatarRes.ok) {
        var avatarData = await avatarRes.json();
        var avatar = avatarData.data && avatarData.data[0];
        if (avatar && avatar.state === 'Completed') avatarUrl = avatar.imageUrl;
      }
    } catch (e) {
      // avatar fetch failing shouldn't block returning the user info
    }

    return json({
      ok: true,
      id: user.id,
      username: user.name,
      displayName: user.displayName,
      avatarUrl: avatarUrl,
      profileUrl: 'https://www.roblox.com/users/' + user.id + '/profile',
    });
  } catch (err) {
    return json({ error: 'Roblox-API nicht erreichbar (' + (err && err.message ? err.message : 'unbekannter Fehler') + ').' }, 502);
  }
}

async function handleAusweis(request, env) {
  var webhook = env.DISCORD_WEBHOOK_AUSWEISE;
  if (!webhook) return json({ error: 'Ausweis-Webhook ist auf dem Server nicht konfiguriert.' }, 500);

  var allowed = await checkRateLimit(env, 'ausweis', request, 5, 600);
  if (!allowed) {
    return json({ error: 'Zu viele Ausweis-Anfragen von deiner Verbindung. Bitte warte ein paar Minuten.' }, 429);
  }

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }

  var name = String(data.name || '—').slice(0, 100);
  var wohnort = String(data.wohnort || '—').slice(0, 100);
  var fraktion = String(data.fraktion || '—').slice(0, 100);
  var geburtsdatum = String(data.geburtsdatum || '—').slice(0, 50);
  var ausweisNr = String(data.ausweisNr || '—').slice(0, 50);
  var imageBase64 = typeof data.imageBase64 === 'string' ? data.imageBase64 : null;

  var embed = {
    title: '🪪 Neuer Bürgerausweis erstellt',
    color: 0xFF2A44,
    fields: [
      { name: 'Name', value: name, inline: true },
      { name: 'Wohnort', value: wohnort, inline: true },
      { name: 'Fraktion', value: fraktion, inline: true },
      { name: 'Geburtsdatum', value: geburtsdatum, inline: true },
      { name: 'Ausweisnummer', value: ausweisNr, inline: true },
    ],
  };

  var form = new FormData();
  form.append('payload_json', JSON.stringify({ username: 'HESSEN RP · Bürgeramt', embeds: [embed] }));

  if (imageBase64) {
    try {
      var base64 = imageBase64.split(',').pop();
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length <= 8 * 1024 * 1024) {
        form.append('file', new Blob([bytes], { type: 'image/png' }), 'ausweis.png');
      }
    } catch (e) {
      // malformed image data — still send the embed without an attachment
    }
  }

  try {
    var discordRes2 = await fetch(webhook, { method: 'POST', body: form });
    if (!discordRes2.ok) return json({ error: 'Discord hat die Anfrage abgelehnt.' }, 502);
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Verbindung zu Discord fehlgeschlagen.' }, 502);
  }
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    var method = request.method;

    if (method === 'POST' && path === '/api/admin/login') return handleAdminLogin(request, env);
    if (method === 'GET' && path === '/api/admin/accounts') return handleGetAdmins(request, env);
    if (method === 'POST' && path === '/api/admin/accounts') return handleSaveAdmin(request, env);
    if (method === 'POST' && path === '/api/admin/accounts/delete') return handleDeleteAdmin(request, env);

    var dataMatch = path.match(/^\/api\/data\/([a-z]+)$/);
    if (dataMatch) {
      var type = dataMatch[1];
      if (method === 'GET') return handleGetData(type, env);
      if (method === 'POST') return handleSaveData(type, request, env);
    }

    var resetMatch = path.match(/^\/api\/data\/([a-z]+)\/reset$/);
    if (resetMatch && method === 'POST') return handleResetData(resetMatch[1], request, env);

    if (method === 'POST' && path === '/api/upload-image') return handleUploadImage(request, env);
    if (method === 'POST' && path === '/api/roblox-lookup') return handleRobloxLookup(request, env);
    if (method === 'POST' && path === '/api/changelog') return handleChangelog(request, env);

    var strafenMatch = path.match(/^\/api\/roblox-strafen\/(\d+)$/);
    if (strafenMatch) {
      if (method === 'GET') return handleGetStrafen(strafenMatch[1], request, env);
      if (method === 'POST') return handleAddStrafe(strafenMatch[1], request, env);
    }

    var imageMatch = path.match(/^\/api\/image\/(.+)$/);
    if (imageMatch && method === 'GET') return handleGetImage(imageMatch[1], env);

    if (method === 'POST' && path === '/api/notruf') return handleNotruf(request, env);
    if (method === 'POST' && path === '/api/ausweis') return handleAusweis(request, env);

    // Everything else: serve the static site from /public.
    return env.ASSETS.fetch(request);
  },
};

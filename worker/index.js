// Cloudflare Worker for HESSEN RP
//
// Responsibilities:
//   1. Serve the static site from /public (via the ASSETS binding)
//   2. GET/POST /api/data/:type   — team / immobilien / regelwerk / fraktionen,
//      stored in Cloudflare KV so all visitors see the same data (no more
//      per-browser localStorage)
//   3. POST /api/upload-image     — Immobilien photos, stored in Cloudflare R2
//   4. POST /api/notruf           — admin panic button -> Discord webhook
//   5. POST /api/ausweis          — Bürgerausweis -> Discord webhook
//   6. POST /api/admin/verify     — checks the admin passphrase against env.ADMIN_KEY
//
// Required bindings/secrets (see README.md for exact setup steps):
//   - KV namespace  bound as DATA_KV
//   - R2 bucket     bound as IMAGES_BUCKET
//   - Secret        ADMIN_KEY               (your own admin passphrase)
//   - Secret        DISCORD_WEBHOOK_NOTRUF
//   - Secret        DISCORD_WEBHOOK_AUSWEISE

const DATA_TYPES = ['team', 'immobilien', 'regelwerk', 'fraktionen'];

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

function isAuthorized(request, env) {
  if (!env.ADMIN_KEY) return false;
  var auth = request.headers.get('Authorization') || '';
  var token = auth.replace(/^Bearer\s+/i, '');
  return !!token && token === env.ADMIN_KEY;
}

async function handleAdminVerify(request, env) {
  if (!env.ADMIN_KEY) return json({ error: 'ADMIN_KEY ist auf dem Server nicht konfiguriert.' }, 500);
  if (!isAuthorized(request, env)) return json({ error: 'Falsche Zugangsphrase.' }, 401);
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
  if (!isAuthorized(request, env)) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

  var list;
  try {
    list = await request.json();
  } catch (e) {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }
  if (!Array.isArray(list)) return json({ error: 'Erwartet ein Array.' }, 400);

  await env.DATA_KV.put(type, JSON.stringify(list));
  return json({ ok: true });
}

async function handleResetData(type, request, env) {
  if (DATA_TYPES.indexOf(type) === -1) return json({ error: 'Unbekannter Datentyp.' }, 404);
  if (!isAuthorized(request, env)) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);
  await env.DATA_KV.put(type, JSON.stringify(DEFAULTS[type]));
  return json({ ok: true });
}

async function handleUploadImage(request, env) {
  if (!isAuthorized(request, env)) return json({ error: 'Nicht autorisiert.' }, 401);
  if (!env.DATA_KV) return json({ error: 'DATA_KV ist auf dem Server nicht konfiguriert.' }, 500);

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

  var allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  var fileType = file.type || 'application/octet-stream';
  if (allowed.indexOf(fileType) === -1) return json({ error: 'Nur PNG, JPEG, WEBP oder GIF erlaubt.' }, 415);

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

async function handleNotruf(request, env) {
  var webhook = env.DISCORD_WEBHOOK_NOTRUF;
  if (!webhook) return json({ error: 'Notruf-Webhook ist auf dem Server nicht konfiguriert.' }, 500);

  var data;
  try { data = await request.json(); } catch (e) { return json({ error: 'Ungültige Anfrage.' }, 400); }

  var grund = String(data.grund || 'Kein Grund angegeben').slice(0, 500);
  var ort = String(data.ort || 'Nicht angegeben').slice(0, 200);
  var absender = String(data.absender || 'Unbekannt').slice(0, 100);

  var payload = {
    username: 'HESSEN RP · Notruf',
    embeds: [{
      title: '🚨 Admin-Notruf ausgelöst',
      color: 0xFF2A44,
      fields: [
        { name: 'Ausgelöst von', value: absender, inline: true },
        { name: 'Ort / Situation', value: ort, inline: true },
        { name: 'Grund', value: grund },
        { name: 'Zeitpunkt', value: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) },
      ],
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

async function handleAusweis(request, env) {
  var webhook = env.DISCORD_WEBHOOK_AUSWEISE;
  if (!webhook) return json({ error: 'Ausweis-Webhook ist auf dem Server nicht konfiguriert.' }, 500);

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

    if (method === 'POST' && path === '/api/admin/verify') return handleAdminVerify(request, env);

    var dataMatch = path.match(/^\/api\/data\/([a-z]+)$/);
    if (dataMatch) {
      var type = dataMatch[1];
      if (method === 'GET') return handleGetData(type, env);
      if (method === 'POST') return handleSaveData(type, request, env);
    }

    var resetMatch = path.match(/^\/api\/data\/([a-z]+)\/reset$/);
    if (resetMatch && method === 'POST') return handleResetData(resetMatch[1], request, env);

    if (method === 'POST' && path === '/api/upload-image') return handleUploadImage(request, env);

    var imageMatch = path.match(/^\/api\/image\/(.+)$/);
    if (imageMatch && method === 'GET') return handleGetImage(imageMatch[1], env);

    if (method === 'POST' && path === '/api/notruf') return handleNotruf(request, env);
    if (method === 'POST' && path === '/api/ausweis') return handleAusweis(request, env);

    // Everything else: serve the static site from /public.
    return env.ASSETS.fetch(request);
  },
};

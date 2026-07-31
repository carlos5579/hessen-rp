// Cloudflare Worker — serves the static HESSEN RP site from /public and
// handles the two API routes used by the admin Notruf button and the
// Ausweis-to-Discord button.
//
// IMPORTANT: the Discord webhook URLs are NEVER written in this file.
// They must be set as encrypted Variables (Secrets) on this Worker:
//   - DISCORD_WEBHOOK_NOTRUF
//   - DISCORD_WEBHOOK_AUSWEISE
// Dashboard: your Worker -> Settings -> Variables and Secrets -> Add.
// See README.md for the full walkthrough.

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleNotruf(request, env) {
  const webhook = env.DISCORD_WEBHOOK_NOTRUF;
  if (!webhook) {
    return json({ error: 'Notruf-Webhook ist auf dem Server nicht konfiguriert.' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const grund = String(data.grund || 'Kein Grund angegeben').slice(0, 500);
  const ort = String(data.ort || 'Nicht angegeben').slice(0, 200);
  const absender = String(data.absender || 'Unbekannt').slice(0, 100);

  const payload = {
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
    const discordRes = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!discordRes.ok) {
      return json({ error: 'Discord hat die Anfrage abgelehnt.' }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Verbindung zu Discord fehlgeschlagen.' }, 502);
  }
}

async function handleAusweis(request, env) {
  const webhook = env.DISCORD_WEBHOOK_AUSWEISE;
  if (!webhook) {
    return json({ error: 'Ausweis-Webhook ist auf dem Server nicht konfiguriert.' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const name = String(data.name || '—').slice(0, 100);
  const wohnort = String(data.wohnort || '—').slice(0, 100);
  const fraktion = String(data.fraktion || '—').slice(0, 100);
  const geburtsdatum = String(data.geburtsdatum || '—').slice(0, 50);
  const ausweisNr = String(data.ausweisNr || '—').slice(0, 50);
  const imageBase64 = typeof data.imageBase64 === 'string' ? data.imageBase64 : null;

  const embed = {
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

  const form = new FormData();
  form.append('payload_json', JSON.stringify({ username: 'HESSEN RP · Bürgeramt', embeds: [embed] }));

  if (imageBase64) {
    try {
      const base64 = imageBase64.split(',').pop();
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length > 8 * 1024 * 1024) {
        return json({ error: 'Bild zu groß.' }, 413);
      }
      form.append('file', new Blob([bytes], { type: 'image/png' }), 'ausweis.png');
    } catch (e) {
      // malformed image data — still send the embed without an attachment
    }
  }

  try {
    const discordRes = await fetch(webhook, { method: 'POST', body: form });
    if (!discordRes.ok) {
      return json({ error: 'Discord hat die Anfrage abgelehnt.' }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Verbindung zu Discord fehlgeschlagen.' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/notruf') {
      return handleNotruf(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/ausweis') {
      return handleAusweis(request, env);
    }

    // Everything else: serve the static site from /public.
    return env.ASSETS.fetch(request);
  },
};

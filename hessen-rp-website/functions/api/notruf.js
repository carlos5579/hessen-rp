// Cloudflare Pages Function — POST /api/notruf
// Forwards an admin emergency call to Discord via webhook.
// The webhook URL itself is NEVER in this file — it must be set as an
// encrypted Environment Variable in the Cloudflare Pages project settings,
// named DISCORD_WEBHOOK_NOTRUF. See README.md for setup steps.

export async function onRequestPost({ request, env }) {
  const webhook = env.DISCORD_WEBHOOK_NOTRUF;
  if (!webhook) {
    return new Response(JSON.stringify({ error: 'Notruf-Webhook ist auf dem Server nicht konfiguriert.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Ungültige Anfrage.' }), { status: 400 });
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
      return new Response(JSON.stringify({ error: 'Discord hat die Anfrage abgelehnt.' }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Verbindung zu Discord fehlgeschlagen.' }), { status: 502 });
  }
}

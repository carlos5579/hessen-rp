// Cloudflare Pages Function — POST /api/ausweis
// Forwards a generated Bürgerausweis (with image) to Discord via webhook.
// The webhook URL itself is NEVER in this file — it must be set as an
// encrypted Environment Variable in the Cloudflare Pages project settings,
// named DISCORD_WEBHOOK_AUSWEISE. See README.md for setup steps.

export async function onRequestPost({ request, env }) {
  const webhook = env.DISCORD_WEBHOOK_AUSWEISE;
  if (!webhook) {
    return new Response(JSON.stringify({ error: 'Ausweis-Webhook ist auf dem Server nicht konfiguriert.' }), {
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
      // 8 MB safety cap, well under Discord's webhook attachment limit
      if (bytes.length > 8 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Bild zu groß.' }), { status: 413 });
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      form.append('file', blob, 'ausweis.png');
    } catch (e) {
      // if the image is malformed, still send the embed without the attachment
    }
  }

  try {
    const discordRes = await fetch(webhook, { method: 'POST', body: form });
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

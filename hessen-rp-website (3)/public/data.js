// HESSEN RP - shared data client.
// Talks to the Worker's KV-backed API so all visitors see the same data
// (team, immobilien, regelwerk, fraktionen), instead of per-browser localStorage.

function hessenrpAdminKey() {
  try { return sessionStorage.getItem('hessenrp_admin_key') || ''; } catch (e) { return ''; }
}

async function hessenrpApiGet(type) {
  try {
    const res = await fetch('/api/data/' + type);
    if (!res.ok) throw new Error('bad response');
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function hessenrpApiSave(type, list) {
  try {
    const res = await fetch('/api/data/' + type, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + hessenrpAdminKey(),
      },
      body: JSON.stringify(list),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Speichern fehlgeschlagen.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpApiReset(type) {
  try {
    const res = await fetch('/api/data/' + type + '/reset', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + hessenrpAdminKey() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Zurücksetzen fehlgeschlagen.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

function getTeamData() { return hessenrpApiGet('team'); }
function getImmobilienData() { return hessenrpApiGet('immobilien'); }
function getRegelwerkData() { return hessenrpApiGet('regelwerk'); }
function getFraktionenData() { return hessenrpApiGet('fraktionen'); }

function saveTeamData(list) { return hessenrpApiSave('team', list); }
function saveImmobilienData(list) { return hessenrpApiSave('immobilien', list); }
function saveRegelwerkData(list) { return hessenrpApiSave('regelwerk', list); }
function saveFraktionenData(list) { return hessenrpApiSave('fraktionen', list); }

function resetTeamData() { return hessenrpApiReset('team'); }
function resetImmobilienData() { return hessenrpApiReset('immobilien'); }
function resetRegelwerkData() { return hessenrpApiReset('regelwerk'); }
function resetFraktionenData() { return hessenrpApiReset('fraktionen'); }

async function hessenrpUploadImage(file) {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + hessenrpAdminKey() },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Upload fehlgeschlagen.' };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpVerifyAdminKey(key) {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

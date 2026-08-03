// HESSEN RP - shared data client.
// Talks to the Worker's KV-backed API so all visitors see the same data
// (team, immobilien, regelwerk, fraktionen), instead of per-browser localStorage.

function hessenrpToken() {
  try { return sessionStorage.getItem('hessenrp_session_token') || ''; } catch (e) { return ''; }
}
function hessenrpSessionInfo() {
  try {
    const raw = sessionStorage.getItem('hessenrp_session_info');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function hessenrpSetSession(token, info) {
  try {
    sessionStorage.setItem('hessenrp_session_token', token);
    sessionStorage.setItem('hessenrp_session_info', JSON.stringify(info));
  } catch (e) { /* storage unavailable */ }
}
function hessenrpClearSession() {
  try {
    sessionStorage.removeItem('hessenrp_session_token');
    sessionStorage.removeItem('hessenrp_session_info');
  } catch (e) { /* storage unavailable */ }
}
function hessenrpAuthHeader() {
  return { 'Authorization': 'Bearer ' + hessenrpToken() };
}

async function hessenrpLogin(username, password) {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Anmeldung fehlgeschlagen.' };
    hessenrpSetSession(data.token, { username: data.username, isSuperAdmin: data.isSuperAdmin, permissions: data.permissions || {} });
    return { ok: true, username: data.username, isSuperAdmin: data.isSuperAdmin, permissions: data.permissions };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
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

async function hessenrpApiSave(type, list, actionLabel) {
  try {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, hessenrpAuthHeader());
    if (actionLabel) headers['X-Action-Label'] = actionLabel;
    const res = await fetch('/api/data/' + type, {
      method: 'POST',
      headers,
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
      headers: hessenrpAuthHeader(),
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
function getServerlinksData() { return hessenrpApiGet('serverlinks'); }

function saveTeamData(list, label) { return hessenrpApiSave('team', list, label); }
function saveImmobilienData(list, label) { return hessenrpApiSave('immobilien', list, label); }
function saveRegelwerkData(list, label) { return hessenrpApiSave('regelwerk', list, label); }
function saveFraktionenData(list, label) { return hessenrpApiSave('fraktionen', list, label); }
function saveServerlinksData(list, label) { return hessenrpApiSave('serverlinks', list, label); }

function resetTeamData() { return hessenrpApiReset('team'); }
function resetImmobilienData() { return hessenrpApiReset('immobilien'); }
function resetRegelwerkData() { return hessenrpApiReset('regelwerk'); }
function resetFraktionenData() { return hessenrpApiReset('fraktionen'); }
function resetServerlinksData() { return hessenrpApiReset('serverlinks'); }

async function hessenrpUploadImage(file) {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: hessenrpAuthHeader(),
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Upload fehlgeschlagen.' };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpRobloxLookup(username) {
  try {
    const res = await fetch('/api/roblox-lookup', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, hessenrpAuthHeader()),
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Suche fehlgeschlagen.' };
    return data;
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpGetStrafen(robloxId) {
  try {
    const res = await fetch('/api/roblox-strafen/' + robloxId, { headers: hessenrpAuthHeader() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function hessenrpAddStrafe(robloxId, typ, grund, username, dauer) {
  try {
    const res = await fetch('/api/roblox-strafen/' + robloxId, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, hessenrpAuthHeader()),
      body: JSON.stringify({ typ, grund, username, dauer }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Speichern fehlgeschlagen.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpGetAdmins() {
  try {
    const res = await fetch('/api/admin/accounts', { headers: hessenrpAuthHeader() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function hessenrpSaveAdmin(account) {
  try {
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, hessenrpAuthHeader()),
      body: JSON.stringify(account),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Speichern fehlgeschlagen.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

async function hessenrpDeleteAdmin(id) {
  try {
    const res = await fetch('/api/admin/accounts/delete', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, hessenrpAuthHeader()),
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Löschen fehlgeschlagen.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Server nicht erreichbar.' };
  }
}

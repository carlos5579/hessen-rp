// HESSEN RP - shared content store
// Default data lives here. The admin panel writes overrides to localStorage.
// Public pages always check localStorage first, then fall back to these defaults.

window.HESSENRP_DEFAULTS = {
  team: [
    { id:'t1', name:'Jonas', rolle:'Serverleitung', rang:'Owner', seit:'2024', bio:'Verantwortlich für Ausrichtung, Team und technische Infrastruktur.' },
    { id:'t2', name:'Lea', rolle:'Co-Leitung', rang:'Co-Owner', seit:'2024', bio:'Kümmert sich um Community-Management und Events.' },
    { id:'t3', name:'Finn', rolle:'Teamleitung', rang:'Head-Admin', seit:'2025', bio:'Leitet das Support- und Moderationsteam.' },
    { id:'t4', name:'Mara', rolle:'Fraktionsbetreuung', rang:'Admin', seit:'2025', bio:'Ansprechpartnerin für Polizei- und Rettungsdienst-Fraktionen.' },
    { id:'t5', name:'Elias', rolle:'Entwicklung', rang:'Developer', seit:'2025', bio:'Baut und pflegt Server-Skripte und Tools.' },
    { id:'t6', name:'Nora', rolle:'Support', rang:'Moderator', seit:'2026', bio:'Erste Anlaufstelle bei Fragen und Problemen im Discord.' },
  ],
  immobilien: [
    { id:'i1', titel:'Altbauwohnung Innenstadt', stadt:'Frankfurt am Main', preis:185000, zimmer:3, flaeche:92, status:'verfügbar', beschreibung:'Helle Altbauwohnung mit Balkon, zentrale Lage.' },
    { id:'i2', titel:'Reihenhaus am Stadtrand', stadt:'Wiesbaden', preis:265000, zimmer:5, flaeche:130, status:'verfügbar', beschreibung:'Familienfreundliches Reihenhaus mit kleinem Garten.' },
    { id:'i3', titel:'Loft im Industriegebiet', stadt:'Kassel', preis:210000, zimmer:2, flaeche:78, status:'reserviert', beschreibung:'Modernes Loft mit offener Küche und hohen Decken.' },
    { id:'i4', titel:'Stadtvilla mit Garage', stadt:'Darmstadt', preis:420000, zimmer:6, flaeche:210, status:'verkauft', beschreibung:'Repräsentative Villa mit Doppelgarage und großem Grundstück.' },
  ]
};

function hessenrpLoad(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* storage unavailable or corrupt, use fallback */ }
  return fallback;
}
function hessenrpSave(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ return false; }
}
function getTeamData(){ return hessenrpLoad('hessenrp_team', window.HESSENRP_DEFAULTS.team); }
function getImmobilienData(){ return hessenrpLoad('hessenrp_immobilien', window.HESSENRP_DEFAULTS.immobilien); }
function saveTeamData(list){ return hessenrpSave('hessenrp_team', list); }
function saveImmobilienData(list){ return hessenrpSave('hessenrp_immobilien', list); }

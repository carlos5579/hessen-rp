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
  ],
  regelwerk: [
    { id:'r1',  section:'§1', sectionTitle:'Allgemeines', num:'§1.1', title:'Geltungsbereich', text:'Mit dem Betreten des Servers akzeptiert jeder Spieler automatisch dieses Regelwerk.' },
    { id:'r2',  section:'§1', sectionTitle:'Allgemeines', num:'§1.2', title:'Weisungsrecht', text:'Anweisungen des Serverteams ist Folge zu leisten. Diskussionen über Team-Entscheidungen sind außerhalb laufender RP-Szenen zu klären.' },
    { id:'r3',  section:'§1', sectionTitle:'Allgemeines', num:'§1.3', title:'Änderungen', text:'Das Team behält sich vor, das Regelwerk jederzeit anzupassen. Änderungen werden im Discord bekanntgegeben.' },
    { id:'r4',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.1', title:'Realistisches Verhalten', text:'Handlungen müssen im Rahmen des Roleplays nachvollziehbar und realistisch sein.' },
    { id:'r5',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.2', title:'Fear-RP', text:'Bei ernsthafter Bedrohung deiner Figur ist angemessene Angst zu zeigen — kein sinnloses Risiko.' },
    { id:'r6',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.3', title:'New-Life-Rule (NLR)', text:'Nach dem Tod deines Charakters erinnerst du dich nicht mehr an die Umstände, die dazu geführt haben.' },
    { id:'r7',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.4', title:'Kein RDM / VDM', text:'Random-Death-Match und Vehicle-Death-Match ohne vorangegangenes Roleplay sind untersagt.' },
    { id:'r8',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.5', title:'Meta-Gaming', text:'Wissen, das dein Charakter im RP nicht haben kann, darf nicht verwendet werden.' },
    { id:'r9',  section:'§2', sectionTitle:'Verhalten im Roleplay', num:'§2.6', title:'Power-Gaming', text:'Der Gegenseite muss immer eine realistische Reaktionsmöglichkeit gelassen werden.' },
    { id:'r10', section:'§3', sectionTitle:'Fraktionen & Charaktere', num:'§3.1', title:'Fraktionsregeln', text:'Jede Fraktion (Polizei, Rettungsdienst, etc.) hat ein eigenes internes Regelwerk zusätzlich zu diesem hier.' },
    { id:'r11', section:'§3', sectionTitle:'Fraktionen & Charaktere', num:'§3.2', title:'Charakteranzahl', text:'Pro Spieler ist grundsätzlich nur ein aktiver Charakter erlaubt. Ausnahmen nur nach Rücksprache mit dem Team.' },
    { id:'r12', section:'§3', sectionTitle:'Fraktionen & Charaktere', num:'§3.3', title:'Namensgebung', text:'Charakternamen müssen realistisch sein — keine Meme- oder Promi-Namen.' },
    { id:'r13', section:'§4', sectionTitle:'Kommunikation', num:'§4.1', title:'Umgangston', text:'Beleidigungen, Diskriminierung und Hassrede führen zum sofortigen Ausschluss vom Server.' },
    { id:'r14', section:'§4', sectionTitle:'Kommunikation', num:'§4.2', title:'Out-of-Character (OOC)', text:'OOC-Kommunikation ist klar vom Roleplay zu trennen, z. B. durch Klammern (( )).' },
    { id:'r15', section:'§4', sectionTitle:'Kommunikation', num:'§4.3', title:'Werbung', text:'Werbung für andere Server oder Communitys ist ohne Absprache untersagt.' },
    { id:'r16', section:'§5', sectionTitle:'Strafen & Einspruch', num:'§5.1', title:'Verwarnungssystem', text:'Verstöße werden gestaffelt geahndet: Verwarnung, Kick, temporärer Bann, permanenter Bann.' },
    { id:'r17', section:'§5', sectionTitle:'Strafen & Einspruch', num:'§5.2', title:'Einspruch', text:'Gegen Team-Entscheidungen kann über die dafür vorgesehenen Kanäle im Discord Einspruch eingelegt werden.' },
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
function getRegelwerkData(){ return hessenrpLoad('hessenrp_regelwerk', window.HESSENRP_DEFAULTS.regelwerk); }
function saveTeamData(list){ return hessenrpSave('hessenrp_team', list); }
function saveImmobilienData(list){ return hessenrpSave('hessenrp_immobilien', list); }
function saveRegelwerkData(list){ return hessenrpSave('hessenrp_regelwerk', list); }

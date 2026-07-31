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
  fraktionen: [
    { id:'f1', name:'Polizei Hessen', kuerzel:'LPH', typ:'Behörde', leitung:'Mara', status:'offen', slots:'12', beschreibung:'Zuständig für Recht und Ordnung im gesamten Bundesland.', raenge:'Anwärter, Polizeimeister, Polizeiobermeister, Kommissar, Revierleiter' },
    { id:'f2', name:'Rettungsdienst Hessen', kuerzel:'RDH', typ:'Behörde', leitung:'Nora', status:'offen', slots:'10', beschreibung:'Rettungssanitäter und Notärzte für den gesamten Server.', raenge:'Praktikant, Rettungssanitäter, Notfallsanitäter, Leitender Notarzt' },
    { id:'f3', name:'Stadtverwaltung', kuerzel:'SV', typ:'Behörde', leitung:'Jonas', status:'bewerbung', slots:'6', beschreibung:'Verwaltet Immobilien, Gewerbe und städtische Angelegenheiten.', raenge:'Sachbearbeiter, Amtsleiter, Bürgermeister' },
    { id:'f4', name:'Hafenring-Familie', kuerzel:'HRF', typ:'Kriminell', leitung:'—', status:'geschlossen', slots:'8', beschreibung:'Eine der einflussreichsten kriminellen Organisationen in Frankfurt.', raenge:'Prospect, Mitglied, Vertrauter, Anführer' },
    { id:'f5', name:'Wirtschaftsverband Hessen', kuerzel:'WVH', typ:'Wirtschaft', leitung:'Elias', status:'offen', slots:'—', beschreibung:'Dachverband für Unternehmer, Läden und Gewerbetreibende.', raenge:'Mitglied, Vorstand' },
  ],
  regelwerk: [
    { id:'r1',  section:'§1', sectionTitle:'Allgemeines', num:'§1.1', title:'Geltungsbereich', text:'Mit dem Betreten des Servers akzeptiert jeder Spieler automatisch dieses Regelwerk.' },
    { id:'r2',  section:'§1', sectionTitle:'Allgemeines', num:'§1.2', title:'Weisungsrecht', text:'Anweisungen des Serverteams sind Folge zu leisten. Diskussionen über Teamentscheidungen sind außerhalb laufender RP-Situationen und vorzugsweise im Support zu führen.' },
    { id:'r3',  section:'§1', sectionTitle:'Allgemeines', num:'§1.3', title:'Fairplay', text:'Jeder Spieler ist verpflichtet, zum positiven Spielerlebnis der Community beizutragen.' },
    { id:'r4',  section:'§1', sectionTitle:'Allgemeines', num:'§1.4', title:'Regelkenntnis', text:'Unwissenheit über Regeln schützt nicht vor Sanktionen.' },

    { id:'r5',  section:'§2', sectionTitle:'Roleplay-Grundsätze', num:'§2.1', title:'Realistisches Roleplay (RRP)', text:'Alle Handlungen müssen möglichst realistisch dargestellt werden.<br>Nicht erlaubt sind unter anderem:<br>• Unrealistische Verletzungen ignorieren<br>• Unrealistische Fahrzeugnutzung<br>• Unrealistische Fluchtmöglichkeiten<br>• Unrealistische Kommunikation' },
    { id:'r6',  section:'§2', sectionTitle:'Roleplay-Grundsätze', num:'§2.2', title:'FearRP', text:'Spieler müssen auf lebensbedrohliche Situationen angemessen reagieren.<br>Beispiele:<br>✅ Hände heben, wenn mehrere bewaffnete Personen auf dich zielen.<br>❌ Bewaffneten Tätern gegenüber grundlos provozierend auftreten.' },
    { id:'r7',  section:'§2', sectionTitle:'Roleplay-Grundsätze', num:'§2.3', title:'Value of Life (VoL)', text:'Das eigene Leben und das Leben anderer Charaktere ist stets zu schützen. Selbstmörderische oder lebensmüde Handlungen ohne RP-Hintergrund sind untersagt.' },

    { id:'r8',  section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.1', title:'FailRP', text:'FailRP beschreibt unrealistische oder regelwidrige Handlungen.<br>Beispiele:<br>• Von hohen Gebäuden springen und weiterlaufen<br>• Schwere Unfälle ignorieren<br>• Unrealistische Fahrzeugmanöver' },
    { id:'r9',  section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.2', title:'PowerRP', text:'Kein Spieler darf Handlungen erzwingen.<br>❌ „Ich schlage dich bewusstlos.“<br>✅ „Ich versuche, dich bewusstlos zu schlagen.“' },
    { id:'r10', section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.3', title:'Meta-Gaming', text:'Informationen außerhalb des Spiels dürfen nicht im RP genutzt werden.<br>Beispiele:<br>• Discord-Nachrichten<br>• Streams<br>• Private Nachrichten' },
    { id:'r11', section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.4', title:'Combat Logging', text:'Das absichtliche Verlassen des Spiels während einer RP-Situation ist verboten.' },
    { id:'r12', section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.5', title:'RDM (Random Deathmatch)', text:'Das grundlose Verletzen oder Töten anderer Spieler ist verboten.' },
    { id:'r13', section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.6', title:'VDM (Vehicle Deathmatch)', text:'Das absichtliche Anfahren oder Überfahren von Spielern ohne RP-Hintergrund ist verboten.' },
    { id:'r14', section:'§3', sectionTitle:'Verbotene RP-Handlungen', num:'§3.7', title:'Trolling', text:'Das absichtliche Stören von RP-Situationen ist verboten.' },

    { id:'r15', section:'§4', sectionTitle:'Kommunikation', num:'§4.1', title:'Sprachverhalten', text:'Folgende Inhalte sind untersagt:<br>• Beleidigungen<br>• Diskriminierung<br>• Rassismus<br>• Sexismus<br>• Extremistische Inhalte' },
    { id:'r16', section:'§4', sectionTitle:'Kommunikation', num:'§4.2', title:'Voice Chat', text:'Verboten sind:<br>• Earrape<br>• Soundboards<br>• Störgeräusche<br>• Absichtliches Überschreien anderer Spieler' },
    { id:'r17', section:'§4', sectionTitle:'Kommunikation', num:'§4.3', title:'RP-Kommunikation', text:'Während RP-Situationen muss die Kommunikation zur Rolle passen.' },

    { id:'r18', section:'§5', sectionTitle:'Einsatzkräfte', num:'§5.1', title:'Allgemeines', text:'Polizei, Feuerwehr und Rettungsdienst haben ihre Rollen realistisch auszuführen.' },
    { id:'r19', section:'§5', sectionTitle:'Einsatzkräfte', num:'§5.2', title:'Dienstmissbrauch', text:'Nicht erlaubt sind:<br>• Grundlose Festnahmen<br>• Missbrauch von Sonderrechten<br>• Zweckentfremdung von Einsatzfahrzeugen' },
    { id:'r20', section:'§5', sectionTitle:'Einsatzkräfte', num:'§5.3', title:'Korruption', text:'Korruption ist nur erlaubt, wenn dies durch die Serverleitung ausdrücklich freigegeben wurde.' },

    { id:'r21', section:'§6', sectionTitle:'Kriminalität', num:'§6.1', title:'Straftaten', text:'Straftaten müssen einen nachvollziehbaren RP-Hintergrund besitzen.' },
    { id:'r22', section:'§6', sectionTitle:'Kriminalität', num:'§6.2', title:'Geiselnahmen', text:'Geiseln sind realistisch zu behandeln. Unnötige Gewaltanwendung ist untersagt.' },
    { id:'r23', section:'§6', sectionTitle:'Kriminalität', num:'§6.3', title:'Überfälle', text:'Überfälle müssen realistisch und fair durchgeführt werden. Betroffene Spieler müssen angemessen reagieren können.' },

    { id:'r24', section:'§7', sectionTitle:'Fahrzeuge', num:'§7.1', title:'Realistische Fahrweise', text:'Spieler haben ihre Fahrzeuge situationsgerecht zu führen.' },
    { id:'r25', section:'§7', sectionTitle:'Fahrzeuge', num:'§7.2', title:'Unrealistisches Fahren', text:'Verboten sind:<br>• Dauerhaftes Offroad-Fahren mit ungeeigneten Fahrzeugen<br>• Unrealistische Sprünge<br>• Absichtliche Fahrzeugzerstörung' },
    { id:'r26', section:'§7', sectionTitle:'Fahrzeuge', num:'§7.3', title:'Fahrzeugspam', text:'Das absichtliche Spawnen großer Fahrzeugmengen ist untersagt.' },

    { id:'r27', section:'§8', sectionTitle:'New-Life-Regel (NLR)', num:'§8', title:'New-Life-Regel (NLR)', text:'Nach dem Tod gilt:<br>• Die direkte Situation gilt als vergessen.<br>• Eine sofortige Rückkehr zum Einsatzort ist untersagt.<br>• Rachehandlungen aufgrund des vorherigen Todes sind verboten.<br>Empfohlene Sperrzeit: 15 Minuten.' },

    { id:'r28', section:'§9', sectionTitle:'Support-Regelungen', num:'§9.1', title:'Supportpflicht', text:'Wer von einem Teammitglied in den Support gebeten wird, hat dieser Aufforderung zeitnah nachzukommen.' },
    { id:'r29', section:'§9', sectionTitle:'Support-Regelungen', num:'§9.2', title:'Supportverhalten', text:'Während eines Supportgesprächs sind folgende Dinge untersagt:<br>• Lügen<br>• Beleidigungen<br>• Unterbrechungen<br>• Verlassen des Supports ohne Erlaubnis' },

    { id:'r30', section:'§10', sectionTitle:'Sanktionen', num:'§10', title:'Sanktionen', text:'Verstöße gegen dieses Regelwerk können entsprechend des Kick-, Verwarnungs- und Bannregelwerks sanktioniert werden.<br>Mögliche Maßnahmen:<br>• Hinweis<br>• Kick<br>• Verwarnung<br>• Temporärer Bann<br>• Permanenter Bann<br>Die genaue Sanktion richtet sich nach Schwere, Häufigkeit und Vorsatz des Verstoßes.' },

    { id:'r31', section:'§11', sectionTitle:'Schlussbestimmungen', num:'§11', title:'Schlussbestimmungen', text:'Die Serverleitung behält sich das Recht vor, dieses Regelwerk jederzeit anzupassen oder zu erweitern. In nicht ausdrücklich geregelten Fällen entscheidet die Serverleitung nach bestem Wissen und Gewissen. Das Ziel des Servers ist ein realistisches, faires und respektvolles Roleplay-Erlebnis für alle Spieler.' },
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
function getFraktionenData(){ return hessenrpLoad('hessenrp_fraktionen', window.HESSENRP_DEFAULTS.fraktionen); }
function saveTeamData(list){ return hessenrpSave('hessenrp_team', list); }
function saveImmobilienData(list){ return hessenrpSave('hessenrp_immobilien', list); }
function saveRegelwerkData(list){ return hessenrpSave('hessenrp_regelwerk', list); }
function saveFraktionenData(list){ return hessenrpSave('hessenrp_fraktionen', list); }

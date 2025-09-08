/** XativaBot – App (alergias con diálogo + recomendaciones; salud; temporadas ES; voz estable; i18n) */

// ===== DOM =====
const chatMessages   = document.getElementById('chat-messages');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');
const voiceBtn       = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const suggestionChips= document.querySelectorAll('.chip');

// ===== Estado =====
let currentLanguage = 'es';
let recognition = null;
let speechSynthesisObj = window.speechSynthesis;
let isListening = false;

let voicesReady = false;
let availableVoices = [];
let userInteracted = false;
let ttsUnlocked = false;

let MENU = { dishes: [] };
let LORE = { facts: [] };
let SEASON = { meta:{country:"ES",months:[]}, produce: [] };

let USER = {
  allergies: [],
  preferences: [],
  lastDish: null,
  preferredRestaurant: null // 'les_corts' | 'gracia' | 'sant_antoni'
};

// Diálogo controlado
let DIALOG = { awaiting: null }; // 'allergy' | null

// ===== i18n UI =====
const I18N = {
  en:{
    welcome:"Welcome to Xativa! I'm AlexBot, your culinary sidekick. Ask me about ingredients, techniques, traditions—or book a table.",
    ask_allergies:"Any allergies or diet preferences?",
    ask_allergies_specific:"Great—what allergy or diet should I consider? (e.g., gluten, shellfish, milk, vegan, vegetarian)",
    menu_intro:"Here are a few highlights from our menu:",
    rec_ready:"Based on your preferences, I recommend:",
    rec_need_info:"Tell me allergies or diet preferences and I’ll tailor suggestions.",
    saved_prefs:"Got it — I’ll remember that.",
    no_match:"I couldn’t find a safe match. Want gluten-free or vegetarian options?",
    lore_intro:"Did you know?",
    reservation_prompt:"Great. Choose the restaurant and fill the details:",
    allergies_saved:"Allergies/preferences saved.",
    say_more:"What are you in the mood for today?",
    unknown:"Thanks for your message. How else can I help?",
    and:"and",
    res_thanks:"✅ Reservation received.",
    res_offline:"📌 You’re offline. It will sync when back.",
    pick_restaurant:"Please select the restaurant: Les Corts, Gràcia or Sant Antoni.",
    locations:"We have three locations in Barcelona:",
    diet_intro:"Chef mode on 👨‍🍳 — tell me your needs and I’ll curate the menu:",
    diet_cta:"Select one or more and confirm:",
    diet_confirm_btn:"Save & suggest",
    diet_none_btn:"No restrictions",
    diet_saved_fun:(list)=>`Noted: ${list}. Let me plate up some ideas…`,
    diet_saved_none:"Perfect, no restrictions — my favourite kind of challenge. Let’s find you something delicious…",
    diet_humor_ping:"Allergies noted. I’ll steer the paella like a pro.",
    health_preface:"Quick culinary-nutrition brief:",
    health_disclaimer:"This is general information, not medical advice.",
    season_now:"In season now:",
    season_of:"Season for",
    month_names:["January","February","March","April","May","June","July","August","September","October","November","December"]
  },
  es:{
    welcome:"¡Bienvenido a Xativa! Soy AlexBot, tu cómplice culinario. Pregúntame por ingredientes, técnicas, tradiciones… o haz una reserva.",
    ask_allergies:"¿Tienes alergias o preferencias de dieta?",
    ask_allergies_specific:"Genial — ¿qué alergia o dieta debo considerar? (p. ej., gluten, marisco, leche, vegano, vegetariano)",
    menu_intro:"Estos son algunos destacados de la carta:",
    rec_ready:"Según lo que me cuentas, te recomiendo:",
    rec_need_info:"Cuéntame alergias o preferencias y afino las sugerencias.",
    saved_prefs:"¡Anotado! Lo recordaré.",
    no_match:"No encontré un plato seguro. ¿Te enseño opciones sin gluten o vegetarianas?",
    lore_intro:"¿Sabías que…?",
    reservation_prompt:"Perfecto. Elige restaurante y completa los datos:",
    allergies_saved:"Alergias/preferencias guardadas.",
    say_more:"¿Qué te apetece hoy?",
    unknown:"Gracias por tu mensaje. ¿En qué más puedo ayudarte?",
    and:"y",
    res_thanks:"✅ Reserva recibida.",
    res_offline:"📌 Estás sin conexión. Se enviará al volver.",
    pick_restaurant:"Selecciona el restaurante: Les Corts, Gràcia o Sant Antoni.",
    locations:"Tenemos tres locales en Barcelona:",
    diet_intro:"Modo chef activado 👨‍🍳 — dime tus necesidades y te afino la carta:",
    diet_cta:"Elige una o varias y confirma:",
    diet_confirm_btn:"Guardar y sugerir",
    diet_none_btn:"Sin restricciones",
    diet_saved_fun:(list)=>`Anotado: ${list}. Ya estoy pensando en un par de platos que te van a gustar…`,
    diet_saved_none:"Perfecto, sin restricciones — me encantan los retos sabrosos. Vamos con unas sugerencias…",
    diet_humor_ping:"Alergias registradas. Llevaré la paella con mano experta.",
    health_preface:"Apunte culinario-nutricional:",
    health_disclaimer:"Información general; no sustituye consejo médico.",
    season_now:"Ahora en temporada:",
    season_of:"Temporada de",
    month_names:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
  },
  ca:{
    welcome:"Benvingut a Xativa! Sóc l’AlexBot, el teu còmplice culinari. Pregunta’m per ingredients, tècniques, tradicions… o fes una reserva.",
    ask_allergies:"Tens alguna al·lèrgia o preferència de dieta?",
    ask_allergies_specific:"Perfecte — quina al·lèrgia o dieta he de tindre en compte? (p. ex., gluten, marisc, llet, vegà, vegetarià)",
    menu_intro:"Aquests són alguns destacats de la carta:",
    rec_ready:"Segons el que m’has dit, et recomane:",
    rec_need_info:"Digue’m al·lèrgies o preferències i afinaré les propostes.",
    saved_prefs:"Anotat! Ho recordaré.",
    no_match:"No he trobat cap plat segur. Vols opcions sense gluten o vegetarianes?",
    lore_intro:"Sabies que…?",
    reservation_prompt:"Genial. Tria el restaurant i completa les dades:",
    allergies_saved:"Al·lèrgies/preferències desades.",
    say_more:"Què et ve de gust avui?",
    unknown:"Gràcies pel teu missatge. En què més et puc ajudar?",
    and:"i",
    res_thanks:"✅ Reserva rebuda.",
    res_offline:"📌 Fora de línia. S’enviarà quan torne.",
    pick_restaurant:"Selecciona el restaurant: Les Corts, Gràcia o Sant Antoni.",
    locations:"Tenim tres locals a Barcelona:",
    diet_intro:"Mode xef activat 👨‍🍳 — digue’m les teues necessitats i t’afinaré la carta:",
    diet_cta:"Tria una o diverses i confirma:",
    diet_confirm_btn:"Desar i suggerir",
    diet_none_btn:"Sense restriccions",
    diet_saved_fun:(list)=>`Anotat: ${list}. Ja tinc un parell de plats en ment…`,
    diet_saved_none:"Perfecte, sense restriccions — m’encanten els reptes saborosos. Anem amb suggeriments…",
    diet_humor_ping:"Al·lèrgies registrades. Portaré la paella amb mà mestra.",
    health_preface:"Apunt culinari-nutricional:",
    health_disclaimer:"Informació general; no substitueix consell mèdic.",
    season_now:"Ara en temporada:",
    season_of:"Temporada de",
    month_names:["Gener","Febrer","Març","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"]
  }
};

// ===== Palabras clave / Intents =====
const KEYWORDS = {
  es:{
    greet:["hola","buenas","buenos días","buenas tardes","buenas noches"],
    menu:["menú","carta","platos","comida","recomendación"],
    rec:["recomienda","recomiéndame","sugerencia","que comer","qué como"],
    allergy:["alergia","alergias","dietéticas","dieta","restricción","restricciones"],
    lore:["historia","mito","tradición","origen","leyenda"],
    reserve:["reserva","reservar","booking","mesa","mesa para"],
    restaurant:["les corts","corts","gracia","gràcia","sant antoni","muntaner","bordeus","torrent d’en vidalet","torrent d'en vidalet","vidalet"],
    ingredient:["háblame de","hablame de","qué es","que es","beneficios de","temporada de","historia de","sobre","especia","especias","ingrediente","ingredientes"],
    health:["colesterol","triglicéridos","azúcar","diabetes","hipertensión","sodio","salud","cardio"],
    seasonWords:["temporada","de temporada","está de temporada","que hay de temporada","qué hay de temporada"]
  },
  en:{
    greet:["hello","hi","hey"],
    menu:["menu","card","dishes","food","recommendation"],
    rec:["recommend","suggest","what should i eat"],
    allergy:["allergy","allergies","dietary","diet","restriction","intolerance"],
    lore:["history","myth","tradition","origin","legend"],
    reserve:["reserve","reservation","book","table"],
    restaurant:["les corts","gracia","gràcia","sant antoni","muntaner","bordeus","torrent d'en vidalet","vidalet"],
    ingredient:["tell me about","what is","benefits of","season of","history of","about","spice","spices","ingredient","ingredients"],
    health:["cholesterol","triglycerides","sugar","diabetes","hypertension","sodium","health","cardio"],
    seasonWords:["seasonal","in season","what’s in season","whats in season","what is in season","season now"]
  },
  ca:{
    greet:["hola","bones"],
    menu:["menú","carta","plats","menjar","recomanació"],
    rec:["recomana","recomanació","què menge","que menjar"],
    allergy:["al·lèrgia","al·lèrgies","dietètiques","dieta","restricció","intolerància"],
    lore:["història","mite","tradició","origen","llegenda"],
    reserve:["reserva","reservar","taula"],
    restaurant:["les corts","gràcia","gracia","sant antoni","muntaner","bordeus","torrent d’en vidalet","torrent d'en vidalet","vidalet"],
    ingredient:["parla'm de","què és","que es","beneficis de","temporada de","història de","sobre","espècia","espècies","ingredient","ingredients"],
    health:["colesterol","triglicèrids","sucre","diabetis","hipertensió","sodi","salut","cardio"],
    seasonWords:["de temporada","està de temporada","què hi ha de temporada","temporada ara"]
  }
};

// ===== Dataset local mínimo (fallback offline) =====
const CULINARY = {
  es: {
    "arroz": { summary:"Base de la paella; variedades bomba o senia absorben caldo sin romperse.", techniques:["Sofreír y nacarar","Hervor y reposo"], pairings:["Azafrán","Pimentón"], nutrition:{energy_kcal:346,protein_g:6.7,fat_g:0.9,carbs_g:76}, culture:"El ‘socarrat’ es apreciado." },
    "azafrán": { summary:"Estigmas del Crocus sativus; aroma floral y color dorado.", techniques:["Tostado leve","Infusión"], pairings:["Arroz","Pescado"], nutrition:{energy_kcal:310,protein_g:11,fat_g:6,carbs_g:65}, culture:"Uso mediterráneo ancestral." },
    "aceite de oliva": { summary:"Grasa matriz mediterránea; AOVE con frutado, amargor y picor.", techniques:["Sofritos","Emulsiones"], pairings:["Tomate","Ajo"], nutrition:{energy_kcal:884,protein_g:0,fat_g:100,carbs_g:0}, culture:"Variedades alteran el perfil." }
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  try { document.hidden ? speechSynthesisObj.pause() : speechSynthesisObj.resume(); } catch {}
});
['click','keydown','touchstart','touchend','pointerdown','focusin'].forEach(evt => {
  document.addEventListener(evt, () => { if (!userInteracted){ userInteracted = true; tryUnlockTTS(); } }, { passive: true });
});

async function initApp(){
  loadMemory();
  setupEventListeners();
  setupSpeechRecognition();
  checkBrowserSupport();
  await ensureVoicesReady();
  await loadData();
  addMessageToChat(I18N[currentLanguage].welcome, 'bot');
}

// ===== Data / Memory =====
async function loadData(){
  try{
    const [menuRes,loreRes,seasonRes] = await Promise.all([
      fetch('/data/menu.json'),
      fetch('/data/lore.json'),
      fetch('/data/season_es.json')
    ]);
    MENU   = await menuRes.json();
    LORE   = await loreRes.json();
    SEASON = await seasonRes.json();
  }catch(e){ console.warn('Data offline:', e); }
}
function loadMemory(){ try{ const raw=localStorage.getItem('xativabot-user'); if(raw) USER=JSON.parse(raw);}catch{} }
function saveMemory(){ try{ localStorage.setItem('xativabot-user', JSON.stringify(USER)); }catch{} }

// ===== UI events =====
function setupEventListeners(){
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSendMessage(); }});
  voiceBtn?.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change',(e)=> changeLanguage(e.target.value));
  suggestionChips.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const intent = chip.dataset.intent || inferIntentFromChipText(chip.textContent || '');
      if (intent) dispatchIntent(intent);
      else { userInput.value = chip.textContent; handleSendMessage(); }
    });
  });
  userInput.addEventListener('input',()=>{ userInput.style.height='auto'; userInput.style.height=(userInput.scrollHeight)+'px'; });
}
function inferIntentFromChipText(txt){
  const t = (txt||'').toLowerCase();
  const sets = {
    menu: ['menu','menú','carta','recomendaciones','recomanacions'],
    allergy: ['diet','dietary','alerg','dietéticas','dietètiques','vegano','vegetariano','allergy','restric'],
    reserve: ['reserve','reservation','reservar','reserva','booking'],
    locations: ['locations','ubicaciones','ubicacions','direcciones','direccions','address']
  };
  for (const [intent, arr] of Object.entries(sets)){
    if (arr.some(k => t.includes(k))) return intent;
  }
  return null;
}

// ===== Compat =====
function checkBrowserSupport(){
  if(!('webkitSpeechRecognition'in window) && !('SpeechRecognition'in window)){
    console.warn('Speech recognition not supported');
    voiceBtn && (voiceBtn.style.display='none');
  }
  if(!('speechSynthesis'in window)) console.warn('Speech synthesis not supported');
}

// ===== STT =====
function setupSpeechRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ voiceBtn && (voiceBtn.style.display='none'); return; }
  recognition=new SR();
  recognition.continuous=false; recognition.interimResults=false;
  recognition.lang=getLangCode(currentLanguage);
  recognition.onstart=()=>{ isListening=true; voiceBtn?.classList.add('active'); voiceIndicator?.classList.add('active'); };
  recognition.onend=()=>{ isListening=false; voiceBtn?.classList.remove('active'); voiceIndicator?.classList.remove('active'); };
  recognition.onresult=(e)=>{ const transcript=e.results[0][0].transcript; userInput.value=transcript; handleSendMessage(); };
  recognition.onerror=(e)=>{ console.error('STT error:', e.error); isListening=false; voiceBtn?.classList.remove('active'); voiceIndicator?.classList.remove('active'); };
}
function toggleVoiceInput(){ if(!recognition) return; isListening? recognition.stop(): recognition.start(); }

// ===== Chat =====
function handleSendMessage(){
  const message = userInput.value.trim();
  if(message==='') return;

  // Si estamos en diálogo de alergias, procesar primero
  if (DIALOG.awaiting === 'allergy') {
    addMessageToChat(message,'user');
    handleAllergyAnswer(message);
    userInput.value=''; userInput.style.height='auto';
    return;
  }

  addMessageToChat(message,'user');
  userInput.value=''; userInput.style.height='auto';
  processUserMessage(message);
}
function addMessageToChat(message,sender){
  const div=document.createElement('div'); div.classList.add('message', `${sender}-message`);
  const p=document.createElement('p'); p.textContent=message; div.appendChild(p);
  chatMessages.appendChild(div); chatMessages.scrollTop=chatMessages.scrollHeight;
  setTimeout(()=>{ div.style.opacity='1'; div.style.transform='translateY(0)'; },10);
}

// ===== NLU =====
function processUserMessage(raw){
  const det = detectIntent(raw);
  dispatchIntent(det.intent, det);
}

function detectIntent(raw){
  const msg = (raw||'').toLowerCase();
  const K = KEYWORDS[currentLanguage];
  const result = { intent:'unknown', message: raw };

  const maybeRest = parseRestaurant(msg);
  if (maybeRest){ USER.preferredRestaurant = maybeRest; saveMemory(); }

  // Ingredientes (expresiones)
  const pat = {
    es: /\b(háblame de|hablame de|qué es|que es|beneficios de|temporada de|historia de|sobre)\s+(.{2,})/i,
    en: /\b(tell me about|what is|benefits of|season of|history of|about)\s+(.{2,})/i,
    ca: /\b(parla'm de|què és|que es|beneficis de|temporada de|història de|sobre)\s+(.{2,})/i
  }[currentLanguage];
  const m = msg.match(pat);
  if (m && m[2]) { result.intent = 'ingredient'; result.topic = cleanTopic(m[2]); return result; }

  // Salud
  if (K.health.some(k=>msg.includes(k))) { result.intent='health'; result.topic = guessTopicFromFreeText(msg) || 'cholesterol'; return result; }

  // Temporadas: si menciona palabra de temporada o un mes
  if (K.seasonWords.some(k=>msg.includes(k)) || hasMonthName(msg, currentLanguage)) {
    result.intent = 'season';
    result.month = extractMonthFromText(msg, currentLanguage) || (new Date().getMonth()+1);
    result.topic = extractIngredientFromSeasonQuery(msg); // p.ej. "temporada de fresas"
    return result;
  }

  // Resto
  if (K.reserve.some(k=>msg.includes(k))) { result.intent='reserve'; return result; }
  if (K.lore.some(k=>msg.includes(k)))    { result.intent='lore'; return result; }
  if (K.allergy.some(k=>msg.includes(k))) { result.intent='allergy'; return result; }
  if (K.rec.some(k=>msg.includes(k)))     { result.intent='recommend'; return result; }
  if (K.menu.some(k=>msg.includes(k)))    { result.intent='menu'; return result; }
  if (K.greet.some(k=>msg.includes(k)))   { result.intent='greet'; return result; }

  // Último intento: tópico culinario libre
  const guess = guessTopicFromFreeText(msg);
  if (guess) { result.intent='ingredient'; result.topic=guess; return result; }

  return result;
}

function cleanTopic(s){ return (s||'').replace(/[?!.:,;()"]/g,' ').replace(/\s{2,}/g,' ').trim(); }
function guessTopicFromFreeText(msg){
  const stop = {
    es: ['hola','quiero','necesito','cuéntame','habla','sobre','de','del','la','el','los','las','un','una','y','o','para','como','qué','que','es','historia','beneficios','temporada','salud','cardio','en','que','qué','hay'],
    en: ['hello','i','want','need','tell','me','about','of','the','a','and','or','for','how','what','is','history','benefits','season','health','cardio','in','what','is','there'],
    ca: ['hola','vull','necessite','explica\'m','parla','sobre','de','del','la','el','els','les','un','una','i','o','per','com','què','que','és','història','beneficis','temporada','salut','cardio','en','què','hi','ha']
  }[currentLanguage];
  const tokens = msg.split(/\s+/).filter(w => w && !stop.includes(w));
  return tokens.slice(-3).join(' ').trim() || null;
}

function parseRestaurant(msg){
  if (/\b(les\s*corts|corts|bordeus)\b/.test(msg)) return 'les_corts';
  if (/\b(gràcia|gracia|vidalet)\b/.test(msg)) return 'gracia';
  if (/\b(sant\s*antoni|muntaner|antoni)\b/.test(msg)) return 'sant_antoni';
  return null;
}

function dispatchIntent(intent, payload={}){
  switch(intent){
    case 'greet': reply(I18N[currentLanguage].say_more); break;
    case 'menu': replyMenu(); break;
    case 'recommend':
      if(!USER.allergies.length && !USER.preferences.length) startAllergyDialog();
      else replyRecommendations();
      break;
    case 'allergy': startAllergyDialog(); break;
    case 'lore': replyLore(); break;
    case 'reserve': ensureRestaurantThenForm(); break;
    case 'locations': replyLocations(); break;
    case 'ingredient': handleIngredient(payload.topic || payload.message || ''); break;
    case 'health': handleHealthQuery(payload.topic || ''); break;
    case 'season': handleSeasonQuery(payload); break;
    default: reply(I18N[currentLanguage].unknown);
  }
}

// ===== Respuestas base =====
function reply(text){
  addMessageToChat(text,'bot');
  if (!isMobileDevice() || userInteracted) speakText(text);
}

function replyMenu(){
  if(!MENU?.dishes?.length){ reply("La carta se está cargando. Inténtalo de nuevo…"); return; }
  const intro = I18N[currentLanguage].menu_intro;
  const sample = MENU.dishes.slice(0,3).map(d=>`• ${d.names[currentLanguage]||d.names.es} — ${d.desc[currentLanguage]||d.desc.es}`).join('\n');
  reply(`${intro}\n${sample}`);
}

function replyRecommendations(){
  const recs = recommendDishes(3);
  if(!recs.length){ reply(I18N[currentLanguage].no_match); return; }
  const lines = recs.map(d=>`• ${d.names[currentLanguage]||d.names.es} — ${d.desc[currentLanguage]||d.desc.es}`);
  reply(`${I18N[currentLanguage].rec_ready}\n${lines.join('\n')}\n😉`);
  USER.lastDish = recs[0]?.id || null; saveMemory();
}

function replyLore(){
  const topic = USER.lastDish || (['paella','fideua','all-i-pebre'][Math.floor(Math.random()*3)]);
  const t = topic.includes('paella') ? 'paella' : topic.includes('fideu') ? 'fideua' : 'all-i-pebre';
  const item = LORE.facts.find(f=>f.topic===t);
  const text = item ? (item[currentLanguage]||item.es) : 'Historias gastronómicas en camino.';
  reply(`${I18N[currentLanguage].lore_intro} ${text}`);
}

function replyLocations(){
  const lines = {
    es: [
      `${I18N.es.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`
    ],
    en: [
      `${I18N.en.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`
    ],
    ca: [
      `${I18N.ca.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`
    ]
  }[currentLanguage];
  reply(lines.join('\n'));
}

function recommendDishes(n=3){
  const avoid=new Set((USER.allergies||[]).map(a=>a.toLowerCase()));
  const prefs=new Set((USER.preferences||[]).map(p=>p.toLowerCase()));
  const ok = (MENU.dishes||[]).filter(d=>{
    if(d.allergens?.some?.(a=>avoid.has(a))) return false;
    if(prefs.size){
      for(const p of prefs){ if(!d.tags?.map?.(t=>t.toLowerCase()).includes(p)) return false; }
    }
    return true;
  });
  ok.sort((a,b)=> (a.category==='main'? -1:0) - (b.category==='main'? -1:0));
  return ok.slice(0,n);
}

// ===== Diálogo de “Necesidades dietéticas” =====
function startAllergyDialog(){
  DIALOG.awaiting = 'allergy';
  reply(I18N[currentLanguage].ask_allergies_specific);
  showDietaryWizard(); // chips de ayuda (NO guarda hasta confirmar)
}
function handleAllergyAnswer(message){
  const found = parseAndSaveAllergies(message, {returnFound:true});
  if (found && (found.allergies.length || found.preferences.length)) {
    reply(I18N[currentLanguage].saved_prefs + " " + (I18N[currentLanguage].diet_humor_ping || ""));
    replyRecommendations();
  } else {
    reply(currentLanguage==='es'
      ? "No he detectado ninguna alergia en tu mensaje. Escribe “sin gluten”, “vegano”, “sin marisco”… o usa los botones y confirma."
      : currentLanguage==='ca'
        ? "No he detectat cap al·lèrgia. Escriu “sense gluten”, “vegà”, “sense marisc”… o usa els botons i confirma."
        : "I didn’t detect any allergy. Type “gluten-free”, “vegan”, “no shellfish”… or use the buttons and confirm.");
  }
  DIALOG.awaiting = null;
}
function showDietaryWizard(){
  const wrap=document.createElement('div'); wrap.classList.add('message','bot-message');
  const labels = {
    es: { cta:I18N.es.diet_cta, confirm:I18N.es.diet_confirm_btn, none:I18N.es.diet_none_btn,
          chips:['Sin gluten','Vegano','Vegetariano','Sin lactosa','Sin marisco','Sin frutos secos'] },
    en: { cta:I18N.en.diet_cta, confirm:I18N.en.diet_confirm_btn, none:I18N.en.diet_none_btn,
          chips:['Gluten-free','Vegan','Vegetarian','Lactose-free','No shellfish','No nuts'] },
    ca: { cta:I18N.ca.diet_cta, confirm:I18N.ca.diet_confirm_btn, none:I18N.ca.diet_none_btn,
          chips:['Sense gluten','Vegà','Vegetarià','Sense lactosa','Sense marisc','Sense fruits secs'] }
  }[currentLanguage];
  wrap.innerHTML = `
    <div class="dietary-wizard">
      <p>${labels.cta}</p>
      <div class="suggestion-chips dietary-chips">
        ${labels.chips.map((t,i)=>`<button class="chip diet-chip" data-key="${i}">${t}</button>`).join('')}
      </div>
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="chip diet-confirm">${labels.confirm}</button>
        <button class="chip diet-none" style="opacity:.9">${labels.none}</button>
      </div>
    </div>
  `;
  chatMessages.appendChild(wrap); chatMessages.scrollTop=chatMessages.scrollHeight;
  const selected = new Set();
  wrap.querySelectorAll('.diet-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const on = btn.classList.toggle('active');
      const key = btn.dataset.key;
      if (on) selected.add(key); else selected.delete(key);
    });
  });
  wrap.querySelector('.diet-none').addEventListener('click', ()=>{
    USER.preferences = []; USER.allergies = []; saveMemory();
    reply(I18N[currentLanguage].diet_saved_none); replyRecommendations(); DIALOG.awaiting = null; wrap.remove();
  });
  wrap.querySelector('.diet-confirm').addEventListener('click', ()=>{
    const map = ['gluten-free','vegan','vegetarian','milk','shellfish','nuts'];
    const prefsAdd=[], allergiesAdd=[];
    selected.forEach(idx=>{ const tag = map[idx]; (tag==='gluten-free'||tag==='vegan'||tag==='vegetarian')? prefsAdd.push(tag): allergiesAdd.push(tag); });
    USER.preferences = Array.from(new Set([...(USER.preferences||[]), ...prefsAdd]));
    USER.allergies   = Array.from(new Set([...(USER.allergies||[]),   ...allergiesAdd]));
    saveMemory();
    const list = [...prefsAdd, ...allergiesAdd].join(', ') || (currentLanguage==='es'?'(sin cambios)':'(no changes)');
    reply(I18N[currentLanguage].diet_saved_fun(list)); replyRecommendations(); DIALOG.awaiting = null; wrap.remove();
  });
}

// ===== Parser de alergias =====
function parseAndSaveAllergies(text, opts={}){
  const map = {
    en:{gluten:'gluten', shellfish:'shellfish', fish:'fish', egg:'egg', milk:'milk', vegan:'vegan', vegetarian:'vegetarian', lactose:'milk', nuts:'nuts'},
    es:{gluten:'gluten', marisco:'shellfish', pescado:'fish', huevo:'egg', leche:'milk', vegano:'vegan', vegetariano:'vegetarian', lactosa:'milk', frutos:'nuts', frutos_secos:'nuts', frutossecos:'nuts', nueces:'nuts', almendras:'nuts', avellanas:'nuts'},
    ca:{gluten:'gluten', marisc:'shellfish', peix:'fish', ou:'egg', llet:'milk', vegà:'vegan', vegetarià:'vegetarian', lactosa:'milk', fruits:'nuts', fruits_secs:'nuts', fruitssecs:'nuts', nous:'nuts', ametlles:'nuts', avellanes:'nuts'}
  }[currentLanguage];
  const foundAllergies=[], foundPrefs=[];
  for(const [k,v] of Object.entries(map)){
    const rx=new RegExp(`\\b${k}\\b`,'i');
    if(rx.test(text)){
      if (v==='vegan' || v==='vegetarian') foundPrefs.push(v);
      else if (v==='gluten') foundPrefs.push('gluten-free');
      else foundAllergies.push(v);
    }
  }
  if(/\b(no.*alerg|sin.*alerg|no.*allerg)/i.test(text)){ USER.allergies=[]; }
  else{ USER.allergies = Array.from(new Set([...(USER.allergies||[]), ...foundAllergies])); }
  foundPrefs.forEach(p=>{ if(!USER.preferences.includes(p)) USER.preferences.push(p); });
  saveMemory();
  if (opts.returnFound) return { allergies: foundAllergies, preferences: foundPrefs };
  return null;
}

// ===== Conocimiento online =====
async function handleIngredient(topicRaw){
  const lang = currentLanguage;
  const topic = cleanTopic(topicRaw || '');
  let knowledgeText = '';
  try{
    const url = `/.netlify/functions/knowledge?topic=${encodeURIComponent(topic)}&lang=${encodeURIComponent(lang)}`;
    const res = await fetch(url);
    if (res.ok){
      const data = await res.json();
      if (data?.ok && data.text) knowledgeText = data.text;
    }
  }catch(e){ console.warn('Knowledge fetch failed:', e); }

  const localKeyMap = {
    es:{ "arroz":"arroz","azafrán":"azafrán","aceite de oliva":"aceite de oliva" },
    en:{ "rice":"arroz","saffron":"azafrán","olive oil":"aceite de oliva" },
    ca:{ "arròs":"arroz","safrà":"azafrán","oli d'oliva":"aceite de oliva" }
  }[lang]||{};
  const tLow = topic.toLowerCase();
  const localKey = Object.keys(localKeyMap).find(k=>tLow.includes(k));
  const local = localKey && ((CULINARY[lang] && CULINARY[lang][localKeyMap[localKey]]) || (CULINARY.es && CULINARY.es[localKeyMap[localKey]]));

  const parts = [];
  if (local?.summary) parts.push(local.summary);
  if (knowledgeText) parts.push(knowledgeText);

  // Añade temporada si aplica
  const seasonInfo = seasonForIngredient(topic, lang);
  if (seasonInfo) parts.push(seasonInfo);

  if (!parts.length){
    reply(lang==='es' ? "Puedo hablar de especias, técnicas e ingredientes (cúrcuma, comino, canela, laurel, vainilla, arroz, azafrán…). ¿Cuál te interesa?"
         : lang==='ca' ? "Puc parlar d'espècies, tècniques i ingredients (cúrcuma, comí, canyella, llorer, vainilla, arròs, safrà…). Quin t’interessa?"
                       : "I can talk about spices, techniques and ingredients (turmeric, cumin, cinnamon, bay leaf, vanilla, rice, saffron…). Which one?");
    return;
  }

  const preface = lang==='es'
    ? "A ver… tema sabroso. Te cuento al grano:"
    : lang==='ca'
      ? "A veure… tema gustós. T’ho conte al gra:"
      : "Oh, that’s a delicious topic. Here’s the good stuff:";
  reply(preface + "\n" + parts.join('\n'));
}

async function handleHealthQuery(topicRaw){
  const lang = currentLanguage;
  const topic = cleanTopic(topicRaw || '');
  let text = '';
  try{
    const url = `/.netlify/functions/knowledge?topic=${encodeURIComponent(topic)}&lang=${encodeURIComponent(lang)}&kind=health`;
    const res = await fetch(url);
    if (res.ok){
      const data = await res.json();
      if (data?.ok && data.text) text = data.text;
    }
  }catch(e){ console.warn('Health fetch failed:', e); }
  if (!text){
    text = (lang==='es')
      ? "Puedo orientarte sobre colesterol, presión arterial, azúcares, sodio… Pregunta: “alimentos que bajan el colesterol” o “¿aceite de oliva y corazón?”"
      : (lang==='ca')
        ? "Puc orientar-te sobre colesterol, pressió arterial, sucres, sodi… Prova: “aliments que baixen el colesterol” o “oli d’oliva i cor”"
        : "I can help with cholesterol, blood pressure, sugars, sodium… Try “foods that lower cholesterol” or “olive oil and heart”.";
  }
  reply(`${I18N[lang].health_preface}\n${text}\n\n${I18N[lang].health_disclaimer}`);
}

// ===== Temporadas =====
function handleSeasonQuery(payload){
  // Si pregunta por ingrediente: “temporada de fresas”
  if (payload.topic) {
    const info = seasonForIngredient(payload.topic, currentLanguage);
    if (info) reply(info);
    else reply(currentLanguage==='es' ? "No tengo la temporada de ese producto todavía." :
         currentLanguage==='ca' ? "Encara no tinc la temporada d’aquest producte." :
                                  "I don’t have that item’s season yet.");
    return;
  }
  // Si pregunta “qué hay de temporada (en mes)”
  const month = payload.month || (new Date().getMonth()+1);
  const list = listSeasonForMonth(month);
  if (!list.length){
    reply(currentLanguage==='es' ? "No tengo datos de temporada para ese mes." :
         currentLanguage==='ca' ? "No tinc dades de temporada per a eixe mes." :
                                  "No season data for that month.");
    return;
  }
  const monthName = I18N[currentLanguage].month_names[month-1];
  const header = currentLanguage==='es' ? `${I18N.es.season_now} (${monthName}):`
              : currentLanguage==='ca' ? `${I18N.ca.season_now} (${monthName}):`
                                       : `${I18N.en.season_now} (${monthName}):`;
  const lines = list.slice(0,24).map(p => `• ${p.name[currentLanguage] || p.name.es}${p.kind==='veg'?' 🥦':' 🍓'}`);
  reply(`${header}\n${lines.join('\n')}${list.length>24?'\n…':''}`);
}

function seasonForIngredient(topic, lang){
  if (!SEASON?.produce?.length) return null;
  const t = topic.toLowerCase();
  const item = SEASON.produce.find(p=>{
    const n = p.name;
    return (n.es && t.includes(n.es.toLowerCase())) ||
           (n.en && t.includes(n.en.toLowerCase())) ||
           (n.ca && t.includes(n.ca.toLowerCase()));
  });
  if (!item) return null;
  const months = (item.months||[]).sort((a,b)=>a-b).map(m => I18N[lang].month_names[m-1]).join(', ');
  const head = lang==='es' ? `${I18N.es.season_of} ${item.name[lang]||item.name.es}:`
           : lang==='ca' ? `${I18N.ca.season_of} ${item.name[lang]||item.name.es}:`
                         : `${I18N.en.season_of} ${item.name[lang]||item.name.es}:`;
  return `${head} ${months || '—'}`;
}

function listSeasonForMonth(month){
  if (!SEASON?.produce?.length) return [];
  return SEASON.produce.filter(p => p.months.includes(month));
}

function hasMonthName(text, lang){
  const months = {
    es:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","setiembre","octubre","noviembre","diciembre"],
    en:["january","february","march","april","may","june","july","august","september","october","november","december"],
    ca:["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"]
  }[lang] || [];
  const s = text.toLowerCase();
  return months.some(m => s.includes(m));
}
function extractMonthFromText(text, lang){
  const months = {
    es:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","setiembre","octubre","noviembre","diciembre"],
    en:["january","february","march","april","may","june","july","august","september","october","november","december"],
    ca:["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"]
  }[lang] || [];
  const s = text.toLowerCase();
  for (let i=0;i<months.length;i++){
    if (s.includes(months[i])) {
      // mapear 'setiembre' a 9 también
      if (lang==='es' && months[i]==='setiembre') return 9;
      return i+1;
    }
  }
  return null;
}
function extractIngredientFromSeasonQuery(text){
  // Intenta capturar "temporada de X" / "season of X"
  const rx = /(?:temporada de|season of|de temporada de|temporada\s+del?|temporada\s+de la)\s+([a-záéíóúüñç'\s]+)/i;
  const m = text.match(rx);
  if (m && m[1]) return m[1].trim();
  return null;
}

// ===== Reserva (email/función) =====
function ensureRestaurantThenForm(){
  if (!USER.preferredRestaurant){
    reply(I18N[currentLanguage].pick_restaurant);
  }
  showReservationForm();
}
function pad2(n){ return n<10? '0'+n : ''+n; }
function formatLocalForInput(dt){ return dt.getFullYear()+'-'+pad2(dt.getMonth()+1)+'-'+pad2(dt.getDate())+'T'+pad2(dt.getHours())+':'+pad2(dt.getMinutes()); }
function roundToNextStep(dt, minutesStep=30){ const ms=minutesStep*60*1000; return new Date(Math.ceil(dt.getTime()/ms)*ms); }

function showReservationForm(){
  const wrap=document.createElement('div'); wrap.classList.add('message','bot-message');
  const now = new Date();
  const def = roundToNextStep(now, 30);
  const minStr = formatLocalForInput(now);
  const defStr = formatLocalForInput(def);
  const restVal = USER.preferredRestaurant || '';
  const prefillAllergies = (USER.allergies||[]).join(', ');

  wrap.innerHTML=`
    <form id="reservation-form" class="reservation-form">
      <label><span data-es="Restaurante:" data-en="Restaurant:" data-ca="Restaurant:">Restaurante:</span><br>
        <select name="restaurant" required>
          <option value="" ${restVal===''?'selected':''}>—</option>
          <option value="les_corts" ${restVal==='les_corts'?'selected':''}>Les Corts · Bordeus, 35</option>
          <option value="gracia" ${restVal==='gracia'?'selected':''}>Gràcia · Torrent d’en Vidalet, 26</option>
          <option value="sant_antoni" ${restVal==='sant_antoni'?'selected':''}>Sant Antoni · Muntaner, 6</option>
        </select>
      </label><br>

      <label><span data-en="Name:" data-es="Nombre:" data-ca="Nom:">Nombre:</span><br>
        <input type="text" name="name" required placeholder="Alex García"></label><br>

      <label><span data-en="Email:" data-es="Correo:" data-ca="Correu:">Correo:</span><br>
        <input type="email" name="email" placeholder="you@example.com"></label><br>

      <label><span data-en="Phone:" data-es="Teléfono:" data-ca="Telèfon:">Teléfono:</span><br>
        <input type="tel" name="phone" placeholder="+34 600 000 000"></label><br>

      <label><span data-en="Date & Time:" data-es="Fecha y hora:" data-ca="Data i hora:">Fecha y hora:</span><br>
        <input type="datetime-local" name="dateTime" required min="${minStr}" value="${defStr}"></label><br>

      <label><span data-en="Party Size:" data-es="Número de comensales:" data-ca="Nombre de comensals:">Número de comensales:</span><br>
        <input type="number" name="partySize" min="1" max="20" value="2"></label><br>

      <label><span data-en="Preferred dishes:" data-es="Platos deseados:" data-ca="Plats desitjats:">Platos deseados:</span><br>
        <input type="text" name="dishes" placeholder="Paella valenciana, Fideuà..."></label><br>

      <label><span data-en="Allergies:" data-es="Alergias:" data-ca="Al·lèrgies:">Alergias:</span><br>
        <input type="text" name="allergies" placeholder="gluten, marisco..." value="${prefillAllergies}"></label><br>

      <label><span data-en="Notes:" data-es="Notas:" data-ca="Notes:">Notas:</span><br>
        <textarea name="notes" placeholder="Preferencias extra, celebración, etc."></textarea></label><br>

      <button type="submit" data-en="Confirm Reservation" data-es="Confirmar Reserva" data-ca="Confirmar Reserva">Confirmar Reserva</button>
    </form>`;

  chatMessages.appendChild(wrap); chatMessages.scrollTop=chatMessages.scrollHeight;
  changeLanguage(currentLanguage);

  const form=wrap.querySelector('#reservation-form');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn=form.querySelector('button[type="submit"]'); btn.disabled=true;

    const data=Object.fromEntries(new FormData(form).entries());
    if (!data.restaurant){ addMessageToChat(I18N[currentLanguage].pick_restaurant, 'bot'); btn.disabled=false; return; }

    data.id='res_'+Date.now();
    data.uiLanguage=currentLanguage;

    try{
      const local=new Date(data.dateTime);
      if(isNaN(local.getTime())) throw new Error('Invalid date');
      data.dateTimeISO=new Date(local.getTime()-local.getTimezoneOffset()*60000).toISOString();
    }catch(_){
      addMessageToChat("⚠️ Fecha/hora inválida.", 'bot'); btn.disabled=false; return;
    }

    try{
      const r=await submitReservation(data);
      addMessageToChat(`${I18N[currentLanguage].res_thanks} ID: ${r.reservation.id}`, 'bot');
      USER.preferredRestaurant = data.restaurant; saveMemory();
      wrap.remove();
    }catch(err){
      console.warn('Offline/Server error, queue reservation:', err.message);
      await queueReservation(data);
      addMessageToChat(I18N[currentLanguage].res_offline, 'bot');
      wrap.remove();
    }finally{ btn.disabled=false; }
  });
}

async function submitReservation(reservation){
  const resp=await fetch('/.netlify/functions/reservations',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reservation)
  });
  const data=await resp.json(); if(!resp.ok) throw new Error(data.error||'Reservation failed'); return data;
}
async function queueReservation(reservation){
  const db=await openReservationDB(); const tx=db.transaction(['reservations'],'readwrite');
  tx.objectStore('reservations').put(reservation);
  if('serviceWorker'in navigator && 'SyncManager'in window){ const reg=await navigator.serviceWorker.ready; await reg.sync.register('reservation-sync'); }
}
function openReservationDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('xativabot-db',1);
    req.onupgradeneeded=(ev)=>{ const db=ev.target.result; if(!db.objectStoreNames.contains('reservations')) db.createObjectStore('reservations',{keyPath:'id'}); };
    req.onsuccess=(ev)=>resolve(ev.target.result); req.onerror=(ev)=>reject(ev.target.error);
  });
}

// ===== TTS =====
function tryUnlockTTS(){
  if (!speechSynthesisObj || ttsUnlocked) return;
  try { const u=new SpeechSynthesisUtterance(' '); u.volume=0; u.rate=1; u.lang=getLangCode(currentLanguage);
    speechSynthesisObj.speak(u); setTimeout(()=>{ try{ speechSynthesisObj.cancel(); }catch{}; ttsUnlocked=true; },0);
  } catch(e){ console.warn('TTS unlock failed', e); }
}
function ensureVoicesReady(){
  return new Promise((resolve)=>{
    if (!speechSynthesisObj) return resolve();
    const load=()=>{ availableVoices=speechSynthesisObj.getVoices(); if(availableVoices?.length){ voicesReady=true; resolve(); } };
    load();
    if(!voicesReady){ speechSynthesisObj.onvoiceschanged=()=>{ load(); if(voicesReady) resolve(); }; setTimeout(load,250); setTimeout(load,1000); }
  });
}
function pickVoiceFor(lang){
  if (!availableVoices?.length) return null;
  const wanted=lang.toLowerCase(), primary=wanted.slice(0,2);
  let v=availableVoices.find(v=>v.lang?.toLowerCase()===wanted) || availableVoices.find(v=>v.lang?.toLowerCase().startsWith(primary));
  if (v) return v;
  const fallbacks = primary==='ca'?['es','en']: primary==='es'?['en']:['es'];
  for(const fb of fallbacks){ const m=availableVoices.find(v=>v.lang?.toLowerCase().startsWith(fb)); if(m) return m; }
  return availableVoices[0]||null;
}
async function speakText(text){
  if (!speechSynthesisObj) return;
  await ensureVoicesReady();
  try { speechSynthesisObj.cancel(); } catch {}
  const utter = new SpeechSynthesisUtterance(text);
  const langCode = getLangCode(currentLanguage);
  const voice = pickVoiceFor(langCode);
  if (voice){ utter.voice=voice; utter.lang=(voice.lang||langCode); } else { utter.lang=langCode; }
  utter.rate=1.0; utter.pitch=1.0; utter.volume=1.0;
  setTimeout(()=>{ try{ speechSynthesisObj.speak(utter);}catch(e){ console.warn('TTS speak failed:',e);} },0);
}

// ===== Idioma / helpers =====
function changeLanguage(lang){
  currentLanguage = lang;
  document.querySelectorAll('[data-'+lang+']').forEach(el=>{ el.textContent = el.getAttribute('data-'+lang); });
  userInput.placeholder = userInput.getAttribute('data-'+lang) || userInput.placeholder;
  if (recognition) recognition.lang = getLangCode(lang);
  reply(I18N[currentLanguage].ask_allergies);
}
function getLangCode(lang){ return ({en:'en-US', es:'es-ES', ca:'ca-ES'})[lang] || 'en-US'; }
function isMobileDevice(){ return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

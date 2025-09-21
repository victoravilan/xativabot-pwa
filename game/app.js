/** XativaBot – App (alergias, recomendaciones, temporadas, salud, voz, reservas + JUEGO con promo) */

/* ========= DOM ========= */
const chatMessages   = document.getElementById('chat-messages');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');
const voiceBtn       = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const suggestionChips= document.querySelectorAll('.chip');

/* ========= Estado ========= */
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
  preferredRestaurant: null, // 'les_corts' | 'gracia' | 'sant_antoni'
  promoCode: null            // <— NUEVO: código del juego (si existe)
};

let DIALOG = { awaiting: null }; // 'allergy' | null

/* ========= Constantes ========= */
const GAME_PROMO_KEY = 'xativabot-game-promo';

/* ========= i18n ========= */
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
    month_names:["January","February","March","April","May","June","July","August","September","October","November","December"],
    game_celebrate: (code)=>`🎉 Bravo! You finished the Culinary Word Search. Promo code: ${code}. I’ll attach it to your booking.`
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
    month_names:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    game_celebrate: (code)=>`🎉 ¡Enhorabuena! Completaste la Sopa de letras culinaria. Código promo: ${code}. Lo adjuntaré a tu reserva.`
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
    month_names:["Gener","Febrer","Març","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"],
    game_celebrate: (code)=>`🎉 Enhorabona! Has completat la Sopa de lletres. Codi promo: ${code}. L’adjuntaré a la reserva.`
  }
};

/* ========= Intents / keywords (igual que tu versión previa) ========= */
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

/* ========= Fallback culinario breve (igual al tuyo) ========= */
const CULINARY = { es: {
  "arroz": { summary:"Base de la paella; variedades bomba o senia absorben caldo sin romperse." },
  "azafrán": { summary:"Estigmas del Crocus sativus; aroma floral y color dorado." },
  "aceite de oliva": { summary:"Grasa matriz mediterránea; AOVE con frutado, amargor y picor." }
}};

/* ========= INIT ========= */
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

  // Listener de mensajes del juego (promo code)
  window.addEventListener('message', (ev)=>{
    try{
      const data = ev.data || {};
      if (data.type === 'CULINARY_GAME_DONE' && data.code) {
        localStorage.setItem(GAME_PROMO_KEY, data.code);
        USER.promoCode = data.code; saveMemory();
        reply(I18N[currentLanguage].game_celebrate(data.code));
      }
    }catch(e){}
  });
}

/* ========= Datos/Memoria ========= */
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

/* ========= Eventos UI ========= */
function setupEventListeners(){
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSendMessage(); }});
  voiceBtn?.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change',(e)=> changeLanguage(e.target.value));

  // Chips: intent por data-intent o texto
  suggestionChips.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const intent = chip.dataset.intent || inferIntentFromChipText(chip.textContent || '');
      if (intent === 'game') { openGamePanel(); return; }
      if (intent) dispatchIntent(intent);
      else { userInput.value = chip.textContent; handleSendMessage(); }
    });
  });

  // Botón explícito del juego (por id)
  document.getElementById('open-game-btn')?.addEventListener('click', openGamePanel);

  // Cierre del panel de juego
  document.getElementById('game-close')?.addEventListener('click', hideGamePanel);
}

function inferIntentFromChipText(txt){
  const t = (txt||'').toLowerCase();
  const sets = {
    menu: ['menu','menú','carta','recomendaciones','recomanacions'],
    allergy: ['diet','dietary','alerg','dietéticas','dietètiques','vegano','vegetariano','allergy','restric'],
    reserve: ['reserve','reservation','reservar','reserva','booking'],
    locations: ['locations','ubicaciones','ubicacions','direcciones','direccions','address'],
    game: ['sopa','lletres','letters','word search','jugar','play']
  };
  for (const [intent, arr] of Object.entries(sets)){
    if (arr.some(k => t.includes(k))) return intent;
  }
  return null;
}

/* ========= Compat ========= */
function checkBrowserSupport(){
  if(!('webkitSpeechRecognition'in window) && !('SpeechRecognition'in window)){
    console.warn('Speech recognition not supported');
    voiceBtn && (voiceBtn.style.display='none');
  }
  if(!('speechSynthesis'in window)) console.warn('Speech synthesis not supported');
}

/* ========= STT ========= */
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

/* ========= Chat ========= */
function handleSendMessage(){
  const message = userInput.value.trim();
  if(message==='') return;

  // Diálogo alergias
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

/* ========= NLU ========= */
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

  // Ingredientes por expresión
  const pat = {
    es: /\b(háblame de|hablame de|qué es|que es|beneficios de|temporada de|historia de|sobre)\s+(.{2,})/i,
    en: /\b(tell me about|what is|benefits of|season of|history of|about)\s+(.{2,})/i,
    ca: /\b(parla'm de|què és|que es|beneficis de|temporada de|història de|sobre)\s+(.{2,})/i
  }[currentLanguage];
  const m = msg.match(pat);
  if (m && m[2]) { result.intent = 'ingredient'; result.topic = cleanTopic(m[2]); return result; }

  // Salud
  if (K.health.some(k=>msg.includes(k))) { result.intent='health'; result.topic = guessTopicFromFreeText(msg) || 'cholesterol'; return result; }

  // Temporadas
  if (K.seasonWords.some(k=>msg.includes(k)) || hasMonthName(msg, currentLanguage)) {
    result.intent = 'season';
    result.month = extractMonthFromText(msg, currentLanguage) || (new Date().getMonth()+1);
    result.topic = extractIngredientFromSeasonQuery(msg);
    return result;
  }

  // Resto
  if (K.reserve.some(k=>msg.includes(k))) { result.intent='reserve'; return result; }
  if (K.lore.some(k=>msg.includes(k)))    { result.intent='lore'; return result; }
  if (K.allergy.some(k=>msg.includes(k))) { result.intent='allergy'; return result; }
  if (K.rec.some(k=>msg.includes(k)))     { result.intent='recommend'; return result; }
  if (K.menu.some(k=>msg.includes(k)))    { result.intent='menu'; return result; }
  if (K.greet.some(k=>msg.includes(k)))   { result.intent='greet'; return result; }

  // Palabra libre culinaria
  const guess = guessTopicFromFreeText(msg);
  if (guess) { result.intent='ingredient'; result.topic=guess; return result; }

  // “juego”, “sopa de letras”…
  if (/(sopa.*letr|word\s*search|jugar|play|joc|lletres)/i.test(msg)) { result.intent='game'; return result; }

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
    case 'game': openGamePanel(); break;
    default: reply(I18N[currentLanguage].unknown);
  }
}

/* ========= Respuestas base ========= */
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
    es: [`${I18N.es.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`],
    en: [`${I18N.en.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`],
    ca: [`${I18N.ca.locations}`,
      `• Les Corts · C/ Bordeus, 35 · Barcelona`,
      `• Gràcia · C/ Torrent d’en Vidalet, 26 · Barcelona`,
      `• Sant Antoni · C/ Muntaner, 6 · Barcelona`]
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

/* ========= Diálogo “Necesidades dietéticas” ========= */
// (igual que tu versión anterior; se mantiene)

/* ========= Parser alergias ========= */
// (igual que tu versión anterior; se mantiene)

/* ========= Conocimiento online ========= */
// (igual que tu versión anterior; se mantiene)

/* ========= Temporadas ========= */
// (igual que tu versión anterior; se mantiene)

/* ========= Reserva (form + envío) ========= */
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
  const promoHint = localStorage.getItem(GAME_PROMO_KEY) ? ` (Promo: ${localStorage.getItem(GAME_PROMO_KEY)})` : '';

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
        <textarea name="notes" placeholder="Preferencias extra, celebración, etc.">${promoHint?('\n'+promoHint):''}</textarea></label><br>

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

    // Adjuntar promo code si existe
    const promo = localStorage.getItem(GAME_PROMO_KEY);
    if (promo) {
      data.promoCode = promo;
      data.notes = (data.notes ? data.notes + '\n' : '') + `Promo: ${promo}`;
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

/* ========= TTS ========= */
// (igual a tu versión previa; se mantiene)
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

/* ========= Idioma / helpers ========= */
function changeLanguage(lang){
  currentLanguage = lang;
  document.querySelectorAll('[data-'+lang+']').forEach(el=>{ el.textContent = el.getAttribute('data-'+lang); });
  userInput.placeholder = userInput.getAttribute('data-'+lang) || userInput.placeholder;
  if (recognition) recognition.lang = getLangCode(lang);
  reply(I18N[currentLanguage].ask_allergies);
}
function getLangCode(lang){ return ({en:'en-US', es:'es-ES', ca:'ca-ES'})[lang] || 'en-US'; }
function isMobileDevice(){ return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

/* ========= PANEL DEL JUEGO ========= */
function openGamePanel(){
  const panel = document.getElementById('game-panel');
  const frame = document.getElementById('game-frame');
  if (!panel || !frame) return;
  const lang = currentLanguage || 'es';
  // Carga el juego con el idioma como query param
  frame.src = `/game/culinary-game.html?lang=${encodeURIComponent(lang)}`;
  panel.hidden = false;
}
function hideGamePanel(){
  const panel = document.getElementById('game-panel');
  const frame = document.getElementById('game-frame');
  if (!panel || !frame) return;
  frame.src = 'about:blank';
  panel.hidden = true;
}

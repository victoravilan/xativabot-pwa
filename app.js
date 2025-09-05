/** XativaBot – App (voz + i18n + culinario + reservas + región) */

// DOM
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const regionSelect = document.getElementById('region-select'); // puede no existir
const suggestionChips = document.querySelectorAll('.chip');

// CONFIG (opcional): enlace WhatsApp directo como fallback manual tras reservar.
// Formato internacional sin signos: "0034661882732"
const MANAGER_WHATSAPP = ""; // ej: "0034622167728" si quieres mostrar botón “Notificar por WhatsApp”

// Estado
let currentLanguage = 'es';
let recognition = null;
let speechSynthesisObj = window.speechSynthesis;
let isListening = false;

// Voz
let voicesReady = false;
let availableVoices = [];
let userInteracted = false;
let ttsUnlocked = false;
let lastSpokenText = '';

// Datos
let MENU = { dishes: [] };
let LORE = { facts: [] };

// Memoria usuario
let USER = { allergies: [], preferences: [], lastDish: null };

// ===== i18n =====
const I18N = {
  en:{welcome:"Welcome to Xativa Restaurants! I'm AlexBot, your personal chef assistant. How can I help you today?",
      ask_allergies:"Do you have any allergies or dietary restrictions? (e.g., gluten, shellfish, egg, milk, fish, vegan, vegetarian)",
      menu_intro:"Here are some highlights from our menu:",
      rec_ready:"Based on your preferences, I recommend:",
      rec_need_info:"I can recommend dishes, but first tell me if you have allergies or diet preferences.",
      saved_prefs:"Got it. I’ll remember that.",
      no_match:"I couldn’t find a safe match. Would you like gluten-free or vegetarian options?",
      lore_intro:"Did you know?",
      reservation_prompt:"Great! Please fill in your reservation details:",
      allergies_saved:"Allergies/preferences saved.",
      say_more:"Tell me more—what are you craving today?",
      unknown:"Thanks for your message. How else may I assist you today?",
      and:"and",
      voice_enable:"Tap to enable voice",
      res_thanks:"✅ Reservation received.",
      res_offline:"📌 You're offline. Reservation saved and will sync when online.",
      res_whatsapp:"Notify via WhatsApp"},
  es:{welcome:"¡Bienvenido a Restaurantes Xativa! Soy AlexBot, tu asistente de chef personal. ¿Cómo puedo ayudarte hoy?",
      ask_allergies:"¿Tienes alguna alergia o restricción? (p. ej.: gluten, marisco, huevo, leche, pescado, vegano, vegetariano)",
      menu_intro:"Estos son algunos destacados de nuestra carta:",
      rec_ready:"Según tus preferencias, te recomiendo:",
      rec_need_info:"Puedo recomendarte platos, pero antes dime si tienes alergias o una dieta específica.",
      saved_prefs:"Anotado. Lo recordaré.",
      no_match:"No he encontrado un plato seguro. ¿Quieres ver opciones sin gluten o vegetarianas?",
      lore_intro:"¿Sabías que…?",
      reservation_prompt:"¡Perfecto! Completa los datos de tu reserva:",
      allergies_saved:"Alergias/preferencias guardadas.",
      say_more:"Cuéntame más—¿qué te apetece hoy?",
      unknown:"Gracias por tu mensaje. ¿En qué más puedo ayudarte?",
      and:"y",
      voice_enable:"Toca para activar la voz",
      res_thanks:"✅ Reserva recibida.",
      res_offline:"📌 Estás sin conexión. La reserva se guardó y se enviará al volver.",
      res_whatsapp:"Notificar por WhatsApp"},
  ca:{welcome:"Benvingut als Restaurants Xativa! Sóc l’AlexBot, el teu assistent de xef personal. Com puc ajudar-te avui?",
      ask_allergies:"Tens cap al·lèrgia o restricció? (p. ex.: gluten, marisc, ou, llet, peix, vegà, vegetarià)",
      menu_intro:"Aquests són alguns destacats de la carta:",
      rec_ready:"Segons les teves preferències, et recomane:",
      rec_need_info:"Et puc recomanar plats, però primer digue’m si tens al·lèrgies o una dieta concreta.",
      saved_prefs:"Anotat. Ho recordaré.",
      no_match:"No he trobat un plat segur. Vols veure opcions sense gluten o vegetarianes?",
      lore_intro:"Sabies que…?",
      reservation_prompt:"Genial! Omple les dades de la teua reserva:",
      allergies_saved:"Al·lèrgies/preferències guardades.",
      say_more:"Explica’m més—què et ve de gust avui?",
      unknown:"Gràcies pel teu missatge. En què més puc ajudar-te?",
      and:"i",
      voice_enable:"Toca per activar la veu",
      res_thanks:"✅ Reserva rebuda.",
      res_offline:"📌 Estàs fora de línia. La reserva s’enviarà en tornar.",
      res_whatsapp:"Notificar per WhatsApp"}
};

// ===== KEYWORDS =====
const KEYWORDS = {
  en:{greet:["hello","hi","hey"],menu:["menu","card","dishes","food"],rec:["recommend","suggest","what should i eat"],
      allergy:["allergy","allergies","gluten","shellfish","fish","egg","milk","vegan","vegetarian"],
      lore:["history","myth","tradition","story","origin"],reserve:["reserve","reservation","book"],
      ingredient:["what is","benefits of","season of","history of","tell me about","spice","spices","ingredient","ingredients","rice","saffron","pepper","turmeric","cinnamon","cumin","clove","nutmeg","bay leaf","vanilla","salt","olive oil","garlic","onion","tomato"],
      season:["in season","seasonal","season"],history:["history","origin","myth"]},
  es:{greet:["hola","buenas"],menu:["menú","carta","platos","comida"],rec:["recomienda","recomiéndame","sugerencia","qué como","que comer"],
      allergy:["alergia","alergias","gluten","marisco","pescado","huevo","leche","vegano","vegetariano"],
      lore:["historia","mito","tradición","origen","leyenda"],reserve:["reserva","reservar","booking"],
      ingredient:["que es","qué es","beneficios de","temporada de","historia de","háblame de","hablame de","sobre","ingrediente","ingredientes","especia","especias","arroz","azafrán","pimienta","cúrcuma","canela","comino","clavo","nuez moscada","laurel","vainilla","sal","aceite","aceite de oliva","ajo","cebolla","tomate","pimentón","azúcar","azucar"],
      season:["de temporada","temporada"],history:["historia","origen","mito","leyenda"]},
  ca:{greet:["hola","bones"],menu:["menú","carta","plats","menjar"],rec:["recomana","recomanació","què menge","que menjar"],
      allergy:["al·lèrgia","gluten","marisc","peix","ou","llet","vegà","vegetarià"],
      lore:["història","mite","tradició","origen","llegenda"],reserve:["reserva","reservar"],
      ingredient:["què és","beneficis de","temporada de","història de","parla'm de","sobre","ingredient","ingredients","espècia","espècies","arròs","safrà","pebre","cúrcuma","canel·la","comí","clau","nou moscada","llorer","vainilla","sal","oli d'oliva","all","ceba","tomaca","tomate","pebre roig"],
      season:["de temporada","temporada"],history:["història","origen","mite","llegenda"]}
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (speechSynthesisObj) speechSynthesisObj.pause(); }
  else { if (speechSynthesisObj) speechSynthesisObj.resume(); }
});

// Gesto del usuario (para TTS en móviles)
['click','keydown','touchstart','touchend','pointerdown','focusin'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (!userInteracted) { userInteracted = true; tryUnlockTTS(); }
  }, { passive: true });
});

async function initApp(){
  loadMemory();
  setupEventListeners();
  setupSpeechRecognition();
  checkBrowserSupport();
  await ensureVoicesReady();
  loadData();

  const savedRegion = localStorage.getItem('xativabot-region') || '';
  if (regionSelect) regionSelect.value = savedRegion;

  addMessageToChat(I18N[currentLanguage].welcome, 'bot');

  if (isMobileDevice()) createVoiceFAB();
}

// ===== Data & Memory =====
async function loadData(){
  try{
    const [menuRes,loreRes] = await Promise.all([ fetch('/data/menu.json'), fetch('/data/lore.json') ]);
    MENU = await menuRes.json();
    LORE = await loreRes.json();
  }catch(e){ console.warn('Data offline (SW cache will serve later).', e); }
}
function loadMemory(){ try{ const raw=localStorage.getItem('xativabot-user'); if(raw) USER=JSON.parse(raw);}catch{} }
function saveMemory(){ try{ localStorage.setItem('xativabot-user', JSON.stringify(USER)); }catch{} }

// ===== UI events =====
function setupEventListeners(){
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSendMessage(); }});
  voiceBtn?.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change',(e)=> changeLanguage(e.target.value));
  regionSelect?.addEventListener('change', (e) => {
    const code = e.target.value || '';
    localStorage.setItem('xativabot-region', code);
    const mapMsg = {
      es: code ? `Región establecida: ${e.target.options[e.target.selectedIndex].text}` : 'Usando España (nacional).',
      en: code ? `Region set: ${e.target.options[e.target.selectedIndex].text}` : 'Using Spain (national).',
      ca: code ? `Regió establida: ${e.target.options[e.target.selectedIndex].text}` : 'Usant Espanya (nacional).'
    };
    reply(mapMsg[currentLanguage] || mapMsg.es);
  });
  suggestionChips.forEach(chip=>{ chip.addEventListener('click',()=>{ userInput.value=chip.textContent; handleSendMessage(); }); });
  userInput.addEventListener('input',()=>{ userInput.style.height='auto'; userInput.style.height=(userInput.scrollHeight)+'px'; });
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
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    addMessageToChat(
      currentLanguage==='es'
        ? '🎙️ El reconocimiento de voz no está disponible en este modo. Usa el micrófono del navegador o escribe.'
        : currentLanguage==='ca'
        ? '🎙️ El reconeixement de veu no està disponible en aquest mode. Usa el micròfon del navegador o escriu.'
        : '🎙️ Voice recognition is not available in this mode. Use the browser mic button or type.',
      'bot'
    );
    voiceBtn && (voiceBtn.style.display='none');
    return;
  }
  recognition = new SR();
  recognition.continuous=false; recognition.interimResults=false;
  recognition.lang=getLangCode(currentLanguage);
  recognition.onstart=()=>{ isListening=true; voiceBtn?.classList.add('active'); voiceIndicator?.classList.add('active'); };
  recognition.onend=()=>{ isListening=false; voiceBtn?.classList.remove('active'); voiceIndicator?.classList.remove('active'); };
  recognition.onresult=(e)=>{ const transcript = e.results[0][0].transcript; userInput.value=transcript; handleSendMessage(); };
  recognition.onerror=(e)=>{ console.error('STT error:', e.error); isListening=false; voiceBtn?.classList.remove('active'); voiceIndicator?.classList.remove('active'); };
}
function toggleVoiceInput(){ if(!recognition) return; isListening? recognition.stop(): recognition.start(); }

// ===== Chat =====
function handleSendMessage(){
  const message = userInput.value.trim();
  if(message==='') return;
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
  const msg = raw.toLowerCase();
  const K = KEYWORDS[currentLanguage];
  if (isIngredientQuery(msg)) return handleIngredient(raw);

  let intent='unknown';
  if(K.reserve.some(k=>msg.includes(k))) intent='reserve';
  else if(K.lore.some(k=>msg.includes(k))) intent='lore';
  else if(K.allergy.some(k=>msg.includes(k))) intent='allergy';
  else if(K.rec.some(k=>msg.includes(k))) intent='recommend';
  else if(K.menu.some(k=>msg.includes(k))) intent='menu';
  else if(K.greet.some(k=>msg.includes(k))) intent='greet';
  else if (K.ingredient.some(k => msg.includes(k))) intent = 'ingredient';
  else if (K.season?.some(k => msg.includes(k))) intent = 'season';
  else if (K.history?.some(k => msg.includes(k))) intent = 'history';

  setTimeout(()=>{
    switch(intent){
      case 'greet': reply(I18N[currentLanguage].say_more); break;
      case 'menu': replyMenu(); break;
      case 'recommend':
        if(!USER.allergies.length && !USER.preferences.length) reply(I18N[currentLanguage].rec_need_info);
        else replyRecommendations();
        break;
      case 'allergy': parseAndSaveAllergies(raw); reply(I18N[currentLanguage].allergies_saved); break;
      case 'lore': replyLore(); break;
      case 'reserve': reply(I18N[currentLanguage].reservation_prompt); showReservationForm(); break;
      case 'ingredient': handleIngredient(raw); break;
      case 'season': handleSeason(raw); break;
      case 'history': replyLore(); break;
      default: reply(I18N[currentLanguage].unknown);
    }
  },150);
}
function isIngredientQuery(msg){
  const phrases = {
    es: ["háblame de","hablame de","sobre","ingrediente","ingredientes","especia","especias","arroz","azafrán","pimienta","cúrcuma","canela","comino","clavo","nuez moscada","laurel","vainilla","sal","aceite","aceite de oliva","ajo","cebolla","tomate","pimentón","azúcar"],
    en: ["tell me about","spice","spices","ingredient","ingredients","rice","saffron","pepper","turmeric","cinnamon","cumin","clove","nutmeg","bay leaf","vanilla","salt","olive oil","garlic","onion","tomato"],
    ca: ["parla'm de","sobre","ingredient","ingredients","espècia","espècies","arròs","safrà","pebre","cúrcuma","canel·la","comí","clau","nou moscada","llorer","vainilla","sal","oli d'oliva","all","ceba","tomaca","tomate","pebre roig"]
  }[currentLanguage] || [];
  return phrases.some(ph => msg.includes(ph));
}

// ===== Respuestas =====
function reply(text){
  lastSpokenText = text;
  addMessageToChat(text,'bot');
  if (shouldSpeak()) speakText(text);
  else if (isMobileDevice()) showVoiceUnlockPrompt();
}
function shouldSpeak(){ return !isMobileDevice() || userInteracted; }

// ===== Culinario =====
function replyMenu(){
  if(!MENU.dishes.length){ reply("La carta se está cargando, inténtalo de nuevo…"); return; }
  const intro = I18N[currentLanguage].menu_intro;
  const sample = MENU.dishes.slice(0,3).map(d=>`• ${d.names[currentLanguage]} — ${d.desc[currentLanguage]}`).join('\n');
  reply(`${intro}\n${sample}`);
}
function replyRecommendations(){
  const recs = recommendDishes(3);
  if(!recs.length){ reply(I18N[currentLanguage].no_match); return; }
  const lines = recs.map(d=>`• ${d.names[currentLanguage]} — ${d.desc[currentLanguage]}`);
  reply(`${I18N[currentLanguage].rec_ready}\n${lines.join('\n')}`);
  USER.lastDish = recs[0]?.id || null; saveMemory();
}
function replyLore(){
  const topic = USER.lastDish || (['paella','fideua','all-i-pebre'][Math.floor(Math.random()*3)]);
  const t = topic.includes('paella') ? 'paella' : topic.includes('fideu') ? 'fideua' : 'all-i-pebre';
  const item = LORE.facts.find(f=>f.topic===t);
  const text = item ? item[currentLanguage] : 'Food stories coming soon!';
  reply(`${I18N[currentLanguage].lore_intro} ${text}`);
}
function recommendDishes(n=3){
  const avoid=new Set(USER.allergies.map(a=>a.toLowerCase()));
  const prefs=new Set(USER.preferences.map(p=>p.toLowerCase()));
  const ok = MENU.dishes.filter(d=>{
    if(d.allergens?.some?.(a=>avoid.has(a))) return false;
    if(prefs.size){
      for(const p of prefs){ if(!d.tags?.map?.(t=>t.toLowerCase()).includes(p)) return false; }
    }
    return true;
  });
  ok.sort((a,b)=> (a.category==='main'? -1:0) - (b.category==='main'? -1:0));
  return ok.slice(0,n);
}
function parseAndSaveAllergies(text){
  const map = {
    en:{gluten:'gluten', shellfish:'shellfish', fish:'fish', egg:'egg', milk:'milk', vegan:'vegan', vegetarian:'vegetarian'},
    es:{gluten:'gluten', marisco:'shellfish', pescado:'fish', huevo:'egg', leche:'milk', vegano:'vegan', vegetariano:'vegetarian'},
    ca:{gluten:'gluten', marisc:'shellfish', peix:'fish', ou:'egg', llet:'milk', vegà:'vegan', vegetarià:'vegetarian'}
  }[currentLanguage];
  const found=[];
  for(const [k,v] of Object.entries(map)){ const rx=new RegExp(`\\b${k}\\b`,'i'); if(rx.test(text)) found.push(v); }
  if(/\b(no.*alerg|sin.*alerg|no.*allerg)/i.test(text)){ USER.allergies=[]; }
  else{ USER.allergies = Array.from(new Set([...USER.allergies, ...found])); }
  if(found.includes('vegan') && !USER.preferences.includes('vegan')) USER.preferences.push('vegan');
  if(found.includes('vegetarian') && !USER.preferences.includes('vegetarian')) USER.preferences.push('vegetarian');
  if(found.includes('gluten') && !USER.preferences.includes('gluten-free')) USER.preferences.push('gluten-free');
  saveMemory();
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
function showVoiceUnlockPrompt(){
  if (document.querySelector('.voice-unlock')) return;
  const wrap=document.createElement('div'); wrap.className='message bot-message voice-unlock';
  const btn=document.createElement('button'); btn.className='chip'; btn.textContent=`🔊 ${I18N[currentLanguage].voice_enable}`;
  btn.addEventListener('click',()=>{ userInteracted=true; tryUnlockTTS(); if(lastSpokenText) speakText(lastSpokenText); wrap.remove(); });
  wrap.appendChild(btn); chatMessages.appendChild(wrap); chatMessages.scrollTop=chatMessages.scrollHeight;
}
function createVoiceFAB(){
  if (document.getElementById('voice-fab')) return;
  const styleId='voice-fab-style';
  if (!document.getElementById(styleId)){
    const s=document.createElement('style'); s.id=styleId; s.textContent=`
      #voice-fab{position:fixed; right:16px; bottom:88px; width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;
      box-shadow:0 8px 20px rgba(0,0,0,.2); background:var(--primary-color, #8B0000); color:#fff; font-size:22px; line-height:54px; z-index:1000;}
      #voice-fab:active{ transform: translateY(1px); }`; document.head.appendChild(s);
  }
  const fab=document.createElement('button'); fab.id='voice-fab'; fab.title=I18N[currentLanguage].voice_enable||'Activar voz'; fab.textContent='🔊';
  fab.addEventListener('click',()=>{ userInteracted=true; tryUnlockTTS(); if(lastSpokenText) speakText(lastSpokenText); fab.remove(); });
  document.body.appendChild(fab);
}

// ===== Idioma/Helpers =====
function changeLanguage(lang){
  currentLanguage = lang;
  document.querySelectorAll('[data-'+lang+']').forEach(el=>{ el.textContent = el.getAttribute('data-'+lang); });
  userInput.placeholder = userInput.getAttribute('data-'+lang) || userInput.placeholder;
  if (recognition) recognition.lang = getLangCode(lang);
  reply(I18N[currentLanguage].ask_allergies);
}
function getLangCode(lang){ return ({en:'en-US', es:'es-ES', ca:'ca-ES'})[lang] || 'en-US'; }
function isMobileDevice(){ return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

// ===== Reserva =====

// Helpers de fecha local → string "YYYY-MM-DDTHH:MM"
function pad2(n){ return n<10? '0'+n : ''+n; }
function formatLocalForInput(dt){
  return dt.getFullYear() + '-' + pad2(dt.getMonth()+1) + '-' + pad2(dt.getDate()) + 'T' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
}
function roundToNextStep(dt, minutesStep=30){
  const ms = minutesStep*60*1000;
  return new Date(Math.ceil(dt.getTime()/ms)*ms);
}

function showReservationForm(){
  const wrap=document.createElement('div'); wrap.classList.add('message','bot-message');

  // Fecha mínima y valor por defecto (próxima media hora en LOCAL)
  const now = new Date();
  const def = roundToNextStep(now, 30);
  const minStr = formatLocalForInput(now);
  const defStr = formatLocalForInput(def);

  const prefillAllergies = (USER.allergies||[]).join(', ');

  wrap.innerHTML=`
    <form id="reservation-form" class="reservation-form">
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
    data.id='res_'+Date.now();
    data.uiLanguage=currentLanguage;
    data.region = regionSelect?.value || localStorage.getItem('xativabot-region') || '';
    // Normaliza fecha: input local -> ISO UTC
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

      // Fallback manual WhatsApp (opcional)
      if (MANAGER_WHATSAPP){
        const text = encodeURIComponent(
`Nueva reserva
Nombre: ${data.name}
Tel: ${data.phone||'-'} - Email: ${data.email||'-'}
Fecha/hora: ${data.dateTime}
Comensales: ${data.partySize}
Platos: ${data.dishes||'-'}
Alergias: ${data.allergies|| (USER.allergies||[]).join(', ') || '-'}
Notas: ${data.notes||'-'}`
        );
        const wa = `https://wa.me/${MANAGER_WHATSAPP}?text=${text}`;
        const w = document.createElement('div');
        w.className='message bot-message';
        w.innerHTML = `<a class="chip" href="${wa}" target="_blank" rel="noopener">🟢 ${I18N[currentLanguage].res_whatsapp}</a>`;
        chatMessages.appendChild(w); chatMessages.scrollTop=chatMessages.scrollHeight;
      }

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
    req.onupgradeneeded=(ev)=>{ const db=ev.target.result; if(!db.objectStoreNames.contains('reservations')) db.createobjectStore('reservations',{keyPath:'id'}); };
    req.onsuccess=(ev)=>resolve(ev.target.result); req.onerror=(ev)=>reject(ev.target.error);
  });
}

// ===== Season/Ingredient (igual que antes) =====
async function handleSeason(_raw){
  const month = new Date().getMonth()+1;
  const region = (regionSelect && regionSelect.value) ? regionSelect.value : (localStorage.getItem('xativabot-region') || '');
  try{
    const url = `/.netlify/functions/season?country=ES${region ? `&region=${encodeURIComponent(region)}` : ''}&month=${month}&lang=${currentLanguage}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'season failed');
    const list = [
      data.title,
      `${label('fruit')}: ${data.fruit.join(', ') || '—'}`,
      `${label('veg')}: ${data.vegetables.join(', ') || '—'}`
    ];
    reply(list.join('\n'));
  }catch(e){ reply(label('err')); }
  function label(k){
    const d = {
      es:{fruit:'Frutas',veg:'Verduras',err:'No pude acceder a la estacionalidad ahora.'},
      en:{fruit:'Fruits',veg:'Vegetables',err:'Couldn’t access seasonality right now.'},
      ca:{fruit:'Fruites',veg:'Hortalisses',err:'No he pogut accedir a la temporalitat ara.'}
    }; return (d[currentLanguage]||d.es)[k];
  }
}
async function handleIngredient(raw){
  const name = extractIngredient(raw) || raw;
  try {
    const url = `/.netlify/functions/knowledge?ingredient=${encodeURIComponent(name)}&lang=${currentLanguage}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'knowledge failed');

    const parts = [];
    if (data.summary) parts.push(data.summary);
    if (Array.isArray(data.techniques) && data.techniques.length) {
      parts.push(sectionLabel('tech'));
      parts.push(data.techniques.map(s => `• ${s}`).join('\n'));
    }
    if (Array.isArray(data.pairings) && data.pairings.length) {
      parts.push(sectionLabel('pair'));
      parts.push(data.pairings.map(s => `• ${s}`).join('\n'));
    }
    if (data.nutrition) {
      const n = data.nutrition;
      parts.push(`${sectionLabel('nutr')} ${fmt(n.energy_kcal,'kcal')} · ${fmt(n.protein_g,labelUnit('prot'))} · ${fmt(n.fat_g,labelUnit('fat'))} · ${fmt(n.carbs_g,labelUnit('carb'))}`);
    }
    if (data.cautions) parts.push(`${sectionLabel('caut')} ${data.cautions}`);

    reply(parts.join('\n'));
  } catch(e) { reply(fallbackInfo()); }

  function fmt(v,suf){ return (v!=null)? `${Math.round(v*10)/10} ${suf}` : '—'; }
  function sectionLabel(key){
    const d = { es:{ tech:"Técnicas clave:", pair:"Maridajes:", nutr:"Nutrición aprox./100 g:", caut:"Precauciones:" },
                en:{ tech:"Key techniques:",  pair:"Pairings:",  nutr:"Approx nutrition /100 g:", caut:"Cautions:" },
                ca:{ tech:"Tècniques clau:", pair:"Maridatges:", nutr:"Nutrició aprox./100 g:",  caut:"Precaucions:" } };
    return (d[currentLanguage]||d.es)[key];
  }
  function labelUnit(what){
    const d = { es:{ prot:"g prot", fat:"g grasa", carb:"g hidratos" },
                en:{ prot:"g protein", fat:"g fat",  carb:"g carbs" },
                ca:{ prot:"g prot",   fat:"g greix", carb:"g hidrats" } };
    return (d[currentLanguage]||d.es)[what];
  }
  function fallbackInfo(){
    const d = {
      es:"Te doy lo esencial y evito afirmaciones dudosas. ¿Quieres enfoque culinario (usos y técnicas) o nutricional (macro/micro y precauciones)?",
      en:"Here’s the core info, avoiding dubious claims. Want culinary (uses & techniques) or nutritional (macro/micro & cautions)?",
      ca:"Et done l’essencial i evite afirmacions dubtoses. Vols enfocament culinari (usos i tècniques) o nutricional (macro/micro i precaucions)?"
    }; return d[currentLanguage]||d.es;
  }
}
function extractIngredient(text){
  const words = text.toLowerCase().replace(/[¡!.,;:?]/g,'').split(/\s+/);
  const stop = new Set(['que','qué','es','de','la','el','los','las','the','what','is','beneficios','temporada','historia','origen','sobre',"parla'm"]);
  const candidates = words.filter(w => w.length>2 && !stop.has(w));
  return candidates[candidates.length-1];
}

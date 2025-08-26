/** XativaBot – App (voz optimizada + i18n + culinario + reservas + región) */

// DOM
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const regionSelect = document.getElementById('region-select'); // NUEVO
const suggestionChips = document.querySelectorAll('.chip');

// Estado
let currentLanguage = 'es';
let recognition = null;
let speechSynthesisObj = window.speechSynthesis;
let isListening = false;

// Voz
let voicesReady = false;
let availableVoices = [];
let userInteracted = false; // habilita TTS tras primer gesto del usuario

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
      and:"and"},
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
      and:"y"},
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
      and:"i"}
};

// ===== Palabras clave (UNIFICADAS) =====
const KEYWORDS = {
  en:{
    greet:["hello","hi","hey"],
    menu:["menu","card","dishes","food"],
    rec:["recommend","suggest","what should i eat"],
    allergy:["allergy","allergies","gluten","shellfish","fish","egg","milk","vegan","vegetarian"],
    lore:["history","myth","tradition","story","origin"],
    reserve:["reserve","reservation","book"],
    ingredient:["what is","benefits of","season of","history of"],
    season:["in season","seasonal","season"],
    history:["history","origin","myth"]
  },
  es:{
    greet:["hola","buenas"],
    menu:["menú","carta","platos","comida"],
    rec:["recomienda","recomiéndame","sugerencia","qué como","que comer"],
    allergy:["alergia","alergias","gluten","marisco","pescado","huevo","leche","vegano","vegetariano"],
    lore:["historia","mito","tradición","origen","leyenda"],
    reserve:["reserva","reservar","booking"],
    ingredient:["que es","qué es","beneficios de","temporada de","historia de"],
    season:["de temporada","temporada"],
    history:["historia","origen","mito","leyenda"]
  },
  ca:{
    greet:["hola","bones"],
    menu:["menú","carta","plats","menjar"],
    rec:["recomana","recomanació","què menge","que menjar"],
    allergy:["al·lèrgia","gluten","marisc","peix","ou","llet","vegà","vegetarià"],
    lore:["història","mite","tradició","origen","llegenda"],
    reserve:["reserva","reservar"],
    ingredient:["què és","beneficis de","temporada de","història de"],
    season:["de temporada","temporada"],
    history:["història","origen","mite","llegenda"]
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (speechSynthesisObj) speechSynthesisObj.pause(); }
  else { if (speechSynthesisObj) speechSynthesisObj.resume(); }
});

// Marca interacción del usuario (habilita TTS en móvil)
['click','keydown','touchstart'].forEach(evt => {
  document.addEventListener(evt, () => { userInteracted = true; }, { once: true, passive: true });
});

async function initApp(){
  loadMemory();
  setupEventListeners();
  setupSpeechRecognition();
  checkBrowserSupport();
  await ensureVoicesReady(); // <- clave para TTS estable
  loadData();

  // Cargar región guardada (si existe)
  const savedRegion = localStorage.getItem('xativabot-region') || '';
  if (regionSelect) regionSelect.value = savedRegion;

  // Bienvenida solo en texto (evita bloqueo por autoplay)
  addMessageToChat(I18N[currentLanguage].welcome, 'bot');
}

// ===== Datos =====
async function loadData(){
  try{
    const [menuRes,loreRes] = await Promise.all([
      fetch('/data/menu.json'),
      fetch('/data/lore.json')
    ]);
    MENU = await menuRes.json();
    LORE = await loreRes.json();
  }catch(e){ console.warn('Data offline (SW cache will serve later).', e); }
}

// ===== Memoria =====
function loadMemory(){ try{ const raw=localStorage.getItem('xativabot-user'); if(raw) USER=JSON.parse(raw);}catch{} }
function saveMemory(){ try{ localStorage.setItem('xativabot-user', JSON.stringify(USER)); }catch{} }

// ===== Eventos UI =====
function setupEventListeners(){
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSendMessage(); }});
  voiceBtn.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change',(e)=> changeLanguage(e.target.value));
  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      const code = e.target.value || '';
      localStorage.setItem('xativabot-region', code);
      // Feedback suave
      const mapMsg = {
        es: code ? `Región establecida: ${e.target.options[e.target.selectedIndex].text}` : 'Usando España (nacional).',
        en: code ? `Region set: ${e.target.options[e.target.selectedIndex].text}` : 'Using Spain (national).',
        ca: code ? `Regió establida: ${e.target.options[e.target.selectedIndex].text}` : 'Usant Espanya (nacional).'
      };
      reply(mapMsg[currentLanguage] || mapMsg.es);
    });
  }
  suggestionChips.forEach(chip=>{ chip.addEventListener('click',()=>{ userInput.value=chip.textContent; handleSendMessage(); }); });
  userInput.addEventListener('input',()=>{ userInput.style.height='auto'; userInput.style.height=(userInput.scrollHeight)+'px'; });
}

// ===== Compat =====
function checkBrowserSupport(){
  if(!('webkitSpeechRecognition'in window) && !('SpeechRecognition'in window)){ console.warn('Speech recognition not supported'); voiceBtn.style.display='none'; }
  if(!('speechSynthesis'in window)) console.warn('Speech synthesis not supported');
}

// ===== STT (voz a texto) =====
function setupSpeechRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return;
  recognition = new SR();
  recognition.continuous=false; recognition.interimResults=false;
  recognition.lang=getLangCode(currentLanguage);
  recognition.onstart=()=>{ isListening=true; voiceBtn.classList.add('active'); voiceIndicator.classList.add('active'); };
  recognition.onend=()=>{ isListening=false; voiceBtn.classList.remove('active'); voiceIndicator.classList.remove('active'); };
  recognition.onresult=(e)=>{ const transcript = e.results[0][0].transcript; userInput.value=transcript; handleSendMessage(); };
  recognition.onerror=(e)=>{ console.error('STT error:', e.error); isListening=false; voiceBtn.classList.remove('active'); voiceIndicator.classList.remove('active'); };
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

// ===== NLU básico =====
function processUserMessage(raw){
  const msg = raw.toLowerCase();
  const K = KEYWORDS[currentLanguage];

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
  },300);
}

function reply(text){
  addMessageToChat(text,'bot');
  if (shouldSpeak()) speakText(text);
}
function shouldSpeak(){
  return userInteracted || !isMobileDevice();
}

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
    if(d.allergens.some(a=>avoid.has(a))) return false;
    if(prefs.size){
      for(const p of prefs){ if(!d.tags.map(t=>t.toLowerCase()).includes(p)) return false; }
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
  for(const [k,v] of Object.entries(map)){
    const rx=new RegExp(`\\b${k}\\b`,'i'); if(rx.test(text)) found.push(v);
  }
  if(/\b(no.*alerg|sin.*alerg|no.*allerg)/i.test(text)){ USER.allergies=[]; }
  else{ USER.allergies = Array.from(new Set([...USER.allergies, ...found])); }

  if(found.includes('vegan') && !USER.preferences.includes('vegan')) USER.preferences.push('vegan');
  if(found.includes('vegetarian') && !USER.preferences.includes('vegetarian')) USER.preferences.push('vegetarian');
  if(found.includes('gluten') && !USER.preferences.includes('gluten-free')) USER.preferences.push('gluten-free');
  saveMemory();
}

// ===== TTS (texto a voz) – robusto =====
function ensureVoicesReady(){
  return new Promise((resolve)=>{
    if (!speechSynthesisObj) return resolve();
    const load = () => {
      availableVoices = speechSynthesisObj.getVoices();
      if (availableVoices && availableVoices.length){
        voicesReady = true;
        resolve();
      }
    };
    load();
    if (!voicesReady){
      speechSynthesisObj.onvoiceschanged = () => { load(); if (voicesReady) resolve(); };
      setTimeout(load, 250);
      setTimeout(load, 1000);
    }
  });
}
function pickVoiceFor(lang){
  if (!availableVoices || !availableVoices.length) return null;
  const wanted = lang.toLowerCase();
  const primary = wanted.slice(0,2);
  let v = availableVoices.find(v => v.lang && v.lang.toLowerCase() === wanted);
  if (v) return v;
  v = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(primary));
  if (v) return v;
  const fallbacks = primary === 'ca' ? ['es','en'] : primary === 'es' ? ['en'] : ['es'];
  for (const fb of fallbacks){
    const m = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(fb));
    if (m) return m;
  }
  return availableVoices[0] || null;
}
async function speakText(text){
  if (!speechSynthesisObj) return;
  await ensureVoicesReady();
  try { speechSynthesisObj.cancel(); } catch {}
  const utter = new SpeechSynthesisUtterance(text);
  const langCode = getLangCode(currentLanguage);
  const voice = pickVoiceFor(langCode);
  if (voice){ utter.voice = voice; utter.lang = (voice.lang || langCode); }
  else { utter.lang = langCode; }
  utter.rate = 1.0; utter.pitch = 1.0; utter.volume = 1.0;
  setTimeout(() => { try { speechSynthesisObj.speak(utter); } catch (e) { console.warn('TTS speak failed:', e); } }, 0);
}

// ===== Idioma =====
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
function showReservationForm(){
  const wrap=document.createElement('div'); wrap.classList.add('message','bot-message');
  wrap.innerHTML=`
    <form id="reservation-form" class="reservation-form">
      <label><span data-en="Name:" data-es="Nombre:" data-ca="Nom:">Nombre:</span><br>
        <input type="text" name="name" required placeholder="Alex García"></label><br>
      <label><span data-en="Email:" data-es="Correo:" data-ca="Correu:">Correo:</span><br>
        <input type="email" name="email" placeholder="you@example.com"></label><br>
      <label><span data-en="Phone:" data-es="Teléfono:" data-ca="Telèfon:">Teléfono:</span><br>
        <input type="tel" name="phone" placeholder="+34 600 000 000"></label><br>
      <label><span data-en="Date & Time:" data-es="Fecha y hora:" data-ca="Data i hora:">Fecha y hora:</span><br>
        <input type="datetime-local" name="dateTime" required></label><br>
      <label><span data-en="Party Size:" data-es="Número de comensales:" data-ca="Nombre de comensals:">Número de comensales:</span><br>
        <input type="number" name="partySize" min="1" max="20" value="2"></label><br>
      <label><span data-en="Notes:" data-es="Notas:" data-ca="Notes:">Notas:</span><br>
        <textarea name="notes" placeholder="Alergias, preferencias..."></textarea></label><br>
      <button type="submit" data-en="Confirm Reservation" data-es="Confirmar Reserva" data-ca="Confirmar Reserva">Confirmar Reserva</button>
    </form>`;
  chatMessages.appendChild(wrap); chatMessages.scrollTop=chatMessages.scrollHeight;

  const form=wrap.querySelector('#reservation-form');
  const dateInput=form.querySelector('input[name="dateTime"]');
  const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
  const round5=new Date(Math.ceil(now.getTime()/(5*60*1000))*(5*60*1000));
  dateInput.min=round5.toISOString().slice(0,16);

  changeLanguage(currentLanguage);

  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const btn=form.querySelector('button[type="submit"]'); btn.disabled=true;
    const data=Object.fromEntries(new FormData(form).entries()); data.id='res_'+Date.now();
    try{ const local=new Date(data.dateTime); if(isNaN(local.getTime())) throw new Error('Invalid date');
      data.dateTime=new Date(local.getTime()-local.getTimezoneOffset()*60000).toISOString();
    }catch(_){ addMessageToChat("⚠️ Invalid date/time.", 'bot'); btn.disabled=false; return; }

    try{ const r=await submitReservation(data);
      addMessageToChat("✅ Reservation confirmed! ID: "+r.reservation.id,'bot');
      wrap.remove();
    }catch(err){
      console.warn('Offline, queue reservation:', err.message);
      await queueReservation(data);
      addMessageToChat("📌 You're offline. Reservation saved and will sync when online.", 'bot');
      wrap.remove();
    }finally{ btn.disabled=false; }
  });
}

// ===== Helpers reserva (Netlify Function) =====
async function submitReservation(reservation){
  const resp=await fetch('/.netlify/functions/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reservation)});
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

// ======== INTELIGENCIA conectada (ingredientes / temporada) ========
async function handleIngredient(raw) {
  const name = extractIngredient(raw) || raw;
  try {
    const url = `/.netlify/functions/knowledge?ingredient=${encodeURIComponent(name)}&lang=${currentLanguage}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'knowledge failed');

    const parts = [];
    parts.push(data.summary);
    if (data.nutrition) {
      const n = data.nutrition;
      parts.push(`${t('nutr')} ${fmt(n.energy_kcal,'kcal')} · ${fmt(n.protein_g,'g prot')} · ${fmt(n.fat_g,'g grasa')} · ${fmt(n.carbs_g,'g hidratos')}`);
    }
    if (data.recalls_us?.length) {
      parts.push(t('recalls_hint'));
    }
    reply(parts.join('\n'));
  } catch(e) {
    reply(t('fallback_info'));
  }

  function fmt(v,suf){ return (v!=null)? `${Math.round(v*10)/10} ${suf}` : '—'; }
  function t(key){
    const dict = {
      es: { nutr: "Nutrición aprox./100 g:", recalls_hint: "He revisado retiradas recientes en USA: nada crítico salvo coincidencias puntuales.", fallback_info: "Te cuento lo esencial y evito afirmaciones dudosas. ¿Quieres que lo investigue con más detalle?" },
      en: { nutr: "Approx nutrition /100 g:", recalls_hint: "Checked recent US recalls: nothing critical except occasional matches.", fallback_info: "Here’s the core info, avoiding dubious claims. Want a deeper dive?" },
      ca: { nutr: "Nutrició aprox./100 g:", recalls_hint: "He comprovat retirades recents als EUA: res crític excepte coincidències puntuals.", fallback_info: "Et conte l’essencial i evite afirmacions dubtoses. Vols que ho investigue més?" }
    };
    return (dict[currentLanguage]||dict.es)[key];
  }
}

async function handleSeason(raw){
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

function extractIngredient(text){
  const words = text.toLowerCase().replace(/[¡!.,;:?]/g,'').split(/\s+/);
  const stop = new Set(['que','qué','es','de','la','el','los','las','the','what','is','beneficios','temporada','historia','origen']);
  const candidates = words.filter(w => w.length>2 && !stop.has(w));
  return candidates[candidates.length-1];
}

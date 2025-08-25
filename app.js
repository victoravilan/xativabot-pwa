/** XativaBot – App (culinario + i18n + voz + reservas) */

// DOM
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const suggestionChips = document.querySelectorAll('.chip');

// State
let currentLanguage = 'es';
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isListening = false;

// Data
let MENU = { dishes: [] };
let LORE = { facts: [] };

// User memory
let USER = { allergies: [], preferences: [], lastDish: null };

// i18n texts
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

// Keywords
const KEYWORDS = {
  en:{greet:["hello","hi","hey"],menu:["menu","card","dishes","food"],rec:["recommend","suggest","what should i eat"],
      allergy:["allergy","allergies","gluten","shellfish","fish","egg","milk","vegan","vegetarian"],
      lore:["history","myth","tradition","story","origin"],reserve:["reserve","reservation","book"]},
  es:{greet:["hola","buenas"],menu:["menú","carta","platos","comida"],rec:["recomienda","recomiéndame","sugerencia","qué como","que comer"],
      allergy:["alergia","alergias","gluten","marisco","pescado","huevo","leche","vegano","vegetariano"],
      lore:["historia","mito","tradición","origen","leyenda"],reserve:["reserva","reservar","booking"]},
  ca:{greet:["hola","bones"],menu:["menú","carta","plats","menjar"],rec:["recomana","recomanació","què menge","que menjar"],
      allergy:["al·lèrgia","gluten","marisc","peix","ou","llet","vegà","vegetarià"],
      lore:["història","mite","tradició","origen","llegenda"],reserve:["reserva","reservar"]}
};

// Init
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (speechSynthesis) speechSynthesis.pause(); }
  else { if (speechSynthesis) speechSynthesis.resume(); }
});

function initApp(){
  loadMemory();
  setupEventListeners();
  setupSpeechRecognition();
  checkBrowserSupport();
  loadData();
  // saludo inicial según idioma
  reply(I18N[currentLanguage].welcome);
}

async function loadData(){
  try{
    const [menuRes,loreRes] = await Promise.all([
      fetch('/data/menu.json'),
      fetch('/data/lore.json')
    ]);
    MENU = await menuRes.json();
    LORE = await loreRes.json();
  }catch(e){ console.warn('Data offline (SW cache will provide when available).', e); }
}

// memory
function loadMemory(){ try{ const raw=localStorage.getItem('xativabot-user'); if(raw) USER=JSON.parse(raw);}catch{} }
function saveMemory(){ try{ localStorage.setItem('xativabot-user', JSON.stringify(USER)); }catch{} }

// listeners
function setupEventListeners(){
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSendMessage(); }});
  voiceBtn.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change',(e)=> changeLanguage(e.target.value));
  suggestionChips.forEach(chip=>{ chip.addEventListener('click',()=>{ userInput.value=chip.textContent; handleSendMessage(); }); });
  userInput.addEventListener('input',()=>{ userInput.style.height='auto'; userInput.style.height=(userInput.scrollHeight)+'px'; });
}

function checkBrowserSupport(){
  if(!('webkitSpeechRecognition'in window) && !('SpeechRecognition'in window)){ console.warn('Speech recognition not supported'); voiceBtn.style.display='none'; }
  if(!('speechSynthesis'in window)) console.warn('Speech synthesis not supported');
}

// STT
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

// chat
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

// NLU básico
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
      default: reply(I18N[currentLanguage].unknown);
    }
  },400);
}

function reply(text){ addMessageToChat(text,'bot'); if(!isMobileDevice()) speakText(text); }

// culinario
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
  const prefs=new Set(USER.preferences.map(p=>p.toLowerCase())); // vegan, vegetarian, gluten-free
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

// TTS
function speakText(text){
  if(!speechSynthesis) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=getLangCode(currentLanguage);
  const voices=speechSynthesis.getVoices();
  const lc=getLangCode(currentLanguage).substring(0,2);
  const v=voices.find(v=>v.lang.toLowerCase().startsWith(lc)); if(v) u.voice=v;
  speechSynthesis.speak(u);
}

// idioma
function changeLanguage(lang){
  currentLanguage = lang;
  document.querySelectorAll('[data-'+lang+']').forEach(el=>{ el.textContent = el.getAttribute('data-'+lang); });
  userInput.placeholder = userInput.getAttribute('data-'+lang) || userInput.placeholder;
  if(recognition) recognition.lang = getLangCode(lang);
  reply(I18N[currentLanguage].ask_allergies);
}
function getLangCode(lang){ return ({en:'en-US', es:'es-ES', ca:'ca-ES'})[lang] || 'en-US'; }
function isMobileDevice(){ return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

// ====== Reserva (form) ======
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

// reserva helpers (Netlify Function)
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

/** XativaBot – App (culinario ampliado + reservas por restaurante Barcelona + voz + i18n) */

// ===== DOM =====
const chatMessages = document.getElementById('chat-messages');
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
let lastSpokenText = '';

let MENU = { dishes: [] };
let LORE = { facts: [] };

let USER = {
  allergies: [],
  preferences: [],
  lastDish: null,
  preferredRestaurant: null // 'les_corts' | 'gracia' | 'sant_antoni'
};

// ===== i18n UI =====
const I18N = {
  en:{
    welcome:"Welcome to Xativa! I'm AlexBot, your culinary assistant. Ask me about ingredients, techniques, traditions—or book a reservation.",
    ask_allergies:"Any allergies or dietary restrictions?",
    menu_intro:"Here are a few highlights from our menu:",
    rec_ready:"Based on your preferences, I recommend:",
    rec_need_info:"Tell me allergies or diet preferences and I’ll tailor suggestions.",
    saved_prefs:"Noted. I’ll remember that.",
    no_match:"I couldn’t find a safe match. Want gluten-free or vegetarian options?",
    lore_intro:"Did you know?",
    reservation_prompt:"Great. Choose the restaurant and fill the details:",
    allergies_saved:"Allergies/preferences saved.",
    say_more:"What are you in the mood for today?",
    unknown:"Thanks for your message. How else can I help?",
    and:"and",
    voice_enable:"Tap to enable voice",
    res_thanks:"✅ Reservation received.",
    res_offline:"📌 You’re offline. It will sync when back.",
    res_whatsapp:"Notify via WhatsApp",
    pick_restaurant:"Please select the restaurant: Les Corts, Gràcia or Sant Antoni."
  },
  es:{
    welcome:"¡Bienvenido a Xativa! Soy AlexBot, tu asistente culinario. Pregúntame por ingredientes, técnicas, tradiciones… o realiza una reserva.",
    ask_allergies:"¿Alguna alergia o restricción?",
    menu_intro:"Algunos destacados de la carta:",
    rec_ready:"Según tus preferencias, te recomiendo:",
    rec_need_info:"Cuéntame alergias o preferencias dietéticas y afino las sugerencias.",
    saved_prefs:"Anotado. Lo recordaré.",
    no_match:"No encontré un plato seguro. ¿Quieres ver opciones sin gluten o vegetarianas?",
    lore_intro:"¿Sabías que…?",
    reservation_prompt:"Perfecto. Elige restaurante y completa los datos:",
    allergies_saved:"Alergias/preferencias guardadas.",
    say_more:"¿Qué te apetece hoy?",
    unknown:"Gracias por tu mensaje. ¿En qué más puedo ayudarte?",
    and:"y",
    voice_enable:"Toca para activar la voz",
    res_thanks:"✅ Reserva recibida.",
    res_offline:"📌 Estás sin conexión. Se enviará al volver.",
    res_whatsapp:"Notificar por WhatsApp",
    pick_restaurant:"Selecciona el restaurante: Les Corts, Gràcia o Sant Antoni."
  },
  ca:{
    welcome:"Benvingut a Xativa! Sóc l’AlexBot, el teu assistent culinari. Pregunta’m per ingredients, tècniques, tradicions… o fes una reserva.",
    ask_allergies:"Tens cap al·lèrgia o restricció?",
    menu_intro:"Alguns destacats de la carta:",
    rec_ready:"Segons les teves preferències, et recomane:",
    rec_need_info:"Digue’m al·lèrgies o preferències i afinaré les propostes.",
    saved_prefs:"Anotat. Ho recordaré.",
    no_match:"No he trobat cap plat segur. Vols opcions sense gluten o vegetarianes?",
    lore_intro:"Sabies que…?",
    reservation_prompt:"Genial. Tria el restaurant i completa les dades:",
    allergies_saved:"Al·lèrgies/preferències guardades.",
    say_more:"Què et ve de gust avui?",
    unknown:"Gràcies pel teu missatge. En què més puc ajudar-te?",
    and:"i",
    voice_enable:"Toca per activar la veu",
    res_thanks:"✅ Reserva rebuda.",
    res_offline:"📌 Fora de línia. S’enviarà en tornar.",
    res_whatsapp:"Notificar per WhatsApp",
    pick_restaurant:"Selecciona el restaurant: Les Corts, Gràcia o Sant Antoni."
  }
};

// ===== Palabras clave / Intents =====
const KEYWORDS = {
  es:{
    greet:["hola","buenas","buenos días","buenas tardes","buenas noches"],
    menu:["menú","carta","platos","comida","recomendación"],
    rec:["recomienda","recomiéndame","sugerencia","que comer","qué como"],
    allergy:["alergia","alergias","gluten","marisco","pescado","huevo","leche","vegano","vegetariano","celiaco","celíaco","intolerancia"],
    lore:["historia","mito","tradición","origen","leyenda"],
    reserve:["reserva","reservar","booking","mesa","mesa para"],
    restaurant:["les corts","corts","gracia","gràcia","sant antoni","santantoni","antoni","muntaner","bordeus","torrent d’en vidalet","torrent d'en vidalet","vidalet"],
    ingredient:["háblame de","hablame de","sobre","ingrediente","ingredientes","especia","especias","arroz","azafrán","pimienta","cúrcuma","canela","comino","clavo","nuez moscada","laurel","vainilla","sal","aceite de oliva","ajo","cebolla","tomate","pimentón","azúcar"]
  },
  en:{
    greet:["hello","hi","hey"],
    menu:["menu","card","dishes","food","recommendation"],
    rec:["recommend","suggest","what should i eat"],
    allergy:["allergy","allergies","gluten","shellfish","fish","egg","milk","vegan","vegetarian","lactose"],
    lore:["history","myth","tradition","origin","legend"],
    reserve:["reserve","reservation","book","table"],
    restaurant:["les corts","gracia","gràcia","sant antoni","muntaner","bordeus","torrent d'en vidalet","vidalet"],
    ingredient:["tell me about","ingredient","ingredients","spice","spices","rice","saffron","pepper","turmeric","cinnamon","cumin","clove","nutmeg","bay leaf","vanilla","salt","olive oil","garlic","onion","tomato","paprika","sugar"]
  },
  ca:{
    greet:["hola","bones"],
    menu:["menú","carta","plats","menjar","recomanació"],
    rec:["recomana","recomanació","què menge","que menjar"],
    allergy:["al·lèrgia","gluten","marisc","peix","ou","llet","vegà","vegetarià","intolerància"],
    lore:["història","mite","tradició","origen","llegenda"],
    reserve:["reserva","reservar","taula"],
    restaurant:["les corts","gràcia","gracia","sant antoni","muntaner","bordeus","torrent d’en vidalet","torrent d'en vidalet","vidalet"],
    ingredient:["parla'm de","sobre","ingredient","ingredients","espècia","espècies","arròs","safrà","pebre","cúrcuma","canel·la","comí","clau","nou moscada","llorer","vainilla","sal","oli d'oliva","all","ceba","tomàquet","pebre roig","paprika","sucre"]
  }
};

// ===== Dataset culinario local (extracto ampliable) =====
const CULINARY = {
  es: {
    "arroz": {
      summary: "Base de la paella; variedad bomba o senia absorbe caldo sin romperse. El almidón aporta textura cremosa si se controla el punto.",
      techniques: ["Sofreír base (sofrito) y nacarar el arroz", "Hervor vivo 8–10 min + fuego medio 8–10 min", "Reposo 3–5 min para asentar granos"],
      pairings: ["Caldo de pescado o pollo", "Azafrán", "Pimentón", "All i oli", "Verduras de temporada", "Mariscos"],
      nutrition: { energy_kcal: 346, protein_g: 6.7, fat_g: 0.9, carbs_g: 76 },
      culture: "En la paella tradicional no se remueve tras añadir el caldo; el ‘socarrat’ es apreciado."
    },
    "azafrán": {
      summary: "Especia de los estigmas del Crocus sativus, aporta aroma floral, notas de heno y color dorado.",
      techniques: ["Tostar levemente hebras y infusionar en caldo caliente", "Evitar exceso de calor directo para no volatilizar aromas"],
      pairings: ["Arroz", "Pescados", "Caldo de pollo", "Marisco", "Cítricos suaves"],
      nutrition: { energy_kcal: 310, protein_g: 11, fat_g: 6, carbs_g: 65 },
      culture: "En la paella valenciana se usa sutilmente; su uso se documenta desde la Antigüedad en la cuenca mediterránea."
    },
    "aceite de oliva": {
      summary: "Grasa matriz de la cocina mediterránea; AOVE aporta frutado, amargor y picor equilibrados.",
      techniques: ["Sofritos a baja-media temperatura", "Emulsiones (allioli, mahonesa)", "Acabados en crudo"],
      pairings: ["Tomate", "Ajo", "Pescado azul", "Hierbas frescas", "Cítricos"],
      nutrition: { energy_kcal: 884, protein_g: 0, fat_g: 100, carbs_g: 0 },
      culture: "El perfil varía por variedad (picual, hojiblanca, arbequina); usar AOVE temprano realza amargos frescos."
    },
    "ajo": {
      summary: "Sulfhidratos que, al cortarse, forman alicina: aroma penetrante, dulce cuando se confita.",
      techniques: ["Lámina fina para dorar", "Confitado en AOVE", "Majado en mortero (allioli)"],
      pairings: ["Tomate", "Pescados", "Aceite de oliva", "Hierbas mediterráneas"],
      nutrition: { energy_kcal: 149, protein_g: 6.4, fat_g: 0.5, carbs_g: 33 },
      culture: "Evitar que se queme (amarga); retirarlo cuando esté rubio para aromatizar el aceite."
    },
    "tomate": {
      summary: "Ácido y umami (glutamato natural). Variedades carnosas para sofritos; pera para salsas.",
      techniques: ["Escaldar y pelar", "Sofreír largo para concentrar", "Asar y triturar"],
      pairings: ["Aceite de oliva", "Ajo", "Pimentón", "Arroz", "Pescados blancos"],
      nutrition: { energy_kcal: 18, protein_g: 0.9, fat_g: 0.2, carbs_g: 3.9 },
      culture: "Un sofrito bien cocinado es la base de infinidad de arroces y guisos."
    },
    "pimentón": {
      summary: "Dulce o ahumado; da color y dulzor. Tostarlo brevemente para desplegar aroma.",
      techniques: ["Añadir fuera del fuego y mezclar rápido para que no amargue", "Usar en adobos y sofritos"],
      pairings: ["Arroz", "Tomate", "Ajo", "Pescado", "Embutidos"],
      nutrition: { energy_kcal: 282, protein_g: 14, fat_g: 13, carbs_g: 54 },
      culture: "El pimentón de la Vera aporta ahumado; el murciano es más dulce y limpio."
    }
  },
  en: {
    "rice": {
      summary: "Backbone of paella; bomba/senia absorb stock without bursting. Starch gives creaminess if timing is right.",
      techniques: ["Sauté sofrito, then pearl the rice", "Rolling boil 8–10 min + medium heat 8–10 min", "Rest 3–5 min"],
      pairings: ["Fish or chicken stock","Saffron","Paprika","Aioli","Seasonal veg","Shellfish"],
      nutrition: { energy_kcal: 346, protein_g: 6.7, fat_g: 0.9, carbs_g: 76 },
      culture: "Don’t stir after stock goes in; the prized socarrat forms at the base."
    },
    "saffron": {
      summary: "Stigmas of Crocus sativus; floral, hay-like aroma and golden hue.",
      techniques: ["Lightly toast strands, infuse in hot stock","Avoid direct high heat"],
      pairings: ["Rice","Seafood","Light citrus","Chicken stock"],
      nutrition: { energy_kcal: 310, protein_g: 11, fat_g: 6, carbs_g: 65 },
      culture: "Used across the Mediterranean since antiquity; in paella, restraint is key."
    }
  },
  ca: {
    "arròs": {
      summary: "Eix de la paella; varietats bomba/senia absorbeixen brou sense rebentar.",
      techniques: ["Sofregit i enrossir el gra","Bull viu 8–10 min + mig 8–10 min","Repòs 3–5 min"],
      pairings: ["Brou de peix o pollastre","Safrà","Pebre roig","Allioli","Verdures","Marisc"],
      nutrition: { energy_kcal: 346, protein_g: 6.7, fat_g: 0.9, carbs_g: 76 },
      culture: "No es remena després del brou; el socarrat és molt apreciat."
    },
    "safrà": {
      summary: "Estigmes de Crocus sativus; aroma floral i color or.",
      techniques: ["Torrar lleu i infusionar","Evitar calor directa forta"],
      pairings: ["Arròs","Peix","Brou de pollastre","Cítrics suaus"],
      nutrition: { energy_kcal: 310, protein_g: 11, fat_g: 6, carbs_g: 65 },
      culture: "Present a la cuina mediterrània des de l’antiguitat."
    }
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { try{ speechSynthesisObj.pause(); }catch{} }
  else { try{ speechSynthesisObj.resume(); }catch{} }
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
  loadData();
  addMessageToChat(I18N[currentLanguage].welcome, 'bot');
}

// ===== Data / Memory =====
async function loadData(){
  try{
    const [menuRes,loreRes] = await Promise.all([
      fetch('/data/menu.json'),
      fetch('/data/lore.json')
    ]);
    MENU = await menuRes.json();
    LORE = await loreRes.json();
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
  suggestionChips.forEach(chip=>{ chip.addEventListener('click',()=>{ userInput.value=chip.textContent; handleSendMessage(); }); });
  userInput.addEventListener('input',()=>{ userInput.style.height='auto'; userInput.style.height=(userInput.scrollHeight)+'px'; });
}

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

  const maybeRest = parseRestaurant(msg);
  if (maybeRest){ USER.preferredRestaurant = maybeRest; saveMemory(); }

  let intent='unknown';
  if(K.reserve.some(k=>msg.includes(k))) intent='reserve';
  else if(K.lore.some(k=>msg.includes(k))) intent='lore';
  else if(K.allergy.some(k=>msg.includes(k))) intent='allergy';
  else if(K.rec.some(k=>msg.includes(k))) intent='recommend';
  else if(K.menu.some(k=>msg.includes(k))) intent='menu';
  else if(K.greet.some(k=>msg.includes(k))) intent='greet';
  else if(K.ingredient.some(k=>msg.includes(k))) intent='ingredient';

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
      case 'reserve': ensureRestaurantThenForm(); break;
      case 'ingredient': handleIngredient(raw); break;
      default: reply(I18N[currentLanguage].unknown);
    }
  },120);
}

function parseRestaurant(msg){
  if (/\b(les\s*corts|corts|bordeus)\b/.test(msg)) return 'les_corts';
  if (/\b(gràcia|gracia|vidalet)\b/.test(msg)) return 'gracia';
  if (/\b(sant\s*antoni|muntaner|antoni)\b/.test(msg)) return 'sant_antoni';
  return null;
}

// ===== Respuestas base =====
function reply(text){
  lastSpokenText = text;
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
  reply(`${I18N[currentLanguage].rec_ready}\n${lines.join('\n')}`);
  USER.lastDish = recs[0]?.id || null; saveMemory();
}

function replyLore(){
  const topic = USER.lastDish || (['paella','fideua','all-i-pebre'][Math.floor(Math.random()*3)]);
  const t = topic.includes('paella') ? 'paella' : topic.includes('fideu') ? 'fideua' : 'all-i-pebre';
  const item = LORE.facts.find(f=>f.topic===t);
  const text = item ? (item[currentLanguage]||item.es) : 'Historias gastronómicas en camino.';
  reply(`${I18N[currentLanguage].lore_intro} ${text}`);
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

function parseAndSaveAllergies(text){
  const map = {
    en:{gluten:'gluten', shellfish:'shellfish', fish:'fish', egg:'egg', milk:'milk', vegan:'vegan', vegetarian:'vegetarian', lactose:'milk'},
    es:{gluten:'gluten', marisco:'shellfish', pescado:'fish', huevo:'egg', leche:'milk', vegano:'vegan', vegetariano:'vegetarian', lactosa:'milk'},
    ca:{gluten:'gluten', marisc:'shellfish', peix:'fish', ou:'egg', llet:'milk', vegà:'vegan', vegetarià:'vegetarian', lactosa:'milk'}
  }[currentLanguage];
  const found=[];
  for(const [k,v] of Object.entries(map)){ const rx=new RegExp(`\\b${k}\\b`,'i'); if(rx.test(text)) found.push(v); }
  if(/\b(no.*alerg|sin.*alerg|no.*allerg)/i.test(text)){ USER.allergies=[]; }
  else{ USER.allergies = Array.from(new Set([...(USER.allergies||[]), ...found])); }
  if(found.includes('vegan') && !USER.preferences.includes('vegan')) USER.preferences.push('vegan');
  if(found.includes('vegetarian') && !USER.preferences.includes('vegetarian')) USER.preferences.push('vegetarian');
  if(found.includes('gluten') && !USER.preferences.includes('gluten-free')) USER.preferences.push('gluten-free');
  saveMemory();
}

// ===== Ingredient Q&A =====
function handleIngredient(raw){
  const lang = currentLanguage;
  const q = raw.toLowerCase();
  const key = findCulinaryKey(q, lang);
  if (!key){ reply(lang==='es' ? "Puedo hablar de arroz, azafrán, aceite de oliva, ajo, tomate, pimentón… ¿cuál te interesa?"
                   : lang==='ca' ? "Puc parlar d’arròs, safrà, oli d’oliva, all, tomàquet, pebre roig… quin t’interessa?"
                                  : "I can talk about rice, saffron, olive oil, garlic, tomato, paprika… which one?"); return; }
  const data = (CULINARY[lang] && CULINARY[lang][key]) || (CULINARY.es && CULINARY.es[key]);
  if (!data){ reply(lang==='es' ? "Aún no tengo ficha para ese ingrediente. Prueba con arroz, azafrán, aceite de oliva, ajo, tomate o pimentón."
                    : lang==='ca' ? "Encara no tinc fitxa per a este ingredient. Prova arròs, safrà, oli d'oliva, all, tomàquet o pebre roig."
                                   : "I don’t have a sheet for that ingredient yet. Try rice, saffron, olive oil, garlic, tomato or paprika."); return; }
  const parts = [];
  if (data.summary) parts.push(data.summary);
  if (data.techniques?.length){ parts.push(sectionLabel('tech',lang)); parts.push(data.techniques.map(s=>`• ${s}`).join('\n')); }
  if (data.pairings?.length){ parts.push(sectionLabel('pair',lang)); parts.push(data.pairings.map(s=>`• ${s}`).join('\n')); }
  if (data.nutrition){ const n=data.nutrition; parts.push(`${sectionLabel('nutr',lang)} ${fmt(n.energy_kcal,'kcal')} · ${fmt(n.protein_g,u('prot',lang))} · ${fmt(n.fat_g,u('fat',lang))} · ${fmt(n.carbs_g,u('carb',lang))}`); }
  if (data.culture) parts.push(`${sectionLabel('cult',lang)} ${data.culture}`);
  reply(parts.join('\n'));

  function fmt(v,suf){ return (v!=null)? `${Math.round(v*10)/10} ${suf}` : '—'; }
  function u(what,l){ const d={ es:{prot:'g prot', fat:'g grasa', carb:'g hidratos'}, en:{prot:'g protein', fat:'g fat', carb:'g carbs'}, ca:{prot:'g prot', fat:'g greix', carb:'g hidrats'} }; return (d[l]||d.es)[what]; }
  function sectionLabel(key,l){
    const d = { es:{ tech:"Técnicas:", pair:"Maridajes:", nutr:"Nutrición aprox./100 g:", cult:"Notas:" },
                en:{ tech:"Techniques:", pair:"Pairings:",  nutr:"Approx. nutrition /100 g:",  cult:"Notes:" },
                ca:{ tech:"Tècniques:", pair:"Maridatges:", nutr:"Nutrició aprox./100 g:",   cult:"Notes:" } };
    return (d[l]||d.es)[key];
  }
}
function findCulinaryKey(q, lang){
  const map = {
    es: { "arroz":"arroz", "azafrán":"azafrán", "aceite de oliva":"aceite de oliva", "aceite":"aceite de oliva", "ajo":"ajo", "tomate":"tomate", "pimentón":"pimentón" },
    en: { "rice":"rice", "saffron":"saffron", "olive oil":"olive oil", "garlic":"garlic", "tomato":"tomato", "paprika":"paprika" },
    ca: { "arròs":"arròs", "safrà":"safrà", "oli d'oliva":"oli d'oliva", "all":"all", "tomàquet":"tomàquet", "pebre roig":"pebre roig" }
  }[lang] || {};
  const keys = Object.keys(map);
  for (const k of keys){ if (q.includes(k)) return map[k]; }
  const fallbacks = lang==='es' ? ["arroz","azafrán","aceite de oliva","ajo","tomate","pimentón"]
                  : lang==='ca' ? ["arròs","safrà","oli d'oliva","all","tomàquet","pebre roig"]
                                 : ["rice","saffron","olive oil","garlic","tomato","paprika"];
  for (const w of fallbacks){ if (q.includes(w)) return w; }
  return null;
}

// ===== Reserva (con restaurante Barcelona) =====
function ensureRestaurantThenForm(){
  if (!USER.preferredRestaurant){
    reply(I18N[currentLanguage].pick_restaurant);
  }
  showReservationForm();
}
function pad2(n){ return n<10? '0'+n : ''+n; }
function formatLocalForInput(dt){
  return dt.getFullYear() + '-' + pad2(dt.getMonth()+1) + '-' + pad2(dt.getDate()) + 'T' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
}
function roundToNextStep(dt, minutesStep=30){
  const ms = minutesStep*60*1000; return new Date(Math.ceil(dt.getTime()/ms)*ms);
}
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

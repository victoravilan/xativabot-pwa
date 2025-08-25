/**
 * XativaBot PWA - Chef Assistant (multilingüe)
 * - Intents: greeting, menu, recommend, dietary/allergies, history/myths, reservation, hours, locations, help
 * - Text + Voice según idioma seleccionado
 * - Recomendaciones con filtrado por alergias y preferencias
 * - Reserva con Function de Netlify (/.netlify/functions/reservations)
 */

// ---------- DOM ----------
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const suggestionChips = document.querySelectorAll('.chip');

// ---------- Estado ----------
const state = {
  lang: 'en',
  allergens: new Set(),       // e.g., 'gluten','nuts','shellfish','dairy','egg'
  dietary: new Set(),         // e.g., 'vegan','vegetarian','gluten-free'
  lastIntent: null
};

// ---------- I18N ----------
const I18N = {
  en: {
    placeholder: "Type your message...",
    chip: {
      menu: "Menu recommendations",
      dietary: "Special dietary needs",
      reserve: "Make a reservation",
      locations: "Restaurant locations"
    },
    welcome: "Welcome to Xativa Restaurants! I'm AlexBot, your personal chef assistant. How can I help you today?",
    ask_prefs: "Tell me your preferences (e.g., vegan, spicy, seafood) and allergies (e.g., nuts, gluten).",
    rec_intro: "Based on your profile, I recommend:",
    none_match: "I couldn't find perfect matches. Would you try one of these safe options?",
    set_prefs_ok: "Got it. I'll remember that for future recommendations.",
    ask_allergies: "Any allergies or restrictions I should consider?",
    hours: "We're open daily 12:00–23:00 (kitchen closes 22:30).",
    locations: "Locations: Valencia City Center, Alicante Beachfront, Madrid Salamanca.",
    reservation: "I'd be happy to help with your reservation. Please fill your details:",
    history_intro: "Here's a culinary story:",
    help: "I can recommend dishes, handle reservations, filter allergies, and share culinary myths. Try: \"vegan paella\", \"gluten-free options\", \"tell me a myth\", or \"book for 2 at 20:00\"."
  },
  es: {
    placeholder: "Escribe tu mensaje...",
    chip: {
      menu: "Recomendaciones del menú",
      dietary: "Necesidades dietéticas especiales",
      reserve: "Hacer una reserva",
      locations: "Ubicaciones de restaurantes"
    },
    welcome: "¡Bienvenido a Restaurantes Xativa! Soy AlexBot, tu asistente de chef personal. ¿Cómo puedo ayudarte hoy?",
    ask_prefs: "Cuéntame tus preferencias (p. ej., vegano, picante, mariscos) y alergias (p. ej., frutos secos, gluten).",
    rec_intro: "Según tu perfil, te recomiendo:",
    none_match: "No encontré coincidencias perfectas. ¿Te apetecen estas opciones seguras?",
    set_prefs_ok: "Perfecto. Lo tendré en cuenta para próximas sugerencias.",
    ask_allergies: "¿Hay alergias o restricciones que deba considerar?",
    hours: "Abrimos todos los días 12:00–23:00 (cocina hasta 22:30).",
    locations: "Ubicaciones: Centro de Valencia, Playa de Alicante, Salamanca (Madrid).",
    reservation: "Con gusto te ayudo con la reserva. Por favor, completa tus datos:",
    history_intro: "Aquí va una historia culinaria:",
    help: "Puedo recomendar platos, gestionar reservas, filtrar alergias y compartir mitos culinarios. Prueba: «paella vegana», «opciones sin gluten», «cuéntame un mito» o «reserva para 2 a las 20:00»."
  },
  ca: {
    placeholder: "Escriu el teu missatge...",
    chip: {
      menu: "Recomanacions del menú",
      dietary: "Necessitats dietètiques especials",
      reserve: "Fer una reserva",
      locations: "Ubicacions de restaurants"
    },
    welcome: "Benvingut als Restaurants Xativa! Sóc l'AlexBot, el teu assistent de xef personal. Com et puc ajudar avui?",
    ask_prefs: "Explica'm les teves preferències (p. ex., vegà, picant, marisc) i al·lèrgies (p. ex., fruits secs, gluten).",
    rec_intro: "Segons el teu perfil, et recomano:",
    none_match: "No he trobat coincidències perfectes. T'abelleixen aquestes opcions segures?",
    set_prefs_ok: "Entesos. Ho tindré en compte per a futures recomanacions.",
    ask_allergies: "Hi ha al·lèrgies o restriccions que hagi de considerar?",
    hours: "Oberts cada dia 12:00–23:00 (cuina fins 22:30).",
    locations: "Ubicacions: Centre de València, Platja d'Alacant, Salamanca (Madrid).",
    reservation: "T'ajudo amb la reserva. Si us plau, completa les teves dades:",
    history_intro: "Una història culinària:",
    help: "Puc recomanar plats, gestionar reserves, filtrar al·lèrgies i compartir mites culinaris. Prova: «paella vegana», «opcions sense gluten», «explica'm un mite» o «reserva per a 2 a les 20:00»."
  }
};

// ---------- Datos (fallback). Si existe /menu.json lo cargamos en init ----------
let MENU = [
  {
    id: "paella_valenciana",
    tags: ["rice","traditional"],
    allergens: ["shellfish"], // si la haces mixta; ajusta según receta
    name: { en:"Valencian Paella", es:"Paella Valenciana", ca:"Paella Valenciana" },
    desc: { en:"Saffron rice with rabbit, chicken and green beans.",
            es:"Arroz al azafrán con conejo, pollo y judías verdes.",
            ca:"Arròs al safrà amb conill, pollastre i bajoques." }
  },
  {
    id: "seafood_paella",
    tags: ["rice","seafood"],
    allergens: ["shellfish"],
    name: { en:"Seafood Paella", es:"Paella de Marisco", ca:"Paella de Marisc" },
    desc: { en:"Prawns, mussels, squid and rich fish stock.",
            es:"Gambas, mejillones, calamar y caldo de pescado.",
            ca:"Gambes, musclos, calamar i brou de peix." }
  },
  {
    id: "tapas_patatas_bravas",
    tags: ["tapas","vegetarian","spicy"],
    allergens: [],
    name: { en:"Patatas Bravas", es:"Patatas Bravas", ca:"Patates Braves" },
    desc: { en:"Crispy potatoes with spicy brava sauce & aioli.",
            es:"Patatas crujientes con salsa brava picante y alioli.",
            ca:"Patates cruixents amb salsa brava i allioli." }
  },
  {
    id: "gazpacho",
    tags: ["cold","vegan","gluten-free"],
    allergens: [],
    name: { en:"Gazpacho", es:"Gazpacho", ca:"Gaspatxo" },
    desc: { en:"Chilled tomato soup, refreshing and light.",
            es:"Sopa fría de tomate, refrescante y ligera.",
            ca:"Sopa freda de tomàquet, refrescant i lleugera." }
  }
];

const CULINARY_FACTS = {
  en: [
    "Paella began around Valencia’s Albufera rice fields; the classic uses rabbit, chicken and flat beans—seafood is a later coastal adaptation.",
    "The word 'tapa' may come from the old custom of covering (tapar) drinks with bread or ham to keep flies away."
  ],
  es: [
    "La paella nació en los arrozales de l'Albufera; la clásica lleva conejo, pollo y bajoqueta. La versión de marisco es una adaptación costera posterior.",
    "La palabra «tapa» podría venir de la costumbre de tapar la bebida con pan o jamón para evitar las moscas."
  ],
  ca: [
    "La paella va néixer als arrossars de l'Albufera; la clàssica porta conill, pollastre i bajoqueta. La versió de marisc és una adaptació costanera posterior.",
    "La paraula «tapa» pot venir de tapar la beguda amb pa o pernil per evitar les mosques."
  ]
};

// ---------- Utilidades de idioma/voz ----------
const speechSynth = window.speechSynthesis;
let recognition = null;
let isListening = false;
let preferredVoices = []; // cache

function getLangCode(lang) {
  return ({ en:'en-US', es:'es-ES', ca:'ca-ES' }[lang]) || 'en-US';
}

function pickVoice(lang) {
  const code = getLangCode(lang).slice(0,2);
  const voices = speechSynth.getVoices();
  // Preferimos voces que empiecen por el idioma
  let v = voices.find(v => v.lang?.toLowerCase().startsWith(code) && /female|heather|lucia|laura|mónica|paula/i.test(v.name)) ||
          voices.find(v => v.lang?.toLowerCase().startsWith(code)) ||
          voices.find(v => /en/i.test(v.lang)) ||
          voices[0];
  return v || null;
}

function speak(text) {
  if (!speechSynth) return;
  speechSynth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = getLangCode(state.lang);
  const voice = pickVoice(state.lang);
  if (voice) u.voice = voice;
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  speechSynth.speak(u);
}

if (speechSynth) {
  speechSynth.onvoiceschanged = () => {
    preferredVoices = speechSynth.getVoices();
  };
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { speechSynth?.pause(); } else { speechSynth?.resume(); }
});

function initApp() {
  // UI
  setupEventListeners();
  setLanguage(languageSelect?.value || 'en');
  // Speech Recognition
  setupSpeechRecognition();
  // Carga menú si existe (opcional)
  fetchMenuIfAvailable();

  // Mensaje de bienvenida en idioma
  addMessageToChat(I18N[state.lang].welcome, 'bot');
}

function setupEventListeners() {
  sendBtn.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  });
  voiceBtn.addEventListener('click', toggleVoiceInput);
  languageSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      userInput.value = chip.textContent;
      handleSendMessage();
    });
  });
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
  });
}

function setLanguage(lang) {
  state.lang = ['en','es','ca'].includes(lang) ? lang : 'en';
  // placeholder + elementos con data-*
  userInput.placeholder = I18N[state.lang].placeholder;
  document.querySelectorAll('[data-' + state.lang + ']').forEach(el => {
    el.textContent = el.getAttribute('data-' + state.lang);
  });
  // reconocimiento
  if (recognition) recognition.lang = getLangCode(state.lang);
}

// ---------- Reconocimiento de voz ----------
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { voiceBtn.style.display = 'none'; return; }
  recognition = new SR();
  recognition.continuous = false; recognition.interimResults = false;
  recognition.lang = getLangCode(state.lang);
  recognition.onstart = () => { isListening = true; voiceBtn.classList.add('active'); voiceIndicator.classList.add('active'); };
  recognition.onend   = () => { isListening = false; voiceBtn.classList.remove('active'); voiceIndicator.classList.remove('active'); };
  recognition.onresult= (e) => { userInput.value = e.results[0][0].transcript; handleSendMessage(); };
  recognition.onerror = () => { isListening = false; voiceBtn.classList.remove('active'); voiceIndicator.classList.remove('active'); };
}

function toggleVoiceInput() {
  if (!recognition) return;
  if (isListening) recognition.stop(); else recognition.start();
}

// ---------- Chat ----------
function handleSendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  addMessageToChat(message, 'user');
  userInput.value = ''; userInput.style.height = 'auto';
  setTimeout(() => handleUserMessage(message), 250);
}

function addMessageToChat(text, sender) {
  const el = document.createElement('div');
  el.classList.add('message', `${sender}-message`);
  const p = document.createElement('p');
  p.textContent = text;
  el.appendChild(p);
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 10);
}

// ---------- NLU muy simple (keywords por idioma) ----------
const KEYWORDS = {
  en: {
    greet: ["hello","hi","hey"],
    menu: ["menu","dish","dishes","what do you have","recommend"],
    recommend: ["recommend","suggest","what to eat"],
    reserve: ["reservation","book","reserve","booking"],
    diet: ["diet","allerg","vegan","vegetarian","gluten","dairy","nuts","shellfish","egg"],
    hours: ["hours","open","time","schedule"],
    location: ["location","where","address"],
    history: ["history","myth","story","tradition"],
    help: ["help","what can you do"]
  },
  es: {
    greet: ["hola","buenas","hey"],
    menu: ["menú","carta","platos","qué tienen","recomendación"],
    recommend: ["recomienda","recomendación","qué comer","sugerencia"],
    reserve: ["reserva","reservar","booking"],
    diet: ["dieta","alerg","vegano","vegetariano","gluten","lácteos","frutos secos","marisco","huevo","celiaco","intolerancia"],
    hours: ["horario","abren","hora","apertura","cierre"],
    location: ["ubicación","dónde","dirección"],
    history: ["historia","mito","tradición","cuento"],
    help: ["ayuda","qué puedes hacer"]
  },
  ca: {
    greet: ["hola","bones","ei"],
    menu: ["menú","carta","plats","què teniu","recomanació"],
    recommend: ["recomana","recomanació","què menjar","suggeriment"],
    reserve: ["reserva","reservar","booking"],
    diet: ["dieta","al·lèrg","vegà","vegetarià","gluten","làctics","fruits secs","marisc","ou","celíac","intolerància"],
    hours: ["horari","obriu","hora","obertura","tancament"],
    location: ["ubicació","on","adreça"],
    history: ["història","mite","tradició","conte"],
    help: ["ajuda","què pots fer"]
  }
};

function detectIntent(msg, lang) {
  const m = msg.toLowerCase();
  const K = KEYWORDS[lang] || KEYWORDS.en;
  const has = arr => arr.some(w => m.includes(w));
  if (has(K.reserve))   return 'reservation';
  if (has(K.history))   return 'history';
  if (has(K.diet))      return 'diet';
  if (has(K.recommend)) return 'recommend';
  if (has(K.menu))      return 'menu';
  if (has(K.hours))     return 'hours';
  if (has(K.location))  return 'locations';
  if (has(K.help))      return 'help';
  if (has(K.greet))     return 'greeting';
  return 'fallback';
}

function handleUserMessage(message) {
  const lang = state.lang;
  const intent = detectIntent(message, lang);
  state.lastIntent = intent;

  switch (intent) {
    case 'greeting':

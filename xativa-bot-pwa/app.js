/**
 * XativaBot PWA - Main Application JavaScript
 * Handles voice recognition, speech synthesis, bot responses, and multilingual functionality
 */

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-input-btn');
const voiceIndicator = document.getElementById('voice-indicator');
const languageSelect = document.getElementById('language-select');
const suggestionChips = document.querySelectorAll('.chip');

// App State
let currentLanguage = 'en';
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isListening = false;

// Initialize the application
function initApp() {
    setupEventListeners();
    setupSpeechRecognition();
    checkBrowserSupport();
}

// Set up event listeners
function setupEventListeners() {
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    voiceBtn.addEventListener('click', toggleVoiceInput);
    languageSelect.addEventListener('change', (e) => changeLanguage(e.target.value));
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

// Browser support checks
function checkBrowserSupport() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        voiceBtn.style.display = 'none';
    }
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
    }
}

// Speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = getLangCode(currentLanguage);

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add('active');
            voiceIndicator.classList.add('active');
        };
        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('active');
            voiceIndicator.classList.remove('active');
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            handleSendMessage();
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            voiceBtn.classList.remove('active');
            voiceIndicator.classList.remove('active');
        };
    }
}

function toggleVoiceInput() {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else recognition.start();
}

// Handle sending message
function handleSendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    addMessageToChat(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    processUserMessage(message);
}

// Chat UI
function addMessageToChat(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender + '-message');
    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageElement.appendChild(messageText);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 10);
}

// Process input
function processUserMessage(message) {
    setTimeout(() => {
        const response = generateBotResponse(message);
        addMessageToChat(response, 'bot');

        // Si es reserva → mostrar formulario
        if (response.toLowerCase().includes('reservation') || response.toLowerCase().includes('reserva')) {
            showReservationForm();
        }

        if (!isMobileDevice()) {
            speakText(response);
        }
    }, 1000);
}

// Bot responses
function generateBotResponse(message) {
    message = message.toLowerCase();
    const responses = {
        en: {
            reservation: "I'd be happy to help you make a reservation. Please fill in your details below:",
            default: "Thank you for your message. How else may I assist you today?"
        },
        es: {
            reservation: "Encantado de ayudarte con tu reserva. Por favor completa tus datos aquí:",
            default: "Gracias por tu mensaje. ¿En qué más puedo ayudarte hoy?"
        },
        ca: {
            reservation: "Encantat d'ajudar-te amb la teva reserva. Si us plau, completa les teves dades:",
            default: "Gràcies pel teu missatge. En què més puc ajudar-te avui?"
        }
    };
    const lang = responses[currentLanguage] || responses.en;

    if (message.includes('reservation') || message.includes('reserva')) return lang.reservation;
    return lang.default;
}

// Text-to-speech
function speakText(text) {
    if (!speechSynthesis) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(currentLanguage);
    const voices = speechSynthesis.getVoices();
    const langCode = getLangCode(currentLanguage).substring(0, 2);
    const voice = voices.find(v => v.lang.startsWith(langCode) && v.name.includes('Female'));
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
}

// Language handling
function changeLanguage(lang) {
    currentLanguage = lang;
    document.querySelectorAll('[data-' + lang + ']').forEach(el => {
        el.textContent = el.getAttribute('data-' + lang);
    });
    userInput.placeholder = userInput.getAttribute('data-' + lang);
    if (recognition) recognition.lang = getLangCode(lang);
}
function getLangCode(lang) {
    const langCodes = { 'en': 'en-US', 'es': 'es-ES', 'ca': 'ca-ES' };
    return langCodes[lang] || 'en-US';
}
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Init
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (speechSynthesis) speechSynthesis.pause();
    } else {
        if (speechSynthesis) speechSynthesis.resume();
    }
});

// ====== RESERVATION FORM ======
// ====== RESERVATION FORM ======
function showReservationForm() {
    const formWrapper = document.createElement('div');
    formWrapper.classList.add('message', 'bot-message');

    formWrapper.innerHTML = `
      <form id="reservation-form" class="reservation-form">
        <label>
          <span data-en="Name:" data-es="Nombre:" data-ca="Nom:">Name:</span><br>
          <input type="text" name="name" required placeholder="Alex García">
        </label><br>

        <label>
          <span data-en="Email:" data-es="Correo:" data-ca="Correu:">Email:</span><br>
          <input type="email" name="email" placeholder="you@example.com">
        </label><br>

        <label>
          <span data-en="Phone:" data-es="Teléfono:" data-ca="Telèfon:">Phone:</span><br>
          <input type="tel" name="phone" placeholder="+34 600 000 000">
        </label><br>

        <label>
          <span data-en="Date & Time:" data-es="Fecha y hora:" data-ca="Data i hora:">Date & Time:</span><br>
          <input type="datetime-local" name="dateTime" required>
        </label><br>

        <label>
          <span data-en="Party Size:" data-es="Número de comensales:" data-ca="Nombre de comensals:">Party Size:</span><br>
          <input type="number" name="partySize" min="1" max="20" value="2">
        </label><br>

        <label>
          <span data-en="Notes:" data-es="Notas:" data-ca="Notes:">Notes:</span><br>
          <textarea name="notes" placeholder="Allergies, preferences..."></textarea>
        </label><br>

        <button type="submit" 
          data-en="Confirm Reservation" 
          data-es="Confirmar Reserva" 
          data-ca="Confirmar Reserva">
          Confirm Reservation
        </button>
      </form>
    `;

    chatMessages.appendChild(formWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const form = formWrapper.querySelector('#reservation-form');
    const dateInput = form.querySelector('input[name="dateTime"]');

    // min = ahora (redondeado a 5 min)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const round5 = new Date(Math.ceil(now.getTime() / (5*60*1000)) * (5*60*1000));
    dateInput.min = round5.toISOString().slice(0,16);

    // Aplica el idioma actual
    changeLanguage(currentLanguage);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const data = Object.fromEntries(new FormData(form).entries());
        data.id = 'res_' + Date.now();

        try {
            const local = new Date(data.dateTime);
            if (isNaN(local.getTime())) throw new Error('Invalid date');
            data.dateTime = new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString();
        } catch (_) {
            addMessageToChat("⚠️ Invalid date/time.", 'bot');
            submitBtn.disabled = false;
            return;
        }

        try {
            const result = await submitReservation(data);
            addMessageToChat("✅ Reservation confirmed! ID: " + result.reservation.id, 'bot');
            formWrapper.remove();
        } catch (err) {
            console.warn('Offline, saving reservation locally:', err.message);
            await queueReservation(data);
            addMessageToChat("📌 You're offline. Reservation saved and will sync when online.", 'bot');
            formWrapper.remove();
        } finally {
            submitBtn.disabled = false;
        }
    });
}


// ====== RESERVATION HELPERS ======
async function submitReservation(reservation) {
    const endpoint = '/.netlify/functions/reservations';
    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Reservation failed');
    return data;
}

async function queueReservation(reservation) {
    const db = await openReservationDB();
    const tx = db.transaction(['reservations'], 'readwrite');
    tx.objectStore('reservations').put(reservation);
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('reservation-sync');
    }
}

function openReservationDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('xativabot-db', 1);
        req.onupgradeneeded = (ev) => {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains('reservations')) {
                db.createObjectStore('reservations', { keyPath: 'id' });
            }
        };
        req.onsuccess = (ev) => resolve(ev.target.result);
        req.onerror = (ev) => reject(ev.target.error);
    });
}

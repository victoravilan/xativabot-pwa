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
    // Send message on button click
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Voice input button
    voiceBtn.addEventListener('click', toggleVoiceInput);
    
    // Language selector
    languageSelect.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
    });
    
    // Suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            handleSendMessage();
        });
    });
    
    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
}

// Check browser support for required features
function checkBrowserSupport() {
    // Check for SpeechRecognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        voiceBtn.style.display = 'none';
    }
    
    // Check for SpeechSynthesis
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser');
    }
}

// Set up speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Set language based on current selection
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

// Toggle voice input
function toggleVoiceInput() {
    if (!recognition) return;
    
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Handle sending a message
function handleSendMessage() {
    const message = userInput.value.trim();
    
    if (message === '') return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Process message and get bot response
    processUserMessage(message);
}

// Add a message to the chat
function addMessageToChat(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(sender + '-message');
    
    const messageText = document.createElement('p');
    messageText.textContent = message;
    
    messageElement.appendChild(messageText);
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add animation
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 10);
}

// Process user message and generate bot response
function processUserMessage(message) {
    // Simulate thinking time
    setTimeout(() => {
        const response = generateBotResponse(message);
        addMessageToChat(response, 'bot');
        
        // Speak the response if not on mobile (to avoid autoplay restrictions)
        if (!isMobileDevice()) {
            speakText(response);
        }
    }, 1000);
}

// Generate bot response based on user input
function generateBotResponse(message) {
    message = message.toLowerCase();
    
    // Language-specific responses
    const responses = {
        en: {
            greeting: "Hello! How can I assist you with Xativa's dining experience today?",
            menu: "Our current menu features signature paella, fresh seafood, and authentic tapas. Would you like me to recommend something based on your preferences?",
            reservation: "I'd be happy to help you make a reservation. Could you please tell me the date, time, and number of guests?",
            location: "Xativa has three locations: Valencia City Center, Alicante Beachfront, and Madrid Salamanca District. Which one would you like to visit?",
            hours: "Our restaurants are open daily from 12:00 PM to 11:00 PM, with the kitchen closing at 10:30 PM.",
            dietary: "We offer numerous options for special dietary needs including vegetarian, vegan, gluten-free, and allergen-free dishes. Could you tell me more about your specific requirements?",
            chef: "I'm AlexBot, Xativa's virtual executive chef. I can help with menu recommendations, ingredient information, cooking techniques, and more!",
            default: "Thank you for your message. Our team at Xativa is dedicated to providing an exceptional dining experience. How else may I assist you today?"
        },
        es: {
            greeting: "¡Hola! ¿Cómo puedo ayudarte con la experiencia gastronómica de Xativa hoy?",
            menu: "Nuestro menú actual incluye paella de la casa, mariscos frescos y auténticas tapas. ¿Te gustaría que te recomendara algo según tus preferencias?",
            reservation: "Estaré encantado de ayudarte a hacer una reserva. ¿Podrías indicarme la fecha, hora y número de comensales?",
            location: "Xativa tiene tres ubicaciones: Centro de Valencia, Frente a la playa de Alicante y Distrito Salamanca de Madrid. ¿Cuál te gustaría visitar?",
            hours: "Nuestros restaurantes están abiertos todos los días de 12:00 a 23:00, con la cocina cerrando a las 22:30.",
            dietary: "Ofrecemos numerosas opciones para necesidades dietéticas especiales, incluyendo platos vegetarianos, veganos, sin gluten y sin alérgenos. ¿Podrías contarme más sobre tus requisitos específicos?",
            chef: "Soy AlexBot, el chef ejecutivo virtual de Xativa. ¡Puedo ayudarte con recomendaciones del menú, información sobre ingredientes, técnicas de cocina y más!",
            default: "Gracias por tu mensaje. Nuestro equipo en Xativa está dedicado a proporcionar una experiencia gastronómica excepcional. ¿En qué más puedo ayudarte hoy?"
        },
        ca: {
            greeting: "Hola! Com puc ajudar-te amb l'experiència gastronòmica de Xativa avui?",
            menu: "El nostre menú actual inclou paella de la casa, marisc fresc i autèntiques tapes. T'agradaria que et recomanés alguna cosa segons les teves preferències?",
            reservation: "Estaré encantat d'ajudar-te a fer una reserva. Podries indicar-me la data, hora i nombre de comensals?",
            location: "Xativa té tres ubicacions: Centre de València, Davant de la platja d'Alacant i Districte Salamanca de Madrid. Quina t'agradaria visitar?",
            hours: "Els nostres restaurants estan oberts tots els dies de 12:00 a 23:00, amb la cuina tancant a les 22:30.",
            dietary: "Oferim nombroses opcions per a necessitats dietètiques especials, incloent plats vegetarians, vegans, sense gluten i sense al·lèrgens. Podries explicar-me més sobre els teus requisits específics?",
            chef: "Sóc AlexBot, el xef executiu virtual de Xativa. Puc ajudar-te amb recomanacions del menú, informació sobre ingredients, tècniques de cuina i més!",
            default: "Gràcies pel teu missatge. El nostre equip a Xativa està dedicat a proporcionar una experiència gastronòmica excepcional. En què més puc ajudar-te avui?"
        }
    };
    
    // Select language
    const lang = responses[currentLanguage] || responses.en;
    
    // Match user input to appropriate response
    if (message.includes('hello') || message.includes('hi') || message.includes('hola') || message.includes('hey')) {
        return lang.greeting;
    } else if (message.includes('menu') || message.includes('food') || message.includes('eat') || message.includes('comida') || message.includes('menjar')) {
        return lang.menu;
    } else if (message.includes('reservation') || message.includes('book') || message.includes('reserva') || message.includes('reservar')) {
        return lang.reservation;
    } else if (message.includes('location') || message.includes('address') || message.includes('where') || message.includes('ubicación') || message.includes('ubicació')) {
        return lang.location;
    } else if (message.includes('hours') || message.includes('open') || message.includes('time') || message.includes('horario') || message.includes('horari')) {
        return lang.hours;
    } else if (message.includes('diet') || message.includes('allerg') || message.includes('vegan') || message.includes('vegetarian') || message.includes('gluten') || message.includes('dieta')) {
        return lang.dietary;
    } else if (message.includes('who are you') || message.includes('about you') || message.includes('quién eres') || message.includes('qui ets')) {
        return lang.chef;
    } else {
        return lang.default;
    }
}

// Speak text using speech synthesis
function speakText(text) {
    if (!speechSynthesis) return;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(currentLanguage);
    
    // Find an appropriate voice
    const voices = speechSynthesis.getVoices();
    const langCode = getLangCode(currentLanguage).substring(0, 2);
    
    // Try to find a voice that matches the current language
    const voice = voices.find(v => v.lang.startsWith(langCode) && v.name.includes('Female'));
    
    if (voice) {
        utterance.voice = voice;
    }
    
    speechSynthesis.speak(utterance);
}

// Change the interface language
function changeLanguage(lang) {
    currentLanguage = lang;
    
    // Update all translatable elements
    document.querySelectorAll('[data-' + lang + ']').forEach(element => {
        element.textContent = element.getAttribute('data-' + lang);
    });
    
    // Update placeholder
    userInput.placeholder = userInput.getAttribute('data-' + lang);
    
    // Update speech recognition language if active
    if (recognition) {
        recognition.lang = getLangCode(lang);
    }
}

// Get language code for speech recognition and synthesis
function getLangCode(lang) {
    const langCodes = {
        'en': 'en-US',
        'es': 'es-ES',
        'ca': 'ca-ES'
    };
    
    return langCodes[lang] || 'en-US';
}

// Check if the device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Handle visibility change to pause/resume speech
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (speechSynthesis) {
            speechSynthesis.pause();
        }
    } else {
        if (speechSynthesis) {
            speechSynthesis.resume();
        }
    }
});
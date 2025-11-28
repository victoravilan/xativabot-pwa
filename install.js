<<<<<<< HEAD
// public/install.js
let deferredPrompt = null;

// Captura el evento cuando la app cumple criterios PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'inline-flex';
});

// Click del botón “Instalar”
async function installApp(){
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  // outcome: 'accepted' | 'dismissed'
  deferredPrompt = null;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
}
window.installApp = installApp;

// Evento cuando ya se instaló
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
});
=======
// public/install.js
let deferredPrompt = null;

// Captura el evento cuando la app cumple criterios PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'inline-flex';
});

// Click del botón “Instalar”
async function installApp(){
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  // outcome: 'accepted' | 'dismissed'
  deferredPrompt = null;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
}
window.installApp = installApp;

// Evento cuando ya se instaló
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
});
>>>>>>> 337b8ebf236036d6c60b58441d582b11fcb9875f

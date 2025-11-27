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

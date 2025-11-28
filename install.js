let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que Chrome 67 y anteriores muestren el prompt automáticamente
  e.preventDefault();
  // Guardar el evento para que pueda ser disparado más tarde
  deferredPrompt = e;
  // Mostrar el botón de instalación
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
  }
});

function installApp() {
  if (!deferredPrompt) {
    alert('La aplicación ya está instalada o el navegador no soporta la instalación.');
    return;
  }
  // Mostrar el prompt de instalación
  deferredPrompt.prompt();
  // Ocultar el botón, ya que solo se puede usar una vez
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
}
// Hacemos la variable global para que app.js pueda acceder a ella
window.deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que Chrome 67 y anteriores muestren el prompt automáticamente
  e.preventDefault();
  // Guardar el evento para que pueda ser disparado más tarde
  window.deferredPrompt = e;

  // Opcional: si aún quieres mostrar el botón en el header, puedes hacerlo aquí
  // const installBtn = document.getElementById('install-btn');
  // if (installBtn) installBtn.style.display = 'inline-flex';
});

function installApp() {
  if (!window.deferredPrompt) {
    alert('La aplicación ya está instalada o el navegador no soporta la instalación.');
    return;
  }
  // Mostrar el prompt de instalación
  deferredPrompt.prompt();
  // Ocultar el botón, ya que solo se puede usar una vez
  // El prompt solo se puede usar una vez.
  window.deferredPrompt = null;
}
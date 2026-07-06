const API_URL = window.API_BASE_URL || 'http://localhost:5000';
let authModal = null;
let modoLogin = true;

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('auth-modal');
  if (modalEl) {
    authModal = new bootstrap.Modal(modalEl);
  }
  actualizarEstadoAuth();
});

function mostrarLogin() {
  modoLogin = true;
  setupModal();
  if(authModal) authModal.show();
}

function mostrarRegister() {
  modoLogin = false;
  setupModal();
  if(authModal) authModal.show();
}

function setupModal() {
  const reg = document.getElementById('register-fields');
  const txt = document.getElementById('btn-auth-text');
  const title = document.getElementById('modal-title-lbl') || document.getElementById('modal-title-label');
  const toggleTxt = document.getElementById('auth-toggle-text');
  const toggleLink = document.getElementById('auth-toggle-link');
  const passEl = document.getElementById('auth-password');
  
  if (!title) return;

  if (modoLogin) {
    title.textContent = 'Iniciar Sesión';
    if(txt) txt.textContent = 'Iniciar Sesión';
    if(reg) reg.style.display = 'none';
    if(toggleTxt) toggleTxt.textContent = '¿No tienes cuenta?';
    if(toggleLink) toggleLink.textContent = 'Regístrate aquí';
    if(passEl) passEl.setAttribute('autocomplete', 'current-password');
  } else {
    title.textContent = 'Crear Cuenta';
    if(txt) txt.textContent = 'Crear Cuenta';
    if(reg) reg.style.display = 'block';
    if(toggleTxt) toggleTxt.textContent = '¿Ya tienes cuenta?';
    if(toggleLink) toggleLink.textContent = 'Inicia sesión';
    if(passEl) passEl.setAttribute('autocomplete', 'new-password');
  }
  const msgEl = document.getElementById('auth-msg');
  if(msgEl) msgEl.textContent = '';
}

function toggleAuth(e) {
  e.preventDefault();
  modoLogin = !modoLogin;
  setupModal();
}

async function manejarAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const nombreEl = document.getElementById('auth-nombre');
  const apellidosEl = document.getElementById('auth-apellidos');
  const telefonoEl = document.getElementById('auth-telefono');
  const nombre = nombreEl ? nombreEl.value.trim() : '';
  const apellidos = apellidosEl ? apellidosEl.value.trim() : '';
  const telefono = telefonoEl ? telefonoEl.value.trim() : '';
  const msgEl = document.getElementById('auth-msg');
  const btnTxt = document.getElementById('btn-auth-text');
  
  if(msgEl) {
    msgEl.style.color = 'var(--az-text-muted)';
    msgEl.textContent = 'Cargando...';
  }
  if(btnTxt) btnTxt.textContent = '...';

  try {
    const url = modoLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;
    const body = modoLogin ? { email, password } : { email, password, nombre, apellidos, telefono };
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('rol', data.rol || 'cliente');
      localStorage.setItem('nombre', data.nombre || nombre || email);
      localStorage.setItem('apellidos', data.apellidos || apellidos || '');
      localStorage.setItem('telefono', data.telefono || telefono || '');
      localStorage.setItem('email', email);
      
      if(msgEl) {
        msgEl.style.color = 'var(--az-emerald)';
        msgEl.textContent = modoLogin ? '¡Bienvenido!' : '¡Cuenta creada!';
      }
      setTimeout(() => { 
        if(authModal) authModal.hide(); 
        actualizarEstadoAuth(); 
      }, 800);
    } else {
      if(msgEl) {
        msgEl.style.color = '#dc2626';
        msgEl.textContent = data.error || 'Error — verifica tus datos.';
      }
      setupModal();
    }
  } catch(err) {
    if(msgEl) {
      msgEl.style.color = '#dc2626';
      msgEl.textContent = 'No se pudo conectar al servidor.';
    }
    setupModal();
  }
}

function actualizarEstadoAuth() {
  const token = localStorage.getItem('token');
  const nombre = localStorage.getItem('nombre');
  
  const anon = document.getElementById('auth-anon');
  const logged = document.getElementById('auth-logged');
  const navName = document.getElementById('nav-user-name');
  
  if (token) {
    if(anon) anon.classList.add('d-none');
    if(logged) logged.classList.remove('d-none');
    if (navName) navName.textContent = nombre ? nombre.split(' ')[0] : 'Mi Cuenta';
  } else {
    if(anon) anon.classList.remove('d-none');
    if(logged) logged.classList.add('d-none');
  }
}

function logout() {
  ['token','rol','nombre','email'].forEach(k => localStorage.removeItem(k));
  actualizarEstadoAuth();
  if (window.location.pathname.includes('cuenta.html') || window.location.pathname.includes('inventario.html') || window.location.pathname.includes('usuarios.html')) {
    window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
  }
}

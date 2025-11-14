// ============================================
// VARIABLES GLOBALES
// ============================================
let idToken = null;
let accessToken = null;
let userInfo = null;

import { userManager, signOutRedirect, clearStateBeforeLogin } from './config.js';

// ============================================
// UI FUNCTIONS GENERALES
// ============================================

window.showApp = function() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    window.loadProducts();
}

window.hideApp = function() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

export function showAlert(elementId, message, type = 'info') {
    const alertEl = document.getElementById(elementId);
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type}`;
    alertEl.style.display = 'block';
    
    if (type === 'error') {
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// FUNCIONES PARA OBTENER TOKENS
// ============================================

function getIdToken() {
    return idToken || localStorage.getItem('idToken');
}

function getAccessToken() {
    return accessToken || localStorage.getItem('accessToken');
}

// ============================================
// FUNCIÓN PARA VERIFICAR SI EL TOKEN HA EXPIRADO
// ============================================

function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        // Decodificar el JWT (solo la parte del payload)
        const payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));
        
        // Verificar si el token ha expirado
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExpiry = decodedPayload.exp;

        return currentTime >= tokenExpiry;
    } catch (error) {
        console.error('Error al verificar expiración del token:', error);
        return true; // Si hay error, asumir que está expirado
    }
}

// ============================================
// FUNCIÓN PARA VERIFICAR SESIÓN ANTES DE OPERACIONES
// ============================================

function checkSessionValidity() {
    const token = getIdToken();
    
    if (!token) {
        console.warn('🔑 No hay token disponible');
        return false;
    }
    
    if (isTokenExpired(token)) {
        
        // Limpiar tokens expirados
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        
        // Actualizar variables globales
        idToken = null;
        accessToken = null;
        userInfo = null;
        
        showAlert('alert', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
        setTimeout(() => {
            window.hideApp();
        }, 2000);
        
        return false;
    }
    
    return true;
}

// ============================================
// FUNCIÓN PARA MOSTRAR TOKENS COMPLETOS
// ============================================

window.showFullTokens = function() {
    const currentIdToken = getIdToken();
    const currentAccessToken = getAccessToken();
    const currentRefreshToken = localStorage.getItem('refreshToken');
    const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || 'null'); 
    return {
        idToken: currentIdToken,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken,
        userInfo: currentUserInfo
    };
}

// ============================================
// FUNCIÓN PARA VERIFICAR Y ACTUALIZAR SESIÓN
// ============================================

function updateSessionState() {
    // Cargar tokens frescos del localStorage
    const newIdToken = localStorage.getItem('idToken');
    const newAccessToken = localStorage.getItem('accessToken');
    const newUserInfo = localStorage.getItem('userInfo');
    
    // Si hay cambios en los tokens, actualizar el estado
    if ((newIdToken && !idToken) || (newAccessToken && !accessToken)) {
        idToken = newIdToken;
        accessToken = newAccessToken;
        userInfo = JSON.parse(newUserInfo || 'null');
        
        window.showApp();
        return true;
    }
    
    return false;
}

// ============================================
// FUNCIONES PARA HACER REQUESTS CON TOKEN (EXPORTADA PARA OTROS ARCHIVOS)
// ============================================

export async function fetchWithToken(url, options = {}) {
    // Verificar sesión antes de hacer la petición
    if (!checkSessionValidity()) {
        throw new Error('Sesión no válida. Por favor, inicia sesión nuevamente.');
    }
    
    const token = getIdToken();
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token, // Usar el token directamente sin "Bearer"
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Verificar si el token ha expirado
        if (response.status === 401) {
            const responseText = await response.text();
            
            // Verificar si es por token expirado
            if (responseText.includes('expired') || responseText.includes('Unauthorized')) {
                console.warn('🔑 Token expirado, redirigiendo al login...');
                
                // Limpiar tokens expirados del localStorage
                localStorage.removeItem('idToken');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userInfo');
                
                // Mostrar mensaje al usuario y redirigir
                showAlert('alert', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
                
                // Esperar un momento para que el usuario vea el mensaje
                setTimeout(() => {
                    window.hideApp();
                    window.location.reload();
                }, 2000);
                
                throw new Error('Token expirado. Redirigiendo al login...');
            }
        }
        
        return response;
        
    } catch (error) {
        console.error('Error en fetchWithToken:', error);
        throw error;
    }
}

// Exportar función de verificación de sesión
export { checkSessionValidity };

// ============================================
// FUNCIONES GENERALES DE UI
// ============================================

window.switchTab = function(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    event.target.classList.add('active');
    
    // Cargar contenido específico de cada pestaña
    switch(tabName) {
        case 'products':
            if (window.loadProducts) window.loadProducts();
            break;
        case 'movements':
            if (window.loadMovements) window.loadMovements();
            break;
        case 'reports':
            if (window.getInventoryStatus) window.getInventoryStatus();
            break;
    }
}

window.closeModal = function() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar tokens del localStorage
    idToken = localStorage.getItem('idToken');
    accessToken = localStorage.getItem('accessToken');
    userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    
    // Agregar listeners
    const signInBtn = document.getElementById("signIn");
    if (signInBtn) {
        signInBtn.addEventListener("click", async () => {
            try {
                // Limpiar cualquier estado residual antes del login
                await clearStateBeforeLogin();
                
                console.log('🔄 Iniciando proceso de login manual...');
                
                // Hacer redirect manual a Cognito sin usar OIDC
                const clientId = "6gh6mi02h02dgli3adr2va12ev";
                const redirectUri = encodeURIComponent("http://localhost:3000/callback");
                const responseType = "code";
                const scope = encodeURIComponent("openid email");
                
                // URL simple sin prompt=login para evitar problemas de challenge
                const cognitoUrl = `https://us-east-1rnaarcaqi.auth.us-east-1.amazoncognito.com/oauth2/authorize?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}`;
                
                console.log('🚀 Redirigiendo a Cognito:', cognitoUrl);
                window.location.href = cognitoUrl;
                
            } catch (error) {
                console.error("Error al iniciar sesión:", error);
                alert("Error al iniciar sesión: " + error.message);
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                // Limpiar tokens
                localStorage.removeItem('idToken');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userInfo');
                idToken = null;
                accessToken = null;
                userInfo = null;
                
                await signOutRedirect();
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        });
    }
    
    if (idToken && accessToken) {
       
        window.showApp();
    } else {
        console.log('❌ No hay sesión activa');
        window.hideApp();
    }
});

// ============================================
// VERIFICAR CAMBIOS DE SESIÓN CADA 500ms
// ============================================
setInterval(() => {
    if (updateSessionState()) {
        // Si detectamos cambios, detener la verificación frecuente
        console.log('🔄 Sesión actualizada, monitoreando cambios cada 5 segundos');
    }
}, 500);

// Después de 5 segundos, cambiar a verificación menos frecuente
setTimeout(() => {
    setInterval(() => {
        updateSessionState();
    }, 5000);
}, 5000);

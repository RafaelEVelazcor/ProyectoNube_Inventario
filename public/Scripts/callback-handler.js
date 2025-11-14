import { userManager } from './config.js';


// ============================================
// PROCESAR EL CALLBACK DE COGNITO CON CLIENT SECRET
// ============================================
async function handleCallback() {
    try {
        console.log('🔄 Procesando callback de Cognito...');
        
        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
            throw new Error(`${error}: ${errorDescription}`);
        }

        if (!code) {
            throw new Error('No se recibió código de autorización de Cognito');
        }

        // ============================================
        // INTERCAMBIO DE CÓDIGO POR TOKENS CON CLIENT SECRET
        // ============================================
        
        const tokenEndpoint = 'https://us-east-1rnaarcaqi.auth.us-east-1.amazoncognito.com/oauth2/token';
        const clientId = '6gh6mi02h02dgli3adr2va12ev';
        const clientSecret = '1e3f3v5ujislchi1asgcfnbqtvoovhdf3d2ir513jhdsbl2e0ocj';
        const redirectUri = 'http://localhost:3000/callback';
        
        // Preparar datos para el intercambio
        const tokenData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri
        });

        console.log('🔄 Intercambiando código por tokens...');

        // Hacer la petición al endpoint de tokens
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error en intercambio de tokens: ${response.status} - ${errorData}`);
        }

        const tokenResponse = await response.json();
        console.log('✅ Tokens recibidos');

        // Decodificar el ID token para obtener información del usuario
        let userInfo = {};
        if (tokenResponse.id_token) {
            try {
                const base64Payload = tokenResponse.id_token.split('.')[1];
                const payload = JSON.parse(atob(base64Payload));
                
                userInfo = {
                    email: payload.email,
                    username: payload['cognito:username'],
                    sub: payload.sub,
                    name: payload.name || payload.email,
                    given_name: payload.given_name,
                    family_name: payload.family_name
                };
             
            } catch (e) {
                console.warn("⚠️ No se pudo decodificar información del usuario:", e);
            }
        }

        // Guardar tokens en localStorage
        localStorage.setItem("idToken", tokenResponse.id_token || '');
        localStorage.setItem("accessToken", tokenResponse.access_token || '');
        localStorage.setItem("refreshToken", tokenResponse.refresh_token || '');
        localStorage.setItem("userInfo", JSON.stringify(userInfo));

        console.log('💾 Tokens guardados en localStorage');

        // Enviar tokens al servidor para loggear en terminal
        try {
            await fetch('/log-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_token: tokenResponse.access_token,
                    id_token: tokenResponse.id_token,
                    refresh_token: tokenResponse.refresh_token,
                    userInfo: userInfo
                })
            });
            console.log('📝 Tokens enviados al servidor');
        } catch (logError) {
            console.warn('⚠️ No se pudieron loggear tokens en servidor:', logError);
        }

        // Mostrar mensaje en la pantalla antes de redirigir
        document.querySelector(".loading-container").innerHTML = `
            <h2 style="color: #28a745;">✅ ¡Autenticación exitosa!</h2>
            <p>Acceso concedido</p>
            <p style="font-size: 14px; color: #6c757d;">Email: ${userInfo.email || 'No disponible'}</p>
            <p style="font-size: 14px; color: #6c757d;">Redirigiendo en 3 segundos...</p>
            <div style="margin-top: 20px;">
                <div style="width: 100%; background-color: #e9ecef; height: 4px; border-radius: 2px;">
                    <div id="progress-bar" style="width: 0%; background-color: #28a745; height: 4px; border-radius: 2px; transition: width 0.1s;"></div>
                </div>
            </div>
        `;
        
        // Animación de progreso
        let progress = 0;
        const progressBar = document.getElementById('progress-bar');
        const progressInterval = setInterval(() => {
            progress += 2;
            progressBar.style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 60);
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
            window.location.href = "/";
        }, 3000);
        
    } catch (error) {
        console.error("❌ Error en el callback:", error);
        document.querySelector(".loading-container").innerHTML = `
            <h2 style="color: #dc3545;">❌ Error de autenticación</h2>
            <p>${error.message}</p>
            <button onclick="window.location.href='/'" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 20px;
            ">← Volver al inicio</button>
        `;
    }
}

// Ejecutar cuando la página se carga
handleCallback();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware de parseo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para CORS en todas las rutas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ============================================
// PROXY PARA COGNITO (evitar CORS)
// ============================================
app.get('/cognito-metadata', async (req, res) => {
  try {
    const cognitoDomain = 'https://us-east-1rnaarcaqi.auth.us-east-1.amazoncognito.com';
    const response = await fetch(`${cognitoDomain}/.well-known/openid-configuration`);
    const data = await response.json();
    
    // Agregar headers CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.json(data);
  } catch (error) {
    console.error('Error fetching Cognito metadata:', error);
    res.status(500).json({ error: 'Failed to fetch Cognito metadata' });
  }
});

// ============================================
// RUTAS PRINCIPALES (antes de static middleware)
// ============================================

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/Views/index.html'));
});

// Ruta de callback para OAuth
app.get('/callback', (req, res) => {
  console.log('📋 Callback accessed with code:', req.query.code ? req.query.code.substring(0, 10) + '...' : 'No code');
  res.sendFile(path.join(__dirname, 'public/Views/callback.html'));
});

// Ruta para recibir tokens y loggearlos en el servidor
app.post('/log-tokens', (req, res) => {
  const { access_token, id_token, refresh_token, userInfo } = req.body;
  
  console.log('\n🎉 ===== TOKENS REALES OBTENIDOS =====');
  console.log('🔐 Access Token:', access_token ? access_token.substring(0, 50) + '...' : 'No disponible');
  console.log('🆔 ID Token:', id_token ? id_token.substring(0, 50) + '...' : 'No disponible');
  console.log('🔄 Refresh Token:', refresh_token ? refresh_token.substring(0, 50) + '...' : 'No disponible');
  console.log('👤 User Info:', userInfo || 'No disponible');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('========================================\n');
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.json({ success: true, message: 'Tokens logged successfully' });
});

// Servir archivos estáticos DESPUÉS de las rutas principales
app.use(express.static(path.join(__dirname, 'public')));

// Manejo de errores 404
app.use((req, res) => {
  // Si la ruta es para HTML, servir index.html (SPA routing)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public/Views/index.html'));
});

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Accede a http://localhost:${PORT}`);
});

// Manejo de errores del servidor
server.on('error', (err) => {
  console.error('❌ Error en el servidor:', err);
});

// Mantener el proceso vivo
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
});

console.log('🚀 Proceso del servidor iniciado con PID:', process.pid);



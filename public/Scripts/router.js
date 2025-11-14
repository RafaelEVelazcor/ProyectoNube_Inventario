import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.use((req, res, next) => {
    console.log(`🔍 Router middleware: ${req.method} ${req.path}`);
    // Si la ruta viene con /Views, la removemos para procesamiento interno
    if (req.path.startsWith('/Views')) {
        req.url = req.url.replace('/Views', '');
        req.originalUrl = req.originalUrl.replace('/Views', '');
    }
    next();
});

// Definir rutas
router.get('/', (req, res) => {
    console.log('✅ Serving index.html');
    res.sendFile(path.resolve(__dirname + "/../Views/index.html"));
});

router.get('/callback', (req, res) => {
    console.log('✅ Serving callback.html');
    res.sendFile(path.resolve(__dirname + "/../Views/callback.html"));
});

export default router;
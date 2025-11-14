// Este es el punto de entrada principal para Vite
import { userManager } from './config.js'
import './Index.js'

// Hacer disponible globalmente para HTML
window.userManager = userManager

// ============================================
// FUNCIONES ESPECÍFICAS DE MOVIMIENTOS
// ============================================

import { fetchWithToken, showAlert, checkSessionValidity } from './Index.js';

// ============================================
// CONFIGURACIÓN DE ENDPOINTS REALES
// ============================================

const API_BASE_URL = 'https://tg4ha3pxcd.execute-api.us-east-1.amazonaws.com/dev';
const ENDPOINTS = {
    MOVEMENTS: `${API_BASE_URL}/movements`,
    PRODUCTS: `${API_BASE_URL}/products`, // Para validar IDs de productos
};

// ============================================
// FUNCIONES DE MOVIMIENTOS
// ============================================

window.loadMovements = async function() {
    try {
        if (!checkSessionValidity()) {
            return;
        }

        console.log('📊 Cargando movimientos...');
        
        const response = await fetchWithToken(ENDPOINTS.MOVEMENTS);
        if (!response.ok) {
            throw new Error('Error al cargar movimientos');
        }
        
        const movements = await response.json();
        console.log('🎯 MOVIMIENTOS RAW DEL API:', movements);
        console.log('🎯 TIPO DE DATOS:', typeof movements);
        console.log('🎯 ES ARRAY:', Array.isArray(movements));
        console.log('🎯 KEYS DEL OBJETO:', Object.keys(movements));
        
        // Mostrar movimientos en la UI
        displayMovements(movements);
        
        // Actualizar estadísticas
        updateMovementStats(movements);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('alert', 'Error al cargar movimientos', 'error');
    }
}

function displayMovements(movements) {
    // Función para mostrar movimientos en la UI
    const movementsList = document.getElementById('movements-list');
    if (!movementsList) return;
    
    console.log('🔍 Estructura de movimientos recibida:', movements);
    
    // Intentar diferentes estructuras de datos del API
    let movementsArray = [];
    
    if (Array.isArray(movements)) {
        movementsArray = movements;
    } else if (movements && movements.movements && Array.isArray(movements.movements)) {
        movementsArray = movements.movements;
    } else if (movements && movements.data && Array.isArray(movements.data)) {
        movementsArray = movements.data;
    } else if (movements && movements.Items && Array.isArray(movements.Items)) {
        movementsArray = movements.Items;
    } else if (movements && typeof movements === 'object') {
        // Si es un objeto con una sola propiedad que contiene el array
        const keys = Object.keys(movements);
        for (const key of keys) {
            if (Array.isArray(movements[key])) {
                movementsArray = movements[key];
                break;
            }
        }
    }
    
    console.log('📦 Array de movimientos procesado:', movementsArray);
    console.log('📊 Cantidad de movimientos:', movementsArray.length);
    
    if (movementsArray && movementsArray.length > 0) {
        movementsList.innerHTML = movementsArray.map((movement, index) => {
            console.log(`🔍 Movimiento ${index}:`, movement);
            
            const movementType = movement.type || 'N/A';
            const typeColor = getMovementTypeColor(movementType);
            
            return `
                <div class="movement-item ${movementType.toLowerCase()}">
                    <div class="movement-header">
                        <div class="movement-type" style="color: ${typeColor}">
                            ${getMovementIcon(movementType)} ${movementType}
                        </div>
                        <span class="movement-date">${formatDate(movement.timestamp || movement.createdAt || new Date())}</span>
                    </div>
                    
                    <div class="movement-product">
                        <div class="product-name">${movement.productName || 'Producto desconocido'}</div>
                        <div class="product-id">${movement.product_Id || movement.productId || 'N/A'}</div>
                    </div>
                    
                    <div class="movement-content">
                        <div class="movement-section">
                            <h4>📋 Detalles</h4>
                            <div class="movement-details-compact">
                                <span>Cantidad: ${movement.quantity || 0} unidades</span>
                                <span>Razón: ${movement.reason || 'Sin razón'}</span>
                                <span>Referencia: ${movement.reference || 'N/A'}</span>
                                <span>Realizado por: ${getUserEmail() || 'Usuario desconocido'}</span>
                            </div>
                        </div>
                        
                        <div class="movement-section">
                            <h4>📊 Stock</h4>
                            <div class="stock-changes">
                                <span class="stock-value stock-previous">${movement.previousStock || 'N/A'}</span>
                                <span class="stock-arrow">→</span>
                                <span class="stock-value stock-new">${movement.newStock || 'N/A'}</span>
                            </div>
                            
                            ${(movement.unitCost || movement.totalCost) ? `
                                <div class="movement-costs">
                                    ${movement.unitCost ? `
                                        <div class="cost-item">
                                            <div class="cost-label">Costo Unit.</div>
                                            <div class="cost-value">$${parseFloat(movement.unitCost).toFixed(2)}</div>
                                        </div>
                                    ` : ''}
                                    ${movement.totalCost ? `
                                        <div class="cost-item">
                                            <div class="cost-label">Costo Total</div>
                                            <div class="cost-value">$${parseFloat(movement.totalCost).toFixed(2)}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${movement.notes ? `
                        <div style="margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                            <strong>📝 Notas:</strong> ${movement.notes}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } else {
        console.log('❌ No se encontraron movimientos o el array está vacío');
        movementsList.innerHTML = '<p class="no-movements">No hay movimientos disponibles</p>';
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

function getMovementTypeColor(type) {
    switch(type) {
        case 'ENTRADA':
            return '#28a745'; // Verde
        case 'SALIDA':
            return '#dc3545'; // Rojo
        case 'AJUSTE':
            return '#ffc107'; // Amarillo/Naranja
        default:
            return '#6c757d'; // Gris
    }
}

function getMovementIcon(type) {
    switch(type) {
        case 'ENTRADA':
            return '📈'; // Flecha hacia arriba/entrada
        case 'SALIDA':
            return '📉'; // Flecha hacia abajo/salida
        case 'AJUSTE':
            return '⚖️'; // Balanza para ajustes
        default:
            return '📋'; // Clipboard por defecto
    }
}

function getUserEmail() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const user = JSON.parse(userInfo);
            return user.email || user.username || 'Usuario desconocido';
        }
        return 'Usuario desconocido';
    } catch (error) {
        console.warn('Error al obtener información del usuario:', error);
        return 'Usuario desconocido';
    }
}

function updateMovementStats(movements) {
    // Usar la misma lógica de extracción que displayMovements
    let movementsArray = [];
    
    if (Array.isArray(movements)) {
        movementsArray = movements;
    } else if (movements && movements.movements && Array.isArray(movements.movements)) {
        movementsArray = movements.movements;
    } else if (movements && movements.data && Array.isArray(movements.data)) {
        movementsArray = movements.data;
    } else if (movements && movements.Items && Array.isArray(movements.Items)) {
        movementsArray = movements.Items;
    } else if (movements && typeof movements === 'object') {
        const keys = Object.keys(movements);
        for (const key of keys) {
            if (Array.isArray(movements[key])) {
                movementsArray = movements[key];
                break;
            }
        }
    }
    
    const stats = {
        total: movementsArray.length,
        entradas: movementsArray.filter(m => m.type === 'ENTRADA').length,
        salidas: movementsArray.filter(m => m.type === 'SALIDA').length,
        ajustes: movementsArray.filter(m => m.type === 'AJUSTE').length,
    };
    
    console.log('📊 Estadísticas de movimientos:', stats);
    
    // Actualizar elementos del DOM
    const totalElement = document.getElementById('totalMovimientos');
    const entradasElement = document.getElementById('entradasTotal');
    const salidasElement = document.getElementById('salidasTotal');
    
    if (totalElement) totalElement.textContent = stats.total;
    if (entradasElement) entradasElement.textContent = stats.entradas;
    if (salidasElement) salidasElement.textContent = stats.salidas;
}

window.addMovement = async function() {
    // Verificar sesión antes de proceder
    if (!checkSessionValidity()) {
        return;
    }
    
    try {
        // Obtener datos del formulario
        const productId = document.getElementById('productId')?.value || '';
        const movementType = document.getElementById('movementType')?.value || '';
        const quantity = parseInt(document.getElementById('movementQuantity')?.value || '0');
        const reason = document.getElementById('reason')?.value || '';
        const reference = document.getElementById('reference')?.value || '';
        const unitCost = parseFloat(document.getElementById('unitCost')?.value || '0');
        const notes = document.getElementById('notes')?.value || '';
        
        // Validaciones básicas
        if (!productId.trim()) {
            showAlert('alert', 'El ID del producto es obligatorio', 'error');
            return;
        }
        
        if (!movementType) {
            showAlert('alert', 'El tipo de movimiento es obligatorio', 'error');
            return;
        }
        
        if (quantity <= 0) {
            showAlert('alert', 'La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        if (!reason.trim()) {
            showAlert('alert', 'La razón del movimiento es obligatoria', 'error');
            return;
        }
        
        console.log('📦 Agregando movimiento...', {
            productId,
            type: movementType,
            quantity
        });
        
        // Estructura de datos según tu API
        const movementData = {
            product_Id: productId,
            type: movementType,
            quantity: quantity,
            reason: reason,
            reference: reference || undefined,
            unitCost: unitCost > 0 ? unitCost : undefined,
            notes: notes || undefined
        };
        
        // Remover campos undefined del objeto
        Object.keys(movementData).forEach(key => 
            movementData[key] === undefined && delete movementData[key]
        );
        
        console.log('📤 Enviando datos del movimiento:', movementData);
        
        const response = await fetchWithToken(ENDPOINTS.MOVEMENTS, {
            method: 'POST',
            body: JSON.stringify(movementData)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(`Error al agregar movimiento: ${errorData}`);
        }
        
        const result = await response.json();
        console.log('✅ Movimiento agregado:', result);
        
        // Recargar lista de movimientos
        await window.loadMovements();
        
        // Limpiar formulario
        const form = document.getElementById('movementForm');
        if (form) form.reset();
        
        showAlert('alert', 'Movimiento registrado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        showAlert('alert', `Error al registrar movimiento: ${error.message}`, 'error');
    }
}

window.viewMovementDetail = function(movementId) {
    // Mostrar modal con detalles del movimiento
    const modal = document.getElementById('detailModal');
    if (modal) {
        // Aquí cargarías los detalles del movimiento específico
        modal.style.display = 'block';
    }
}

window.filterMovements = async function() {
    try {
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;
        const movementType = document.getElementById('typeFilter').value;
        
        // Por ahora, simplemente recargar todos los movimientos
        // En el futuro se puede implementar filtrado del lado del cliente o servidor
        await window.loadMovements();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al filtrar movimientos', 'error');
    }
}

window.clearMovementFilters = function() {
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    document.getElementById('typeFilter').value = '';
    
    // Recargar todos los movimientos
    window.loadMovements();
}

// Event listeners específicos de movimientos
document.addEventListener('DOMContentLoaded', () => {
    const movementForm = document.getElementById('movementForm');
    if (movementForm) {
        movementForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await window.addMovement();
        });
    }
});

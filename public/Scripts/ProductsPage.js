// ============================================
// FUNCIONES ESPECÍFICAS DE PRODUCTOS
// ============================================

import { fetchWithToken, showAlert, checkSessionValidity } from './Index.js';

// ============================================
// CONFIGURACIÓN DE ENDPOINTS REALES
// ============================================

const API_BASE_URL = 'https://tg4ha3pxcd.execute-api.us-east-1.amazonaws.com/dev';
const ENDPOINTS = {
    PRODUCTS: `${API_BASE_URL}/products`,
    SEARCH: `${API_BASE_URL}/products/search`,
};

// ============================================
// FUNCIONES DE CÁLCULOS DE INVENTARIO
// ============================================

function calculateInventoryMetrics(products) {
    // Usar la misma lógica de extracción que displayProducts
    let productsArray = [];
    
    if (Array.isArray(products)) {
        productsArray = products;
    } else if (products && products.products && Array.isArray(products.products)) {
        productsArray = products.products;
    } else if (products && products.data && Array.isArray(products.data)) {
        productsArray = products.data;
    } else if (products && products.Items && Array.isArray(products.Items)) {
        productsArray = products.Items;
    } else if (products && typeof products === 'object') {
        const keys = Object.keys(products);
        for (const key of keys) {
            if (Array.isArray(products[key])) {
                productsArray = products[key];
                break;
            }
        }
    }
    
    if (!productsArray || productsArray.length === 0) {
        updateMetricsDisplay(0, 0, 0, []);
        return;
    }
    
    let totalValue = 0;
    let totalProducts = productsArray.length;
    let lowStockProducts = [];
    
    productsArray.forEach(product => {
        // Calcular valor total del inventario (precio unitario * stock actual)
        const unitPrice = product.unitPrice || product.price || product.cost || 0;
        const currentStock = product.currentStock || product.stock || product.quantity || 0;
        const productValue = unitPrice * currentStock;
        
        totalValue += productValue;
        
        // Detectar productos con stock bajo (stock actual <= stock mínimo)
        const minStock = product.minStock || product.minimumStock || 0;
        if (currentStock <= minStock && minStock > 0) {
            lowStockProducts.push({
                name: product.name || product.productName || product.title || 'Sin nombre',
                SKU: product.SKU || product.sku || product.id || 'N/A',
                currentStock: currentStock,
                minStock: minStock,
                deficit: minStock - currentStock
            });
        }
    });
    
    console.log('📊 Métricas de inventario calculadas:', {
        totalValue: totalValue.toFixed(2),
        totalProducts,
        lowStockCount: lowStockProducts.length,
        lowStockProducts
    });
    
    // Actualizar la UI con las métricas
    updateMetricsDisplay(totalValue, totalProducts, lowStockProducts.length, lowStockProducts);
}

function updateMetricsDisplay(totalValue, totalProducts, lowStockCount, lowStockProducts) {
    // Actualizar elementos de métricas en la UI
    const totalValueEl = document.getElementById('total-inventory-value');
    const totalProductsEl = document.getElementById('total-products-count');
    const lowStockEl = document.getElementById('low-stock-count');
    const lowStockListEl = document.getElementById('low-stock-list');
    
    if (totalValueEl) {
        totalValueEl.textContent = `$${totalValue.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    
    if (totalProductsEl) {
        totalProductsEl.textContent = totalProducts;
    }
    
    if (lowStockEl) {
        lowStockEl.textContent = lowStockCount;
        // Agregar clase de alerta si hay productos con stock bajo
        lowStockEl.className = lowStockCount > 0 ? 'metric-value low-stock-warning' : 'metric-value';
    }
    
    // Mostrar lista detallada de productos con stock bajo
    if (lowStockListEl) {
        if (lowStockProducts.length > 0) {
            lowStockListEl.innerHTML = `
                <h4>⚠️ Productos con Stock Bajo:</h4>
                <ul class="low-stock-list">
                    ${lowStockProducts.map(product => `
                        <li class="low-stock-item">
                            <strong>${product.name}</strong> (${product.SKU})<br>
                            <span class="stock-info">Stock actual: ${product.currentStock} | Mínimo: ${product.minStock}</span>
                            <span class="deficit">Déficit: ${product.deficit} unidades</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            lowStockListEl.innerHTML = '<p class="no-alerts">✅ Todos los productos tienen stock adecuado</p>';
        }
    }
}

// Función para obtener solo las métricas (útil para dashboard)
window.getInventoryMetrics = async function() {
    try {
        const response = await fetchWithToken(ENDPOINTS.PRODUCTS);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const products = await response.json();
        const productsArray = Array.isArray(products) ? products : (products.data || []);
        
        let totalValue = 0;
        let totalProducts = productsArray.length;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        productsArray.forEach(product => {
            const unitPrice = product.unitPrice || 0;
            const currentStock = product.currentStock || 0;
            const minStock = product.minStock || 0;
            
            // Valor total
            totalValue += unitPrice * currentStock;
            
            // Stock bajo
            if (currentStock <= minStock && minStock > 0) {
                lowStockCount++;
            }
            
            // Sin stock
            if (currentStock === 0) {
                outOfStockCount++;
            }
        });
        
        return {
            totalValue: parseFloat(totalValue.toFixed(2)),
            totalProducts,
            lowStockCount,
            outOfStockCount,
            averageValue: totalProducts > 0 ? parseFloat((totalValue / totalProducts).toFixed(2)) : 0
        };
        
    } catch (error) {
        console.error('Error al calcular métricas:', error);
        return {
            totalValue: 0,
            totalProducts: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            averageValue: 0
        };
    }
}

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

window.loadProducts = async function() {
    try {
        const response = await fetchWithToken(ENDPOINTS.PRODUCTS);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const products = await response.json();
        console.log('Productos cargados:', products);
        
        // Mostrar productos en la UI
        displayProducts(products);
        
        // Calcular y mostrar métricas del inventario
        calculateInventoryMetrics(products);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al cargar productos', 'error');
    }
}

// Función para buscar productos
window.searchProducts = async function(searchTerm) {
    try {
        console.log('🔍 Buscando productos con término:', searchTerm);
        
        if (!searchTerm || searchTerm.trim() === '') {
            // Si no hay término de búsqueda, cargar todos los productos
            await window.loadProducts();
            return;
        }
        
        const searchUrl = `${ENDPOINTS.SEARCH}?q=${encodeURIComponent(searchTerm.trim())}`;
        console.log('🔗 URL de búsqueda:', searchUrl);
        
        const response = await fetchWithToken(searchUrl);
        if (!response.ok) throw new Error('Error al buscar productos');
        
        const searchResults = await response.json();
        console.log('📋 Resultados de búsqueda:', searchResults);
        
        // Mostrar resultados de búsqueda
        displayProducts(searchResults);
        
        // Calcular métricas con los resultados filtrados
        calculateInventoryMetrics(searchResults);
        
        // Mostrar información de búsqueda
        displaySearchInfo(searchTerm, searchResults);
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        showAlert('alert', 'Error al buscar productos', 'error');
    }
}

// Función para mostrar información de búsqueda
function displaySearchInfo(searchTerm, results) {
    // Extraer array de productos para contar
    let productsArray = [];
    if (Array.isArray(results)) {
        productsArray = results;
    } else if (results && results.products && Array.isArray(results.products)) {
        productsArray = results.products;
    } else if (results && results.data && Array.isArray(results.data)) {
        productsArray = results.data;
    } else if (results && typeof results === 'object') {
        const keys = Object.keys(results);
        for (const key of keys) {
            if (Array.isArray(results[key])) {
                productsArray = results[key];
                break;
            }
        }
    }
    
    const count = productsArray.length;
    const searchBar = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchBar && searchTerm) {
        // Agregar indicador visual de que hay una búsqueda activa
        searchBar.classList.add('searching');
        
        if (clearBtn) {
            clearBtn.style.display = 'flex';
        }
        
        // Mostrar contador de resultados
        let searchInfo = document.getElementById('search-info');
        if (!searchInfo) {
            searchInfo = document.createElement('div');
            searchInfo.id = 'search-info';
            searchBar.parentNode.insertBefore(searchInfo, searchBar.nextSibling);
        }
        
        searchInfo.innerHTML = `
            <span>🔍 Búsqueda: "<strong>${searchTerm}</strong>" - 
            ${count} resultado${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}</span>
            <button onclick="clearSearch()">✕ Limpiar</button>
        `;
    }
}

// Función para limpiar la búsqueda
window.clearSearch = function() {
    const searchBar = document.getElementById('searchInput');
    const searchInfo = document.getElementById('search-info');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchBar) {
        searchBar.value = '';
        searchBar.classList.remove('searching');
    }
    
    if (searchInfo) {
        searchInfo.remove();
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Recargar todos los productos
    window.loadProducts();
}

// Función para mostrar información de paginación
function displayPaginationInfo(data, filters) {
    const paginationEl = document.getElementById('pagination-info');
    if (!paginationEl) return;
    
    // Extraer información de paginación del response
    let totalItems = 0;
    let currentPage = 1;
    let itemsPerPage = 20;
    
    if (data.pagination) {
        totalItems = data.pagination.total || 0;
        currentPage = data.pagination.page || 1;
        itemsPerPage = data.pagination.limit || 20;
    } else if (data.total !== undefined) {
        totalItems = data.total;
        currentPage = filters.page || 1;
        itemsPerPage = filters.limit || 20;
    }
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    paginationEl.innerHTML = `
        Mostrando ${startItem}-${endItem} de ${totalItems} productos
        <button onclick="loadProductsPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            ← Anterior
        </button>
        Página ${currentPage} de ${totalPages}
        <button onclick="loadProductsPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;
}

// Función para cargar una página específica
window.loadProductsPage = function(page) {
    if (page < 1) return;
    
    const currentFilters = getCurrentFilters();
    currentFilters.page = page;
    
    window.loadProducts(currentFilters);
}

// Función para obtener los filtros actuales de la UI
function getCurrentFilters() {
    const filters = {};
    
    // Obtener valores de los filtros
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    const minStockFilter = document.getElementById('minStockFilter');
    const tagFilter = document.getElementById('tagFilter');
    const limitFilter = document.getElementById('limitFilter');
    
    if (categoryFilter && categoryFilter.value) {
        filters.category = categoryFilter.value;
    }
    
    if (statusFilter && statusFilter.value) {
        filters.status = statusFilter.value;
    }
    
    if (searchInput && searchInput.value.trim()) {
        filters.search = searchInput.value.trim();
    }
    
    if (minStockFilter && minStockFilter.value) {
        filters.minStock = parseInt(minStockFilter.value);
    }
    
    if (tagFilter && tagFilter.value) {
        filters.tag = tagFilter.value;
    }
    
    if (limitFilter && limitFilter.value) {
        filters.limit = parseInt(limitFilter.value);
    }
    
    return filters;
}

function displayProducts(products) {
    // Función para mostrar productos en la UI
    const productsList = document.getElementById('products-list');
    if (!productsList) return;
    
    console.log('🔍 Estructura de productos recibida:', products);
    
    // Intentar diferentes estructuras de datos del API
    let productsArray = [];
    
    if (Array.isArray(products)) {
        productsArray = products;
    } else if (products && products.products && Array.isArray(products.products)) {
        productsArray = products.products;
    } else if (products && products.data && Array.isArray(products.data)) {
        productsArray = products.data;
    } else if (products && products.Items && Array.isArray(products.Items)) {
        productsArray = products.Items;
    } else if (products && typeof products === 'object') {
        // Si es un objeto con una sola propiedad que contiene el array
        const keys = Object.keys(products);
        for (const key of keys) {
            if (Array.isArray(products[key])) {
                productsArray = products[key];
                break;
            }
        }
    }
    
    console.log('📦 Array de productos procesado:', productsArray);
    console.log('📊 Cantidad de productos:', productsArray.length);
    
    if (productsArray && productsArray.length > 0) {
        productsList.innerHTML = productsArray.map((product, index) => {
            console.log(`🔍 Producto ${index}:`, product);
            console.log(`🔑 Product ID disponible: ${product.product_Id || product.product_id || product.productId || product.id || 'No disponible'}`);
            
            // Obtener el product_id correcto (puede venir como product_Id, product_id, productId, etc.)
            const productId = product.product_Id || product.product_id || product.productId || product.id;
            const displaySku = product.SKU || product.sku || 'N/A';
            
            console.log(`🔍 Producto ${index} - product_id: ${productId}, SKU: ${displaySku}`);
            
            return `
                <div class="product-item">
                    <div class="product-header">
                        <h3>${product.name || product.productName || product.title || 'Sin nombre'}</h3>
                        <span class="sku">${displaySku}</span>
                    </div>
                    <div class="product-details">
                        <p><strong>ID:</strong> ${productId}</p>
                        <p><strong>Descripción:</strong> ${product.description || product.desc || 'Sin descripción'}</p>
                        <p><strong>Categoría:</strong> ${product.category || product.productCategory || 'Sin categoría'}</p>
                        <p><strong>Precio:</strong> $${product.unitPrice || product.price || product.cost || 0}</p>
                        <p><strong>Stock:</strong> ${product.currentStock || product.stock || product.quantity || 0} unidades</p>
                        <p><strong>Stock Mínimo:</strong> ${product.minStock || product.minimumStock || 0}</p>
                        <p><strong>Stock Máximo:</strong> ${product.maxStock || product.maximumStock || 0}</p>
                        <p><strong>Código de Barras:</strong> ${product.barcode || product.barCode || 'N/A'}</p>
                        <p><strong>Estado:</strong> ${product.isActive !== false ? 'Activo' : 'Inactivo'}</p>
                    </div>
                    ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name || 'Producto'}" class="product-image" style="max-width: 200px;">` : ''}
                    <div class="product-actions">
                        <button onclick="editProduct('${productId}')" class="btn-edit">Editar</button>
                        <button onclick="deleteProduct('${productId}')" class="btn-delete">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        console.log('❌ No se encontraron productos o el array está vacío');
        productsList.innerHTML = '<p>No hay productos disponibles</p>';
    }
}

window.addProduct = async function() {
    // Verificar sesión antes de proceder
    if (!checkSessionValidity()) {
        return;
    }
    
    try {
        // Obtener datos del formulario
        const productName = document.getElementById('productName')?.value || '';
        const productDescription = document.getElementById('productDescription')?.value || '';
        const productSKU = document.getElementById('productSKU')?.value || '';
        const productCategory = document.getElementById('productCategory')?.value || '';
        const currentStock = parseInt(document.getElementById('currentStock')?.value || '0');
        const minStock = parseInt(document.getElementById('minStock')?.value || '0');
        const maxStock = parseInt(document.getElementById('maxStock')?.value || '0');
        const unitPrice = parseFloat(document.getElementById('unitPrice')?.value || '0');
        const costPrice = parseFloat(document.getElementById('costPrice')?.value || '0');
        const barcode = document.getElementById('barcode')?.value || '';
        const imageUrl = document.getElementById('imageUrl')?.value || '';
        const isActive = document.getElementById('isActive')?.checked !== false;
        
        // Validaciones básicas
        if (!productName.trim()) {
            showAlert('alert', 'El nombre del producto es obligatorio', 'error');
            return;
        }
        
        if (!productSKU.trim()) {
            showAlert('alert', 'El SKU es obligatorio', 'error');
            return;
        }
        
        console.log('📦 Agregando producto...', {
            name: productName,
            SKU: productSKU,
            category: productCategory
        });
        
        // Estructura de datos según el ejemplo proporcionado
        const productData = {
            name: productName,
            description: productDescription,
            SKU: productSKU,
            category: productCategory,
            currentStock: currentStock,
            minStock: minStock,
            maxStock: maxStock,
            unitPrice: unitPrice,
            costPrice: costPrice,
            barcode: barcode,
            imageUrl: imageUrl,
            tags: productName ? [productName.toLowerCase()] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "current_user", // Se puede obtener del token JWT
            isActive: isActive
        };
        
        console.log('📤 Enviando datos:', productData);
        
        const response = await fetchWithToken(ENDPOINTS.PRODUCTS, {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(`Error al agregar producto: ${errorData}`);
        }
        
        const result = await response.json();
        console.log('✅ Producto agregado:', result);
        
        // Recargar lista de productos
        await window.loadProducts();
        
        // Limpiar formulario
        const form = document.getElementById('productForm');
        if (form) form.reset();
        
        showAlert('alert', 'Producto agregado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        showAlert('alert', `Error al agregar producto: ${error.message}`, 'error');
    }
}

window.editProduct = async function(productId) {
    try {
        console.log('📝 Editando producto con ID:', productId);
        
        const response = await fetchWithToken(`${ENDPOINTS.PRODUCTS}/${productId}`);
        if (!response.ok) throw new Error('Error al obtener producto');
        
        const productData = await response.json();
        console.log('📦 Datos del producto obtenidos:', productData);
        
        // Extraer el producto de la respuesta (puede venir en different estructuras)
        let product = productData;
        if (productData.body && typeof productData.body === 'string') {
            product = JSON.parse(productData.body);
        } else if (productData.product) {
            product = productData.product;
        } else if (productData.data) {
            product = productData.data;
        }
        
        // Llenar formulario con datos del producto
        document.getElementById('editProductId').value = productId;
        
        // Llenar campos según la estructura real
        if (document.getElementById('productName')) document.getElementById('productName').value = product.name || '';
        if (document.getElementById('productDescription')) document.getElementById('productDescription').value = product.description || '';
        if (document.getElementById('productSKU')) document.getElementById('productSKU').value = product.SKU || '';
        if (document.getElementById('productCategory')) document.getElementById('productCategory').value = product.category || '';
        if (document.getElementById('currentStock')) document.getElementById('currentStock').value = product.currentStock || 0;
        if (document.getElementById('minStock')) document.getElementById('minStock').value = product.minStock || 0;
        if (document.getElementById('maxStock')) document.getElementById('maxStock').value = product.maxStock || 0;
        if (document.getElementById('unitPrice')) document.getElementById('unitPrice').value = product.unitPrice || 0;
        if (document.getElementById('costPrice')) document.getElementById('costPrice').value = product.costPrice || 0;
        if (document.getElementById('barcode')) document.getElementById('barcode').value = product.barcode || '';
        if (document.getElementById('imageUrl')) document.getElementById('imageUrl').value = product.imageUrl || '';
        if (document.getElementById('isActive')) document.getElementById('isActive').checked = product.isActive !== false;
        
        // Cambiar título del formulario
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        if (formTitle) formTitle.textContent = '✏️ Editar Producto';
        if (submitBtn) submitBtn.textContent = 'Actualizar Producto';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        // Desplazar la página hacia el formulario de edición
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Agregar clase de resaltado
            formSection.classList.add('editing');
            formSection.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.3)';
            formSection.style.border = '2px solid #4a90e2';
            
            // Quitar el resaltado después de 3 segundos
            setTimeout(() => {
                formSection.classList.remove('editing');
                formSection.style.boxShadow = '';
                formSection.style.border = '';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al cargar producto para editar', 'error');
    }
}

window.updateProduct = async function() {
    try {
        const productId = document.getElementById('editProductId').value;
        
        console.log('🔄 Actualizando producto con ID:', productId);
        
        // Obtener datos del formulario
        const productName = document.getElementById('productName')?.value || '';
        const productDescription = document.getElementById('productDescription')?.value || '';
        const productSKU = document.getElementById('productSKU')?.value || '';
        const productCategory = document.getElementById('productCategory')?.value || '';
        const currentStock = parseInt(document.getElementById('currentStock')?.value || '0');
        const minStock = parseInt(document.getElementById('minStock')?.value || '0');
        const maxStock = parseInt(document.getElementById('maxStock')?.value || '0');
        const unitPrice = parseFloat(document.getElementById('unitPrice')?.value || '0');
        const costPrice = parseFloat(document.getElementById('costPrice')?.value || '0');
        const barcode = document.getElementById('barcode')?.value || '';
        const imageUrl = document.getElementById('imageUrl')?.value || '';
        const isActive = document.getElementById('isActive')?.checked !== false;
        
        const productData = {
            name: productName,
            description: productDescription,
            SKU: productSKU,
            category: productCategory,
            currentStock: currentStock,
            minStock: minStock,
            maxStock: maxStock,
            unitPrice: unitPrice,
            costPrice: costPrice,
            barcode: barcode,
            imageUrl: imageUrl,
            tags: productName ? [productName.toLowerCase()] : [],
            updatedAt: new Date().toISOString(),
            isActive: isActive
        };
        
        const response = await fetchWithToken(`${ENDPOINTS.PRODUCTS}/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error al actualizar producto: ${errorData}`);
        }
        
        const result = await response.json();
        console.log('Producto actualizado:', result);
        
        // Recargar lista de productos
        await window.loadProducts();
        
        // Resetear formulario
        window.cancelEdit();
        showAlert('alert', 'Producto actualizado correctamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', `Error al actualizar producto: ${error.message}`, 'error');
    }
}

window.deleteProduct = async function(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
        console.log('🗑️ Eliminando producto con ID:', productId);
        
        const response = await fetchWithToken(`${ENDPOINTS.PRODUCTS}/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error al eliminar producto: ${errorData}`);
        }
        
        console.log('Producto eliminado');
        
        // Recargar lista de productos
        await window.loadProducts();
        showAlert('alert', 'Producto eliminado correctamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', `Error al eliminar producto: ${error.message}`, 'error');
    }
}

window.cancelEdit = function() {
    document.getElementById('editProductId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('formTitle').textContent = '➕ Agregar Producto';
    document.getElementById('submitBtn').textContent = 'Agregar Producto';
    document.getElementById('cancelBtn').style.display = 'none';
}

window.filterProducts = async function() {
    // Función para filtrar productos
    await window.loadProducts();
}

// Event listeners específicos de productos
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('editProductId').value;
            
            if (productId) {
                await window.updateProduct();
            } else {
                await window.addProduct();
            }
        });
    }
    
    // Event listener para la search bar
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        const clearBtn = document.getElementById('clearSearchBtn');
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            
            // Mostrar/ocultar botón de limpiar
            if (clearBtn) {
                clearBtn.style.display = searchTerm.trim() ? 'flex' : 'none';
            }
            
            // Limpiar timeout anterior
            clearTimeout(searchTimeout);
            
            // Esperar 500ms después de que el usuario deje de escribir
            searchTimeout = setTimeout(() => {
                if (searchTerm.trim() === '') {
                    window.clearSearch();
                } else {
                    window.searchProducts(searchTerm);
                }
            }, 500);
        });
        
        // Event listener para Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value;
                
                if (searchTerm.trim() === '') {
                    window.clearSearch();
                } else {
                    window.searchProducts(searchTerm);
                }
            }
        });
        
        // Event listener para Escape (limpiar búsqueda)
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.clearSearch();
            }
        });
    }
});

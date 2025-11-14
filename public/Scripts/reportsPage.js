// ============================================
// FUNCIONES ESPECÍFICAS DE REPORTES
// ============================================

import { fetchWithToken, showAlert } from './Index.js';

// ============================================
// FUNCIONES DE REPORTES
// ============================================

window.generateReport = async function() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const format = document.getElementById('reportFormat').value;
        const reportType = document.getElementById('reportType').value;
        
        if (!startDate || !endDate) {
            showAlert('alert', 'Por favor selecciona fechas de inicio y fin', 'error');
            return;
        }
        
        const response = await fetchWithToken(
            `/api/reports?startDate=${startDate}&endDate=${endDate}&format=${format}&type=${reportType}`
        );
        
        if (!response.ok) throw new Error('Error al generar reporte');
        
        const report = await response.json();
        console.log('Reporte generado:', report);
        
        // Mostrar el reporte en la UI
        displayReport(report, format);
        showAlert('alert', 'Reporte generado correctamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al generar reporte', 'error');
    }
}

function displayReport(report, format) {
    const reportContainer = document.getElementById('report-container');
    if (!reportContainer) return;
    
    if (format === 'json') {
        reportContainer.innerHTML = `
            <div class="report-content">
                <h3>Reporte Generado</h3>
                <pre>${JSON.stringify(report, null, 2)}</pre>
            </div>
        `;
    } else if (format === 'csv') {
        // Para CSV, mostrar opción de descarga
        reportContainer.innerHTML = `
            <div class="report-content">
                <h3>Reporte CSV Generado</h3>
                <p>El reporte se ha generado correctamente.</p>
                <button onclick="downloadReport('${format}')">Descargar CSV</button>
            </div>
        `;
    } else if (format === 'pdf') {
        // Para PDF, mostrar opción de descarga
        reportContainer.innerHTML = `
            <div class="report-content">
                <h3>Reporte PDF Generado</h3>
                <p>El reporte se ha generado correctamente.</p>
                <button onclick="downloadReport('${format}')">Descargar PDF</button>
            </div>
        `;
    }
}

window.downloadReport = async function(format) {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const reportType = document.getElementById('reportType').value;
        
        const response = await fetchWithToken(
            `/api/reports/download?startDate=${startDate}&endDate=${endDate}&format=${format}&type=${reportType}`
        );
        
        if (!response.ok) throw new Error('Error al descargar reporte');
        
        // Crear blob para descargar archivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${reportType}-${startDate}-${endDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('alert', 'Reporte descargado correctamente', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al descargar reporte', 'error');
    }
}

window.getInventoryStatus = async function() {
    try {
        const response = await fetchWithToken('/api/reports/inventory-status');
        if (!response.ok) throw new Error('Error al obtener estado del inventario');
        
        const inventoryStatus = await response.json();
        console.log('Estado del inventario:', inventoryStatus);
        
        displayInventoryStatus(inventoryStatus);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al obtener estado del inventario', 'error');
    }
}

function displayInventoryStatus(inventoryData) {
    const statusContainer = document.getElementById('inventory-status');
    if (!statusContainer) return;
    
    statusContainer.innerHTML = `
        <div class="inventory-summary">
            <h3>Estado del Inventario</h3>
            <div class="status-cards">
                <div class="status-card">
                    <h4>Total de Productos</h4>
                    <span class="status-number">${inventoryData.total_products || 0}</span>
                </div>
                <div class="status-card">
                    <h4>Productos con Stock Bajo</h4>
                    <span class="status-number alert">${inventoryData.low_stock_products || 0}</span>
                </div>
                <div class="status-card">
                    <h4>Valor Total del Inventario</h4>
                    <span class="status-number">$${inventoryData.total_value || 0}</span>
                </div>
                <div class="status-card">
                    <h4>Movimientos del Mes</h4>
                    <span class="status-number">${inventoryData.monthly_movements || 0}</span>
                </div>
            </div>
        </div>
    `;
}

window.generateCustomReport = async function() {
    try {
        const fields = Array.from(document.querySelectorAll('input[name="reportFields"]:checked'))
                           .map(checkbox => checkbox.value);
        
        if (fields.length === 0) {
            showAlert('alert', 'Por favor selecciona al menos un campo para el reporte', 'error');
            return;
        }
        
        const startDate = document.getElementById('customStartDate').value;
        const endDate = document.getElementById('customEndDate').value;
        
        const customReportData = {
            fields: fields,
            startDate: startDate,
            endDate: endDate,
            filters: getCustomFilters()
        };
        
        const response = await fetchWithToken('/api/reports/custom', {
            method: 'POST',
            body: JSON.stringify(customReportData)
        });
        
        if (!response.ok) throw new Error('Error al generar reporte personalizado');
        
        const customReport = await response.json();
        console.log('Reporte personalizado generado:', customReport);
        
        displayCustomReport(customReport);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert', 'Error al generar reporte personalizado', 'error');
    }
}

function getCustomFilters() {
    // Obtener filtros adicionales del formulario personalizado
    return {
        category: document.getElementById('filterCategory')?.value || '',
        minValue: document.getElementById('filterMinValue')?.value || '',
        maxValue: document.getElementById('filterMaxValue')?.value || ''
    };
}

function displayCustomReport(reportData) {
    const customContainer = document.getElementById('custom-report-container');
    if (!customContainer) return;
    
    customContainer.innerHTML = `
        <div class="custom-report">
            <h3>Reporte Personalizado</h3>
            <div class="report-table">
                ${generateReportTable(reportData)}
            </div>
            <div class="report-actions">
                <button onclick="exportCustomReport('csv')">Exportar como CSV</button>
                <button onclick="exportCustomReport('excel')">Exportar como Excel</button>
            </div>
        </div>
    `;
}

function generateReportTable(data) {
    if (!data.data || data.data.length === 0) {
        return '<p>No hay datos para mostrar</p>';
    }
    
    const headers = Object.keys(data.data[0]);
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    const dataRows = data.data.map(row => 
        `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`
    ).join('');
    
    return `
        <table>
            <thead>
                <tr>${headerRow}</tr>
            </thead>
            <tbody>
                ${dataRows}
            </tbody>
        </table>
    `;
}

window.exportCustomReport = function(format) {
    // Implementar exportación de reporte personalizado
    console.log(`Exportando reporte personalizado en formato: ${format}`);
}

// Event listeners específicos de reportes
document.addEventListener('DOMContentLoaded', () => {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await window.generateReport();
        });
    }
    
    const customReportForm = document.getElementById('customReportForm');
    if (customReportForm) {
        customReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await window.generateCustomReport();
        });
    }
    
    // Auto-cargar estado del inventario al entrar a la pestaña de reportes
    const reportsTab = document.getElementById('reports-tab');
    if (reportsTab) {
        reportsTab.addEventListener('click', () => {
            setTimeout(() => {
                window.getInventoryStatus();
            }, 100);
        });
    }
});

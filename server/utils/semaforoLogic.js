/**
 * Configuración centralizada de umbrales (en horas)
 */
const SEMAFORO_CONFIG = {
    INVENTARIO: { yellow: 72, red: 168 },
    CONSUMO: { yellow: 24, red: 48 },
    VENTAS: { yellow: 24, red: 48 }
};

/**
 * Determina el estado de una alerta basado en las horas transcurridas
 * @param {number|null} hours - Horas desde el evento
 * @param {string} moduleType - Tipo de módulo (INCIDENCIAS, INVENTARIO, etc.)
 * @returns {object} - Objeto con color, etiqueta y prioridad
 */
const getStatusByHours = (hours, moduleType) => {
    const limit = SEMAFORO_CONFIG[moduleType] || { yellow: 24, red: 48 };

    // Si no hay datos o supera el límite rojo
    if (hours === null || hours >= limit.red) {
        return { 
            status: 'RED', 
            label: 'CRÍTICO', 
            hex: '#EF4444', 
            priority: 3 
        };
    }

    if (hours >= limit.yellow) {
        return { 
            status: 'YELLOW', 
            label: 'RETRASADO', 
            hex: '#F59E0B', 
            priority: 2 
        };
    }

    return { 
        status: 'GREEN', 
        label: 'AL DÍA', 
        hex: '#10B981', 
        priority: 1 
    };
};

module.exports = { getStatusByHours, SEMAFORO_CONFIG };
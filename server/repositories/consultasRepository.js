const { getConnection } = require('../config/datab');

const consultasRepository = {
    getStockActual: async () => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT codigo_articulo, SUM(cantidad_enviada) as stock_total 
                FROM Movimientos_Inventario 
                GROUP BY codigo_articulo
            `);
            return result.recordset;
        } catch (error) {
            console.error("❌ Error en getStockActual:", error.message);
            throw error;
        }
    },

    getComparativoFisico: async () => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query('SELECT * FROM vista_comparativa_semanal');
            return result.recordset;
        } catch (error) {
            console.error("❌ Error en getComparativoFisico:", error.message);
            throw error;
        }
    },

    getDetalleIncidenciasPorIds: async (ids) => {
        try {
            const pool = await getConnection();
            
            // Seguridad: Si no hay IDs, devolvemos arrays vacíos en lugar de romper SQL
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return { incidencias: [], articulos: [], evidencias: [] };
            }

            const cleanIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
            if (cleanIds.length === 0) return { incidencias: [], articulos: [], evidencias: [] };

            const idsString = cleanIds.join(',');

            // Ejecutamos consultas en paralelo
            const [info, articulos, evidencias] = await Promise.all([
                pool.request().query(`SELECT * FROM dbo.Incidencias_Header WHERE Id IN (${idsString})`),
                pool.request().query(`SELECT * FROM dbo.Incidencias_Detail WHERE IncidenciaId IN (${idsString})`),
                pool.request().query(`SELECT * FROM dbo.Incidencias_Evidencia WHERE IncidenciaId IN (${idsString})`)
            ]);

            return { 
                incidencias: info.recordset || [], 
                articulos: articulos.recordset || [], 
                evidencias: evidencias.recordset || [] 
            };
        } catch (error) {
            console.error("❌ Error en SQL Repository:", error.message);
            throw error;
        }
    }
};

module.exports = consultasRepository;
const { getConnection, sql } = require('../config/datab');

const reportesRepository = {
    /**
     * @param {Object} filters
     * @param {string} filters.startDate
     * @param {string} filters.endDate
     * @param {string} filters.usuario
     * @param {string} filters.modulo
     */
    getAuditoriaGlobal: async (filters) => {
        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT Modulo, Accion, ReferenciaID, Usuario, Sucursal, Fecha
            FROM dbo.View_Auditoria_Global
            WHERE 1=1
        `;

        if (filters.startDate && filters.endDate) {
            query += " AND CAST(Fecha AS DATE) BETWEEN @startDate AND @endDate";
            request.input('startDate', sql.Date, filters.startDate);
            request.input('endDate', sql.Date, filters.endDate);
        }

        if (filters.usuario && filters.usuario !== 'ALL') {
            query += " AND LOWER(Usuario) = LOWER(@usuario)";
            request.input('usuario', sql.VarChar, filters.usuario);
        }

        if (filters.modulo && filters.modulo !== 'ALL') {
            const modParam = String(filters.modulo).trim().toLowerCase();

            if (modParam === 'inventario físico' || modParam === 'inventario fisico' || modParam === 'inventarios') {
                query += " AND LOWER(Modulo) IN ('inventario físico', 'inventario fisico', 'inventarios')";
            } else if (modParam === 'ventas') {
                query += " AND LOWER(Modulo) = 'ventas'";
            } else if (modParam === 'recepcion' || modParam === 'recepción') {
                query += " AND LOWER(Modulo) IN ('recepcion', 'recepción')";
            } else {
                query += " AND LOWER(Modulo) = @modulo";
                request.input('modulo', sql.VarChar, modParam);
            }
        }

        query += " ORDER BY Fecha DESC";

        const result = await request.query(query);
        return result.recordset;
    },

    /**
     * @returns {Promise<Array<{Usuario: string}>>}
     */
    getDistinctUsuarios: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT DISTINCT Usuario
            FROM dbo.View_Auditoria_Global
            WHERE Usuario IS NOT NULL AND Usuario != '' AND Usuario != 'Desconocido'
            ORDER BY Usuario ASC
        `);
        return result.recordset;
    }
};

module.exports = reportesRepository;

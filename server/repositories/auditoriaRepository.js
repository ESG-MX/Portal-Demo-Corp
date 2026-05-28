const { getConnection, sql } = require('../config/datab');

const auditoriaRepository = {
    getTriggerLogs: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT TOP 500 
                L.id, L.fecha_registro, L.codigo_almacen, L.codigo_articulo, 
                L.stock_teorico_momento, L.stock_fisico_reportado, L.diferencia, L.usuario_operador,
                -- Prioridad 1: Maestro de Items, Prioridad 2: Log (si no dice "vinculado"), Prioridad 3: Código
                COALESCE(I.descripcion, NULLIF(NULLIF(L.producto, ''), 'No vinculado'), L.codigo_articulo) as producto
            FROM dbo.Log_Inventario_Automatico L
            OUTER APPLY (SELECT TOP 1 descripcion FROM dbo.items WHERE itemcode = L.codigo_articulo) I
            ORDER BY L.fecha_registro DESC
        `);
        return result.recordset;
    },

    getLiveComparison: async (whCode) => {
        const pool = await getConnection();
        let query = `
            WITH UltimoFisico AS (
                SELECT 
                    codigo_articulo, 
                    codigo_almacen, 
                    cantidad_fisica, 
                    fecha_conteo,
                    ROW_NUMBER() OVER (
                        PARTITION BY codigo_articulo, codigo_almacen 
                        ORDER BY fecha_conteo DESC
                    ) as fila
                FROM dbo.Inventario_Fisico
            )
            SELECT 
                ISNULL(T.codigo_almacen, F.codigo_almacen) AS codigo_almacen, 
                ISNULL(T.codigo_articulo, F.codigo_articulo) AS itemcode, 
                -- Forzamos descripción del maestro incluso si no hay teórico
                COALESCE(
                    I.descripcion, 
                    NULLIF(NULLIF(T.producto, ''), 'No vinculado'), 
                    ISNULL(T.codigo_articulo, F.codigo_articulo)
                ) AS descripcion, 
                ISNULL(T.stock_actual, 0) AS stock_teorico, 
                ISNULL(F.cantidad_fisica, 0) AS reporte_fisico,
                (ISNULL(F.cantidad_fisica, 0) - ISNULL(T.stock_actual, 0)) AS diferencia,
                F.fecha_conteo
            FROM dbo.View_Inventario_Teorico T
            FULL OUTER JOIN UltimoFisico F 
                ON T.codigo_articulo = F.codigo_articulo 
                AND T.codigo_almacen = F.codigo_almacen
                AND F.fila = 1
            OUTER APPLY (SELECT TOP 1 descripcion FROM dbo.items WHERE itemcode = ISNULL(T.codigo_articulo, F.codigo_articulo)) I
        `;
        const request = pool.request();
        if (whCode && whCode.toUpperCase() !== 'TODOS') {
            query += ' WHERE ISNULL(T.codigo_almacen, F.codigo_almacen) = @wh';
            request.input('wh', sql.VarChar, whCode);
        }
        query += ' ORDER BY codigo_almacen ASC, descripcion ASC';
        const result = await request.query(query);
        return result.recordset;
    },

    getWeeklyHistory: async (whCode, searchDate, page = 1, limit = 50) => {
        const pool = await getConnection();
        const request = pool.request();
        const offset = (page - 1) * limit;
        let whereClauses = [];

        if (whCode && whCode.toUpperCase() !== 'TODOS') {
            whereClauses.push('Unificada.codigo_almacen = @wh');
            request.input('wh', sql.VarChar, whCode);
        }
        if (searchDate) {
            whereClauses.push('CAST(Unificada.fecha_evento AS DATE) = @searchDate');
            request.input('searchDate', sql.VarChar, searchDate);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const unifiedQuery = `
            SELECT 
                fecha_registro AS fecha_evento, codigo_almacen, codigo_articulo, producto, 
                stock_teorico_momento, stock_fisico_reportado, diferencia, 'MOVIMIENTO AUTOMÁTICO' AS tipo
            FROM dbo.Log_Inventario_Automatico
            UNION
            SELECT 
                fecha_cierre AS fecha_evento, codigo_almacen, itemcode AS codigo_articulo, descripcion AS producto, 
                stock_teorico_momento, stock_fisico_reportado, diferencia, 'CORTE SEMANAL' AS tipo
            FROM dbo.Historial_Inventarios
        `;

        const countQuery = `SELECT COUNT(*) as total FROM (${unifiedQuery}) AS Unificada ${whereString}`;
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        const dataQuery = `
            SELECT DISTINCT -- Seguridad adicional para evitar duplicados en el reporte
                Unificada.fecha_evento,
                Unificada.codigo_almacen,
                Unificada.codigo_articulo,
                Unificada.stock_teorico_momento,
                Unificada.stock_fisico_reportado,
                Unificada.diferencia,
                Unificada.tipo,
                -- Limpieza de nombres vinculados en el historial unificado
                COALESCE(I.descripcion, NULLIF(NULLIF(Unificada.producto, ''), 'No vinculado'), Unificada.codigo_articulo) AS producto
            FROM (${unifiedQuery}) AS Unificada
            OUTER APPLY (SELECT TOP 1 descripcion FROM dbo.items WHERE itemcode = Unificada.codigo_articulo) I
            ${whereString}
            ORDER BY Unificada.fecha_evento DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const dataResult = await request.query(dataQuery);
        const dataFormatted = dataResult.recordset.map(row => ({
            ...row,
            fecha_cierre: row.fecha_evento
        }));

        return { data: dataFormatted, total };
    },

    getDistinctClosureDates: async (whCode) => {
        const pool = await getConnection();
        const request = pool.request();
        
        let query = `
            SELECT DISTINCT CONVERT(VARCHAR(10), fecha_evento, 126) as fecha_cierre 
            FROM (
                SELECT fecha_registro AS fecha_evento, codigo_almacen FROM dbo.Log_Inventario_Automatico
                UNION
                SELECT fecha_cierre AS fecha_evento, codigo_almacen FROM dbo.Historial_Inventarios
            ) AS Unificada
        `;

        let whereClauses = ['fecha_evento IS NOT NULL'];
        if (whCode && whCode.toUpperCase() !== 'TODOS') {
            whereClauses.push('codigo_almacen = @wh');
            request.input('wh', sql.VarChar, whCode);
        }

        query += ` WHERE ${whereClauses.join(' AND ')}`;
        query += ' ORDER BY fecha_cierre DESC';
        const result = await request.query(query);
        return result.recordset; 
    },

    executeWeeklyClosing: async (whCode) => {
        const pool = await getConnection();
        await pool.request()
            .input('wh', sql.VarChar, whCode) 
            .execute('Cierre_Inventario_Semanal_Por_Almacen');
    }
};

module.exports = auditoriaRepository;
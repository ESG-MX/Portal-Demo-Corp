const reportesRepository = require('../repositories/reportesRepository');
const asyncHandler = require('../utils/asyncHandler');

const reportesController = {
    getAuditoriaGlobal: asyncHandler(async (req, res) => {
        const { startDate, endDate, usuario, modulo } = req.query;

        const data = await reportesRepository.getAuditoriaGlobal({
            startDate, endDate, usuario, modulo
        });

        res.json(data);
    }),

    getUsuariosActivos: asyncHandler(async (req, res) => {
        const data = await reportesRepository.getDistinctUsuarios();
        res.json(data);
    }),

    getMovimientosHistorico: asyncHandler(async (req, res) => {
        const { startDate, endDate, whsCode, modulo } = req.query;
        const { getConnection, sql } = require('../config/datab');
        const pool = await getConnection();
        
        let query = `
            SELECT * FROM dbo.View_Movimientos_Detallados 
            WHERE Fecha BETWEEN @start AND @end
        `;
        
        const request = pool.request()
            .input('start', sql.DateTime, startDate || '2000-01-01')
            .input('end', sql.DateTime, endDate || '2099-12-31');

        if (whsCode && whsCode !== 'TODOS') {
            query += ' AND Almacen = @whs';
            request.input('whs', sql.VarChar, whsCode);
        }

        if (modulo && modulo !== 'TODOS') {
            query += ' AND Modulo = @mod';
            request.input('mod', sql.VarChar, modulo);
        }

        query += ' ORDER BY Fecha DESC';
        
        const result = await request.query(query);
        res.json(result.recordset);
    }),

    getDetalle: asyncHandler(async (req, res) => {
        const { modulo, id } = req.query;
        let detalles = [];
        try {
            const { getConnection, sql } = require('../config/datab');
            const pool = await getConnection();

            const mod = (modulo || '').toUpperCase().trim();

            if (mod === 'INCIDENCIAS') {
                const r = await pool.request().input('id', sql.Int, id).query(`SELECT ItemCode, ItemName, CantidadAfectada, PrecioFactura FROM Incidencias_Detail WHERE IncidenciaId = @id`);
                detalles = r.recordset;
            } else if (mod === 'INVENTARIO FÍSICO' || mod === 'INVENTARIO FISICO' || mod === 'INVENTARIOS') {
                const r = await pool.request().input('id', sql.Int, id).query(`
                    SELECT f.codigo_articulo as ItemCode, i.descripcion as ItemName, f.cantidad_fisica as CantidadAfectada
                    FROM dbo.Inventario_Fisico f
                    LEFT JOIN dbo.items i ON f.codigo_articulo = i.itemcode
                    WHERE f.id = @id
                `);
                detalles = r.recordset;
            } else if (mod === 'VENTAS') {
                const r = await pool.request().input('id', sql.Int, id).query(`
                    SELECT r.itemcode as ItemCode, i.descripcion as ItemName, r.quantity as CantidadAfectada, r.price as PrecioFactura
                    FROM dbo.Recorded_Orders r
                    LEFT JOIN dbo.items i ON r.itemcode = i.itemcode
                    WHERE r.docnum = @id
                `);
                detalles = r.recordset;
            } else if (mod === 'CONSUMO' || mod === 'RECEPCION' || mod === 'RECEPCIÓN' || mod === 'CAJA CHICA') {
                const head = await pool.request().input('id', sql.Int, id).query(`SELECT fecha_envio, codigo_almacen, origen_web FROM Movimientos_Inventario WHERE id = @id`);
                if (head.recordset.length > 0) {
                    const h = head.recordset[0];
                    const r = await pool.request()
                        .input('almacen', sql.VarChar, h.codigo_almacen)
                        .input('origen', sql.VarChar, h.origen_web)
                        .input('f', sql.DateTime, h.fecha_envio)
                        .query(`
                            SELECT m.codigo_articulo as ItemCode, i.descripcion as ItemName, m.cantidad_enviada as CantidadAfectada
                            FROM dbo.Movimientos_Inventario m
                            LEFT JOIN dbo.items i ON m.codigo_articulo = i.itemcode
                            WHERE m.codigo_almacen = @almacen
                            AND m.origen_web = @origen
                            AND CAST(m.fecha_envio as DATE) = CAST(@f as DATE)
                            AND DATEPART(HOUR, m.fecha_envio) = DATEPART(HOUR, @f)
                            AND DATEPART(MINUTE, m.fecha_envio) = DATEPART(MINUTE, @f)
                        `);
                    detalles = r.recordset;
                }
            }
        } catch (error) {
            console.error("❌ Error en getDetalle [Detalle Auditoría]:", error.message);
            console.error("🔍 Contexto:", { modulo, id });
        }
        res.json(detalles);
    })
};

module.exports = reportesController;

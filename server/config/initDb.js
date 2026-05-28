const { getConnection, sql } = require('./datab');

async function initDb() {
    try {
        const pool = await getConnection();

        try {
            const checkCol = await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Movimientos_Inventario]') 
                    AND name = 'UsuarioEmail'
                )
                BEGIN
                    ALTER TABLE [dbo].[Movimientos_Inventario] ADD [UsuarioEmail] VARCHAR(255) NULL;
                END
            `);
            console.log("✅ [INIT-DB] Columna UsuarioEmail verificada/creada.");
        } catch (colErr) {
            console.error("❌ [INIT-DB] Error al verificar/crear columna UsuarioEmail:", colErr.message);
        }

        const createViewQuery = `
            CREATE OR ALTER VIEW dbo.View_Auditoria_Global AS
            -- INCIDENCIAS
            SELECT 'Incidencias' AS Modulo, 'Reporte de Incidencia' AS Accion, CAST(Id AS VARCHAR(50)) AS ReferenciaID, CreadoPor AS Usuario, Almacen AS Sucursal, FechaCreacion AS Fecha FROM dbo.Incidencias_Header
            UNION ALL
            -- VENTAS
            SELECT 'Ventas' AS Modulo, 'Pedido Creado' AS Accion, CAST(docnum AS VARCHAR(50)) AS ReferenciaID, username AS Usuario, whscode AS Sucursal, CAST(docdate AS DATETIME) AS Fecha FROM dbo.Recorded_Orders
            UNION ALL
            -- INVENTARIO
            SELECT 'Inventario Físico' AS Modulo, 'Conteo Guardado' AS Accion, CAST(id AS VARCHAR(50)) AS ReferenciaID, email_operador AS Usuario, codigo_almacen AS Sucursal, fecha_conteo AS Fecha FROM dbo.Inventario_Fisico
            UNION ALL
            -- MOVIMIENTOS (Consumo, Recepción, Caja Chica)
            SELECT origen_web AS Modulo,
                   CASE WHEN origen_web = 'CONSUMO' THEN 'Salida Inventario' WHEN origen_web = 'RECEPCION' THEN 'Entrada Mercancía' WHEN origen_web = 'Caja Chica' THEN 'Entrada Gasto' ELSE 'Movimiento Inventario' END AS Accion,
                   CAST(id AS VARCHAR(50)) AS ReferenciaID, UsuarioEmail AS Usuario, codigo_almacen AS Sucursal, fecha_envio AS Fecha FROM dbo.Movimientos_Inventario;
        `;

        await pool.request().query(createViewQuery);
        console.log("✅ [INIT-DB] Vista dbo.View_Auditoria_Global sincronizada correctamente.");

    } catch (error) {
        console.error("❌ [INIT-DB] FATAL ERROR:", error.message);
    }
}

module.exports = initDb;

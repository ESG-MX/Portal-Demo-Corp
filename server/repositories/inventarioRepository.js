const { getConnection, sql } = require('../config/datab');

const inventarioRepository = {
    /**
     * Obtiene los almacenes asignados a un usuario según su rol.
     */
    getAlmacenesByUser: async (user) => {
        const { email, role } = user;
        const pool = await getConnection();
        
        const query = (role.toLowerCase() === 'admin') 
            ? `SELECT a.whscode, a.whsdesc AS whsname, a.Zona, a.Contrato,
               (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
               FROM dbo.almacenes a ORDER BY a.whsdesc ASC`
            : `SELECT a.whscode, a.whsdesc AS whsname, a.Zona, a.Contrato,
               (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
               FROM dbo.almacenes a
               JOIN dbo.Usuario_Almacenes ua ON a.whscode = ua.whscode
               WHERE LOWER(ua.email) = LOWER(@email)
               ORDER BY a.whsdesc ASC`;

        const result = await pool.request().input('email', sql.VarChar, email).query(query);
        return result.recordset;
    },

    /**
     * Obtiene productos y precios fijos basados en la zona del almacén.
     */
    getProductosByAlmacen: async (whscode) => {
        const pool = await getConnection();
        const zonaResult = await pool.request()
            .input('wh', sql.VarChar, whscode)
            .query("SELECT Zona FROM dbo.almacenes WHERE whscode = @wh");

        const zona = zonaResult.recordset[0]?.Zona || 'ZONA 1'; 

        const itemsQuery = `
            SELECT 
                descripcion AS producto, 
                i.itemcode,
                codigo_general, 
                tipo AS unidad,
                ISNULL(c.factor_multiplicador, 1) AS factor,
                CASE 
                    ${Array.from({length: 20}, (_, i) => `WHEN @zona = 'ZONA ${i+1}' THEN Zona_${i+1}`).join(' ')}
                    ELSE 0
                END AS precio_fijo
            FROM dbo.items i
            LEFT JOIN dbo.item_conversiones c ON i.itemcode = c.itemcode
            ORDER BY descripcion ASC`;

        const itemsRes = await pool.request().input('zona', sql.VarChar, zona).query(itemsQuery);
        return itemsRes.recordset;
    },

    /**
     * Guarda el conteo físico. 
     * EL LOG AUTOMÁTICO SE GENERA VÍA TRIGGER EN SQL SERVER.
     */
    saveConteo: async (almacen, conteos, userEmail) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            
            for (const item of conteos) {
                // Lógica de conversión: se divide la cantidad por el factor para guardar en unidades base
                const factor = parseFloat(item.factor || 1);
                const cantidadPiezas = parseFloat(item.cantidad);
                const cantidadConvertidaParaDB = cantidadPiezas / factor;
                const precioPaquete = parseFloat(item.precio || 0);

                await new sql.Request(transaction)
                    .input('email', sql.VarChar, userEmail)
                    .input('almacen', sql.VarChar, almacen)
                    .input('articulo', sql.VarChar, item.codigo)
                    .input('cantidad', sql.Decimal(18, 4), cantidadConvertidaParaDB)
                    .input('precio', sql.Decimal(18, 4), precioPaquete)
                    .query(`
                        INSERT INTO dbo.Inventario_Fisico (
                            email_operador, 
                            codigo_almacen, 
                            codigo_articulo, 
                            cantidad_fisica, 
                            Preci_Unitario, 
                            fecha_conteo
                        ) 
                        VALUES (
                            @email, 
                            @almacen, 
                            @articulo, 
                            @cantidad, 
                            @precio, 
                            CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME)
                        )
                    `);
                // Nota: Por cada INSERT aquí, el trigger [trg_Log_Inventario_Automatico] 
                // se dispara automáticamente en la base de datos.
            }

            await transaction.commit();
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error; 
        }
    },

    /**
     * Obtiene el estatus de salud (Semáforo) de todos los almacenes.
     */
    getAlmacenesConAtraso: async () => {
        const pool = await getConnection();
        const query = `
            WITH UltimoConteo AS (
                SELECT codigo_almacen, MAX(fecha_conteo) as ultima_fecha
                FROM dbo.Inventario_Fisico
                GROUP BY codigo_almacen
            )
            SELECT 
                a.whscode, 
                a.whsdesc, 
                u.ultima_fecha,
                ISNULL(DATEDIFF(HOUR, u.ultima_fecha, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME)), 9999) as horas_atraso,
                ISNULL(DATEDIFF(DAY, u.ultima_fecha, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME)), 999) as dias_atraso
            FROM dbo.almacenes a
            LEFT JOIN UltimoConteo u ON a.whscode = u.codigo_almacen
        `;
        const result = await pool.request().query(query);
        return result.recordset;
    }
};

module.exports = inventarioRepository;
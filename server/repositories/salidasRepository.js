const { getConnection, sql } = require('../config/datab');

const salidasRepository = {
    getAlmacenesByUser: async (user) => {
        const { email, role } = user;
        const pool = await getConnection();
        const isAdmin = (role || '').toLowerCase().includes('admin');

        const query = isAdmin 
            ? `SELECT a.whscode, a.whsdesc AS whsname, a.Contrato,
               (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
               FROM dbo.almacenes a ORDER BY a.whsdesc ASC`
            : `SELECT a.whscode, a.whsdesc AS whsname, a.Contrato,
               (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
               FROM dbo.almacenes a
               JOIN dbo.Usuario_Almacenes ua ON a.whscode = ua.whscode
               WHERE LOWER(ua.email) = LOWER(@email)
               ORDER BY a.whsdesc ASC`;

        const result = await pool.request().input('email', sql.VarChar, email).query(query);
        return result.recordset;
    },

    getProductosConStock: async (whscode) => {
        const pool = await getConnection();
        
        // 1. Obtener la zona asignada al almacén seleccionado
        const zonaRes = await pool.request()
            .input('wh', sql.VarChar, whscode)
            .query("SELECT Zona FROM dbo.almacenes WHERE whscode = @wh");
        
        const zona = zonaRes.recordset[0]?.Zona || '';

        // 2. Query con JOIN a item_conversiones para obtener el factor
        const itemsQuery = `
            SELECT 
                v.producto, 
                v.codigo_articulo AS itemcode, 
                v.codigo_articulo AS rowId, 
                v.unidad, 
                v.stock_actual,
                -- Obtenemos el factor de conversión, si no existe en la tabla usamos 1
                ISNULL(c.factor_multiplicador, 1) AS factor,
                CASE 
                    ${Array.from({length: 20}, (_, i) => `WHEN @zona = 'ZONA ${i+1}' THEN ISNULL(i.Zona_${i+1}, 0)`).join(' ')}
                    ELSE 0
                END AS precio_fijo
            FROM dbo.View_Inventario_Teorico v
            INNER JOIN dbo.items i ON v.codigo_articulo = i.itemcode
            LEFT JOIN dbo.item_conversiones c ON v.codigo_articulo = c.itemcode
            WHERE v.codigo_almacen = @wh AND v.stock_actual > 0
            ORDER BY v.producto ASC`;

        const itemsRes = await pool.request()
            .input('wh', sql.VarChar, whscode)
            .input('zona', sql.VarChar, zona)
            .query(itemsQuery);
            
        return itemsRes.recordset;
    },

    saveConsumo: async (almacen, conteos, userEmail, fechaSeleccionada) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            for (const item of conteos) {
                // LÓGICA DE CONVERSIÓN:
                // Si el front manda '1' pieza y el factor es '2000', 
                // cantidadDB será '0.0005' para no romper el stock original de paquetes.
                const factor = parseFloat(item.factor || 1);
                const cantidadPiezas = Math.abs(parseFloat(item.cantidad));
                const cantidadConvertidaParaDB = (cantidadPiezas / factor) * -1;
                
                // El precio que se guarda en Movimientos_Inventario debe ser el del PAQUETE (precio_fijo original)
                const precioPaquete = parseFloat(item.precio_paquete || item.precio || 0);

                // 1. Insertar en Movimientos_Inventario (La tabla que afecta el stock real)
                await new sql.Request(transaction)
                    .input('almacen', sql.VarChar(50), almacen)
                    .input('articulo', sql.VarChar(50), item.codigo)
                    .input('cantidad', sql.Decimal(18, 4), cantidadConvertidaParaDB) 
                    .input('precio', sql.Decimal(18, 2), precioPaquete)
                    .input('email', sql.VarChar(255), userEmail)
                    .query(`INSERT INTO dbo.Movimientos_Inventario 
                            (origen_web, codigo_almacen, codigo_articulo, cantidad_enviada, precio_unitario, fecha_envio, UsuarioEmail) 
                            VALUES ('CONSUMO', @almacen, @articulo, @cantidad, @precio, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME), @email)`);

                // 2. Insertar en Registro_Consumos (El historial humano, guardamos piezas para auditoría)
                await new sql.Request(transaction)
                    .input('email', sql.VarChar(255), userEmail)
                    .input('whs', sql.VarChar(50), almacen)
                    .input('code', sql.VarChar(50), item.codigo)
                    .input('name', sql.VarChar(255), item.nombre)
                    .input('qty', sql.Decimal(18, 4), cantidadPiezas) // Guardamos 1 pieza (no 0.0005)
                    .input('precio', sql.Decimal(18, 2), (precioPaquete / factor)) // Guardamos el precio unitario de la pieza
                    .input('fechaSelect', sql.Date, fechaSeleccionada || new Date())
                    .query(`INSERT INTO dbo.Registro_Consumos (UsuarioEmail, WhsCode, ItemCode, ItemName, Quantity, PrecioUnitario, FechaSeleccionada, [Timestamp]) 
                            VALUES (@email, @whs, @code, @name, @qty, @precio, @fechaSelect, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME))`);
            }
            await transaction.commit();
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    },

    getHistorialConsumos: async (params) => {
        const limit = parseInt(params.limit) || 20;
        const page = parseInt(params.page) || 1;
        const offset = (page - 1) * limit;
        const { startDate, endDate, whsCode, contrato } = params;

        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT 
                rc.ID, 
                rc.UsuarioEmail, 
                rc.WhsCode, 
                rc.ItemCode, 
                rc.ItemName, 
                rc.Quantity, 
                rc.PrecioUnitario,
                CAST(rc.FechaSeleccionada AS DATE) as FechaSeleccionada, 
                rc.[Timestamp]
            FROM dbo.Registro_Consumos rc
            LEFT JOIN dbo.almacenes a ON LTRIM(RTRIM(rc.WhsCode)) = LTRIM(RTRIM(a.whscode))
            WHERE 1=1`;

        if (startDate && startDate.trim() !== '') {
            query += ` AND FechaSeleccionada >= @startDate`;
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate && endDate.trim() !== '') {
            query += ` AND CAST(FechaSeleccionada AS DATE) <= @endDate`;
            request.input('endDate', sql.Date, endDate);
        }
        if (whsCode && whsCode !== '' && whsCode !== 'TODOS') {
            query += ` AND LTRIM(RTRIM(rc.WhsCode)) = LTRIM(RTRIM(@whsCode))`;
            request.input('whsCode', sql.VarChar, whsCode.trim());
        }
        if (contrato && contrato !== '') {
            query += ` AND a.Contrato = @contrato`;
            request.input('contrato', sql.VarChar, contrato);
        }

        query += ` ORDER BY rc.[Timestamp] DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        return result.recordset;
    },

    getConsumosConAtraso: async () => {
        const pool = await getConnection();
        const query = `
            WITH UltimoConsumo AS (
                SELECT WhsCode, MAX([Timestamp]) as ultima_fecha
                FROM dbo.Registro_Consumos
                GROUP BY WhsCode
            )
            SELECT 
                a.whscode, 
                a.whsdesc, 
                u.ultima_fecha,
                ISNULL(DATEDIFF(HOUR, u.ultima_fecha, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME)), 9999) as horas_atraso
            FROM dbo.almacenes a
            LEFT JOIN UltimoConsumo u ON LTRIM(RTRIM(a.whscode)) = LTRIM(RTRIM(u.WhsCode))
            ORDER BY horas_atraso DESC
        `;
        const result = await pool.request().query(query);
        return result.recordset;
    }
};

module.exports = salidasRepository;
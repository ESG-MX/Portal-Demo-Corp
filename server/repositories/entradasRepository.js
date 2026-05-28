const { getConnection, sql } = require('../config/datab');

const entradasRepository = {
    saveReceptionLog: async (documentLines, userEmail, numAtCard, docNum) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();

            for (const item of documentLines) {
                // --- REGISTRO 1: Movimientos_Inventario 
                const reqMov = new sql.Request(transaction);
                await reqMov
                    .input('origen', sql.VarChar, 'Recepcion')
                    .input('whs', sql.VarChar, item.WhsCode || item.WarehouseCode)
                    .input('articulo', sql.VarChar, item.ItemCode || item.itemCode)
                    .input('cantidad', sql.Decimal(18, 4), item.Quantity || item.quantity)
                    .input('precio', sql.Decimal(18, 4), item.Price || item.price || item.UnitPrice || 0)
                    .input('email', sql.VarChar, userEmail)
                    .query(`INSERT INTO Movimientos_Inventario 
                            (origen_web, codigo_almacen, codigo_articulo, cantidad_enviada, precio_unitario, fecha_envio, UsuarioEmail) 
                            VALUES (@origen, @whs, @articulo, @cantidad, @precio, GETDATE(), @email)`);

                // --- REGISTRO 2: Registro_Entradas 
                const reqReg = new sql.Request(transaction);
                await reqReg
                    .input('usuario', sql.VarChar, userEmail)
                    .input('almacen', sql.VarChar, item.WhsCode || item.WarehouseCode)
                    .input('orden', sql.VarChar, docNum.toString())
                    .input('factura', sql.VarChar, numAtCard)
                    .input('code', sql.VarChar, item.ItemCode || item.itemCode)
                    .input('nombre', sql.VarChar, item.ItemName || item.ItemDescription || item.Dscription || 'S/D')
                    .input('cant', sql.Decimal(18, 4), item.Quantity || item.quantity)
                    .input('p_unit', sql.Decimal(18, 4), item.Price || item.price || item.UnitPrice || 0)
                    .query(`INSERT INTO Registro_Entradas 
                            (usuario, almacen, orden_compra, referencia_factura, item_code, item_nombre, cantidad, precio_unitario) 
                            VALUES (@usuario, @almacen, @orden, @factura, @code, @nombre, @cant, @p_unit)`);
            }

            await transaction.commit();
            console.log("✅ Datos sincronizados en ambas tablas SQL correctamente.");
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error("❌ Error al guardar en SQL:", error.message);
            throw error;
        }
    },

    getHistorial: async (params) => {
        const limit = parseInt(params.limit) || 50;
        const page = parseInt(params.page) || 1;
        const offset = (page - 1) * limit;
        const { startDate, endDate, whsCode, contrato } = params;

        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT 
                re.fecha_recibido,
                re.usuario,
                re.almacen,
                re.orden_compra,
                re.referencia_factura,
                re.item_code,
                re.item_nombre,
                re.cantidad,
                re.precio_unitario,
                (re.cantidad * re.precio_unitario) AS precio_total,
                -- Alias de compatibilidad para el Front-end (estándar SAP)
                re.fecha_recibido AS DocDate,
                re.almacen AS WhsCode,
                re.orden_compra AS DocNum,
                re.item_code AS ItemCode,
                re.item_nombre AS ItemName,
                re.referencia_factura AS NumAtCard,
                re.cantidad AS Quantity,
                re.precio_unitario AS Price,
                (re.cantidad * re.precio_unitario) AS DocTotal,
                re.usuario AS EmailUsuario,
                a.Contrato,
                (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
            FROM dbo.Registro_Entradas re
            LEFT JOIN dbo.almacenes a ON LTRIM(RTRIM(re.almacen)) = LTRIM(RTRIM(a.whscode))
            WHERE 1=1`;

        if (startDate) { query += ` AND CAST(re.fecha_recibido AS DATE) >= @startDate`; request.input('startDate', sql.Date, startDate); }
        if (endDate) { query += ` AND CAST(re.fecha_recibido AS DATE) <= @endDate`; request.input('endDate', sql.Date, endDate); }
        if (whsCode && whsCode !== 'TODOS' && whsCode !== '') {
            query += ` AND LTRIM(RTRIM(re.almacen)) = LTRIM(RTRIM(@whsCode))`;
            request.input('whsCode', sql.VarChar, whsCode.trim());
        }
        if (contrato && contrato !== '') {
            query += ` AND a.Contrato = @contrato`;
            request.input('contrato', sql.VarChar, contrato);
        }

        query += ` ORDER BY re.fecha_recibido DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        return result.recordset;
    }
};

module.exports = entradasRepository;
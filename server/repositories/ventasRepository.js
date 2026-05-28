const { getConnection, sql } = require('../config/datab');
const ventasRepository = {
    /**
     * @param {object} user
     * @returns {Promise<Array>}
     */
    getAlmacenesByUser: async (user) => {
        const { email, role } = user;
        const userRole = (role || '').toLowerCase().trim();
        const powerRoles = ['admin', 'manager', 'mc', 'mp', 'comp'];

        const pool = await getConnection();
        const request = pool.request();
        let query;

        if (powerRoles.includes(userRole) || email === (process.env.DEMO_ADMIN_EMAIL || 'admin@democorp.com')) {
            query = `SELECT a.whscode, a.whsdesc, a.Abreviatura, a.Contrato,
                    (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
                    FROM dbo.almacenes a ORDER BY a.whsdesc ASC`;
        } else {
            query = `
                SELECT a.whscode, a.whsdesc, a.Abreviatura, a.Contrato,
                (SELECT TOP 1 CardName FROM dbo.Ventas v WHERE v.WhsCode = a.whscode) as CardName
                FROM dbo.almacenes a
                JOIN dbo.Usuario_Almacenes ua ON a.whscode = ua.whscode
                WHERE LOWER(ua.email) = LOWER(@email)
                ORDER BY a.whsdesc ASC
            `;
            request.input('email', sql.VarChar, email);
        }

        const result = await request.query(query);
        return result.recordset;
    },
    /**
     * @param {string} whscode
     * @returns {Promise<Array>}
     */
 getItemsByWhs: async (whscode) => {
        const pool = await getConnection();
        const result = await pool.request()
            .input('whs', sql.VarChar, whscode)
            .query(`
                SELECT 
                    v.id, v.CardCode, v.ItemCode, v.ItemName, v.Price, v.TaxCode, 
                    v.RequiereDetalle,
                    (SELECT d.id, d.NombreDieta 
                     FROM dbo.Dietas_Catalogo d
                     JOIN dbo.Almacen_Dietas_Permitidas adp ON d.id = adp.DietaId
                     WHERE adp.WhsCode = @whs AND d.Activo = 1
                     FOR JSON PATH) AS DietasDisponibles
                FROM Ventas v
                WHERE v.WhsCode = @whs AND v.Status = 1
                ORDER BY v.ItemName ASC
            `);
        
        return result.recordset.map(item => ({
            ...item,
            DietasDisponibles: JSON.parse(item.DietasDisponibles || '[]')
        }));
    },

    checkDuplicateOrder: async (whsCode, docDate, totalQuantity, tipoServicio) => {
        const pool = await getConnection();
        const result = await pool.request()
            .input('whs', sql.VarChar, whsCode)
            .input('date', sql.Date, docDate)
            .input('total', sql.Decimal(18, 4), totalQuantity)
            .input('tipo', sql.VarChar, tipoServicio)
            .query(`
                SELECT TOP 1 docnum 
                FROM Recorded_Orders 
                WHERE whscode = @whs 
                  AND CAST(docdate AS DATE) = @date 
                  AND TipoServicio = @tipo
                GROUP BY docnum 
                HAVING ABS(SUM(quantity) - @total) < 0.001
            `);
        
        return result.recordset[0];
    },

    logOrder: async (orderData, userEmail, sapResponse) => {
        const { DocEntry, DocNum } = sapResponse;
        const { TipoServicio } = orderData;
        const pool = await getConnection();
        
        for (const item of orderData.DocumentLines) {
            // 1. Guardar el registro principal en Recorded_Orders
            const resRecord = await pool.request()
                .input('user', sql.VarChar, userEmail)
                .input('whs', sql.VarChar, item.WarehouseCode || orderData.WhsCode)
                .input('card', sql.VarChar, orderData.CardCode)
                .input('entry', sql.Int, DocEntry)
                .input('num', sql.Int, DocNum)
                .input('code', sql.VarChar, item.ItemCode)
                .input('qty', sql.Decimal(18, 4), item.Quantity)
                .input('price', sql.Decimal(18, 4), item.Price)
                .input('tax', sql.VarChar, item.TaxCode)
                .input('date', sql.Date, orderData.DocDate)
                .input('tipoServicio', sql.VarChar, item.TipoServicio || TipoServicio)
                .query(`
                    INSERT INTO Recorded_Orders (username, whscode, cardcode, docentry, docnum, itemcode, quantity, price, taxcode, docdate, TipoServicio) 
                    OUTPUT INSERTED.id
                    VALUES (@user, @whs, @card, @entry, @num, @code, @qty, @price, @tax, @date, @tipoServicio)
                `);

            const newOrderId = resRecord.recordset[0].id;

            // 2. Procesar el desglose de dietas (puede venir como 'desglose' o 'U_Desglose' stringificado)
            let breakdown = item.desglose;
            if (!breakdown && item.U_Desglose) {
                try {
                    breakdown = JSON.parse(item.U_Desglose);
                } catch (e) {
                    breakdown = null;
                }
            }

            if (breakdown && Array.isArray(breakdown) && breakdown.length > 0) {
                for (const dieta of breakdown) {
                    await pool.request()
                        .input('orderId', sql.Int, newOrderId)
                        .input('nombre', sql.VarChar, dieta.NombreDieta)
                        .input('cant', sql.Decimal(18, 4), dieta.Cantidad)
                        .query(`
                            INSERT INTO Recorded_Orders_Dietas_Detalle (RecordedOrderId, NombreDieta, Cantidad) 
                            VALUES (@orderId, @nombre, @cant)
                        `);
                }
            }
        }
    },

    /**
     * Obtiene la relación diaria de venta vs consumo desde la vista
     */
    getRelacionDiaria: async (filters) => {
        const { startDate, endDate, whsCode } = filters;
        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT Fecha, Almacen, Ventas_Del_Dia, Consumos_Del_Dia, Charolas_Vendidas, Relacion_Consumo_Charola
            FROM Vista_Relacion_Diaria_Por_Almacen
            WHERE Fecha BETWEEN @start AND @end
        `;

        request.input('start', sql.Date, startDate);
        request.input('end', sql.Date, endDate);

        if (whsCode && whsCode !== 'TODOS') {
            query += " AND Almacen = @whs";
            request.input('whs', sql.VarChar, whsCode);
        }

        query += " ORDER BY Fecha DESC, Almacen ASC";
        const result = await request.query(query);
        return result.recordset;
    },

    /**
     * Obtiene el atraso en horas del reporte de ventas por almacén
     */
    getVentasConAtraso: async () => {
        const pool = await getConnection();
        const query = `
            WITH UltimaVenta AS (
                SELECT whscode, MAX(docdate) as ultima_fecha
                FROM dbo.Recorded_Orders
                GROUP BY whscode
            )
            SELECT 
                a.whscode, 
                a.whsdesc, 
                u.ultima_fecha,
                ISNULL(DATEDIFF(DAY, u.ultima_fecha, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATE)) * 24, 9999) as horas_atraso
            FROM dbo.almacenes a
            LEFT JOIN UltimaVenta u ON LTRIM(RTRIM(a.whscode)) = LTRIM(RTRIM(u.whscode))
            ORDER BY horas_atraso DESC
        `;
        const result = await pool.request().query(query);
        return result.recordset;
    },
    updateOrderWithBreakdown: async (docEntry, itemCode, nuevaCantidadTotal, desglose) => {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Actualizar la tabla Madre (Recorded_Orders)
        // Usamos DocEntry e ItemCode para identificar la fila exacta
        const updateMadre = await transaction.request()
            .input('qty', sql.Decimal(18, 4), nuevaCantidadTotal)
            .input('entry', sql.Int, docEntry)
            .input('code', sql.VarChar, itemCode)
            .query(`
                UPDATE Recorded_Orders 
                SET quantity = @qty 
                WHERE docentry = @entry AND itemcode = @code;
                
                SELECT id FROM Recorded_Orders WHERE docentry = @entry AND itemcode = @code;
            `);

        const orderId = updateMadre.recordset[0]?.id;

        if (orderId) {
            // 2. Borrar el desglose viejo
            await transaction.request()
                .input('orderId', sql.Int, orderId)
                .query(`DELETE FROM Recorded_Orders_Dietas_Detalle WHERE RecordedOrderId = @orderId`);

            // 3. Insertar el nuevo desglose
            for (const dieta of desglose) {
                await transaction.request()
                    .input('orderId', sql.Int, orderId)
                    .input('nombre', sql.VarChar, dieta.NombreDieta)
                    .input('cant', sql.Decimal(18, 4), dieta.Cantidad)
                    .query(`
                        INSERT INTO Recorded_Orders_Dietas_Detalle (RecordedOrderId, NombreDieta, Cantidad) 
                        VALUES (@orderId, @nombre, @cant)
                    `);
            }
        }

        await transaction.commit();
        return { success: true };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}
};
module.exports = ventasRepository;
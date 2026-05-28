const { getConnection, sql } = require('../config/datab');
const adminRepository = {
    getAllRawItems: async () => {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM dbo.items ORDER BY descripcion ASC');
        return result.recordset;
    },
    updateRawItem: async (id, data) => {
        const pool = await getConnection();
        const request = pool.request();
        
        request.input('id', sql.VarChar, id);
        request.input('desc', sql.VarChar, data.descripcion);

        // Generamos dinámicamente los parámetros para las 20 zonas
        let zonesUpdateSql = '';
        for (let i = 1; i <= 20; i++) {
            const fieldName = `Zona_${i}`;
            const value = parseFloat(data[fieldName]) || 0;
            request.input(`z${i}`, sql.Decimal(18, 4), value);
            zonesUpdateSql += `, ${fieldName} = @z${i}`;
        }

        const query = `
            UPDATE dbo.items 
            SET descripcion = @desc 
            ${zonesUpdateSql}
            WHERE itemcode = @id
        `;

        await request.query(query);
    },
    getAllAlmacenes: async () => {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT whscode, whsdesc, Contrato FROM dbo.almacenes ORDER BY whsdesc ASC');
        return result.recordset;
    },
    getAllUserAccess: async () => {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT ID, email, whscode FROM dbo.Usuario_Almacenes ORDER BY email ASC');
        return result.recordset;
    },
    checkUserAccessExists: async (email, whscode) => {
        const pool = await getConnection();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('whs', sql.VarChar, whscode)
            .query('SELECT ID FROM dbo.Usuario_Almacenes WHERE email = @email AND whscode = @whs');
        return result.recordset.length > 0;
    },
    grantUserAccess: async (email, whscode) => {
        const pool = await getConnection();
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('whs', sql.VarChar, whscode)
            .query('INSERT INTO dbo.Usuario_Almacenes (email, whscode) VALUES (@email, @whs)');
    },
    revokeUserAccess: async (id) => {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Usuario_Almacenes WHERE ID = @id');
    },
    getAllPaxItems: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT id, ItemCode, ItemName, Price, CardCode, CardName, WhsCode
            FROM dbo.Ventas 
            ORDER BY ItemName ASC, WhsCode ASC
        `);
        return result.recordset;
    },
    createPaxItemsBatch: async (ItemCode, ItemName, Price, CardCode, CardName, WhsCodes) => {
        const pool = await getConnection();
        for (const whs of WhsCodes) {
            await pool.request()
                .input('code', sql.VarChar, ItemCode)
                .input('name', sql.VarChar, ItemName)
                .input('price', sql.Decimal(10, 2), Price)
                .input('cardCode', sql.VarChar, CardCode)
                .input('cardName', sql.VarChar, CardName)
                .input('whs', sql.VarChar, whs)
                .query(`
                    INSERT INTO dbo.Ventas (ItemCode, ItemName, Price, Status, WhsCode, CardCode, CardName, TaxCode) 
                    VALUES (@code, @name, @price, 1, @whs, @cardCode, @cardName, 'IVAT16')
                `);
        }
    },
    updatePaxItemPrice: async (id, price) => {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('price', sql.Decimal(10, 2), price)
            .query('UPDATE dbo.Ventas SET Price = @price WHERE id = @id');
    },
    deletePaxItem: async (id) => {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Ventas WHERE id = @id');
    },
    getInventoryComparison: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
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
                T.codigo_almacen, 
                T.codigo_articulo as itemcode, 
                T.producto as descripcion, 
                T.stock_actual as stock_teorico, 
                ISNULL(F.cantidad_fisica, 0) as stock_fisico,
                (ISNULL(F.cantidad_fisica, 0) - T.stock_actual) as diferencia,
                F.fecha_conteo
            FROM dbo.View_Inventario_Teorico T
            LEFT JOIN UltimoFisico F 
                ON T.codigo_articulo = F.codigo_articulo 
                AND T.codigo_almacen = F.codigo_almacen
                AND F.fila = 1
        `);
        return result.recordset;
    },
    executeWeeklyClosing: async () => {
        const pool = await getConnection();
        await pool.request().execute('Cierre_Inventario_Semanal');
    },
    getAllUsers: async () => {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT id, email, rol FROM dbo.Rols ORDER BY email ASC');
        return result.recordset;
    },
    checkUserExists: async (email) => {
        const pool = await getConnection();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM dbo.Rols WHERE email = @email');
        return result.recordset.length > 0;
    },
    createUser: async (email, rol) => {
        const pool = await getConnection();
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('rol', sql.VarChar, rol)
            .query('INSERT INTO dbo.Rols (email, rol) VALUES (@email, @rol)');
    },
    deleteUser: async (id) => {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Rols WHERE id = @id');
    },
    updateUserRole: async (id, rol) => {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('rol', sql.VarChar, rol)
            .query('UPDATE dbo.Rols SET rol = @rol WHERE id = @id');
    },
     getDietas: async () => {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT id, NombreDieta, Activo FROM dbo.Dietas_Catalogo ORDER BY NombreDieta ASC');
        return result.recordset;
    },

    createDieta: async (nombre) => {
        const pool = await getConnection();
        await pool.request().input('nombre', sql.VarChar, nombre).query('INSERT INTO dbo.Dietas_Catalogo (NombreDieta) VALUES (@nombre)');
    },

    toggleDietaStatus: async (id, status) => {
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, id).input('status', sql.Bit, status).query('UPDATE dbo.Dietas_Catalogo SET Activo = @status WHERE id = @id');
    },

    deleteDietaCompleta: async (id) => {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        await transaction.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM whs_dietas WHERE DietaId = @id');
        
        await transaction.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dietas WHERE id = @id');

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
},

    // Mapeo Almacén <-> Dietas
    getWhsDietas: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT adp.WhsCode, adp.DietaId, d.NombreDieta, a.whsdesc 
            FROM dbo.Almacen_Dietas_Permitidas adp
            JOIN dbo.Dietas_Catalogo d ON adp.DietaId = d.id
            JOIN dbo.almacenes a ON adp.WhsCode = a.whscode
        `);
        return result.recordset;
    },

    assignDietaToWhs: async (whscode, dietaId) => {
        const pool = await getConnection();
        await pool.request()
            .input('whs', sql.VarChar, whscode)
            .input('dieta', sql.Int, dietaId)
            .query('INSERT INTO dbo.Almacen_Dietas_Permitidas (WhsCode, DietaId) VALUES (@whs, @dieta)');
    },

    removeDietaFromWhs: async (whscode, dietaId) => {
        const pool = await getConnection();
        await pool.request()
            .input('whs', sql.VarChar, whscode)
            .input('dieta', sql.Int, dietaId)
            .query('DELETE FROM dbo.Almacen_Dietas_Permitidas WHERE WhsCode = @whs AND DietaId = @dieta');
    },

    getAllPaxItems: async () => {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT id, ItemCode, ItemName, Price, CardCode, CardName, WhsCode, RequiereDetalle
            FROM dbo.Ventas 
            ORDER BY ItemName ASC, WhsCode ASC
        `);
        return result.recordset;
    },

    togglePaxDetail: async (id, status) => {
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, id).input('status', sql.Bit, status).query('UPDATE dbo.Ventas SET RequiereDetalle = @status WHERE id = @id');
    },

     bulkUpdateItemsFromCSV: async (items) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            console.log(`📦 Procesando carga masiva de ${items.length} items...`);
            if (items.length > 0) console.log("🔍 Mapeo de columnas detectado:", Object.keys(items[0]));

            for (const item of items) {
                const itemCode = item.itemcode?.toString().trim();
                
                // Validar que el código no sea nulo o un encabezado mal mapeado
                if (!itemCode) {
                    console.warn("⚠️ Saltando fila inválida:", item);
                    continue;
                }

                const request = new sql.Request(transaction);
                
                request.input('codgen', sql.VarChar, item.codigo_general?.toString().trim() || '');
                // Aseguramos que el itemcode no venga vacío
                request.input('code', sql.VarChar, itemCode);
                request.input('desc', sql.VarChar, item.descripcion?.toString().trim() || '');
                request.input('tipo', sql.VarChar, item.tipo?.toString().trim() || 'Pieza');

                for (let i = 1; i <= 20; i++) {
                    const rawVal = (item[`zona_${i}`] || '0').toString().replace(',', '.');
                    const zonaVal = parseFloat(rawVal) || 0;
                    request.input(`z${i}`, sql.Decimal(18, 4), zonaVal);
                }

                await request.query(`
                    IF EXISTS (SELECT 1 FROM dbo.items WHERE itemcode = @code)
                    BEGIN
                        UPDATE dbo.items 
                        SET codigo_general = @codgen,
                            descripcion = @desc,
                            tipo = @tipo,
                            Zona_1 = @z1, Zona_2 = @z2, Zona_3 = @z3, Zona_4 = @z4, Zona_5 = @z5,
                            Zona_6 = @z6, Zona_7 = @z7, Zona_8 = @z8, Zona_9 = @z9, Zona_10 = @z10,
                            Zona_11 = @z11, Zona_12 = @z12, Zona_13 = @z13, Zona_14 = @z14, Zona_15 = @z15,
                            Zona_16 = @z16, Zona_17 = @z17, Zona_18 = @z18, Zona_19 = @z19, Zona_20 = @z20
                        WHERE itemcode = @code
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.items (
                            codigo_general, itemcode, descripcion, tipo, 
                            Zona_1, Zona_2, Zona_3, Zona_4, Zona_5, 
                            Zona_6, Zona_7, Zona_8, Zona_9, Zona_10,
                            Zona_11, Zona_12, Zona_13, Zona_14, Zona_15,
                            Zona_16, Zona_17, Zona_18, Zona_19, Zona_20
                        )
                        VALUES (
                            @codgen, @code, @desc, @tipo, 
                            @z1, @z2, @z3, @z4, @z5, 
                            @z6, @z7, @z8, @z9, @z10,
                            @z11, @z12, @z13, @z14, @z15,
                            @z16, @z17, @z18, @z19, @z20
                        )
                    END
                `);
        }
            await transaction.commit();
        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error(`Error en bulkUpdateItemsFromCSV:`, err.message);
            throw err;
        }
    },
};
module.exports = adminRepository;
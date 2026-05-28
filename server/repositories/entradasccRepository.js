const { getConnection, sql } = require('../config/datab');const entradasccRepository = {    /**     * @param {string} search      * @returns {Promise<Array>}     */    searchItemsLocal: async (search) => {        const pool = await getConnection();        const searchText = `%${search || ''}%`;        const queryText = `SELECT TOP 100 itemcode, descripcion FROM items WHERE itemcode LIKE @search OR descripcion LIKE @search ORDER BY descripcion ASC;`;        const result = await pool.request().input('search', sql.VarChar, searchText).query(queryText);        return result.recordset;    },    /**     * @param {Array} lines      * @param {string} warehouseCode      */    saveCajaChicaLog: async (lines, warehouseCode, userEmail) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            for (const line of lines) {
                const request = new sql.Request(transaction);
                await request
                    .input('origen', sql.VarChar, 'Caja Chica')
                    .input('wh', sql.VarChar, warehouseCode)
                    .input('item', sql.VarChar, line.ItemCode)
                    .input('qty', sql.Float, line.Quantity)
                    .input('email', sql.VarChar, userEmail)
                    .query(`INSERT INTO Movimientos_Inventario (origen_web, codigo_almacen, codigo_articulo, cantidad_enviada, fecha_envio, UsuarioEmail) VALUES (@origen, @wh, @item, @qty, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central Standard Time' AS DATETIME), @email)`);
            }
            await transaction.commit();        } catch (error) {            if (transaction) await transaction.rollback();            throw error;
        }
    }};module.exports = entradasccRepository;
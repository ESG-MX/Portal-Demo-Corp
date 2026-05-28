const { getConnection, sql } = require('../config/datab');

const incidenciasRepository = {
    createIncidencia: async (header, items, blobUrls, history) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            // 1. Insertar Cabecera (Header) - Confirmado: FechaCreacion
            const requestHeader = new sql.Request(transaction);
            const headerResult = await requestHeader
                .input('CreadoPor', sql.VarChar(255), header.creadoPor)
                .input('ProveedorId', sql.VarChar(50), header.proveedorId)
                .input('ProveedorNombre', sql.VarChar(255), header.proveedorNombre)
                .input('PONumber', sql.VarChar(50), header.poNumber)
                .input('FacturaUUID', sql.VarChar(100), header.facturaUUID || null)
                .input('Almacen', sql.VarChar(50), header.almacen)
                .input('TipoIncidencia', sql.NVarChar(sql.MAX), header.tipoIncidencia)
                .input('Accion', sql.NVarChar(sql.MAX), header.accion)
                .input('Descripcion', sql.NVarChar(sql.MAX), header.descripcion || '')
                .query(`
                    INSERT INTO Incidencias_Header 
                    (CreadoPor, ProveedorId, ProveedorNombre, PONumber, FacturaUUID, Almacen, TipoIncidencia, Accion, Descripcion, Estado, FechaCreacion) 
                    OUTPUT INSERTED.Id
                    VALUES (@CreadoPor, @ProveedorId, @ProveedorNombre, @PONumber, @FacturaUUID, @Almacen, @TipoIncidencia, @Accion, @Descripcion, 'Pendiente', GETDATE())
                `);
            const incidenciaId = headerResult.recordset[0].Id;

            // 2. Insertar Detalles (Artículos) - Confirmado: CantidadOriginal, PrecioPO, PrecioFactura
            for (const item of items) {
                const itemCode = item.ItemCode || item.itemCode;
                const itemName = item.ItemName || item.itemName;
                const cantAf = item.CantidadAfectada || item.cantidadAfectada;
                const cantOri = item.CantidadOriginal || item.cantidadOriginal || 0;
                const pPO = item.PrecioPO || item.precioPO || 0;
                const pFactura = item.PrecioFactura || item.precioFactura || 0;

                await new sql.Request(transaction)
                    .input('IncidenciaId', sql.Int, incidenciaId)
                    .input('ItemCode', sql.VarChar(50), itemCode)
                    .input('ItemName', sql.VarChar(255), itemName)
                    .input('CantidadAfectada', sql.Decimal(18, 2), cantAf)
                    .input('CantidadOriginal', sql.Decimal(18, 2), cantOri)
                    .input('PrecioPO', sql.Decimal(18, 2), pPO)
                    .input('PrecioFactura', sql.Decimal(18, 2), pFactura)
                    .query(`
                        INSERT INTO Incidencias_Detail 
                        (IncidenciaId, ItemCode, ItemName, CantidadAfectada, CantidadOriginal, PrecioPO, PrecioFactura) 
                        VALUES (@IncidenciaId, @ItemCode, @ItemName, @CantidadAfectada, @CantidadOriginal, @PrecioPO, @PrecioFactura)
                    `);
            }

            // 3. Insertar Evidencias (Fotos) - Confirmado: La columna es BlobUrl
            for (const url of blobUrls) {
                await new sql.Request(transaction)
                    .input('IncidenciaId', sql.Int, incidenciaId)
                    .input('UrlDeLaFoto', sql.NVarChar(sql.MAX), url) 
                    .query(`
                        INSERT INTO Incidencias_Evidencia (IncidenciaId, BlobUrl) 
                        VALUES (@IncidenciaId, @UrlDeLaFoto)
                    `); 
            }

            // 4. Insertar Historial Inicial - Confirmado: La columna es Fecha
            await new sql.Request(transaction)
                .input('IncidenciaId', sql.Int, incidenciaId)
                .input('Usuario', sql.VarChar(255), history.usuario)
                .input('Rol', sql.VarChar(50), history.rol)
                .input('Estado', sql.VarChar(50), 'Pendiente')
                .input('Comentario', sql.NVarChar(sql.MAX), history.comentario)
                .query(`
                    INSERT INTO Incidencias_Historial (IncidenciaId, Usuario, Rol, Estado, Comentario, Fecha) 
                    VALUES (@IncidenciaId, @Usuario, @Rol, @Estado, @Comentario, GETDATE())
                `); 

            await transaction.commit();
            return incidenciaId;
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error("Error en createIncidencia Repository:", error);
            throw error;
        }
    },

    getIncidenciaByPO: async (poNumber) => {
        const pool = await getConnection();
        const result = await pool.request()
            .input('PONumber', sql.VarChar(50), poNumber)
            .query("SELECT Id FROM Incidencias_Header WHERE PONumber = @PONumber");
        return result.recordset.length > 0 ? result.recordset[0] : null;
    },

    getAllIncidencias: async (filters, permissions = {}) => {
        const pool = await getConnection();
        const request = pool.request();
        let whereQuery = "WHERE 1=1";
        const { hasFullAccess, finalWhs, role } = permissions;

        const isGlobalRole = hasFullAccess || (role && role.toLowerCase().includes('comp'));

        if (!isGlobalRole && finalWhs && finalWhs !== 'ALL') {
            whereQuery += " AND Almacen = @FinalWhs";
            request.input('FinalWhs', sql.VarChar(50), finalWhs);
        }

        if (filters.estado) {
            whereQuery += " AND Estado = @Estado";
            request.input('Estado', sql.VarChar(50), filters.estado);
        }

        if (filters.proveedorId) {
            whereQuery += " AND ProveedorId = @ProveedorId";
            request.input('ProveedorId', sql.VarChar(50), filters.proveedorId);
        }

        if (filters.fechaInicio && filters.fechaFin) {
            whereQuery += " AND FechaCreacion BETWEEN @FechaInicio AND @FechaFin";
            request.input('FechaInicio', sql.DateTime, filters.fechaInicio);
            request.input('FechaFin', sql.DateTime, filters.fechaFin);
        }

        const queryStr = `SELECT Id, FechaCreacion, CreadoPor, ProveedorId, ProveedorNombre, PONumber, Almacen, Estado, TipoIncidencia, Accion,
                          DATEDIFF(HOUR, FechaCreacion, GETDATE()) as HorasTranscurridas
                          FROM Incidencias_Header ${whereQuery} ORDER BY FechaCreacion DESC`;
        
        const result = await request.query(queryStr);
        return result.recordset;
    },

    getIncidenciaFullById: async (id) => {
        const pool = await getConnection();
        const headerRes = await pool.request()
            .input('Id', sql.Int, id)
            .query("SELECT * FROM Incidencias_Header WHERE Id = @Id");

        if (headerRes.recordset.length === 0) return null;
        const incidencia = headerRes.recordset[0];

        const [detailsRes, fotosRes, histRes] = await Promise.all([
            pool.request().input('Id', sql.Int, id).query("SELECT * FROM Incidencias_Detail WHERE IncidenciaId = @Id"),
            // CORREGIDO: Seleccionamos BlobUrl directamente (ya no FotoUrl)
            pool.request().input('Id', sql.Int, id).query("SELECT BlobUrl, FechaSubida FROM Incidencias_Evidencia WHERE IncidenciaId = @Id"),
            // CORREGIDO: Ordenamos por Fecha (ya no FechaCambio)
            pool.request().input('Id', sql.Int, id).query("SELECT * FROM Incidencias_Historial WHERE IncidenciaId = @Id ORDER BY Fecha DESC")
        ]);

        incidencia.articulos = detailsRes.recordset;

        const { getSasUrl } = require('../services/azureBlobService');
        incidencia.evidencia = fotosRes.recordset.map(f => ({
            ...f,
            BlobUrl: f.BlobUrl ? getSasUrl(f.BlobUrl) : null
        }));

        incidencia.historial = histRes.recordset;
        return incidencia;
    },

    updateSeguimiento: async (id, usuario, rol, nuevoEstado, comentario) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const checkResult = await new sql.Request(transaction)
                .input('Id', sql.Int, id)
                .query("SELECT Estado FROM Incidencias_Header WHERE Id = @Id");

            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return null;
            }

            const estadoActualDB = checkResult.recordset[0].Estado;
            const estadoFinal = nuevoEstado || estadoActualDB;

            if (comentario) {
                await new sql.Request(transaction)
                    .input('IncidenciaId', sql.Int, id)
                    .input('Usuario', sql.VarChar(255), usuario)
                    .input('Rol', sql.VarChar(50), rol)
                    .input('Estado', sql.VarChar(50), estadoFinal)
                    .input('Comentario', sql.NVarChar(sql.MAX), comentario)
                    // CORREGIDO: La columna es Fecha (ya no FechaCambio)
                    .query(`INSERT INTO Incidencias_Historial (IncidenciaId, Usuario, Rol, Estado, Comentario, Fecha) 
                            VALUES (@IncidenciaId, @Usuario, @Rol, @Estado, @Comentario, GETDATE())`);
            }

            if (nuevoEstado && nuevoEstado !== estadoActualDB) {
                await new sql.Request(transaction)
                    .input('NuevoEstado', sql.VarChar(50), nuevoEstado)
                    .input('Id', sql.Int, id)
                    .query(`UPDATE Incidencias_Header SET Estado = @NuevoEstado WHERE Id = @Id`);
            }

            await transaction.commit();
            return estadoFinal;
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    },

    deleteIncidencia: async (id) => {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            request.input('Id', sql.Int, id);

            await request.query("DELETE FROM Incidencias_Evidencia WHERE IncidenciaId = @Id");
            await request.query("DELETE FROM Incidencias_Detail WHERE IncidenciaId = @Id");
            await request.query("DELETE FROM Incidencias_Historial WHERE IncidenciaId = @Id");
            await request.query("DELETE FROM Incidencias_Header WHERE Id = @Id");

            await transaction.commit();
            return true;
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    }
};

module.exports = incidenciasRepository;
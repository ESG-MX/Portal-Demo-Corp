const { sapRequest } = require('../services/sapService'); 
const ventasRepository = require('../repositories/ventasRepository'); 
const asyncHandler = require('../utils/asyncHandler');
const { getConnection, sql } = require('../config/datab'); 
const { getStatusByHours } = require('../utils/semaforoLogic');

const ventasCont = {
    getAlmacenes: asyncHandler(async (req, res) => {
        const almacenes = await ventasRepository.getAlmacenesByUser(req.user);
        res.json(almacenes);
    }),

    getItemsByWhs: asyncHandler(async (req, res) => {
        const items = await ventasRepository.getItemsByWhs(req.params.whscode);
        res.json(items);
    }),

    /**
     * Obtiene órdenes de SAP y les pega el desglose de dietas que existe en SQL
     */
    getSapOrders: asyncHandler(async (req, res) => {
        const { startDate, endDate, whsCode, cardName } = req.query;
        const userEmail = req.user?.email;
        
        let filterParts = [`DocDate ge '${startDate}'`, `DocDate le '${endDate}'` ];
        
        if (whsCode && whsCode !== '') filterParts.push(`U_ALMACEN eq '${whsCode}'`);
        if (cardName && cardName !== '') {
            const escapedName = cardName.replace(/'/g, "''");
            filterParts.push(`contains(CardName, '${escapedName}')`);
        }

        const filter = filterParts.join(' and ');

        // 1. Obtener datos de SAP
        const response = await sapRequest(userEmail, 'GET', 'Orders', null, {
            "$filter": filter,
            "$select": "DocEntry,DocNum,DocDate,CardName,DocTotal,U_ALMACEN,DocumentLines,NumAtCard,DocumentStatus"
        });

        const sapOrders = response.data.value;

        // 2. Enriquecer con desglose de SQL para que el frontend pueda editarlo
        const pool = await getConnection();
        for (let order of sapOrders) {
            for (let line of order.DocumentLines) {
                const dbRes = await pool.request()
                    .input('entry', sql.Int, order.DocEntry)
                    .input('code', sql.VarChar, line.ItemCode)
                    .query(` 
                        SELECT dd.NombreDieta, dd.Cantidad, ro.TipoServicio
                        FROM Recorded_Orders ro
                        JOIN Recorded_Orders_Dietas_Detalle dd ON ro.id = dd.RecordedOrderId
                        WHERE ro.docentry = @entry AND ro.itemcode = @code
                    `);
                // Adjuntamos el desglose encontrado a la línea de SAP
                line.desglose = dbRes.recordset;
            }
        }

        res.json(sapOrders);
    }),

    /**
     * Actualiza SAP y sincroniza los cambios en las tablas Madre e Hija de SQL
     */
    updateSapOrder: asyncHandler(async (req, res) => {
        const { id } = req.params; 
        const { DocumentLines } = req.body; 
        const userEmail = req.user?.email;

        console.log(`>>> [CIERRE MES] Iniciando actualización Orden SAP: ${id}`);

        // 1. PRIMERO: Actualizar SAP Service Layer
        const payloadSAP = {
            DocumentLines: DocumentLines.map(line => ({
                LineNum: line.LineNum,
                Quantity: parseFloat(line.Quantity || 0)
            }))
        };

        try {
            await sapRequest(userEmail, 'PATCH', `Orders(${id})`, payloadSAP);
            console.log(`✅ SAP actualizado con éxito.`);
        } catch (error) {
            console.error("❌ Error al actualizar SAP:", error.response?.data || error.message);
            return res.status(error.response?.status || 500).json({
                success: false,
                message: "SAP rechazó la actualización",
                details: error.response?.data
            });
        }

        // 2. SEGUNDO: Si SAP tuvo éxito, sincronizamos SQL (Madre e Hija)
        const pool = await getConnection();
        
        for (const line of DocumentLines) {
            const transaction = new sql.Transaction(pool);
            try {
                await transaction.begin();

                // A. Actualizar cantidad en Tabla Madre (Recorded_Orders)
                const resMadre = await transaction.request()
                    .input('qty', sql.Decimal(18, 4), parseFloat(line.Quantity))
                    .input('entry', sql.Int, id)
                    .input('code', sql.VarChar, line.ItemCode)
                    .query(`
                        UPDATE Recorded_Orders 
                        SET quantity = @qty 
                        WHERE docentry = @entry AND itemcode = @code;

                        SELECT id FROM Recorded_Orders WHERE docentry = @entry AND itemcode = @code;
                    `);

                const internalOrderId = resMadre.recordset[0]?.id;

                // B. Si existe el registro en nuestra DB y trae desglose, actualizamos tabla hija
                if (internalOrderId && line.desglose && Array.isArray(line.desglose)) {
                    
                    // Borrar desglose anterior
                    await transaction.request()
                        .input('parentID', sql.Int, internalOrderId)
                        .query(`DELETE FROM Recorded_Orders_Dietas_Detalle WHERE RecordedOrderId = @parentID`);

                    // Insertar nuevo desglose corregido
                    for (const dieta of line.desglose) {
                        await transaction.request()
                            .input('parentID', sql.Int, internalOrderId)
                            .input('nombre', sql.VarChar, dieta.NombreDieta)
                            .input('cant', sql.Decimal(18, 4), parseFloat(dieta.Cantidad || 0))
                            .query(`
                                INSERT INTO Recorded_Orders_Dietas_Detalle (RecordedOrderId, NombreDieta, Cantidad) 
                                VALUES (@parentID, @nombre, @cant)
                            `);
                    }
                }

                await transaction.commit();
                console.log(`✅ SQL Sincronizado para Item: ${line.ItemCode}`);
            } catch (err) {
                await transaction.rollback();
                console.error("❌ Error sincronizando SQL:", err);
                // No retornamos error aquí para intentar procesar las demás líneas, 
                // pero podrías manejarlo según tu necesidad.
            }
        }

        res.json({ message: "Venta actualizada en SAP y SQL correctamente" });
    }),

    crearPedido: asyncHandler(async (req, res) => {
        console.log("--- INICIO PROCESO CREAR PEDIDO ---");
        const { TipoServicio, force, ...bodyData } = req.body;
        const userEmail = req.user?.email;

        if (!force && req.user?.role?.toLowerCase() !== 'admin') {
            const pool = await getConnection();
            const lastDateRes = await pool.request()
                .input('whs', sql.VarChar, bodyData.U_ALMACEN)
                .query("SELECT MAX(docdate) as LastDate FROM dbo.Recorded_Orders WHERE whscode = @whs");
            
            const lastDate = lastDateRes.recordset[0]?.LastDate;
            if (lastDate) {
                const reqDate = new Date(bodyData.DocDate + 'T00:00:00');
                const prevDate = new Date(lastDate);
                const diffDays = Math.round((reqDate - prevDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 1) {
                    return res.status(400).json({ success: false, message: "Bloqueo: Existe un salto de días. Debe reportar el día siguiente al último registro." });
                }
            }
        }

        if (!force) {
            const serviciosEnPedido = [...new Set(bodyData.DocumentLines.map(l => l.TipoServicio))];
            for (const servicio of serviciosEnPedido) {
                const lineasServicio = bodyData.DocumentLines.filter(l => l.TipoServicio === servicio);
                const totalQtyServicio = lineasServicio.reduce((acc, line) => acc + parseFloat(line.Quantity || 0), 0);
                const duplicate = await ventasRepository.checkDuplicateOrder(bodyData.U_ALMACEN, bodyData.DocDate, totalQtyServicio, servicio);
                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        isDuplicate: true,
                        message: `Ya existe un registro de ${servicio} (#${duplicate.docnum}) para esta fecha en este hospital.`
                    });
                }
            }
        }

        const sapLines = [];
        bodyData.DocumentLines.forEach(line => {
            const existing = sapLines.find(l => l.ItemCode === line.ItemCode);
            const qty = parseFloat(line.Quantity || 0);
            if (existing && qty > 0) {
                existing.Quantity += qty;
            } else if (qty > 0) {
                sapLines.push({
                    ItemCode: line.ItemCode,
                    Quantity: qty,
                    WarehouseCode: line.WarehouseCode,
                    UnitPrice: parseFloat(line.Price || 0),
                    TaxCode: line.TaxCode
                });
            }
        });

        const sapPayload = {
            CardCode: bodyData.CardCode,
            DocDate: bodyData.DocDate,
            DocDueDate: bodyData.DocDueDate,
            NumAtCard: bodyData.NumAtCard,
            U_ALMACEN: bodyData.U_ALMACEN, 
            DocumentLines: sapLines
        };

        try {
            const sapRes = await sapRequest(userEmail,'POST', 'Orders', sapPayload);
            await ventasRepository.logOrder({ ...bodyData, TipoServicio }, req.user?.email, sapRes.data);
            res.json({ success: true, message: sapRes.data.DocNum });
        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.data.error?.message?.value || "Error desconocido de SAP",
                    details: error.response.data
                });
            } else {
                throw error;
            }
        }
    }),

    getHistorial: asyncHandler(async (req, res) => {
        const pool = await getConnection();
        const { startDate, endDate, whsCode, contrato, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitParsed = parseInt(limit);
        const request = pool.request();

        let query = `
            SELECT 
                ro.id AS IdRegistro, ro.docnum AS DocNum, ro.docdate AS DocDate, ro.TipoServicio,
                ro.whscode AS WhsCode, ro.username AS EmailUsuario, ro.itemcode AS ItemSAP,
                v.ItemName AS ItemGeneral, ro.price AS PrecioUnitario,
                ISNULL(dd.NombreDieta, 'VENTA DIRECTA') AS DetalleDieta,
                ISNULL(dd.Cantidad, ro.quantity) AS CantidadAnalisis,
                (ISNULL(dd.Cantidad, ro.quantity) * ro.price) AS TotalRenglon
            FROM dbo.Recorded_Orders ro
            LEFT JOIN dbo.Recorded_Orders_Dietas_Detalle dd ON ro.id = dd.RecordedOrderId
            LEFT JOIN dbo.Ventas v ON ro.itemcode = v.ItemCode AND ro.whscode = v.WhsCode
            LEFT JOIN dbo.almacenes a ON ro.whscode = a.whscode
            WHERE 1=1
        `;

        if (startDate) { query += ` AND ro.docdate >= @startDate`; request.input('startDate', sql.Date, startDate); }
        if (endDate) { query += ` AND ro.docdate <= @endDate`; request.input('endDate', sql.Date, endDate); }
        if (whsCode && whsCode !== 'TODOS' && whsCode !== '') {
            query += ` AND ro.whscode = @whsCode`;
            request.input('whsCode', sql.VarChar, whsCode);
        }
        if (contrato && contrato !== '') {
            query += ` AND a.Contrato = @contrato`;
            request.input('contrato', sql.VarChar, contrato);
        }

        query += ` ORDER BY ro.docdate DESC, ro.docnum DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limitParsed);
        
        const result = await request.query(query);
        res.json(result.recordset);
    }),

    getRelacionDiaria: asyncHandler(async (req, res) => {
        const { startDate, endDate, whsCode } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ message: "Fechas requeridas" });
        const data = await ventasRepository.getRelacionDiaria({ startDate, endDate, whsCode });
        res.json(data);
    }),

    getReporteSalud: asyncHandler(async (req, res) => {
        const almacenes = await ventasRepository.getVentasConAtraso();
        const dataConSemaforo = almacenes.map(row => ({
            ...row,
            semaforo: getStatusByHours(row.horas_atraso, 'VENTAS')
        })).sort((a, b) => b.semaforo.priority - a.semaforo.priority);
        res.json(dataConSemaforo);
    }),
};

module.exports = ventasCont;
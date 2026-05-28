const { sapRequest } = require('../services/sapService');
const entradasRepository = require('../repositories/entradasRepository');
const { notificarSupervisoresWhs } = require('../services/notificacionesService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
require('dotenv').config();

const getWarehouses = asyncHandler(async (req, res) => {
    const { hasFullAccess, secureOffice } = req.permissions || {};
    const userEmail = req.user?.email;

    if (!hasFullAccess && secureOffice) {
        return res.json([{ WarehouseCode: secureOffice, WarehouseName: `Sucursal ${secureOffice}` }]);
    }
    let allWarehouses = [];
    let nextLink = "Warehouses?$select=WarehouseCode,WarehouseName,Inactive&$top=1000";
    do {
        const urlToFetch = nextLink.includes('/b1s/v1/') ? nextLink.split('/b1s/v1/')[1] : nextLink;
        const response = await sapRequest(userEmail, 'GET', urlToFetch);
        allWarehouses = [...allWarehouses, ...response.data.value];
        nextLink = response.data['odata.nextLink'];
    } while (nextLink);
    let filtered = allWarehouses.filter(wh => {
        const name = wh.WarehouseName?.toUpperCase() || '';
        const code = wh.WarehouseCode?.toUpperCase() || '';
        return !code.startsWith('ADM') && wh.Inactive !== 'tYES' && !name.includes('INACTIVO');
    });
    res.json(filtered.sort((a, b) => a.WarehouseCode.localeCompare(b.WarehouseCode)));
});

const getOrders = asyncHandler(async (req, res) => {
    let { page = 1, limit = 25, startDate, endDate, docNum } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { finalWhs } = req.permissions;
    const userEmail = req.user?.email;

    if (docNum) {
        const response = await sapRequest(userEmail, 'GET', 'PurchaseOrders', null, {
            "$filter": `DocNum eq ${docNum} and DocumentStatus eq 'bost_Open'`,
            "$select": "DocEntry,DocNum,CardName,DocDate,DocDueDate,DocTotal"
        });
        return res.json({ data: response.data.value, total: response.data.value.length });
    }
    const sqlCode = "Portal_GetOrders_V12";
    const pWhsFrom = (finalWhs && finalWhs !== 'ALL') ? finalWhs : ' ';
    const pWhsTo = (finalWhs && finalWhs !== 'ALL') ? finalWhs : 'ZZZZZZ';
    const cleanStart = startDate ? startDate.replace(/-/g, '') : '20000101';
    const cleanEnd = endDate ? endDate.replace(/-/g, '') : '20991231';
    try {
        const queryResponse = await sapRequest(userEmail,'GET', `SQLQueries('${sqlCode}')/List`, null, {
            pWhs1: `'${pWhsFrom}'`, pWhs2: `'${pWhsTo}'`, pStart: `'${cleanStart}'`, pEnd: `'${cleanEnd}'`
        });
        const allResults = queryResponse.data.value || [];
        res.json({ data: allResults.slice(skip, skip + parseInt(limit, 10)), total: allResults.length });
    } catch (sqlError) {
        if (sqlError.response?.status === 404) {
            const hanaSql = {
                "SqlCode": sqlCode,
                "SqlName": "Portal Recepcion V12 Azure",
                "SqlText": `SELECT DISTINCT T0."DocEntry", T0."DocNum", T0."CardName", T0."DocDate", T0."DocDueDate", T0."DocTotal" FROM OPOR T0 INNER JOIN POR1 T1 ON T0."DocEntry" = T1."DocEntry" WHERE T0."DocStatus" = 'O' AND T1."LineStatus" = 'O' AND (T1."OpenQty" >= 0.01 OR T1."OpenInvQty" >= 0.01) AND T1."WhsCode" >= :pWhs1 AND T1."WhsCode" <= :pWhs2 AND T0."DocDueDate" >= :pStart AND T0."DocDueDate" <= :pEnd ORDER BY T0."DocNum" DESC`
            };
            await sapRequest(userEmail,'POST', 'SQLQueries', hanaSql);
            return res.status(202).json({ message: "Sincronizando vistas..." });
        }
        throw sqlError;
    }
});

const getOrderDetails = asyncHandler(async (req, res) => {
    const { docEntry } = req.params;
    const userEmail = req.user?.email;
    const response = await sapRequest(userEmail, 'GET', `PurchaseOrders(${docEntry})`);
    let data = response.data;
    if (data && data.DocumentLines) {
        data.DocumentLines = data.DocumentLines.filter(line => {
            const isOpen = line.LineStatus === 'bost_Open';
            const hasQty = (line.RemainingOpenQuantity || line.OpenQuantity || 0) >= 0.01;
            return isOpen && hasQty;
        });
    }
    res.json(data);
});

const cancelOrder = asyncHandler(async (req, res) => {
    const { docEntry } = req.params;
    const userEmail = req.user?.email;
    console.log(`>>> [AZURE DEBUG] Intentando CANCELAR Orden de Compra DocEntry: ${docEntry}`);
    try {
        await sapRequest(userEmail, 'POST', `PurchaseOrders(${docEntry})/Cancel`, {});
        console.log(`✅ [AZURE DEBUG] Orden de Compra ${docEntry} CANCELADA con éxito en SAP.`);
        res.json({ success: true, message: `Orden #${docEntry} cancelada exitosamente en SAP.` });
    } catch (error) {
        console.error("❌ [AZURE DEBUG] ERROR AL CANCELAR ORDEN DE COMPRA EN SAP SERVICE LAYER");
        if (error.response) {
            console.error("STATUS:", error.response.status);
            console.error("DETALLE SAP:", JSON.stringify(error.response.data, null, 2));
            
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.error?.message?.value || "Error desconocido al cancelar la orden en SAP",
                details: error.response.data
            });
        }
        throw error; // Re-lanza errores que no son de respuesta de SAP
    }
});

const receiveGoods = asyncHandler(async (req, res) => {
    const { docEntry, lines, numAtCard } = req.body;
    const userEmail = req.user?.email;

    if (!lines || lines.length === 0) {
        throw new AppError("No hay líneas para recibir", 400);
    }

    const sapPayload = {
        NumAtCard: numAtCard || "S/R",
        Comments: `Portal Recepción - Auto-Cierre - Usuario: ${req.user?.email || 'Portal'}`,
        DocDate: new Date().toISOString().split('T')[0],
        DocumentLines: lines
            .filter(line => parseFloat(line.Quantity || 0) > 0)
            .map(line => ({
                BaseType: 22,
                BaseEntry: parseInt(docEntry, 10),
                BaseLine: parseInt(line.LineNum, 10),
                Quantity: parseFloat(line.Quantity || 0),
                WarehouseCode: line.WhsCode || line.WarehouseCode
            }))
    };

    console.log(">>> [AZURE DEBUG] Iniciando Entrada en SAP...");
    console.log(">>> [AZURE DEBUG] Payload para PurchaseDeliveryNotes:", JSON.stringify(sapPayload, null, 2));
    
    // 1. Crear la entrada de mercancía en SAP
    const response = await sapRequest(userEmail, 'POST', 'PurchaseDeliveryNotes', sapPayload);
    const sapCreatedDoc = response.data; 
    console.log(`✅ [AZURE DEBUG] Entrada creada en SAP. DocNum: ${sapCreatedDoc.DocNum}`);
    console.log(">>> [AZURE DEBUG] Respuesta de SAP (PurchaseDeliveryNotes):", JSON.stringify(sapCreatedDoc, null, 2));

    // 2. Cierre automático de la Orden de Compra original
    try {
        await sapRequest(userEmail,'POST', `PurchaseOrders(${docEntry})/Close`, {});
        console.log(`✅ [AZURE DEBUG] Orden de Compra #${docEntry} cerrada en SAP.`);
    } catch (closeError) {
        console.error("⚠️ [AZURE DEBUG] No se pudo cerrar la OC en SAP:", closeError.response?.data?.error?.message?.value || closeError.message);
    }

    // 3. Registro en tablas locales 
    console.log(">>> [AZURE DEBUG] Iniciando registro en tablas locales...");
    await entradasRepository.saveReceptionLog(
        lines, 
        userEmail,
        numAtCard, 
        sapCreatedDoc.DocNum 
    );
    console.log("✅ [AZURE DEBUG] Registro en tablas locales completado.");
    
    // 4. Notificaciones
    const whsCode = sapPayload.DocumentLines[0]?.WarehouseCode;
    if (whsCode) {
        await notificarSupervisoresWhs(
            whsCode,
            `Recepción Finalizada PO #${docEntry}`,
            `Mercancía recibida y orden #${docEntry} cerrada automáticamente.`,
            '/entradas',
            'info'
        );
    }

    res.json({ success: true, docNum: sapCreatedDoc.DocNum });
});

const getHistorial = asyncHandler(async (req, res) => {
    // Aseguramos que los filtros lleguen limpios al repositorio
    const filters = {
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || '',
        whsCode: req.query.whsCode || '',
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
    };
    const result = await entradasRepository.getHistorial(filters);
    res.json(result);
});

module.exports = { getWarehouses, getOrders, getOrderDetails, cancelOrder, receiveGoods, getHistorial };
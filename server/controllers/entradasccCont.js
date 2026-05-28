const { sapRequest } = require('../services/sapService');
const entradasccRepository = require('../repositories/entradasccRepository');
const { notificarSupervisoresWhs } = require('../services/notificacionesService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
require('dotenv').config();

const entradasccCont = {
    searchItems: asyncHandler(async (req, res) => {
        const { q } = req.query;
        const items = await entradasccRepository.searchItemsLocal(q);
        const formattedResults = items.map(row => ({
            value: row.itemcode,
            label: `${row.itemcode} - ${row.descripcion}`
        }));
        res.json(formattedResults);
    }),

    searchVendors: asyncHandler(async (req, res) => {
        const { q } = req.query;
        const userEmail = req.user?.email; // 👈 Extraemos el email del usuario logueado

        let filter = "CardType eq 'S'";
        if (q && q.trim() !== '') {
            const raw = q.replace(/'/g, "''");
            const upper = q.toUpperCase().replace(/'/g, "''");
            filter += ` and (contains(CardName, '${raw}') or contains(CardName, '${upper}') or contains(CardCode, '${upper}'))`;
        }

        // CAMBIO: Agregamos userEmail como primer parámetro para manejar la sesión correcta
        const response = await sapRequest(userEmail, 'GET', 'BusinessPartners', null, {
            "$select": "CardCode,CardName",
            "$filter": filter,
            "$top": 20
        });

        const results = response.data.value.map(v => ({
            value: v.CardCode,
            label: `${v.CardName} (${v.CardCode})`
        }));
        res.json(results);
    }),

    getWarehouses: asyncHandler(async (req, res) => {
        const { hasFullAccess, secureOffice } = req.permissions || {};
        const userEmail = req.user?.email; // 👈 Extraemos el email

        let filter = "Inactive eq 'tNO'";
        if (!hasFullAccess && secureOffice) {
            filter += ` and WarehouseCode eq '${secureOffice}'`;
        }

        let allWarehouses = [];
        let nextLink = `Warehouses?$select=WarehouseCode,WarehouseName,Inactive&$filter=${filter}&$top=1000`;

        do {
            const urlToFetch = nextLink.includes('/b1s/v1/') ? nextLink.split('/b1s/v1/')[1] : nextLink;
            
            // CAMBIO: Agregamos userEmail en la petición del bucle
            const response = await sapRequest(userEmail, 'GET', urlToFetch);
            
            allWarehouses = [...allWarehouses, ...response.data.value];
            nextLink = response.data['odata.nextLink'];
        } while (nextLink);

        const filtered = allWarehouses
            .filter(wh => {
                const name = wh.WarehouseName?.toUpperCase() || '';
                const code = wh.WarehouseCode?.toUpperCase() || '';
                return !code.startsWith('ADM') && !name.includes('INACTIVO');
            })
            .map(wh => ({
                value: wh.WarehouseCode,
                label: `${wh.WarehouseCode} - ${wh.WarehouseName}`
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
            
        res.json(filtered);
    }),

    createEntry: asyncHandler(async (req, res) => {
        const { 
            CardCode, 
            DocDate, 
            NumAtCard, 
            U_TipoIngreso, 
            U_Semana, 
            WarehouseCode, 
            Lines = [], 
            NoDeducible, 
            RazonSocialManual 
        } = req.body;
        
        const userEmail = req.user?.email; // 👈 Extraemos el email

        if (!Lines || Lines.length === 0) {
            throw new AppError("No se enviaron artículos.", 400);
        }

        let sapComments = `Portal Caja Chica - Creado por: ${req.user?.name || 'Usuario Portal'}`;
        if (NoDeducible) {
            sapComments = `*** NO DEDUCIBLE *** | Proveedor: ${RazonSocialManual || 'No especificado'} | ${sapComments}`;
        }

        const sapPayload = {
            CardCode,
            DocDate,
            NumAtCard: NumAtCard,
            U_TipoIngreso,
            U_Semana,
            Comments: sapComments,
            DocumentLines: Lines.map(l => ({
                ItemCode: l.ItemCode,
                Quantity: l.Quantity,
                UnitPrice: l.Price,
                TaxCode: NoDeducible ? 'IVAA0' : l.TaxCode,
                WarehouseCode: WarehouseCode
            }))
        };

        // CAMBIO: Agregamos userEmail para que el documento se cree bajo la licencia del usuario si existe
        const response = await sapRequest(userEmail, 'POST', 'PurchaseDeliveryNotes', sapPayload);

        try {
            // Registro local de auditoría
            await entradasccRepository.saveCajaChicaLog(Lines, WarehouseCode, userEmail);
        } catch (sqlError) {
            console.error("❌ [CRITICAL] Entrada creada en SAP (DocNum: " + response.data.DocNum + ") pero falló el log SQL:", sqlError.message);
        }

        const total = Lines.reduce((sum, l) => sum + (parseFloat(l.Quantity) * parseFloat(l.Price)), 0);
        
        // Notificación a supervisores
        await notificarSupervisoresWhs(
            WarehouseCode,
            `Nueva Entrada por Caja Chica`,
            `Se registró una compra de $${total.toFixed(2)} en el almacén ${WarehouseCode}.`,
            '/entradascc',
            'info'
        );

        res.json({ success: true, docNum: response.data.DocNum });
    })
};

module.exports = entradasccCont;
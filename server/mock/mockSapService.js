// Mock SAP B1 Service Layer — replaces real SAP Business One in demo/portfolio mode.

const logger = require('../utils/logger');

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString().split('T')[0];

const mockPurchaseOrders = [
    { DocEntry: 2001, DocNum: 10001, CardCode: 'PROV-001', CardName: 'Distribuidora Alimentos Demo S.A.', DocDate: daysAgo(2), DocDueDate: daysAgo(0), DocTotal: 15750.00, DocumentStatus: 'bost_Open', DocumentLines: [
        { LineNum: 0, ItemCode: 'MP-001', ItemDescription: 'Arroz Blanco', Quantity: 200, Price: 22.50, WarehouseCode: 'CAFE-01' },
        { LineNum: 1, ItemCode: 'MP-002', ItemDescription: 'Frijol Negro',  Quantity: 100, Price: 35.00, WarehouseCode: 'CAFE-01' },
    ]},
    { DocEntry: 2002, DocNum: 10002, CardCode: 'PROV-002', CardName: 'Carnes y Aves Frescas Demo', DocDate: daysAgo(5), DocDueDate: daysAgo(3), DocTotal: 8500.00, DocumentStatus: 'bost_Open', DocumentLines: [
        { LineNum: 0, ItemCode: 'MP-003', ItemDescription: 'Pollo Entero', Quantity: 100, Price: 85.00, WarehouseCode: 'CAFE-02' },
    ]},
    { DocEntry: 2003, DocNum: 10003, CardCode: 'PROV-001', CardName: 'Distribuidora Alimentos Demo S.A.', DocDate: daysAgo(10), DocDueDate: daysAgo(8), DocTotal: 9600.00, DocumentStatus: 'bost_Closed', DocumentLines: [
        { LineNum: 0, ItemCode: 'MP-004', ItemDescription: 'Carne Molida',  Quantity: 80, Price: 120.00, WarehouseCode: 'CAFE-03' },
    ]},
];

const mockBusinessPartners = [
    { CardCode: 'PROV-001', CardName: 'Distribuidora Alimentos Demo S.A.', CardType: 'cSupplier', Phone1: '555-1000', EmailAddress: 'ventas@alimentos-demo.com' },
    { CardCode: 'PROV-002', CardName: 'Carnes y Aves Frescas Demo',        CardType: 'cSupplier', Phone1: '555-2000', EmailAddress: 'pedidos@carnes-demo.com'   },
    { CardCode: 'PROV-003', CardName: 'Lácteos y Derivados Demo',          CardType: 'cSupplier', Phone1: '555-3000', EmailAddress: 'contacto@lacteos-demo.com' },
    { CardCode: 'PROV-004', CardName: 'Verduras Orgánicas Demo',           CardType: 'cSupplier', Phone1: '555-4000', EmailAddress: 'info@verduras-demo.com'    },
];

const mockGoodsReceipts = [
    { DocEntry: 3001, DocNum: 20001, DocDate: new Date().toISOString(), CardCode: 'PROV-001', CardName: 'Distribuidora Alimentos Demo S.A.', DocumentLines: [
        { ItemCode: 'MP-001', ItemDescription: 'Arroz Blanco', Quantity: 50, Price: 22.50, WarehouseCode: 'CAFE-01', LineTotal: 1125.0 },
    ]},
];

function buildMockResponse(data) {
    return { data, status: 200, headers: {} };
}

async function sapRequest(userEmail, method, endpoint, data = null, params = null) {
    logger.info(`[MOCK SAP] ${method.toUpperCase()} /${endpoint} — usuario: ${userEmail}`);

    const ep = (endpoint || '').toLowerCase();

    // Login (should not be called in mock mode, but handle it)
    if (ep === 'login') {
        return buildMockResponse({ SessionId: 'MOCK-SESSION-123', Version: '1000150' });
    }

    // Purchase Orders
    if (ep.startsWith('purchaseorders')) {
        if (ep.includes('(')) {
            const entry = parseInt(ep.match(/\((\d+)\)/)?.[1]);
            const po = mockPurchaseOrders.find(p => p.DocEntry === entry) || mockPurchaseOrders[0];
            return buildMockResponse(po);
        }
        return buildMockResponse({ value: mockPurchaseOrders });
    }

    // Goods Receipt PO (receiving)
    if (ep.startsWith('goodsreceiptpo') || ep.startsWith('purchasedeliverynotes')) {
        if (method.toLowerCase() === 'post') {
            return buildMockResponse({ DocEntry: 3001, DocNum: 20001, ...data });
        }
        return buildMockResponse({ value: mockGoodsReceipts });
    }

    // Sales Orders
    if (ep.startsWith('orders')) {
        if (method.toLowerCase() === 'post') {
            const newDocNum = 30000 + Math.floor(Math.random() * 9999);
            return buildMockResponse({ DocEntry: 4001, DocNum: newDocNum, ...data });
        }
        return buildMockResponse({ value: [] });
    }

    // Business Partners (suppliers / clients)
    if (ep.startsWith('businesspartners')) {
        const search = params?.['$filter'] || '';
        const filtered = search
            ? mockBusinessPartners.filter(bp =>
                bp.CardName.toLowerCase().includes(search.toLowerCase()) ||
                bp.CardCode.toLowerCase().includes(search.toLowerCase()))
            : mockBusinessPartners;
        return buildMockResponse({ value: filtered });
    }

    // Inventory transfers / goods issues
    if (ep.startsWith('inventorytransferrequest') || ep.startsWith('goodsissue') || ep.startsWith('stocktransfer')) {
        if (method.toLowerCase() === 'post') {
            return buildMockResponse({ DocEntry: 5001, DocNum: 40001, ...data });
        }
        return buildMockResponse({ value: [] });
    }

    // Default: return empty success
    return buildMockResponse({ value: [] });
}

module.exports = { sapRequest };

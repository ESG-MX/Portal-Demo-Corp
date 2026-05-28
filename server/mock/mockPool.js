// Mock implementation of the mssql connection pool API.
// Replaces Azure SQL Server in demo/portfolio mode (USE_MOCK_DB=true).

const data = require('./mockData');

function resolveQuery(sqlText) {
    const q = sqlText.toLowerCase().trim();

    // Write operations (INSERT, UPDATE, DELETE, MERGE, ALTER, IF EXISTS…)
    const isWrite = /^\s*(insert|update|delete|merge|alter|if\s+(not\s+)?exists|if\s+exists|create\s+or\s+alter)/i.test(q);
    if (isWrite) {
        if (q.includes('output inserted')) {
            return { recordset: [{ id: Math.floor(Math.random() * 9000) + 1000 }], rowsAffected: [1] };
        }
        return { recordset: [], rowsAffected: [1] };
    }

    // Connectivity test
    if (q.includes('getdate') || q.match(/select\s+1\b/)) {
        return { recordset: [{ fechaServidor: new Date() }] };
    }

    // Schema introspection (initDb checks)
    if (q.includes('sys.columns') || q.includes('object_id')) {
        return { recordset: [{ column_id: 1 }] }; // pretend column already exists
    }

    // Auth / user role lookup
    if ((q.includes('from usuarios') || q.includes('from rols')) && !q.includes('usuario_almacenes')) {
        return { recordset: data.usuarios };
    }

    // User-warehouse access mapping
    if (q.includes('usuario_almacenes')) {
        return { recordset: data.usuarioAlmacenes };
    }

    // SAP user mapping (no real mappings in demo)
    if (q.includes('sapusermapping')) {
        return { recordset: [] };
    }

    // Almacenes (warehouses)
    if (q.includes('almacenes')) {
        return { recordset: data.almacenes };
    }

    // Sales items catalog (Ventas table, not recorded orders)
    if (q.includes('from dbo.ventas') || (q.includes('from ventas') && !q.includes('recorded_orders') && !q.includes('vista_relacion'))) {
        return { recordset: data.ventasItems };
    }

    // Recorded orders & daily relation view
    if (q.includes('recorded_orders') || q.includes('vista_relacion_diaria')) {
        return { recordset: data.recordedOrders };
    }

    // Physical inventory & theoretical stock views
    if (q.includes('inventario_fisico') || q.includes('view_inventario_teorico')) {
        return { recordset: data.inventarioFisico };
    }

    // Weekly comparative view
    if (q.includes('vista_comparativa')) {
        return { recordset: data.comparativoFisico };
    }

    // Inventory movements
    if (q.includes('movimientos_inventario')) {
        return { recordset: data.movimientosInventario };
    }

    // Raw items / product catalog
    if (q.includes('from dbo.items') || q.includes('from items')) {
        return { recordset: data.items };
    }

    // Item conversions
    if (q.includes('item_conversiones')) {
        return { recordset: [] };
    }

    // Diet catalog and warehouse-diet mapping
    if (q.includes('dietas_catalogo') || q.includes('almacen_dietas') || q.includes('dietas')) {
        return { recordset: data.dietas };
    }

    // Entry records / purchase history
    if (q.includes('registro_entradas')) {
        return { recordset: data.registroEntradas };
    }

    // Incidents
    if (q.includes('incidencias_header') || q.includes('incidencias_detail') || q.includes('incidencias_evidencia')) {
        if (q.includes('incidencias_detail')) return { recordset: data.incidenciasDetail };
        if (q.includes('incidencias_evidencia')) return { recordset: data.incidenciasEvidencia };
        return { recordset: data.incidenciasHeader };
    }

    // Audit global view
    if (q.includes('view_auditoria_global') || q.includes('auditoria')) {
        return {
            recordset: [
                ...data.usuarios.map(u => ({ Modulo: u.Modulo, Accion: u.Accion, ReferenciaID: u.ReferenciaID, Usuario: u.Usuario, Sucursal: u.Sucursal, Fecha: u.Fecha })),
            ]
        };
    }

    // Notifications
    if (q.includes('notificaciones')) {
        return { recordset: [] };
    }

    // Default
    return { recordset: [] };
}

function createRequest() {
    const req = {
        _inputs: {},
        input(name, type, value) {
            this._inputs[name] = value;
            return this;
        },
        async query(sqlText) {
            return resolveQuery(sqlText);
        },
        async execute(procName) {
            return { recordset: [], rowsAffected: [1] };
        }
    };
    return req;
}

const mockPool = {
    request: createRequest,
    connected: true,
};

// Mock sql types and classes (mirrors the mssql API surface used in repositories)
const sql = {
    VarChar:         'VarChar',
    NVarChar:        'NVarChar',
    Int:             'Int',
    BigInt:          'BigInt',
    Float:           'Float',
    Date:            'Date',
    DateTime:        'DateTime',
    DateTime2:       'DateTime2',
    Bit:             'Bit',
    UniqueIdentifier:'UniqueIdentifier',
    Decimal:         (p, s) => `Decimal(${p},${s})`,
    Numeric:         (p, s) => `Numeric(${p},${s})`,

    Transaction: class MockTransaction {
        constructor(pool) { this._pool = pool; }
        async begin()    {}
        async commit()   {}
        async rollback() {}
        request() { return createRequest(); }
    },

    Request: class MockRequest {
        constructor(transaction) { this._inputs = {}; }
        input(name, type, value) { this._inputs[name] = value; return this; }
        async query(sqlText)     { return resolveQuery(sqlText); }
        async execute(procName)  { return { recordset: [], rowsAffected: [1] }; }
    },

    ConnectionPool: class MockConnectionPool {
        constructor(config) {}
        connect() { return Promise.resolve(mockPool); }
    },
};

async function getConnection() {
    return mockPool;
}

module.exports = { sql, getConnection };

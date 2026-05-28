const sql_real = require('mssql');
require('dotenv').config();

// In demo/portfolio mode the app uses in-memory mock data instead of Azure SQL.
if (process.env.USE_MOCK_DB === 'true') {
    module.exports = require('../mock/mockPool');
    return;
}

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;

function getConnection() {
    if (!poolPromise) {
        poolPromise = new sql_real.ConnectionPool(dbConfig)
            .connect()
            .then(pool => {
                console.log('✅ Conectado a SQL Server (Pool Creado)');
                return pool;
            })
            .catch(err => {
                poolPromise = null;
                console.error('❌ Error creando el Pool de DB:', err.message);
                throw err;
            });
    }
    return poolPromise;
}

module.exports = { sql: sql_real, getConnection };

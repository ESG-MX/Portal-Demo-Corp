require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { getConnection } = require('./config/datab');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorMiddleware');
const { iniciarCronInventarios } = require('./cron/inventoryAlerts');
const initDb = require('./config/initDb');

const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- RUTAS API ---
app.use('/api/salidas',      require('./routes/salidas'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/auditoria',    require('./routes/auditoria'));
app.use('/api/consultas',    require('./routes/consultas'));
app.use('/api/entradas',     require('./routes/entradas'));
app.use('/api/entradascc',   require('./routes/entradascc'));
app.use('/api/incidencias',  require('./routes/incidencias.routes'));
app.use('/api/inventario',   require('./routes/inventario'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/reportes',     require('./routes/reportes'));
app.use('/api/user',         require('./routes/user.routes'));
app.use('/api/ventas',       require('./routes/ventas'));

app.use(errorHandler);

// --- FRONTEND ESTÁTICO ---
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, err => {
        if (err) {
            if (req.path.startsWith('/api')) {
                res.status(404).json({ success: false, message: 'API endpoint no encontrado' });
            } else {
                res.status(404).send('Frontend build missing');
            }
        }
    });
});

// --- INICIALIZACIÓN ---
async function probarConexion() {
    try {
        if (process.env.USE_MOCK_DB === 'true') {
            logger.info('🗄️  Modo demo activo — usando base de datos en memoria (mock)');
            return;
        }
        logger.info('Intentando conectar a SQL Server...');
        const pool = await getConnection();
        const result = await pool.request().query('SELECT GETDATE() as fechaServidor');
        logger.info('✅ CONEXIÓN EXITOSA DB. Fecha en servidor: ' + result.recordset[0].fechaServidor);
    } catch (error) {
        logger.error('❌ ERROR DE CONEXIÓN A DB: ' + error.message);
    }
}

probarConexion().then(() => initDb());
iniciarCronInventarios();

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    logger.info(`🚀 Servidor activo en puerto ${PORT}`);
    if (process.env.DEMO_MODE === 'true') {
        logger.info('🎭 DEMO_MODE=true — autenticación Azure AD deshabilitada');
    }
});

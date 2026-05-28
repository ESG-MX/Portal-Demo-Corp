const cron = require('node-cron');
const inventarioRepository = require('../repositories/inventarioRepository');
const { notificarSupervisoresWhs } = require('../services/notificacionesService');
const logger = require('../utils/logger');
const iniciarCronInventarios = () => {
    cron.schedule('0 8 * * *', async () => {
        logger.info('⏰ [CRON] Ejecutando escaneo de inventarios atrasados...');
        try {
            const almacenesAtrasados = await inventarioRepository.getAlmacenesConAtraso(7);
            if (almacenesAtrasados.length === 0) {
                logger.info('✅ [CRON] Todos los almacenes tienen su inventario al día (< 7 días).');
                return;
            }
            
            for (let almacen of almacenesAtrasados) {
                const diasMsg = almacen.dias_atraso === 999 
                    ? "nunca ha subido un Inventario Físico al sistema"
                    : `no ha subido un Inventario Físico en los últimos ${almacen.dias_atraso} días`;
                const titulo = `⚠️ Alerta de Inventario: ${almacen.whscode}`;
                const mensaje = `El almacén ${almacen.whscode} - ${almacen.whsdesc} ${diasMsg}. Por favor, requiera la actualización de stock.`;
                await notificarSupervisoresWhs(almacen.whscode, titulo, mensaje, '/inventario', 'warning');
            }
            logger.info(`✅ [CRON] Se enviaron alertas de atraso a ${almacenesAtrasados.length} almacenes.`);
        } catch (error) {
            logger.error(`❌ [CRON] Error escaneando inventarios atrasados: ${error.message}`);
        }
    });
    logger.info('✅ [CRON] Tarea programada: Alertas de Inventario Diario a las 08:00 AM.');
};
module.exports = { iniciarCronInventarios };

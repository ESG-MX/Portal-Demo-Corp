const inventarioRepository = require('../repositories/inventarioRepository');
const { notificarSupervisoresWhs } = require('../services/notificacionesService');
const asyncHandler = require('../utils/asyncHandler');
const { getStatusByHours } = require('../utils/semaforoLogic');
const AppError = require('../utils/appError');
const getInventarioData = asyncHandler(async (req, res) => {
    const { wh } = req.query; 
    const misAlmacenes = await inventarioRepository.getAlmacenesByUser(req.user);
    const currentWhCode = wh || (misAlmacenes.length > 0 ? misAlmacenes[0].whscode : null);
    let itemsParaContar = [];
    if (currentWhCode) {
        itemsParaContar = await inventarioRepository.getProductosByAlmacen(currentWhCode);
    }
    res.json({ almacenes: misAlmacenes, productos: itemsParaContar, almacenActivo: currentWhCode });
});
const guardarConteo = asyncHandler(async (req, res) => {
    const { almacen, conteos } = req.body;
    const { email } = req.user;
    if (!almacen || !conteos || conteos.length === 0) {
        throw new AppError("No hay datos para guardar", 400);
    }
    await inventarioRepository.saveConteo(almacen, conteos, email);
    await notificarSupervisoresWhs(
        almacen, 
        'Inventario Actualizado', 
        `El almacén ${almacen} ha finalizado la carga de su inventario físico.`, 
        '/inventario', 
        'success'
    );
    res.json({ success: true });
});

const getReporteSalud = asyncHandler(async (req, res) => {
    const almacenes = await inventarioRepository.getAlmacenesConAtraso();
    
    const dataConSemaforo = almacenes.map(row => ({
        ...row,
        semaforo: getStatusByHours(row.horas_atraso, 'INVENTARIO')
    })).sort((a, b) => b.semaforo.priority - a.semaforo.priority);

    res.json(dataConSemaforo);
});

module.exports = { getInventarioData, guardarConteo, getReporteSalud };
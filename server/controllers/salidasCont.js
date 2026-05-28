const salidasRepository = require('../repositories/salidasRepository');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { getStatusByHours } = require('../utils/semaforoLogic');

const getConsumoData = asyncHandler(async (req, res) => {
    const { wh } = req.query;
    const misAlmacenes = await salidasRepository.getAlmacenesByUser(req.user);
    const currentWhCode = wh || (misAlmacenes.length > 0 ? misAlmacenes[0].whscode : null);
    let itemsConStock = [];
    if (currentWhCode) {
        itemsConStock = await salidasRepository.getProductosConStock(currentWhCode);
    }
    res.json({ almacenes: misAlmacenes, productos: itemsConStock, almacenActivo: currentWhCode });
});

const guardarConsumo = asyncHandler(async (req, res) => {
    const { almacen, conteos, fecha } = req.body;
    if (!almacen || !conteos || conteos.length === 0) {
        throw new AppError("No hay datos para guardar", 400);
    }
    await salidasRepository.saveConsumo(almacen, conteos, req.user?.email, fecha);
    res.json({ success: true, message: "Consumo registrado correctamente" });
});

const getHistorial = asyncHandler(async (req, res) => {
    // req.query ahora contiene { page, limit, startDate, endDate, whsCode, estado }
    // enviados desde HistorialConsumo.jsx
    const historial = await salidasRepository.getHistorialConsumos(req.query);
    res.json(historial);
});

const getReporteSalud = asyncHandler(async (req, res) => {
    const almacenes = await salidasRepository.getConsumosConAtraso();
    
    const dataConSemaforo = almacenes.map(row => ({
        ...row,
        semaforo: getStatusByHours(row.horas_atraso, 'CONSUMO')
    })).sort((a, b) => b.semaforo.priority - a.semaforo.priority);

    res.json(dataConSemaforo);
});

module.exports = { getConsumoData, guardarConsumo, getHistorial, getReporteSalud };
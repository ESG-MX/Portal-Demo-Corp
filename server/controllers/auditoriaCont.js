const auditoriaRepository = require('../repositories/auditoriaRepository');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const auditoriaCont = {
    getLogs: asyncHandler(async (req, res) => {
        const logs = await auditoriaRepository.getTriggerLogs();
        res.json(logs);
    }),
    getComparativo: asyncHandler(async (req, res) => {
        const { wh } = req.query;
        const comparativo = await auditoriaRepository.getLiveComparison(wh);
        res.json(comparativo);
    }),
    getHistorial: asyncHandler(async (req, res) => {
        const { wh, searchDate, page, limit } = req.query;
        const result = await auditoriaRepository.getWeeklyHistory(
            wh, 
            searchDate, 
            parseInt(page) || 1, 
            parseInt(limit) || 50
        );
        res.json(result); 
    }),
    getFechasHistorial: asyncHandler(async (req, res) => {
        const { wh } = req.query; 
        const fechas = await auditoriaRepository.getDistinctClosureDates(wh); 
        res.json(fechas);
    }),
    ejecutarCierre: asyncHandler(async (req, res) => {
        const { wh } = req.body;
        if (!wh) {
            throw new AppError("Se requiere el código de almacén (wh) para el cierre.", 400);
        }
        await auditoriaRepository.executeWeeklyClosing(wh);
        res.json({ success: true, message: `Cierre para ${wh} ejecutado.` });
    })
};
module.exports = auditoriaCont;
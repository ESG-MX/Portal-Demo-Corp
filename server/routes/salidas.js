const express = require('express');
const router = express.Router();
const { validateUserWithGraph } = require('../middleware/auth');
const { rolePermissionMiddleware } = require('../middleware/rolePermissionMiddleware');
const salidasCont = require('../controllers/salidasCont'); 
router.use(validateUserWithGraph);
router.use(rolePermissionMiddleware);
router.get('/test', (req, res) => {
    res.json({ message: "Ruta de Salidas funcionando" });
});
router.get('/data', salidasCont.getConsumoData);
router.get('/historial', salidasCont.getHistorial);
router.get('/reporte-salud', salidasCont.getReporteSalud);
router.post('/guardar', salidasCont.guardarConsumo);
module.exports = router;
const express = require('express');
const router = express.Router();

const { 
    validateUserWithGraph, 
    authorize 
} = require('../middleware/auth');

const { 
    getStockActual, 
    getComparativoFisico, 
    getDatosParaReporte,
    generarReporteM365 
} = require('../controllers/consultasCont');

router.use(validateUserWithGraph);

router.get('/test', (req, res) => {
    res.json({ message: "Ruta de Consultas funcionando" });
});

router.get('/stock', getStockActual);
router.get('/comparativo', getComparativoFisico);

router.post('/datos-reporte', authorize ('user'), getDatosParaReporte);
router.post('/generar-reporte-m365', authorize ('user'), generarReporteM365);

module.exports = router;
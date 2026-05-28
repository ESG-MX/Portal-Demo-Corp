const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { validateUserWithGraph, authorize } = require('../middleware/auth');

router.use(validateUserWithGraph);

router.get('/auditoria-global', authorize('admin'), reportesController.getAuditoriaGlobal);
router.get('/usuarios-activos', authorize('admin'), reportesController.getUsuariosActivos);
router.get('/detalle', authorize('admin'), reportesController.getDetalle);
router.get('/movimientos-historico', reportesController.getMovimientosHistorico);

module.exports = router;

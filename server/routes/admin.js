const express = require('express');
const router = express.Router();
const adminCont = require('../controllers/adminCont');
const { validateUserWithGraph, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- CONFIGURACIÓN DE MULTER PARA ALTA VELOCIDAD EN AZURE ---
const isAzure = process.env.REGION_NAME || process.env.WEBSITE_SITE_NAME;
// En Azure usamos una ruta fuera de wwwroot para evitar el error de "Solo Lectura"
const uploadDir = isAzure ? '/home/site/uploads' : path.join(__dirname, '../uploads');

// Creamos la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });
// -----------------------------------------------------------

router.use(validateUserWithGraph);

router.get('/items-raw', authorize('admin', 'manager', 'mc', 'mp'), adminCont.getRawItems);
router.get('/items-pax', authorize('admin', 'manager', 'mc', 'mp'), adminCont.getPaxItems);
router.get('/users', authorize('admin', 'mc'), adminCont.getUsers);
router.get('/almacenes', authorize('admin', 'mc', 'mp'), adminCont.getAlmacenes); 
router.get('/user-warehouses', authorize('admin', 'mc'), adminCont.getUserWhs);
router.get('/inventory-comparison', authorize('manager'), adminCont.getComparison);
router.get('/dietas', authorize('mp', 'admin'), adminCont.getDietas);
router.get('/whs-dietas', authorize('mp', 'admin'), adminCont.getWhsDietas);

router.put('/items-raw/:id', authorize('admin', 'mc', 'mp'), adminCont.updateRawItem);
router.put('/items-pax-detail/:id', authorize('mp', 'admin'), adminCont.togglePaxDetail);

router.post('/items-pax', authorize('admin'), adminCont.createPaxItem);
router.post('/users', authorize('admin', 'mc'), adminCont.createUser);
router.post('/user-warehouses', authorize('admin', 'mc'), adminCont.addUserWhs);
router.post('/inventory-closing', authorize('admin'), adminCont.executeClosing);
router.post('/dietas', authorize('mp', 'admin'), adminCont.createDieta);
router.put('/users/:id', authorize('admin', 'mc'), adminCont.updateUserRole);
router.put('/items-pax/:id', authorize('admin'), adminCont.updatePaxPrice);
router.post('/whs-dietas', authorize('mp', 'admin'), adminCont.manageWhsDieta);

// Ruta que usa Multer
router.post('/upload-items-csv', authorize('admin', 'comp', 'mc', 'mp'), upload.single('file'), adminCont.uploadItemsCSV);

router.delete('/items-pax/:id', authorize('admin'), adminCont.deletePaxItem);
router.delete('/users/:id', authorize('admin'), adminCont.deleteUser);
router.delete('/user-warehouses/:id', authorize('admin'), adminCont.deleteUserWhs);
router.delete('/dietas/:id', authorize('mp', 'admin'), adminCont.deleteDieta);

module.exports = router;
const adminRepository = require('../repositories/adminRepository');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const fs = require('fs');
const csv = require('csv-parser');

const adminCont = {
    getRawItems: asyncHandler(async (req, res) => {
        const items = await adminRepository.getAllRawItems();
        res.json(items);
    }),
    updateRawItem: asyncHandler(async (req, res) => {
        const { id } = req.params;
        await adminRepository.updateRawItem(id, req.body);
        res.json({ message: "Item actualizado correctamente" });
    }),

    getAlmacenes: asyncHandler(async (req, res) => {
        const almacenes = await adminRepository.getAllAlmacenes();
        res.json(almacenes);
    }),
    getUserWhs: asyncHandler(async (req, res) => {
        const accesos = await adminRepository.getAllUserAccess();
        res.json(accesos);
    }),
    addUserWhs: asyncHandler(async (req, res) => {
        const { email, whscode } = req.body;
        const existe = await adminRepository.checkUserAccessExists(email, whscode);
        if (existe) {
            throw new AppError("Este acceso ya existe.", 400);
        }
        await adminRepository.grantUserAccess(email, whscode);
        res.json({ message: "Acceso asignado" });
    }),
    deleteUserWhs: asyncHandler(async (req, res) => {
        const { id } = req.params;
        await adminRepository.revokeUserAccess(id);
        res.json({ message: "Acceso eliminado" });
    }),
    getPaxItems: asyncHandler(async (req, res) => {
        const items = await adminRepository.getAllPaxItems();
        res.json(items);
    }),
    createPaxItem: asyncHandler(async (req, res) => {
        const { ItemCode, ItemName, Price, CardCode, CardName, WhsCodes } = req.body;
        await adminRepository.createPaxItemsBatch(ItemCode, ItemName, Price, CardCode, CardName, WhsCodes);
        res.json({ message: `Se registraron ${WhsCodes.length} productos correctamente.` });
    }),
    updatePaxPrice: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { Price } = req.body;
        await adminRepository.updatePaxItemPrice(id, Price);
        res.json({ message: "Precio actualizado" });
    }),
    deletePaxItem: asyncHandler(async (req, res) => {
        const { id } = req.params;
        await adminRepository.deletePaxItem(id);
        res.json({ message: "Producto eliminado" });
    }),
    getComparison: asyncHandler(async (req, res) => {
        const comparison = await adminRepository.getInventoryComparison();
        res.json(comparison);
    }),
    executeClosing: asyncHandler(async (req, res) => {
        await adminRepository.executeWeeklyClosing();
        res.json({ message: "Cierre exitoso: Datos guardados en Historial_Inventarios" });
    }),
    getUsers: asyncHandler(async (req, res) => {
        const users = await adminRepository.getAllUsers();
        res.json(users);
    }),
    createUser: asyncHandler(async (req, res) => {
        const { email, rol } = req.body;
        const existe = await adminRepository.checkUserExists(email);
        if (existe) {
            throw new AppError("El usuario ya está registrado", 400);
        }
        await adminRepository.createUser(email, rol);
        res.json({ message: "Usuario agregado correctamente" });
    }),
    deleteUser: asyncHandler(async (req, res) => {
        const { id } = req.params;
        await adminRepository.deleteUser(id);
        res.json({ message: "Usuario eliminado" });
    }),
    updateUserRole: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { rol } = req.body;
        await adminRepository.updateUserRole(id, rol);
        res.json({ message: "Rol de usuario actualizado" });
    }),
    getDietas: asyncHandler(async (req, res) => {
        const dietas = await adminRepository.getDietas();
        res.json(dietas);
    }),
    createDieta: asyncHandler(async (req, res) => {
        await adminRepository.createDieta(req.body.NombreDieta);
        res.json({ message: "Dieta creada" });
    }),
    getWhsDietas: asyncHandler(async (req, res) => {
        const mapping = await adminRepository.getWhsDietas();
        res.json(mapping);
    }),
    togglePaxDetail: asyncHandler(async (req, res) => {
        await adminRepository.togglePaxDetail(req.params.id, req.body.status);
        res.json({ message: "Estado de detalle actualizado" });
    }),
    manageWhsDieta: asyncHandler(async (req, res) => {
        const { whscode, dietaId, action } = req.body; // action: 'add' | 'remove'
        if (action === 'add') await adminRepository.assignDietaToWhs(whscode, dietaId);
        else await adminRepository.removeDietaFromWhs(whscode, dietaId);
        res.json({ message: "Mapeo actualizado" });
    }),

    deleteDieta: asyncHandler(async (req, res) => {
        const { id } = req.params;
        await adminRepository.deleteDietaCompleta(id);
        res.json({ success: true, message: "Dieta eliminada correctamente" });
    }),

    uploadItemsCSV: asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new AppError("No se ha subido ningún archivo CSV.", 400);
        }

        const results = [];
        const filePath = req.file.path;

        // Detectamos si el CSV usa coma o punto y coma leyendo la primera línea
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const firstLine = fileContent.split('\n')[0];
        const separator = firstLine.includes(';') ? ';' : ',';

         const readCSV = () => new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({
                    separator: separator,
                    mapHeaders: ({ header }) => header.toLowerCase().trim()
                }))
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => resolve());
        });

        await readCSV();

        if (results.length === 0) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            throw new AppError("El archivo CSV está vacío o no tiene el formato correcto.", 400);
        }

        try {
            await adminRepository.bulkUpdateItemsFromCSV(results);

            fs.unlinkSync(filePath);

            res.json({ 
                success: true, 
                message: `Se procesaron ${results.length} artículos correctamente.` 
            });
        } catch (error) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            throw new AppError("Error al actualizar los items: " + error.message, 500);
        }
    })
};

module.exports = adminCont;

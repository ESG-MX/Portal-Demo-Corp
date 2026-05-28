const incidenciasRepository = require('../repositories/incidenciasRepository');
const { sapRequest } = require('../services/sapService');
const { uploadBlob } = require('../services/azureBlobService');
const { notificarSupervisoresWhs } = require('../services/notificacionesService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const crearIncidencia = asyncHandler(async (req, res) => {
    const { 
        proveedorId, proveedorNombre, poNumber, docEntry,
        facturaUUID, almacen, tipoIncidencia, accion, descripcion,
        articulos 
    } = req.body;
    const creadoPor = req.user.email;
    const archivos = req.files || []; 
    let parsedArticulos = [];
    if (articulos && typeof articulos === 'string') {
        parsedArticulos = JSON.parse(articulos);
    } else if (Array.isArray(articulos)) {
        parsedArticulos = articulos;
    }
    const mappedTipo = Array.isArray(tipoIncidencia) 
        ? tipoIncidencia.map(t => typeof t === 'object' ? t.value : t).join(', ') 
        : tipoIncidencia;
    const mappedAccion = Array.isArray(accion) 
        ? accion.map(a => typeof a === 'object' ? a.value : a).join(', ') 
        : accion;
    if (!creadoPor || !proveedorId || !poNumber || !mappedTipo || !mappedAccion || parsedArticulos.length === 0) {
        throw new AppError("Faltan datos obligatorios o artículos.", 400);
    }
    const existingIncidencia = await incidenciasRepository.getIncidenciaByPO(poNumber);
    if (existingIncidencia) {
        throw new AppError("Ya existe un reporte de incidencia asociado a esta Orden de Compra/PO.", 400);
    }
    const uploadPromises = archivos.map(async (file) => {
        try {
            return await uploadBlob(file.originalname, file.buffer, file.mimetype);
        } catch (azureErr) {
            console.error("Error subiendo foto:", azureErr);
            return null;
        }
    });
    const blobUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);

    // Mapeo estricto para asegurar que las llaves coincidan con el repositorio y evitar el error "Precio Factura"
    const articulosMapeados = parsedArticulos.map(art => ({
        ItemCode: art.ItemCode || art.itemCode,
        ItemName: art.ItemName || art.itemName,
        CantidadAfectada: art.CantidadAfectada || art.cantidadAfectada,
        CantidadOriginal: art.CantidadOriginal || art.cantidadOriginal || 0,
        PrecioPO: art.PrecioPO || art.precioPO || 0,
        PrecioFactura: art.PrecioFactura || art.precioFactura || art["Precio Factura"] || 0
    }));

    const headerData = { 
        creadoPor, proveedorId, proveedorNombre, poNumber, facturaUUID, almacen, 
        tipoIncidencia: mappedTipo, 
        accion: mappedAccion, 
        descripcion 
    };
    const historyData = { usuario: creadoPor, rol: 'Sistema', comentario: 'Incidencia creada en el sistema.' };
    const incidenciaId = await incidenciasRepository.createIncidencia(headerData, articulosMapeados, blobUrls, historyData);
    if (docEntry) {
        try {
            await sapRequest('PATCH', `PurchaseOrders(${docEntry})`, {
                U_NumIncidencia: incidenciaId.toString()
            });
            console.log(`✅ [SAP B1] Orden de Compra (DocEntry: ${docEntry}) actualizada con Incidencia # ${incidenciaId}`);
        } catch (sapError) {
            console.error("❌ Error al inyectar en SAP B1:", sapError.response?.data?.error?.message?.value || sapError.message);
        }
    }
    res.status(201).json({
        mensaje: "Incidencia creada correctamente",
        incidenciaId,
    });
    await notificarSupervisoresWhs(
        almacen,
        'Nueva Incidencia Reportada',
        `Se ha reportado una incidencia (${tipoIncidencia}) en el almacén ${almacen} para el PO #${poNumber}.`,
        '/incidencias',
        'warning'
    );
});
const obtenerIncidencias = asyncHandler(async (req, res) => {
    try {
        const permissions = {
            ...req.permissions,
            role: req.user?.role
        };
        const incidencias = await incidenciasRepository.getAllIncidencias(req.query, permissions);
        res.json(incidencias);
    } catch (err) {
        console.error("❌ Error en obtenerIncidencias:", err);
        res.status(500).json({ mensaje: "Error interno al obtener incidencias", error: err.message });
    }
});
const obtenerIncidenciaPorId = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidencia = await incidenciasRepository.getIncidenciaFullById(id);
    if (!incidencia) {
        throw new AppError("Incidencia no encontrada", 404);
    }
    res.json(incidencia);
});
const actualizarSeguimiento = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nuevoEstado, comentario } = req.body;
    const { email: usuario, role: rol } = req.user;
    if (!usuario || !rol) {
        throw new AppError("Usuario y rol son requeridos para el seguimiento.", 400);
    }
    const estadoFinal = await incidenciasRepository.updateSeguimiento(id, usuario, rol, nuevoEstado, comentario);
    if (estadoFinal === null) {
        throw new AppError("Incidencia no encontrada.", 404);
    }
    res.json({ mensaje: "Seguimiento actualizado correctamente", estadoActual: estadoFinal });
});
const eliminarIncidencia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await incidenciasRepository.deleteIncidencia(id);
    res.json({ mensaje: "Incidencia eliminada correctamente" });
});
module.exports = {
    crearIncidencia,
    obtenerIncidencias,
    obtenerIncidenciaPorId,
    actualizarSeguimiento,
    eliminarIncidencia
};

const axios = require('axios');
const consultasRepository = require('../repositories/consultasRepository');
const asyncHandler = require('../utils/asyncHandler');
const { obtenerUrlSegura } = require('../utils/azureHelper');

const getStockActual = asyncHandler(async (req, res) => {
    const stock = await consultasRepository.getStockActual();
    res.json(stock);
});

const getComparativoFisico = asyncHandler(async (req, res) => {
    const data = await consultasRepository.getComparativoFisico();
    res.json(data);
});

// Esta función es la que el portal usa para el Modal de Detalle
const getDatosParaReporte = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const data = await consultasRepository.getDetalleIncidenciasPorIds([id]);

    if (!data.incidencias || data.incidencias.length === 0) {
        return res.status(404).json({ message: "No encontrada" });
    }

    const inc = data.incidencias[0];
    const respuesta = {
        ...inc,
        articulos: data.articulos.filter(a => a.IncidenciaId === inc.Id),
        evidencia: data.evidencias.filter(e => e.IncidenciaId === inc.Id).map(e => ({
            ...e,
            BlobUrl: obtenerUrlSegura(e.BlobUrl)
        })),
        historial: data.historial ? data.historial.filter(h => h.IncidenciaId === inc.Id) : []
    };

    res.json(respuesta);
});

// FUNCIÓN MAESTRA: GENERACIÓN DE REPORTES A SHAREPOINT (4 FOTOS)
const generarReporteM365 = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const POWER_AUTOMATE_URL = process.env.POWER_AUTOMATE_URL;

    console.log(`[INICIO] Petición masiva recibida para ${ids?.length} incidencias.`);

    if (!ids || ids.length === 0) return res.status(400).json({ message: "No IDs provided" });
    if (!POWER_AUTOMATE_URL) return res.status(500).json({ error: "Falta configuración de URL" });

    // 1. Obtener toda la data de SQL de un solo golpe
    const data = await consultasRepository.getDetalleIncidenciasPorIds(ids);

    // 2. Responder 202 al frontend INMEDIATAMENTE (Soluciona el error 504)
    res.status(202).json({ 
        message: `Se está procesando la generación masiva. Revisa la carpeta de SharePoint en unos minutos.` 
    });

    // 3. Procesamiento en segundo plano (Fire and Forget)
    // Función auxiliar interna para descargar fotos
    const prepararFotoBase64 = async (fotoObj) => {
        const pixelTransparente = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        if (!fotoObj || !fotoObj.BlobUrl) {
            return { "$content-type": "image/png", "$content": pixelTransparente };
        }
        try {
            const urlSegura = obtenerUrlSegura(fotoObj.BlobUrl);
            const imgRes = await axios.get(urlSegura, { responseType: 'arraybuffer', timeout: 10000 });
            const base64 = Buffer.from(imgRes.data, 'binary').toString('base64');
            const type = fotoObj.BlobUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
            return { "$content-type": type, "$content": base64 };
        } catch (e) {
            console.error(`⚠️ Error al procesar imagen: ${e.message}`);
            return { "$content-type": "image/png", "$content": pixelTransparente };
        }
    };

    // Bucle asíncrono para enviar a Microsoft
    for (const inc of data.incidencias) {
        try {
            const susArticulos = data.articulos
                .filter(a => a.IncidenciaId === inc.Id)
                .map(a => ({
                    NombreArt: String(a.ItemName || "N/A").replace(/"/g, "'"),
                    CantOrig: parseFloat(a.CantidadOriginal || 0),
                    CantAfec: parseFloat(a.CantidadAfectada || 0),
                    PrecioPO: parseFloat(a.PrecioPO || 0),
                    PrecFact: parseFloat(a.PrecioFactura || 0)
                }));

            const evidenciasInc = data.evidencias.filter(e => e.IncidenciaId === inc.Id);

            // Descargamos las 4 fotos en paralelo para esta incidencia
            const [f1, f2, f3, f4] = await Promise.all([
                prepararFotoBase64(evidenciasInc[0]),
                prepararFotoBase64(evidenciasInc[1]),
                prepararFotoBase64(evidenciasInc[2]),
                prepararFotoBase64(evidenciasInc[3])
            ]);

            const payload = {
                ID: `INC-${inc.Id}`,
                Proveedor: String(inc.ProveedorNombre || "N/A"),
                OrdenSAP: String(inc.PONumber || "N/A"),
                Tipo: String(inc.TipoIncidencia || "General"),
                Fecha: inc.FechaCreacion ? new Date(inc.FechaCreacion).toLocaleDateString('es-MX') : 'S/F',
                Descripcion: String(inc.Descripcion || "Sin descripción").replace(/\n/g, " "),
                Articulos: susArticulos,
                Foto1: f1,
                Foto2: f2,
                Foto3: f3,
                Foto4: f4
            };

            // Envío a Power Automate
            await axios.post(POWER_AUTOMATE_URL, payload, { timeout: 30000 });
            console.log(`✅ Reporte INC-${inc.Id} enviado con éxito a SharePoint.`);

        } catch (err) {
            console.error(`❌ Error enviando INC-${inc.Id}:`, err.response?.data || err.message);
        }
    }
});

module.exports = { 
    getStockActual, 
    getComparativoFisico, 
    getDatosParaReporte,
    generarReporteM365 
};
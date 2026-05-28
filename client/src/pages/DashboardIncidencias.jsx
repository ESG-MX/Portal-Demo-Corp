import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/features/LoadingSpinner';
import { toast } from 'sonner';

const DashboardIncidencias = () => {
    // --- ESTADOS Y HOOKS ---
    const { userProfile, authFetch } = useAuth();
    const usuarioActual = userProfile;
    
    const [incidencias, setIncidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState({ estado: '', fechaInicio: '', fechaFin: '' });
    
    // Estados para el Modal de Detalle
    const [modalOpen, setModalOpen] = useState(false);
    const [incidenciaSel, setIncidenciaSel] = useState(null);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState('');

    // --- ESTADOS PARA SELECCIÓN MÚLTIPLE Y PROCESAMIENTO ---
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // --- CARGA DE DATOS ---
    const cargarIncidencias = async () => {
        if (!authFetch) return;
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtros.estado) params.append('estado', filtros.estado);
            
            const res = await authFetch.get(`/api/incidencias?${params.toString()}`);
            setIncidencias(Array.isArray(res.data) ? res.data : []);
            setSelectedIds([]); // Limpiar selección al filtrar o recargar
            setError(null);
        } catch (error) {
            console.error('Error cargando incidencias', error);
            setError('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarIncidencias();
    }, [filtros.estado, authFetch]);

    // --- LÓGICA DE SELECCIÓN ---
    const handleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === incidencias.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(incidencias.map(inc => inc.Id));
        }
    };

    // --- LÓGICA DE GENERACIÓN MASIVA (M365 / SHAREPOINT) ---
    const handleBatchDownload = async () => {
        if (selectedIds.length === 0) return toast.error("Seleccione al menos una incidencia");
        
        setIsDownloading(true);
        const toastId = toast.loading(`Iniciando generación de ${selectedIds.length} reportes en SharePoint...`);

        try {
            // Llamamos al nuevo endpoint que conecta con Power Automate
            const response = await authFetch.post('/api/consultas/generar-reporte-m365', { 
                ids: selectedIds 
            });

            // Mostramos éxito con el mensaje que viene del servidor
            toast.success(response.data.message || "Proceso enviado a SharePoint con éxito", { 
                id: toastId,
                duration: 6000 
            });

            setSelectedIds([]); // Limpiar selección tras éxito
        } catch (error) {
            console.error("Error al procesar reportes:", error);
            toast.error("Error al conectar con el servicio de reportes masivos", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    // --- DETALLE Y SEGUIMIENTO ---
    const abrirDetalle = async (id) => {
        if (!authFetch) return;
        try {
            const res = await authFetch.get(`/api/incidencias/${id}`);
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            
            if (data) {
                setIncidenciaSel(data);
                setNuevoEstado(data.Estado);
                setModalOpen(true);
            } else {
                toast.error("No se encontró el detalle");
            }
        } catch (error) {
            console.error('Error detalle:', error);
            toast.error("Error al obtener información");
        }
    };

    const guardarSeguimiento = async () => {
        if (!nuevoComentario?.trim() && nuevoEstado === incidenciaSel.Estado) return;
        if (!authFetch) return;

        try {
            await authFetch.patch(`/api/incidencias/${incidenciaSel.Id}/seguimiento`, {
                usuario: usuarioActual?.email || 'admin@bersa.com',
                rol: usuarioActual?.role || 'Admin',
                nuevoEstado: nuevoEstado,
                comentario: nuevoComentario
            });
            setNuevoComentario('');
            await abrirDetalle(incidenciaSel.Id);
            cargarIncidencias();
            toast.success("Seguimiento actualizado");
        } catch (error) {
            toast.error('Error al guardar seguimiento');
        }
    };

    const eliminarIncidencia = () => {
        toast('¿Eliminar incidencia permanentemente?', {
            action: {
                label: 'Confirmar',
                onClick: async () => {
                    try {
                        await authFetch.delete(`/api/incidencias/${incidenciaSel.Id}`);
                        setModalOpen(false);
                        cargarIncidencias();
                        toast.success('Incidencia eliminada');
                    } catch (error) {
                        toast.error('Error al eliminar');
                    }
                }
            }
        });
    };

    const colorEstado = (estado) => {
        switch(estado) {
            case 'Pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Resuelto': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-azul-bersa p-4 md:p-10 font-sans text-white">
            <div className="max-w-full mx-auto px-2 md:px-8">
                
                {/* HEADER CON BOTONES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Panel de <span className="text-naranja-bersa">Incidencias</span></h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botón de Generación Masiva a SharePoint */}
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={handleBatchDownload}
                                disabled={isDownloading}
                                className="bg-naranja-bersa hover:bg-violet-700 text-white px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {isDownloading ? 'Procesando...' : `Generar Reportes (${selectedIds.length})`}
                            </button>
                        )}

                        <select
                            className="px-6 py-3.5 bg-white rounded-2xl font-black text-[11px] text-azul-bersa shadow-xl outline-none uppercase tracking-widest cursor-pointer"
                            value={filtros.estado}
                            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                        >
                            <option value="">TODOS LOS ESTADOS</option>
                            <option value="Pendiente">PENDIENTES</option>
                            <option value="En Proceso">EN PROCESO</option>
                            <option value="Resuelto">RESUELTOS</option>
                        </select>
                    </div>
                </div>

                {/* TABLA PRINCIPAL */}
                {loading ? <LoadingSpinner text="Cargando Incidencias..." /> : (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-naranja-bersa">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 accent-azul-bersa cursor-pointer"
                                            onChange={handleSelectAll}
                                            checked={incidencias.length > 0 && selectedIds.length === incidencias.length}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-white uppercase tracking-widest">ID</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-white uppercase tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-white uppercase tracking-widest">Proveedor / PO</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-black text-white uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-black text-white uppercase tracking-widest">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {incidencias.map((inc) => (
                                    <tr key={inc.Id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-gray-300 accent-naranja-bersa cursor-pointer"
                                                checked={selectedIds.includes(inc.Id)}
                                                onChange={() => handleSelect(inc.Id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-black text-azul-bersa border-l-[6px] border-transparent group-hover:border-naranja-bersa">#INC-{inc.Id}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                            {inc.FechaCreacion ? new Date(inc.FechaCreacion).toLocaleDateString() : 'S/F'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-azul-bersa uppercase">{inc.ProveedorNombre}</div>
                                            <div className="text-xs font-semibold text-gray-500">PO: {inc.PONumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-[10px] uppercase font-black rounded-full border ${colorEstado(inc.Estado)}`}>
                                                {inc.Estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => abrirDetalle(inc.Id)} className="bg-azul-bersa text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm hover:bg-slate-800">ABRIR</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLE / SIDEBAR */}
            {modalOpen && incidenciaSel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-7xl h-full max-h-[92vh] md:rounded-[2.5rem] shadow-2xl flex flex-col text-gray-800 animate-in zoom-in-95 duration-500 overflow-hidden">
                        
                        {/* Header del Modal */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-azul-bersa tracking-tight">#INC-{incidenciaSel.Id}</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seguimiento de Incidencia</p>
                            </div>
                            <button 
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Cuerpo del Modal */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            
                            {/* Información General */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-naranja-bersa uppercase">Proveedor</p>
                                    <p className="font-bold text-azul-bersa leading-tight">{incidenciaSel.ProveedorNombre}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-naranja-bersa uppercase">Almacén</p>
                                    <p className="font-bold text-azul-bersa">{incidenciaSel.Almacen || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-naranja-bersa uppercase">Orden SAP (PO)</p>
                                    <p className="font-bold text-azul-bersa font-mono">#{incidenciaSel.PONumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-naranja-bersa uppercase">Estado Actual</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border ${colorEstado(incidenciaSel.Estado)}`}>
                                        {incidenciaSel.Estado}
                                    </span>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descripción del Hallazgo</p>
                                <p className="text-sm font-medium italic text-gray-600">"{incidenciaSel.Descripcion || 'Sin descripción'}"</p>
                            </div>

                            {/* Evidencias (Fotos) */}
                            {(incidenciaSel.evidencia || incidenciaSel.evidencias) && (
                                <div>
                                    <p className="text-[10px] font-black text-azul-bersa uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-naranja-bersa rounded-full"></span> Evidencias Fotográficas
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(incidenciaSel.evidencia || incidenciaSel.evidencias || []).map((foto, i) => {
                                            const url = typeof foto === 'string' ? foto : foto.BlobUrl;
                                            if (!url) return null;
                                            return (
                                                <div key={i} className="relative group aspect-video overflow-hidden rounded-2xl bg-gray-100 border border-gray-100 shadow-sm">
                                                    <img 
                                                        src={url} 
                                                        alt={`Evidencia ${i + 1}`} 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
                                                        onClick={() => window.open(url, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Listado de Artículos */}
                            <div>
                                <p className="text-[10px] font-black text-azul-bersa uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-naranja-bersa rounded-full"></span> Artículos Afectados
                                </p>
                                <div className="space-y-2">
                                    {incidenciaSel.articulos?.map((art, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-azul-bersa uppercase leading-none">{art.ItemName}</p>
                                                <p className="text-[9px] font-bold text-gray-400 font-mono mt-1">{art.ItemCode}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-naranja-bersa uppercase">Cantidad</p>
                                                <p className="text-sm font-black text-azul-bersa">{art.CantidadAfectada}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Panel de Seguimiento / Actualización */}
                            <div className="border-t border-gray-100 pt-8 space-y-4">
                                <p className="text-[10px] font-black text-azul-bersa uppercase tracking-widest">Actualizar Estatus</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <select 
                                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-black border-none outline-none focus:ring-2 focus:ring-azul-bersa/20"
                                        value={nuevoEstado}
                                        onChange={(e) => setNuevoEstado(e.target.value)}
                                    >
                                        <option value="Pendiente">PENDIENTE</option>
                                        <option value="En Proceso">EN PROCESO</option>
                                        <option value="Resuelto">RESUELTO</option>
                                    </select>
                                    <button 
                                        onClick={guardarSeguimiento}
                                        className="bg-azul-bersa text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                                <textarea 
                                    placeholder="Agregar un comentario al historial..."
                                    className="w-full p-6 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-azul-bersa/20 resize-none h-24"
                                    value={nuevoComentario}
                                    onChange={(e) => setNuevoComentario(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer del Modal */}
                        <div className="p-6 border-t border-gray-100 flex justify-between bg-gray-50/30">
                            <button onClick={eliminarIncidencia} className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all">Eliminar Reporte</button>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white px-4 py-2 rounded-xl border border-transparent hover:border-gray-200 transition-all">Cerrar Detalle</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardIncidencias;
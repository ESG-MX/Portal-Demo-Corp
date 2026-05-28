import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth'; 
import { useAdmin } from '../../../hooks/useAdmin';
import LoadingSpinner from '../LoadingSpinner';
import { toast } from 'sonner';
import { X, Save, ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function ItemsTab({ role }) {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false); // Estado para la carga del CSV
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState([]); // Arreglo de IDs expandidos
    const [tempItems, setTempItems] = useState({}); // Mapa de datos: { [itemcode]: data }
    const { authFetch, userProfile } = useAuth(); 
    const { updateItem, items: adminItems, setItems: setAdminItems } = useAdmin();

    const currentRole = role || userProfile?.role;
    const canEdit = ['admin', 'mc', 'mp'].includes(currentRole?.toLowerCase());
    const canUpload = ['admin', 'comp', 'mp', 'mc'].includes(currentRole?.toLowerCase());

    // Función para obtener datos (memorizada para reusarla tras subir el CSV)
    const fetchData = useCallback(async () => {
        if (!authFetch) return; 
        setLoading(true);
        try {
            const res = await authFetch.get('/api/admin/items-raw');
            setAdminItems(Array.isArray(res.data) ? res.data : []);
            setLoading(false);
        } catch (err) {
            console.error("Error en ItemsTab:", err);
            setError(err.response?.data?.message || "No tienes permisos para acceder a esta información.");
            setLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Función para manejar la subida del CSV
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const confirmBox = window.confirm("¿Deseas actualizar masivamente los precios y descripciones desde este CSV?");
        if (!confirmBox) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await authFetch.post('/api/admin/upload-items-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("✅ Catálogo actualizado correctamente.");
            fetchData(); // Recargar la tabla automáticamente
        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            setUploading(false);
            e.target.value = null; // Limpiar el input
        }
    };

    const toggleExpand = (item) => {
        setExpandedIds(prev => 
            prev.includes(item.itemcode) 
                ? prev.filter(id => id !== item.itemcode) 
                : [...prev, item.itemcode]
        );

        setTempItems(prev => {
            const next = { ...prev };
            if (next[item.itemcode]) {
                delete next[item.itemcode];
            } else {
                next[item.itemcode] = { ...item };
            }
            return next;
        });
    };

    const handleSaveAll = async () => {
        const itemsToSave = Object.values(tempItems);
        if (itemsToSave.length === 0) return;

        setLoading(true);
        try {
            for (const item of itemsToSave) {
                await updateItem(item.itemcode, item);
            }
            setExpandedIds([]);
            setTempItems({});
            toast.success(`Se actualizaron ${itemsToSave.length} productos con éxito`);
        } catch (err) {
            toast.error("Error al procesar el guardado masivo");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = (Array.isArray(adminItems) ? adminItems : []).filter(it => 
        it.itemcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (error) return (
        <div className="p-20 text-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl inline-block shadow-lg border border-red-100">
                <h4 className="font-black text-lg mb-2 uppercase italic tracking-tighter">Acceso Restringido</h4>
                <p className="text-sm opacity-80 font-bold">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
                <div>
                    <h3 className="text-azul-bersa font-black uppercase text-xl tracking-tight">Inventario Items (Materia Prima)</h3>
                    <div className="relative mt-3">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Buscar por código o descripción técnica..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-azul-bersa outline-none w-full lg:w-96 transition-all shadow-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        {/* BOTÓN DE CARGA CSV (Solo admin y comp) */}
                        {canUpload && (
                            <label className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-sm active:scale-95
                                ${uploading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-naranja-bersa text-white hover:bg-violet-700'}
                            `}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {uploading ? 'Procesando CSV...' : 'Actualizar Precios (CSV)'}
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    className="hidden" 
                                    onChange={handleFileUpload} 
                                    disabled={uploading}
                                />
                            </label>
                        )}
                        
                        <span className="text-[9px] bg-azul-bersa/10 px-4 py-2.5 rounded-xl text-azul-bersa font-black tracking-widest uppercase flex items-center">
                            Acceso: {role?.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mr-2 tracking-tighter">Total: {filteredItems.length} registros</p>
                    
                    {/* BOTÓN DE GUARDADO MASIVO */}
                    {Object.keys(tempItems).length > 0 && (
                        <button 
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all animate-in zoom-in duration-300 flex items-center gap-2"
                        >
                            <Save size={16} />
                            Guardar {Object.keys(tempItems).length} Cambios
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 text-azul-bersa/50 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                            <th className="px-6 py-5 w-10"></th>
                            <th className="px-6 py-4">Código Interno</th>
                            <th className="px-6 py-4">Descripción Técnica</th>
                            {canEdit && <th className="px-6 py-4 text-right pr-12">Estatus</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((it) => {
                                const isExpanded = expandedIds.includes(it.itemcode);
                                return (
                                    <React.Fragment key={it.itemcode}>
                                        <tr 
                                            onClick={() => canEdit && toggleExpand(it)}
                                            className={`transition-all cursor-pointer ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                {isExpanded ? <ChevronUp size={18} className="text-azul-bersa" /> : <ChevronDown size={18} className="text-gray-300" />}
                                            </td>
                                            <td className="px-6 py-4 font-black text-blue-700 text-sm tracking-tight">
                                                {it.itemcode}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-azul-bersa font-bold text-sm uppercase leading-tight">{it.descripcion}</div>
                                                {isExpanded && <span className="text-[9px] font-black text-naranja-bersa uppercase animate-pulse">Editando modo rápido...</span>}
                                            </td>
                                            {canEdit && (
                                                <td className="px-6 py-4 text-right pr-12">
                                                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${isExpanded ? 'bg-azul-bersa text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                        {isExpanded ? 'Abierto' : 'Cerrado'}
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                        
                                        {/* PANEL EXPANDIBLE DE ZONAS */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="4" className="px-10 py-8 bg-gray-50/50 border-y border-blue-100 shadow-inner">
                                                    <div className="flex flex-col gap-6 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2 text-azul-bersa">
                                                                <Info size={16} />
                                                                <h4 className="text-[11px] font-black uppercase tracking-widest">Configuración de Precios por Zona</h4>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => toggleExpand(it)} 
                                                                    className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-white transition-all"
                                                                >
                                                                    Quitar de edición
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
                                                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                                                <div key={num} className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Zona {num}</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-0 top-1.5 text-gray-300 text-[10px] font-bold">$</span>
                                                                        <input 
                                                                            type="number"
                                                                            step="any"
                                                                            className="w-full pl-3 bg-transparent border-none outline-none font-mono text-xs font-black text-azul-bersa focus:ring-0"
                                                                            value={tempItems[it.itemcode]?.[`Zona_${num}`] ?? ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setTempItems(prev => ({
                                                                                    ...prev,
                                                                                    [it.itemcode]: { ...prev[it.itemcode], [`Zona_${num}`]: val }
                                                                                }));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : !loading && (
                            <tr>
                                <td colSpan="4" className="p-24 text-center">
                                    <p className="text-gray-400 text-xs font-black uppercase italic tracking-[0.2em]">
                                        {searchTerm ? `No hay resultados para "${searchTerm}"` : "No hay items disponibles."}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {(loading || uploading) && (
                <LoadingSpinner text={uploading ? 'Procesando archivo masivo...' : 'Sincronizando Inventario SQL...'} />
            )}
        </div>
    );
}
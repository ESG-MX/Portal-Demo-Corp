import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react'; // Importamos iconos

export default function DietasTab() {
    const { authFetch, userProfile } = useAuth(); // Obtenemos authFetch y userProfile
    const [dietas, setDietas] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [mapeo, setMapeo] = useState([]);
    const [nuevaDieta, setNuevaDieta] = useState('');
    const [loading, setLoading] = useState(true);

    // Verificamos si el usuario es Admin o MP para mostrar controles de gestión
    const canManage = userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'mp';

    const fetchData = async () => {
        if (!authFetch) return; // Asegurarse de que authFetch esté disponible
        try {
            // Usar authFetch para consistencia y manejo de errores integrado
            const [resD, resA, resM] = await Promise.all([
                authFetch.get('/api/admin/dietas'),
                authFetch.get('/api/admin/almacenes'),
                authFetch.get('/api/admin/whs-dietas')
            ]);
            setDietas(resD.data || []);
            setAlmacenes(resA.data || []);
            setMapeo(resM.data || []);
        } catch (error) {
            console.error("Error fetching dietas data:", error);
            toast.error("Error al cargar datos de dietas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [authFetch]); // Añadir authFetch a las dependencias

    const handleCreateDieta = async (e) => {
        e.preventDefault();
        if (!authFetch) return;
        try {
            const res = await authFetch.post('/api/admin/dietas', { NombreDieta: nuevaDieta });
            if(res.status === 200 || res.status === 201) { // Asumiendo 200 o 201 para éxito
                setNuevaDieta('');
                fetchData();
                toast.success("Dieta agregada correctamente");
            }
        } catch (error) {
            console.error("Error creating dieta:", error);
            toast.error("Error al agregar dieta.");
        }
    };

    const handleDeleteDieta = async (id) => {
        if(!window.confirm("¿Estás seguro de eliminar esta dieta? Se borrará de todos los hospitales.")) return;
        if (!authFetch) return;
        try {
            const res = await authFetch.delete(`/api/admin/dietas/${id}`);
            if(res.status === 200 || res.status === 204) { // Asumiendo 200 o 204 para éxito
                fetchData();
                toast.success("Dieta eliminada");
            }
        } catch (error) {
            console.error("Error deleting dieta:", error);
            toast.error("Error al eliminar dieta.");
        }
    };

    const handleToggleMapeo = async (whscode, dietaId, exists) => {
        if (!authFetch) return;
        try {
            await authFetch.post('/api/admin/whs-dietas', { whscode, dietaId, action: exists ? 'remove' : 'add' });
            fetchData();
        } catch (error) {
            console.error("Error toggling dieta mapping:", error);
            toast.error("Error al actualizar mapeo de dieta.");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Columna 1: Catálogo de Dietas */}
            <div className="md:col-span-1 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-azul-bersa font-black uppercase text-sm mb-4 italic">Catálogo Maestro</h3>
                
                {/* EL FORMULARIO AHORA ES VISIBLE SI ES ADMIN O MP */}
                {canManage && (
                    <form onSubmit={handleCreateDieta} className="mb-6 flex gap-2">
                        <input type="text" value={nuevaDieta} onChange={e => setNuevaDieta(e.target.value)} 
                            className="flex-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:border-naranja-bersa" 
                            placeholder="Nueva Dieta..." required />
                        <button className="bg-naranja-bersa text-white px-4 rounded-xl font-black hover:scale-105 transition-all">
                            <Plus size={18} />
                        </button>
                    </form>
                )}

                <div className="space-y-2">
                    {dietas.map(d => (
                        <div key={d.id} className="group bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm hover:border-naranja-bersa/30 transition-all">
                            <span className="text-xs font-black text-gray-700">{d.NombreDieta}</span>
                            
                            {/* BOTÓN DE ELIMINAR */}
                            {canManage && (
                                <button onClick={() => handleDeleteDieta(d.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Columna 2-3: Mapeo por Almacén (Se mantiene igual) */}
            <div className="md:col-span-2">
                <h3 className="text-azul-bersa font-black uppercase text-sm mb-4 italic">Asignación por Hospital</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(almacenes || []).map(al => (
                        <div key={al.whscode} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-[10px] font-black text-azul-bersa uppercase border-b pb-2 mb-3">{al.whsdesc}</div>
                            <div className="flex flex-wrap gap-2">
                                {dietas.map(dieta => {
                                    const exists = mapeo.some(m => m.WhsCode === al.whscode && m.DietaId === dieta.id);
                                    return (
                                        <button key={dieta.id} 
                                            disabled={!canManage} // MP también puede activar/desactivar
                                            onClick={() => handleToggleMapeo(al.whscode, dieta.id, exists)}
                                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
                                                exists ? 'bg-azul-bersa text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}>
                                            {dieta.NombreDieta}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Settings2, Trash2, Edit3, Plus, Search, CheckCircle2, Circle } from 'lucide-react';

export default function PaxTab({ role }) {
    const [items, setItems] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); 
    const { accessToken } = useAuth();
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState({ 
        ItemCode: '', 
        ItemName: '', 
        Price: '',
        CardCode: '',
        CardName: '',
        WhsCodes: [] 
    });

    const fetchData = async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const resItems = await fetch('/api/admin/items-pax', { 
                headers: { 'Authorization': `Bearer ${accessToken}` } 
            });
            const dataItems = await resItems.json();
            setItems(Array.isArray(dataItems) ? dataItems : []);

            const resAlmacenes = await fetch('/api/admin/almacenes', { 
                headers: { 'Authorization': `Bearer ${accessToken}` } 
            });
            const dataAlmacenes = await resAlmacenes.json();
            setAlmacenes(Array.isArray(dataAlmacenes) ? dataAlmacenes : []);
        } catch (err) {
            console.error("Error cargando datos:", err);
            toast.error("Error al sincronizar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [accessToken]);

    // --- NUEVA FUNCIÓN PARA MENU PLANNING (MP) ---
    const handleToggleDetail = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/admin/items-pax-detail/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ status: !currentStatus })
            });
            
            if (res.ok) {
                toast.success("Configuración de desglose actualizada");
                // Actualizamos el estado local para no recargar todo
                setItems(items.map(it => it.id === id ? { ...it, RequiereDetalle: !currentStatus } : it));
            } else {
                toast.error("No se pudo actualizar la configuración");
            }
        } catch (error) {
            toast.error("Error de conexión al servidor");
        }
    };

    const filteredItems = items.filter(it => 
        it.ItemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.ItemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.WhsCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.CardName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.CardCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleWhsToggle = (whscode) => {
        setFormData(prev => {
            const current = prev.WhsCodes;
            const updated = current.includes(whscode) 
                ? current.filter(c => c !== whscode) 
                : [...current, whscode];
            return { ...prev, WhsCodes: updated };
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (formData.WhsCodes.length === 0) {
            toast.warning("Debes seleccionar al menos un almacén.");
            return;
        }
        const payload = {
            ItemCode: formData.ItemCode.trim(),
            ItemName: formData.ItemName.trim(),
            Price: parseFloat(formData.Price),
            CardCode: formData.CardCode.trim(),
            CardName: formData.CardName.trim(),
            WhsCodes: formData.WhsCodes 
        };
        try {
            const res = await fetch('/api/admin/items-pax', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success("Productos registrados correctamente");
                setShowForm(false);
                setFormData({ ItemCode: '', ItemName: '', Price: '', CardCode: '', CardName: '', WhsCodes: [] });
                fetchData(); 
            } else {
                const errData = await res.json();
                toast.error("Error: " + errData.error);
            }
        } catch (err) { toast.error("Error de conexión"); }
    };

    const handleUpdatePrice = async (id, currentPrice) => {
        const newPrice = prompt(`Actualizar precio (ID: ${id}):`, currentPrice);
        if (newPrice && !isNaN(newPrice)) {
            try {
                await fetch(`/api/admin/items-pax/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ Price: parseFloat(newPrice) })
                });
                toast.success("Precio actualizado");
                fetchData();
            } catch (error) { toast.error("Error al actualizar precio");}
        }
    };

    const handleDelete = (id) => {
        toast(`¿Seguro que desea eliminar el registro #${id}?`, {
            action: {
                label: 'Eliminar',
                onClick: async () => {
                    try {
                        await fetch(`/api/admin/items-pax/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        toast.success("Registro eliminado");
                        fetchData();
                    } catch (error) { toast.error("Error al eliminar"); }
                }
            }
        });
    };

    return (
        <div className="p-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header y Buscador */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-azul-bersa font-black text-xl uppercase tracking-tight flex items-center gap-2">
                        <Settings2 className="text-naranja-bersa" /> Catálogo de Ventas (PAX)
                    </h3>
                    <div className="relative mt-3">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <Search size={16} />
                        </span>
                        <input 
                            type="text" 
                            placeholder="Buscar por código, nombre, almacén o cliente..."
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-azul-bersa outline-none w-full lg:w-96 transition-all shadow-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className={`px-6 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                        showForm ? 'bg-gray-400 text-white' : 'bg-naranja-bersa text-white hover:bg-orange-700'
                    }`}
                >
                    {showForm ? 'CANCELAR' : <><Plus size={14}/> NUEVO PRODUCTO</>}
                </button>
            </div>

            {/* Formulario de Creación */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white p-8 rounded-[2rem] mb-10 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300 border border-gray-100 shadow-xl text-gray-800">
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">Código Item</label>
                        <input type="text" placeholder="Ej: 19400" className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-azul-bersa outline-none" required
                            value={formData.ItemCode} onChange={e => setFormData({...formData, ItemCode: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">Nombre del Producto</label>
                        <input type="text" placeholder="Descripción completa" className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-azul-bersa outline-none" required
                            value={formData.ItemName} onChange={e => setFormData({...formData, ItemName: e.target.value})} />
                    </div>
                    {/* ... (resto de inputs: CardCode, CardName, etc - mantenidos de tu código original) ... */}
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">Código Cliente (CardCode)</label>
                        <input type="text" placeholder="Ej: B0070" className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-azul-bersa outline-none" required
                            value={formData.CardCode} onChange={e => setFormData({...formData, CardCode: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">Nombre Cliente (CardName)</label>
                        <input type="text" placeholder="Nombre de entidad" className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-azul-bersa outline-none" required
                            value={formData.CardName} onChange={e => setFormData({...formData, CardName: e.target.value})} />
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">
                            Asignar Almacenes ({formData.WhsCodes.length} seleccionados)
                        </label>
                        <div className="border border-gray-100 rounded-3xl bg-gray-50 p-4 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {almacenes.map(al => (
                                <label key={al.whscode} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                    formData.WhsCodes.includes(al.whscode) ? 'bg-white border-azul-bersa shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'
                                }`}>
                                    <input type="checkbox" className="w-4 h-4 accent-azul-bersa"
                                        checked={formData.WhsCodes.includes(al.whscode)}
                                        onChange={() => handleWhsToggle(al.whscode)} />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-azul-bersa leading-tight uppercase">{al.whsdesc}</span>
                                        <span className="text-[9px] text-azul-bersa/40 font-mono font-bold">{al.whscode}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black text-azul-bersa/50 ml-1 uppercase">Precio de Venta</label>
                        <input type="number" step="0.01" placeholder="0.00" className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-black text-azul-bersa outline-none" required
                            value={formData.Price} onChange={e => setFormData({...formData, Price: e.target.value})} />
                    </div>

                    <div className="md:col-span-2 mt-4">
                        <button type="submit" className="w-full bg-azul-bersa text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-900 transition-all shadow-xl active:scale-[0.98]">
                            REGISTRAR PRODUCTO EN CATÁLOGO
                        </button>
                    </div>
                </form>
            )}

            {/* Tabla Principal */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 text-azul-bersa/50 text-[10px] uppercase font-black tracking-widest border-b border-gray-50">
                            <th className="px-6 py-5">Código</th>
                            <th className="px-6 py-5">Almacén</th>
                            <th className="px-6 py-5">Producto / Descripción</th>
                            <th className="px-6 py-5 text-center">Tipo de Venta</th> {/* NUEVA COLUMNA PARA MP */}
                            <th className="px-6 py-5 text-right">Precio</th>
                            <th className="px-6 py-5 text-center">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredItems.length > 0 ? filteredItems.map((it) => (
                            <tr key={it.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 font-black text-naranja-bersa text-sm tracking-tighter">{it.ItemCode}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-100 uppercase">
                                        {it.WhsCode}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <div className="text-azul-bersa font-bold text-sm leading-tight uppercase">{it.ItemName}</div>
                                    {(it.CardCode || it.CardName) && (
                                        <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                                            REF: <span className="text-gray-500">{it.CardCode || 'S/C'}</span> | {it.CardName || 'S/N'}
                                        </div>
                                    )}
                                </td>

                                {/* --- NUEVO CONTROL PARA MP (MENU PLANNING) --- */}
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => handleToggleDetail(it.id, it.RequiereDetalle)}
                                        className={`group relative flex items-center justify-center mx-auto px-4 py-1.5 rounded-full text-[10px] font-black transition-all duration-300 shadow-sm border ${
                                            it.RequiereDetalle 
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                                        }`}
                                        title={it.RequiereDetalle ? 'Cambiar a Cantidad Simple' : 'Activar Desglose de Dietas'}
                                    >
                                        {it.RequiereDetalle ? (
                                            <span className="flex items-center gap-1.5 uppercase">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Desglose Activo
                                            </span>
                                        ) : (
                                            <span className="uppercase tracking-tighter">Cantidad Simple</span>
                                        )}
                                    </button>
                                </td>

                                <td className="px-6 py-4 text-right font-mono font-black text-azul-bersa text-sm">
                                    ${Number(it.Price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-3">
                                        <button 
                                            onClick={() => handleUpdatePrice(it.id, it.Price)}
                                            className="p-2.5 text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Editar Precio"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(it.id)}
                                            className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : !loading && (
                            <tr>
                                <td colSpan="6" className="p-24 text-center">
                                    <p className="text-gray-400 text-xs font-black uppercase italic tracking-[0.2em]">
                                        {searchTerm ? `No hay resultados para "${searchTerm}"` : "No hay productos en el catálogo."}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {loading && (
                <div className="p-24 text-center">
                    <Loader2 className="h-10 w-10 text-azul-bersa animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sincronizando Catálogo SQL...</p>
                </div>
            )}
        </div>
    );
}
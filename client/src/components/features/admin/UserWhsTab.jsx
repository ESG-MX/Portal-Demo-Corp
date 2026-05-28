import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import LoadingSpinner from '../LoadingSpinner';

export default function UserWhsTab() {
    const [accessList, setAccessList] = useState([]);
    const [users, setUsers] = useState([]);           
    const [almacenes, setAlmacenes] = useState([]);   
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({ email: '', whscode: '' });
    const [error, setError] = useState(null);
    const { authFetch } = useAuth();

    const fetchData = async () => {
        if (!authFetch) return;
        setLoading(true);
        setError(null);
        try {
            const [resAccess, resUsers, resAlms] = await Promise.all([
                authFetch.get('/api/admin/user-warehouses'), 
                authFetch.get('/api/admin/users'),
                authFetch.get('/api/admin/almacenes')
            ]);
            
            setAccessList(Array.isArray(resAccess.data) ? resAccess.data : []);
            setUsers(Array.isArray(resUsers.data) ? resUsers.data : []);
            setAlmacenes(Array.isArray(resAlms.data) ? resAlms.data : []);
        } catch (err) {
            console.error("Error al cargar datos de accesos", err);
            setError(err.response?.data?.message || "No tienes permisos para ver esta sección.");
        } finally {
            setLoading(false);
        }
    };
    const handleAssign = async (e) => {
        e.preventDefault();
        if (!form.email || !form.whscode) return;
        setIsSubmitting(true);
        try {
            await authFetch.post('/api/admin/user-warehouses', form);
            setForm({ ...form, whscode: '' }); 
            fetchData();
            toast.success("Acceso asignado correctamente");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Error al asignar acceso");
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = (id) => {
        toast("¿Estás seguro de revocar este acceso al almacén?", {
            action: {
                label: 'Revocar Acceso',
                onClick: async () => {
                    try {
                        await authFetch.delete(`/api/admin/user-warehouses/${id}`);
                        setAccessList(accessList.filter(item => item.ID !== id));
                        toast.success("Acceso revocado");
                    } catch (err) {
                        console.error(err);
                        toast.error(err.response?.data?.message || "Error al revocar acceso");
                    }
                }
            }
        });
    };
    const filteredAccess = (Array.isArray(accessList) ? accessList : []).filter(item => 
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.whscode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => { fetchData(); }, [authFetch]);

    if (error) return (
        <div className="p-20 text-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl inline-block shadow-lg border border-red-100">
                <h4 className="font-black text-lg mb-2 uppercase italic tracking-tighter">Acceso Restringido</h4>
                <p className="text-sm opacity-80 font-bold">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h3 className="text-azul-bersa font-black uppercase text-xl tracking-tight mb-3">
                        Accesos de Usuarios a Almacenes
                    </h3>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Buscar por usuario o almacén..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-azul-bersa outline-none w-full lg:w-80 transition-all shadow-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <form onSubmit={handleAssign} className="flex flex-wrap gap-2 bg-gray-100 p-2.5 rounded-2xl border border-gray-200 shadow-sm w-full lg:w-auto items-center">
                    <select 
                        className="text-[11px] font-bold bg-white border-none rounded-lg p-2 outline-none focus:ring-2 focus:ring-azul-bersa/20 shadow-sm cursor-pointer"
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})}
                        required
                    >
                        <option value="">-- SELECCIONAR USUARIO --</option>
                        {users.map(u => <option key={u.id} value={u.email}>{u.email}</option>)}
                    </select>
                    <select 
                        className="text-[11px] font-bold bg-white border-none rounded-lg p-2 outline-none focus:ring-2 focus:ring-azul-bersa/20 shadow-sm cursor-pointer"
                        value={form.whscode}
                        onChange={e => setForm({...form, whscode: e.target.value})}
                        required
                    >
                        <option value="">-- SELECCIONAR ALMACÉN --</option>
                        {almacenes.map(a => <option key={a.whscode} value={a.whscode}>{a.whsdesc} ({a.whscode})</option>)}
                    </select>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-azul-bersa text-white px-6 py-2 rounded-xl text-[10px] font-black hover:bg-opacity-90 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                        {isSubmitting ? 'ASIGNANDO...' : 'ASIGNAR ACCESO'}
                    </button>
                </form>
            </div>
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                    <thead className="text-azul-bersa/50 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Usuario / Email</th>
                            <th className="px-6 py-4 text-center">WhsCode Autorizado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredAccess.map((item) => (
                            <tr key={item.ID} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4 font-bold text-azul-bersa text-sm rounded-l-2xl border-y border-l border-gray-50">
                                    {item.email}
                                </td>
                                <td className="px-6 py-4 text-center border-y border-gray-50">
                                    <span className="bg-azul-bersa/5 text-azul-bersa px-3 py-1 rounded-md font-mono text-xs font-black border border-azul-bersa/10 uppercase tracking-tight">
                                        {item.whscode}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right rounded-r-2xl border-y border-r border-gray-50">
                                    <button 
                                        onClick={() => handleDelete(item.ID)}
                                        className="text-gray-300 hover:text-red-500 p-2 transition-all hover:bg-red-50 rounded-lg"
                                        title="Revocar acceso"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filteredAccess.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-gray-400 text-xs font-black uppercase italic tracking-widest">
                            No se encontraron accesos que coincidan con "{searchTerm}"
                        </p>
                    </div>
                )}
                {loading && (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                        <div className="w-6 h-6 border-4 border-azul-bersa/20 border-t-azul-bersa rounded-full animate-spin"></div>
                        <p className="text-gray-400 animate-pulse text-[10px] font-black uppercase tracking-widest">Sincronizando permisos...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
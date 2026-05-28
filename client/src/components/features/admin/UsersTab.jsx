import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
const AVAILABLE_ROLES = [
    { value: 'user', label: 'USER' },
    { value: 'manager', label: 'MANAGER' },
    { value: 'mc', label: 'MC' },
    { value: 'mp', label: 'MP' },
    { value: 'comp', label: 'COMPRAS' },
    { value: 'admin', label: 'ADMIN' }
];
export default function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newUser, setNewUser] = useState({ email: '', rol: 'user' }); // Default role for new user
    const { authFetch, userProfile } = useAuth(); // Get authFetch

    // Lógica para filtrar roles permitidos según el rol del usuario actual
    const filteredRoles = useMemo(() => {
        const role = userProfile?.permissions?.effectiveRole || userProfile?.role?.toLowerCase() || '';
        if (role === 'mc') {
            return AVAILABLE_ROLES.filter(r => r.value !== 'admin');
        }
        return AVAILABLE_ROLES;
    }, [userProfile]);

    const fetchUsers = async () => {
        if (!authFetch) return;
        try {
            const res = await authFetch.get('/api/admin/users');
            setUsers(res.data);
            setError(null); // Clear any previous errors
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.response?.data?.message || err.message || "Error al cargar usuarios.");
        } finally {
            setLoading(false);
        }
    };
    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUser.email) return;
        try {
            const res = await authFetch.post('/api/admin/users', newUser);
            if (res.ok) {
                setNewUser({ email: '', rol: 'user' });
                fetchUsers();
                toast.success("Usuario agregado con éxito");
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Error al agregar usuario");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Error al agregar usuario");
        }
    };
    const handleDeleteUser = (id) => {
        toast("¿Seguro que deseas eliminar este acceso permanentemente?", {
            action: {
                label: 'Eliminar Permanente',
                onClick: async () => {
                    try {
                        await authFetch.delete(`/api/admin/users/${id}`);
                        setUsers(users.filter(u => u.id !== id));
                        toast.success("Usuario eliminado");
                    } catch (err) {
                        console.error(err);
                        toast.error(err.response?.data?.message || "Error al eliminar usuario");
                    }
                }
            }
        });
    };
    const handleUpdateRole = async (userId, newRole) => {
        setUpdating(userId);
        try {
            await authFetch.put(`/api/admin/users/${userId}`, { rol: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, rol: newRole } : u));
            toast.success("Rol de usuario actualizado");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Error al actualizar rol");
        } finally { 
            setUpdating(null); 
        }
    };
    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    useEffect(() => { fetchUsers(); }, [authFetch]); // Dependency on authFetch
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
            {/* ENCABEZADO: Título, Buscador y Formulario */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div className="w-full lg:w-auto">
                    <h3 className="text-azul-bersa font-black uppercase tracking-tight text-xl mb-3">
                        Gestión de Usuarios y Accesos
                    </h3>
                    {/* BARRA DE BÚSQUEDA */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Buscar por email corporativo..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-azul-bersa outline-none w-full lg:w-80 transition-all shadow-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {/* FORMULARIO DE ALTA RÁPIDA */}
                <form onSubmit={handleAddUser} className="flex gap-2 bg-gray-100 p-2.5 rounded-2xl border border-gray-200 shadow-sm w-full lg:w-auto items-center">
                    <input 
                        type="email" 
                        placeholder="nuevo.usuario@democorp.com..."
                        className="text-xs p-2 rounded-lg border-none focus:ring-0 flex-1 lg:w-64 bg-transparent font-bold"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        required
                    />
                    <select 
                        className="text-[10px] font-black bg-white border-none rounded-lg px-2 py-1.5 shadow-sm outline-none cursor-pointer"
                        value={newUser.rol}
                        onChange={(e) => setNewUser({...newUser, rol: e.target.value})}
                    >
                        {filteredRoles.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <button type="submit" className="bg-azul-bersa text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-opacity-90 transition-all uppercase tracking-widest active:scale-95">
                        Agregar
                    </button>
                </form>
            </div>
            {/* TABLA DE USUARIOS */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                    <thead>
                        <tr className="text-azul-bersa/50 text-[10px] uppercase font-black tracking-widest">
                            <th className="px-6 py-4 text-center">ID</th>
                            <th className="px-6 py-4">Email Corporativo</th>
                            <th className="px-6 py-4">Nivel de Acceso</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((u) => (
                            <tr key={u.id} className="bg-white hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 rounded-l-2xl text-gray-400 font-mono text-xs text-center border-y border-l border-gray-50">
                                    {u.id}
                                </td>
                                <td className="px-6 py-4 font-bold text-azul-bersa text-sm border-y border-gray-50">
                                    {u.email}
                                </td>
                                <td className="px-6 py-4 border-y border-gray-50">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                        u.rol?.toLowerCase() === 'admin' 
                                        ? 'bg-violet-50 text-naranja-bersa border-violet-100' 
                                        : 'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                        {u.rol || 'USER'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 rounded-r-2xl text-center flex items-center justify-center gap-4 border-y border-r border-gray-50">
                                    {updating === u.id ? (
                                        <span className="text-[10px] font-bold text-gray-400 animate-pulse uppercase">Guardando...</span>
                                    ) : (
                                        <>
                                            <select 
                                                className="text-[10px] font-black border-none bg-gray-100 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-azul-bersa/20 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                                                value={u.rol?.toLowerCase()}
                                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                            >
                                                {filteredRoles.map(role => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-gray-300 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                                                title="Eliminar usuario"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filteredUsers.length === 0 && (
                    <div className="text-center p-20">
                        <p className="text-gray-400 text-xs font-black uppercase italic tracking-widest">
                            No se encontró el correo "{searchTerm}"
                        </p>
                    </div>
                )}
            </div>
            {loading && (
                <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <div className="w-6 h-6 border-4 border-azul-bersa/20 border-t-azul-bersa rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse text-[10px] font-black uppercase tracking-widest">Sincronizando Usuarios...</p>
                </div>
            )}
        </div>
    );
}
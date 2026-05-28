import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';

const Sidebar = ({ isSidebarOpen }) => {
    const { userProfile, logout, isLoading } = useAuth();
    const location = useLocation();

    const menuItems = useMemo(() => {
        if (!userProfile) return [];
        const rawRole = (userProfile.role || '').toLowerCase().trim();
        const effectiveRole = (userProfile.permissions?.effectiveRole || '').toLowerCase().trim();
        
        // Helpers para detección robusta de roles
        const isComp = rawRole.includes('comp') || effectiveRole.includes('comp');
        const isAdmin = rawRole.includes('admin') || effectiveRole.includes('admin');
        const isMP = rawRole.includes('mp') || effectiveRole.includes('mp');
        const isManager = rawRole.includes('manager') || effectiveRole.includes('manager');
        const isMC = rawRole.includes('mc') || effectiveRole.includes('mc');

        const level = userProfile.permissions?.level || 1;

        const items = [
            { name: 'Inicio', path: '/', icon: '🏠' },
        ];

        if (!isComp && !isMC) {
            items.push(
                { name: 'Ventas', path: '/ventas', icon: '🛒' },
                { name: 'Consumo', path: '/consumo', icon: '📦' },
                { name: 'Inventario', path: '/inventario', icon: '📋' },
            );
        }

        if (isAdmin || isManager || isMP) {
            items.push({ name: 'Semáforo Ops', path: '/dashboard-semaforo', icon: '🚦' });
        }

        if (!isComp) {
            items.push(
                { name: 'Recepción', path: '/repmerch', icon: '🚚' },
                { name: 'Caja Chica', path: '/cajac', icon: '💰' },
            );
        }

        if (isAdmin || isManager) {
            items.push({ name: 'Auditoría Stock', path: '/auditoria', icon: '📊' });
        }

        if (isAdmin || isComp || isMP) {
            items.push({ name: 'Incidencias', path: '/incidencias', icon: '🚨' });
        }

        if (isManager || isAdmin || isMP || isComp) {
            items.push({ name: 'Reportar Incidencia', path: '/incidencias/nuevo', icon: '📝' });
        }

        // Panel de Administración
        if (level >= 5 || isAdmin || isMC || isMP) {
            items.push({ name: 'Panel Control', path: '/admin', icon: '⚙️' });
        }

        return items;
    }, [userProfile]);

    return (
        <aside className={`bg-azul-bersa text-white flex flex-col h-screen shadow-xl transition-all duration-300 ${isSidebarOpen ? 'w-64 border-r-2 border-naranja-bersa' : 'w-0'} overflow-hidden`}>
            {/* Header / Logo */}
            <div className="p-6 border-b border-white/10 min-w-[256px]">
                <Link to="/" className="block">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-naranja-bersa rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                            <span className="text-white font-black text-base leading-none">P</span>
                        </div>
                        <div>
                            <p className="text-white font-black text-sm tracking-tight uppercase leading-none">Portal</p>
                            <p className="text-[10px] font-black text-naranja-bersa mt-0.5 tracking-widest uppercase">Operativo</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Navegación con Scroll independiente */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar min-w-[256px]">
                {!isLoading && menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${isActive ? 'bg-naranja-bersa text-white shadow-lg shadow-violet-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer con Botón de Logout fijo abajo */}
            <div className="p-4 border-t border-white/10 mt-auto min-w-[256px]">
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 font-black hover:bg-red-500/10 rounded-xl transition-all uppercase text-[10px] tracking-widest">
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

/* Forzando un deploy */

export default Sidebar;
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import ItemsTab from '../components/features/admin/ItemsTab';
import PaxTab from '../components/features/admin/PaxTab';
import UsersTab from '../components/features/admin/UsersTab';
import UserWhsTab from '../components/features/admin/UserWhsTab';
import DietasTab from '../components/features/admin/DietasTab'; 
const Admin = () => {
    const { userProfile, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState('');
    const effectiveRole = userProfile?.permissions?.effectiveRole || 'usuario';
    const currentLevel = userProfile?.permissions?.level || 1;
    const visibleTabs = useMemo(() => {
        if (!userProfile) return [];
        const allTabs = [
            { 
                id: 'pax', 
                label: 'PAX', 
                component: <PaxTab role={effectiveRole} />, 
                minRole: 3 
            },
            { 
                id: 'items', 
                label: 'ITEMS', 
                component: <ItemsTab role={effectiveRole} />, 
                minRole: 2
            },
            { 
                id: 'users', 
                label: 'USUARIOS', 
                component: <UsersTab />, 
                minRole: 5
            },
            { 
                id: 'accesos', 
                label: 'ACCESOS WH', 
                component: <UserWhsTab />,
                minRole: 5
            },
              { 
                id: 'dietas', 
                label: 'GESTIÓN DIETAS', 
                component: <DietasTab />, 
                minRole: 3 
            },
        ];
        return allTabs.filter(tab => {
            if (currentLevel >= tab.minRole) return true;
            if (tab.id === 'dietas' && effectiveRole === 'mp') return true;
            // Permitir al rol 'mc' ver las pestañas de Items, Usuarios y Accesos WH
            if (effectiveRole === 'mc' && (tab.id === 'items' || tab.id === 'users' || tab.id === 'accesos')) return true;
            return false;
        });
    }, [currentLevel, effectiveRole, userProfile]);
    useEffect(() => {
        if (visibleTabs.length > 0 && !activeTab) {
            setActiveTab(visibleTabs[0].id);
        }
    }, [visibleTabs, activeTab]);
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-azul-bersa flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="font-mono text-xs uppercase tracking-widest">Iniciando Sesión...</p>
                </div>
            </div>
        );
    }
    if (!userProfile) {
        return (
            <div className="min-h-screen bg-azul-bersa flex items-center justify-center text-white">
                <p className="animate-pulse font-mono text-xs uppercase">Sincronizando con Servidor SQL...</p>
            </div>
        );
    }
    if (visibleTabs.length === 0) {
        return (
            <div className="min-h-screen bg-azul-bersa p-6 flex items-center justify-center text-center">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md">
                    <h2 className="text-2xl font-black text-red-600 mb-2 uppercase">Acceso Denegado</h2>
                    <p className="text-gray-600 text-sm">No tienes permisos para acceder a las funciones de administración.</p>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-gray-400 text-[10px] font-mono uppercase">Rol Detectado: {effectiveRole}</p>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-azul-bersa p-6">
            <div className="max-w-7xl mx-auto mb-8 flex items-center justify-center gap-4 animate-in fade-in zoom-in duration-700">
                <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/20">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h1 className="text-white text-4xl font-black uppercase tracking-widest">
                    Panel de <span className="text-naranja-bersa">Control</span>
                </h1>
            </div>
            <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
                {visibleTabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-8 py-4 rounded-t-2xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                            activeTab === tab.id 
                            ? 'bg-white text-azul-bersa scale-100 shadow-[-4px_-4px_15px_rgba(0,0,0,0.1)] z-10' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white mt-2'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="max-w-7xl mx-auto bg-white rounded-b-3xl rounded-tr-3xl p-8 shadow-2xl min-h-[600px] border-t border-gray-50">
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                    {visibleTabs.find(t => t.id === activeTab)?.component || (
                        <div className="text-center text-gray-400 p-20 font-bold uppercase text-xs">
                            Selecciona un módulo para comenzar
                        </div>
                    )}
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-4 flex justify-end px-4">
                <p className="text-white/30 text-[9px] font-mono uppercase tracking-widest">
                    Usuario: {userProfile.email} | Nivel: {effectiveRole}
                </p>
            </div>
        </div>
    );
};
export default Admin;
import React, { useState } from 'react';
import LiveCompTab from '../components/features/auditoriastock/LiveCompTab';
import HistoryTab from '../components/features/auditoriastock/HistoryTab';
import MovementsTab from '../components/features/auditoriastock/MovementsTab';
import { RefreshCw, Archive, List } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuditoria } from '../hooks/useAuditoria';
const Auditoria = () => {
    const { authFetch } = useAuth();
    const logic = useAuditoria(authFetch);
    const [activeTab, setActiveTab] = useState('live');
    return (
        <div className="min-h-screen bg-azul-bersa p-6 font-sans">
            <h1 className="text-white text-center text-3xl font-black mb-8 uppercase tracking-widest">
                Auditoría de <span className="text-naranja-bersa">Existencias</span>
            </h1>

            {/* Navegación de Pestañas */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4 justify-center">
                <button
                    onClick={() => setActiveTab('live')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === 'live' ? 'bg-white text-azul-bersa shadow-xl transform scale-105' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                >
                    <RefreshCw size={16} /> Comparativo Live
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === 'history' ? 'bg-white text-azul-bersa shadow-xl transform scale-105' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                >
                    <Archive size={16} /> Historial Cierres
                </button>
                <button
                    onClick={() => setActiveTab('movements')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === 'movements' ? 'bg-white text-azul-bersa shadow-xl transform scale-105' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                >
                    <List size={16} /> Kardex de Movimientos
                </button>
            </div>

            <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-2xl p-6 min-h-[600px]">
                {activeTab === 'live' && <LiveCompTab logic={logic} />}
                {activeTab === 'history' && <HistoryTab logic={logic} />}
                {activeTab === 'movements' && <MovementsTab logic={logic} />}
            </div>
        </div>
    );
};
export default Auditoria;
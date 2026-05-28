import React, { useState } from 'react';
import Select from 'react-select';
import { useAuth } from '../hooks/useAuth';
import { useRepMerch } from '../hooks/useRepMerch';
import OrderDetailModal from "../components/features/recepcionmerch/OrderDetailModal";
import { customSelectStyles } from '../utils/selectStyles';
import LoadingSpinner from '../components/features/LoadingSpinner';
import HistorialEntradas from '../components/features/recepcionmerch/HistorialEntradas';

function RepMerch() {
  const { userProfile, authFetch, accessToken } = useAuth();
  const logic = useRepMerch(authFetch, accessToken); 
  const [activeTab, setActiveTab] = useState('recepcion');

  if (!userProfile) {
    return <div className="p-10 text-white font-bold">Cargando perfil...</div>;
  }

  const role = userProfile.role?.toLowerCase() || '';
  if (role.includes('comp')) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl flex flex-col items-center">
          <span className="text-3xl mb-4">🔒</span>
          <h2 className="text-xl font-bold text-azul-bersa">Acceso Denegado</h2>
          <p className="mt-2 text-red-500/80">Tu nivel de acceso no tiene autorización para este módulo.</p>
        </div>
      </div>
    );
  }

  const isPowerUser = userProfile.permissions?.isPowerUser || false;
  const isMP = (userProfile.role || '').toLowerCase().includes('mp') || (userProfile.role || '').toLowerCase().includes('admin');

  const handleSearch = () => {
    logic.setPage(1);
    logic.setAppliedDocNum(logic.filters.docNum);
  };
  return (
    <div className="min-h-screen bg-azul-bersa p-6 md:p-12 font-sans text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
            <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-violet-500/20">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
                Recepción de <span className="text-naranja-bersa">Mercancía</span>
            </h1>
        </div>

        {/* Navegación por pestañas */}
        <div className="max-w-6xl mx-auto flex gap-4 mb-6 border-b border-white/10">
            <button 
                onClick={() => setActiveTab('recepcion')} 
                className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'recepcion' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
            >
                NUEVA RECEPCIÓN
            </button>
            {isMP && (
                <button 
                    onClick={() => setActiveTab('historial')} 
                    className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'historial' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    HISTORIAL
                </button>
            )}
        </div>

        {activeTab === 'recepcion' ? (
            <>
                <section className="bg-white rounded-2xl p-6 shadow-md grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1"># DOCUMENTO</label>
                        <input type="number" className="p-3 bg-gray-50 border rounded-xl font-bold text-black" value={logic.filters.docNum} onChange={e => logic.setFilters({...logic.filters, docNum: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">DESDE</label>
                        <input type="date" className="p-3 bg-gray-50 border rounded-xl font-bold text-black" value={logic.filters.startDate} onChange={e => logic.setFilters({...logic.filters, startDate: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">HASTA</label>
                        <input type="date" className="p-3 bg-gray-50 border rounded-xl font-bold text-black" value={logic.filters.endDate} onChange={e => logic.setFilters({...logic.filters, endDate: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black tracking-widest uppercase text-gray-700 mb-1">ALMACÉN</label>
                        {isPowerUser ? (
                            <Select options={logic.warehouseOptions} value={logic.selectedWhs} onChange={logic.setSelectedWhs} isClearable placeholder="TODOS LOS ALMACENES..." styles={customSelectStyles} className="text-sm" />
                        ) : (
                            <div className="p-3 bg-gray-100 rounded-xl font-bold text-sm text-gray-700">🔒 {userProfile.office}</div>
                        )}
                    </div>
                    <button onClick={handleSearch} className="bg-naranja-bersa text-white font-black p-4 rounded-xl">🔍 BUSCAR</button>
                </section>

                <div className="space-y-4">
                    <div className="bg-naranja-bersa text-white rounded-t-[2rem] p-6 grid grid-cols-12 gap-4 items-center shadow-lg">
                        <div className="col-span-2 px-4 text-[11px] font-black uppercase tracking-[0.2em]"># Doc</div>
                        <div className="col-span-5 text-[11px] font-black uppercase tracking-[0.2em]">Proveedor</div>
                        <div className="col-span-3 text-right text-[11px] font-black uppercase tracking-[0.2em]">Total</div>
                        <div className="col-span-2 text-center text-[11px] font-black uppercase tracking-[0.2em]">Acción</div>
                    </div>
                    <div className="space-y-3">
                        {logic.loading ? (
                            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden"><LoadingSpinner text="Sincronizando con SAP..." /></div>
                        ) : logic.ordenes.length === 0 ? (
                            <div className="bg-white rounded-2xl p-20 text-center text-gray-600 font-black uppercase text-xs tracking-widest shadow-sm">No hay órdenes pendientes de procesar</div>
                        ) : (
                            logic.ordenes.map((orden) => (
                                <div key={orden.DocEntry} className="bg-white rounded-2xl p-5 grid grid-cols-12 gap-4 items-center shadow-md border-l-[10px] border-naranja-bersa hover:translate-x-1 transition-all group">
                                    <div className="col-span-2 px-4 font-black text-azul-bersa text-xl tracking-tight">{orden.DocNum}</div>
                                    <div className="col-span-5"><p className="font-bold text-azul-bersa/80 uppercase text-sm leading-tight truncate">{orden.CardName}</p></div>
                                    <div className="col-span-3 text-right"><p className="font-mono font-black text-azul-bersa text-xl tracking-tighter">${Number(orden.DocTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p></div>
                                    <div className="col-span-2 flex justify-center">
                                        <button onClick={() => logic.setSelectedOrder(orden)} className="bg-azul-bersa hover:bg-azul-bersa/90 text-white px-8 py-3 rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-lg shadow-azul-bersa/20 uppercase tracking-widest">REVISAR</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </>
        ) : (
            <HistorialEntradas authFetch={authFetch} />
        )}

        {logic.selectedOrder && (
            <OrderDetailModal 
                order={logic.selectedOrder} 
                onClose={() => logic.setSelectedOrder(null)} 
                logic={logic}
                authFetch={authFetch}
            />
        )}
      </div>
    </div>
  );
}
export default RepMerch;
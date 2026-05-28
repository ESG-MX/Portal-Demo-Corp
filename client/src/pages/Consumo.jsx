import React, { useState, useMemo, useEffect } from 'react';
import { 
    MinusCircle, Send, Search, Loader2, AlertTriangle, 
    History, ArrowLeft, ArrowRight, FileSpreadsheet 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth'; 
import { useConsumo } from '../hooks/useConsumo';
import Select from 'react-select';
import { customSelectStyles } from '../utils/selectStyles';
import HistorialConsumo from '../components/features/consumo/HistorialConsumo';

const Consumo = () => {
    const { authFetch, userProfile } = useAuth();
    const {
        data, filtro, setFiltro, conteos, handleCantidadChange, registrarSalidas, 
        fetchData, loading, historial, fetchHistorial, loadingHistorial
    } = useConsumo(authFetch);

    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('consumo');

    if (userProfile?.role?.toLowerCase().includes('mc')) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[500px]">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl flex flex-col items-center">
                    <span className="text-3xl mb-4">🔒</span>
                    <h2 className="text-xl font-bold text-azul-bersa">Acceso Denegado</h2>
                    <p className="mt-2 text-red-500/80">Tu rol no tiene acceso a las salidas por consumo.</p>
                </div>
            </div>
        );
    }

    // Lógica de almacenes para el Select
    const warehouseOptions = useMemo(() => {
        return (data.almacenes || []).map(a => ({
            value: a.whscode,
            label: `${a.whsname} (${a.whscode})`
        }));
    }, [data.almacenes]);

    const seleccionarAlmacen = (option) => {
        if (!option) return;
        fetchData(option.value);
    };

    // Permisos: MC, MP y ADMIN pueden ver el historial
    const canSeeHistory = useMemo(() => {
        if (!userProfile) return false;
        const role = (userProfile.role || '').toLowerCase();
        return role.includes('mp') || role.includes('admin') || role.includes('mc');
    }, [userProfile]);

    // Lógica de búsqueda de productos (Pestaña 1)
    const productosFiltrados = useMemo(() => {
        const term = filtro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (!term) return data.productos || [];
        return data.productos.filter(p => {
            const nombre = (p.producto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const codigo = (p.itemcode || "").toLowerCase();
            return nombre.includes(term) || codigo.includes(term);
        });
    }, [data.productos, filtro]);

    // CORRECCIÓN: La validación de stock ahora considera el FACTOR
    const tieneErroresDeStock = useMemo(() => {
        return productosFiltrados.some(p => {
            const factor = parseFloat(p.factor || 1);
            const retirarPiezas = parseFloat(conteos[p.rowId] || 0);
            const stockEnPiezas = parseFloat(p.stock_actual || 0) * factor;
            return retirarPiezas > stockEnPiezas;
        });
    }, [productosFiltrados, conteos]);

    return (
        <div className="min-h-screen bg-azul-bersa p-6 md:p-12 font-sans text-white">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex items-center gap-4">
                <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg">
                    <MinusCircle size={35} className="text-white" />
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter">Consumo</h1>
            </div>

            {/* Tabs */}
            <div className="max-w-6xl mx-auto flex gap-4 mb-6 border-b border-white/10">
                <button onClick={() => setActiveTab('consumo')} className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'consumo' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}>NUEVO CONSUMO</button>
                {canSeeHistory && (
                    <button onClick={() => setActiveTab('historial')} className={`pb-3 px-4 font-black text-sm border-b-4 transition-all ${activeTab === 'historial' ? 'border-naranja-bersa text-white' : 'border-transparent text-white/40 hover:text-white'}`}>HISTORIAL</button>
                )}
            </div>

            <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                {activeTab === 'consumo' ? (
                    <>
                        {/* Panel de Controles */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 items-end gap-6 text-gray-700 border border-gray-100">
                            <div className="lg:col-span-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ALMACÉN</label>
                                <Select
                                    options={warehouseOptions}
                                    value={warehouseOptions.find(opt => opt.value === data.almacenActivo) || null}
                                    onChange={seleccionarAlmacen}
                                    styles={customSelectStyles}
                                    placeholder="Buscar almacén..."
                                />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">BUSCADOR DE ARTÍCULOS</label>
                                <div className="relative">
                                    <input type="text" placeholder="Código o nombre..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full border-2 border-gray-50 bg-gray-50 py-3 px-11 rounded-2xl outline-none font-bold text-azul-bersa focus:border-naranja-bersa/30 transition-all" />
                                    <Search className="absolute left-4 top-4 text-gray-300" size={20} />
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">FECHA SALIDA</label>
                                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border-2 border-gray-50 bg-gray-50 py-3 px-4 rounded-2xl outline-none font-bold text-azul-bersa" />
                            </div>
                            <div className="lg:col-span-3">
                                <button
                                    onClick={() => registrarSalidas(fecha)}
                                    disabled={loading || !data.almacenActivo || tieneErroresDeStock}
                                    className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl disabled:opacity-30 ${tieneErroresDeStock ? 'bg-red-500 text-white' : 'bg-naranja-bersa text-white hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} 
                                    {tieneErroresDeStock ? "STOCK EXCEDIDO" : "REGISTRAR"}
                                </button>
                            </div>
                        </div>

                        {/* Listado de Productos */}
                        <div className="flex flex-col gap-3">
                            <div className="bg-azul-bersa/50 rounded-t-[2rem] grid grid-cols-7 p-5 text-white font-black text-[11px] uppercase tracking-widest border-b border-white/10">
                                <div className="pl-6">Producto</div>
                                <div className="text-center">Unidad</div>
                                <div className="text-center">Stock Actual</div>
                                <div className="text-center">Precio Unit.</div>
                                <div className="text-center">Retirar</div>
                                <div className="text-center">Precio Total</div>
                                <div className="text-center">Stock Final</div>
                            </div>

                            <div className="flex flex-col gap-3 mb-20">
                                {productosFiltrados.map((p) => {
                                    // LOGICA DE CONVERSION:
                                    const factor = parseFloat(p.factor || 1);
                                    
                                    // 1. Stock Actual en piezas (0.026 * 2000 = 52)
                                    const stockActualPiezas = parseFloat(p.stock_actual || 0) * factor;
                                    
                                    // 2. Cantidad a retirar ingresada por el usuario (ej: 10)
                                    const cantidadRetirar = parseFloat(conteos[p.rowId] || 0);
                                    
                                    // 3. Precio unitario por PIEZA (140.09 / 500 = 0.28)
                                    const precioPorPieza = parseFloat(p.precio_fijo || 0) / factor;
                                    
                                    // 4. Cálculos finales
                                    const saldoFinal = (stockActualPiezas - cantidadRetirar);
                                    const esSobregiro = stockActualPiezas < cantidadRetirar;
                                    const precioTotal = precioPorPieza * cantidadRetirar;
                                    
                                    return (
                                        <div key={p.rowId} className={`bg-white text-azul-bersa rounded-2xl p-5 shadow-sm grid grid-cols-7 items-center transition-all border-l-[10px] ${esSobregiro ? 'border-red-500 bg-red-50' : 'border-naranja-bersa hover:scale-[1.01]'}`}>
                                            <div className="pl-4">
                                                <div className="font-black text-sm uppercase leading-tight">{p.producto}</div>
                                                <div className="text-[10px] text-gray-400 font-bold font-mono flex gap-2">
                                                    <span>{p.itemcode}</span>
                                                    {factor > 1 && <span className="text-naranja-bersa">Factor: {factor}</span>}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-black text-[10px]">{p.unidad}</span>
                                            </div>
                                            
                                            {/* Stock disponible con decimales para pesaje/kilos */}
                                            <div className="text-center font-bold text-gray-400 text-sm">
                                                {stockActualPiezas.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                            </div>

                                            {/* Precio por Pieza (Prorrateado) */}
                                            <div className="text-center font-bold text-azul-bersa text-sm">
                                                $ {precioPorPieza.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </div>

                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    value={conteos[p.rowId] || ""}
                                                    placeholder="0"
                                                    min="0"
                                                    step="any"
                                                    onKeyDown={(e) => {
                                                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onWheel={(e) => e.target.blur()}
                                                    className="w-24 border-2 border-gray-100 bg-gray-50 rounded-xl py-2 px-3 text-center font-black text-azul-bersa outline-none focus:border-naranja-bersa [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "" || parseFloat(val) >= 0) {
                                                            handleCantidadChange(p.rowId, val);
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <div className="text-center font-black text-azul-bersa text-sm">
                                                $ {precioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </div>

                                            {/* Saldo Final con decimales */}
                                            <div className={`text-center font-black text-2xl ${esSobregiro ? 'text-red-500' : 'text-azul-bersa'}`}>
                                                {Math.max(0, saldoFinal).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <HistorialConsumo 
                        almacenes={data.almacenes}
                        historial={historial}
                        fetchHistorial={fetchHistorial}
                        loadingHistorial={loadingHistorial}
                        authFetch={authFetch}
                    />
                )}
            </div>
        </div>
    );
};

export default Consumo;
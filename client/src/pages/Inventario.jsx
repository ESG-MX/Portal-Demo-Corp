import React, { useState, useMemo } from 'react'; 
import { useAuth } from '../hooks/useAuth';
import { useInventario } from '../hooks/useInventario';
import { Package, Save, Search, Loader2, Store, Factory, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../utils/selectStyles';
const Inventario = () => {
    const { authFetch } = useAuth();
    const { data, filtro, setFiltro, conteos, handleCantidadChange, totalGeneral, guardar, fetchData, loading, limpiarConteos } = useInventario(authFetch);
    const [categoriaVista, setCategoriaVista] = useState('MATERIA_PRIMA'); 
    const warehouseOptions = useMemo(() => {
        return (data.almacenes || []).map(a => ({
            value: a.whscode,
            label: `${a.whsname} (${a.whscode})`
        }));
    }, [data.almacenes]);

    const productosFiltrados = useMemo(() => {
        let base = data.productos || [];
        if (categoriaVista === 'TIENDITA') base = base.filter(p => (p.codigo_general || "").startsWith("TIEWM"));
        else base = base.filter(p => !(p.codigo_general || "").startsWith("TIEWM"));
        const term = filtro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (!term) return base;
        return base.filter(p => {
            const nombre = (p.producto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cod = (p.itemcode || "").toLowerCase();
            return nombre.includes(term) || cod.includes(term);
        });
    }, [data.productos, filtro, categoriaVista]);
    const seleccionarAlmacen = (option) => {
        if (!option) return;
        fetchData(option.value);          
    };
    return (
        <div className="min-h-screen bg-azul-bersa p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg shadow-naranja-bersa/20">
                            <Package className="text-white" size={32} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Inventario</h1>
                    </div>
                    <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10 self-start">
                        <button onClick={() => setCategoriaVista('MATERIA_PRIMA')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${categoriaVista === 'MATERIA_PRIMA' ? 'bg-white text-azul-bersa shadow-xl' : 'text-white/60 hover:text-white'}`}><Factory size={16}/> MATERIA PRIMA</button>
                        <button onClick={() => setCategoriaVista('TIENDITA')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${categoriaVista === 'TIENDITA' ? 'bg-naranja-bersa text-white shadow-xl' : 'text-white/60 hover:text-white'}`}><Store size={16}/> TIENDITA</button>
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8 items-end bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-black/20">
                    <div className="md:col-span-3 relative">
                        <label className="block text-gray-700 text-[10px] font-black mb-2 uppercase tracking-widest ml-1">Operación / Almacén</label>
                        <Select
                            options={warehouseOptions}
                            value={warehouseOptions.find(opt => opt.value === data.almacenActivo) || null}
                            onChange={seleccionarAlmacen}
                            styles={customSelectStyles}
                            placeholder="Buscar almacén..."
                            noOptionsMessage={() => "No se encontraron almacenes"}
                        />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-gray-700 text-[10px] font-black mb-2 uppercase tracking-widest ml-1">Buscador</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-4 text-gray-300" size={20} />
                            <input type="text" className="w-full bg-white border border-gray-200 text-azul-bersa pl-12 p-3.5 rounded-2xl focus:ring-2 focus:ring-naranja-bersa/20 outline-none font-semibold shadow-sm transition-all" placeholder="Filtrar por nombre o código..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                        </div>
                    </div>
                    <div className="md:col-span-2 text-center">
                        <div className="border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                            <label className="block text-naranja-bersa text-[9px] font-black uppercase tracking-widest mb-1">Total General</label>
                            <div className="text-xl font-mono font-black text-azul-bersa">$ {totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                        <button onClick={limpiarConteos} className="bg-gray-100 text-gray-400 p-4 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={24} /></button>
                        <button onClick={guardar} disabled={loading || !data.almacenActivo} className="flex-1 flex items-center justify-center gap-3 bg-naranja-bersa hover:bg-naranja-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-naranja-bersa/30 transition-all active:scale-95 disabled:opacity-30">
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} strokeWidth={2.5} />} 
                            <span className="tracking-wide uppercase">Guardar Todo</span>
                        </button>
                    </div>
                </div>
                <div className="w-full mb-20">
                    <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-naranja-bersa text-white text-[11px] font-black uppercase tracking-widest rounded-t-[2rem] shadow-lg">
                        <div className="col-span-5">Producto</div>
                        <div className="col-span-2 text-center">Unidad</div>
                        <div className="col-span-2 text-center">Precio Unit.</div>
                        <div className="col-span-1 text-center">Cantidad</div>
                        <div className="col-span-2 text-right pr-4">Total Est.</div>
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                        {productosFiltrados.map((p) => {
                            const factor = parseFloat(p.factor || 1);
                            const precioPaquete = parseFloat(p.precio_fijo || 0);
                            const cantidadPiezas = parseFloat(conteos[p.rowId] || 0);
                            
                            // Cálculo explícito para evitar que se trate como entero
                            const totalFila = (cantidadPiezas * precioPaquete) / factor;
                            const precioPorPieza = precioPaquete / factor;

                            return (
                                <div key={p.rowId} className="grid grid-cols-12 gap-4 items-center bg-white p-6 rounded-2xl shadow-sm border-l-4 border-transparent hover:border-naranja-bersa transition-all group">
                                    <div className="col-span-5">
                                        <div className="font-black text-azul-bersa text-[15px] uppercase leading-tight group-hover:text-naranja-bersa transition-colors">{p.producto}</div>
                                        <div className="text-[10px] text-gray-600 font-mono mt-1 font-bold flex gap-2">
                                            <span>{p.itemcode}</span>
                                            {factor > 1 && <span className="text-naranja-bersa">Factor: {factor}</span>}
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <span className="bg-violet-50 text-naranja-bersa border border-violet-100 px-3 py-1 rounded-lg font-black text-[10px] uppercase">{p.unidad || 'PZA'}</span>
                                    </div>
                                    <div className="col-span-2 text-center font-bold text-gray-600 text-sm">
                                        $ {precioPorPieza.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <input type="number" className="w-24 bg-gray-50 border-none rounded-xl py-2 px-3 text-center font-black text-azul-bersa focus:ring-2 focus:ring-naranja-bersa/30 outline-none" placeholder="0" value={conteos[p.rowId] || ''} onChange={(e) => handleCantidadChange(p.rowId, e.target.value)} />
                                    </div>
                                    <div className="col-span-2 text-right pr-4 font-mono font-black text-azul-bersa text-lg">
                                        $ {totalFila.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Inventario;
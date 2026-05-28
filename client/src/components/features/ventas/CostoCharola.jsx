import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useVentas } from '../../../hooks/useVentas';
import { Search, FileSpreadsheet, TrendingUp, Coffee, Utensils, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const CostoCharola = () => {
    const { userProfile, authFetch } = useAuth();
    const { almacenes } = useVentas(userProfile);
    
    const [loading, setLoading] = useState(false);
    const [datos, setDatos] = useState([]);
    const [filtros, setFiltros] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        whsCode: 'TODOS'
    });

    const fetchRelacion = async () => {
        if (!authFetch) return; // Evita crash si authFetch no está listo
        setLoading(true);
        try {
            const params = new URLSearchParams(filtros).toString();
            const res = await authFetch.get(`/api/ventas/relacion-diaria?${params}`);
            setDatos(res.data || []);
        } catch (error) {
            toast.error("Error al cargar el análisis de costos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userProfile && authFetch) fetchRelacion();
    }, [filtros.whsCode, authFetch, userProfile]);

    // Memorizar la opción seleccionada para que el Select no se limpie solo
    const selectedOption = useMemo(() => {
        if (filtros.whsCode === 'TODOS') return { value: 'TODOS', label: 'TODOS LOS ALMACENES' };
        const found = (almacenes || []).find(a => a.whscode === filtros.whsCode);
        return found ? { value: found.whscode, label: found.whsdesc } : null;
    }, [filtros.whsCode, almacenes]);

    const handleExport = () => {
        if (datos.length === 0) return toast.info("No hay datos para exportar");
        const headers = ["Fecha", "Almacén", "Ventas ($)", "Consumos ($)", "Charolas Vendidas", "Precio Charola"];
        const csv = [
            headers.join(","),
            ...datos.map(d => [
                d.Fecha ? d.Fecha.split('T')[0] : 'S/F',
                d.Almacen,
                d.Ventas_Del_Dia,
                d.Consumos_Del_Dia,
                d.Charolas_Vendidas,
                `$${Number(d.Relacion_Consumo_Charola || 0).toFixed(2)}`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Costo_Charola_${filtros.startDate}_${filtros.endDate}.csv`;
        a.click();
    };

    return (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-naranja-bersa p-2 rounded-xl shadow-lg">
                        <TrendingUp size={35} />
                    </div>
                    <h2 className="text-2xl font-black uppercase italic text-white">Análisis <span className="text-naranja-bersa">Costo Charola</span></h2>
                </div>
                <button 
                    onClick={handleExport}
                    className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl flex items-center gap-2 font-bold text-xs transition-all active:scale-95"
                >
                    <FileSpreadsheet size={20} /> EXPORTAR CSV
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl mb-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-end text-gray-700 border border-white/10">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Almacén</label>
                    <Select 
                        options={[{value: 'TODOS', label: 'TODOS LOS ALMACENES'}, ...(almacenes || []).map(a => ({ value: a.whscode, label: a.whsdesc }))]}
                        styles={customSelectStyles}
                        value={selectedOption}
                        onChange={(opt) => setFiltros({...filtros, whsCode: opt.value})}
                        placeholder="Seleccionar..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Desde</label>
                    <input type="date" value={filtros.startDate} onChange={e => setFiltros({...filtros, startDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hasta</label>
                    <input type="date" value={filtros.endDate} onChange={e => setFiltros({...filtros, endDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-violet-200" />
                </div>
                <button 
                    onClick={fetchRelacion}
                    className="bg-[#001e36] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    <Search size={18} /> Consultar
                </button>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl text-gray-800 mb-20">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                    Relación Diaria: Venta vs Consumo Materia Prima
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Almacén</th>
                                <th className="px-8 py-5 text-right">Ventas del Día</th>
                                <th className="px-8 py-5 text-right">Consumos</th>
                                <th className="px-8 py-5 text-right">Charolas Vendidas</th>
                                <th className="px-8 py-5 text-center">Precio Charola</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-naranja-bersa" size={48} />
                                        <p className="mt-4 font-black text-gray-300 uppercase italic">Procesando Análisis...</p>
                                    </td>
                                </tr>
                            ) : datos.length > 0 ? (
                                datos.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-violet-50/30 transition-colors">
                                        <td className="px-8 py-5 font-bold text-gray-500">
                                            {row.Fecha ? row.Fecha.split('T')[0] : 'S/F'}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-[#001e36] text-sm uppercase">{row.Almacen}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-green-600">
                                            ${Number(row.Ventas_Del_Dia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-red-500">
                                            ${Number(row.Consumos_Del_Dia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-gray-600 uppercase">
                                            {row.Charolas_Vendidas || 0}
                                        </td>
                                        <td className="px-8 py-5 text-center font-mono font-bold text-[#001e36]">
                                            ${Number(row.Relacion_Consumo_Charola || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center text-gray-200 font-black text-4xl uppercase italic">
                                        Sin Datos Disponibles
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CostoCharola;

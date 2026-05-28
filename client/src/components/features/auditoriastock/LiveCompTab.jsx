import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const LiveCompTab = ({ logic }) => {
    const { authFetch, accessToken } = useAuth();
    const [almacenes, setAlmacenes] = useState([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState('TODOS');
    const [filtro, setFiltro] = useState('');
    const { comparativo, fetchComparativo, ejecutarCierreSemanal, loading } = logic;
    const fetchListaAlmacenes = async () => {
        try {
            const res = await authFetch.get('/api/admin/almacenes'); 
            setAlmacenes(Array.isArray(res.data) ? res.data : []);
        } catch (err) { 
            console.error("Error cargando almacenes:", err); 
        }
    };
    useEffect(() => {
        fetchListaAlmacenes();
    }, [accessToken]);
    useEffect(() => {
        fetchComparativo(almacenSeleccionado);
    }, [almacenSeleccionado, fetchComparativo]);

    const almacenOptions = useMemo(() => [
        { value: 'TODOS', label: '🌍 TODAS LAS UNIDADES' },
        ...almacenes.map(al => ({ value: al.whscode, label: al.whsdesc }))
    ], [almacenes]);

    const datosFiltrados = (comparativo || []).filter(row => 
        row.itemcode?.toLowerCase().includes(filtro.toLowerCase()) ||
        row.descripcion?.toLowerCase().includes(filtro.toLowerCase())
    );
    return (
        <div className="p-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-10">
                <div className="flex flex-col gap-4">
                    <h3 className="text-azul-bersa font-black uppercase text-xl tracking-tight flex items-center gap-2">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        Comparativo en Vivo (Live)
                    </h3>
                    <div className="flex flex-wrap items-end gap-3 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="w-64">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Unidad / Almacén</label>
                            <Select 
                                options={almacenOptions}
                                styles={customSelectStyles}
                                value={almacenOptions.find(opt => opt.value === almacenSeleccionado)}
                                onChange={(opt) => setAlmacenSeleccionado(opt.value)}
                                placeholder="Seleccionar..."
                            />
                        </div>
                        <div className="w-64 relative">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Buscador</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
                                <input 
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-azul-bersa/20 transition-all"
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => fetchComparativo(almacenSeleccionado)}
                            disabled={loading}
                            className="bg-gray-50 border border-gray-200 text-azul-bersa p-2 rounded-xl hover:bg-azul-bersa hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Actualizar tabla"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
<button
    onClick={() => ejecutarCierreSemanal(almacenSeleccionado)} 
    className="bg-red-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black hover:bg-red-700 shadow-xl uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
>
    <CheckCircle2 className="w-4 h-4" />
    Realizar Cierre Semanal
</button>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                    Comparativo Live: Stock Teórico vs Reporte Físico
                </div>
                <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                    <thead>
                        <tr className="text-azul-bersa/50 text-[10px] uppercase font-black tracking-widest px-4">
                            <th className="px-6 py-4">Unidad</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4 text-center">Teórico</th>
                            <th className="px-6 py-4 text-center">Físico</th>
                            <th className="px-6 py-4 text-center">Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && datosFiltrados.map((row, i) => (
                            <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 rounded-l-2xl font-black text-azul-bersa text-xs border-y border-l border-gray-50">
                                    {row.codigo_almacen}
                                </td>
                                <td className="px-6 py-4 border-y border-gray-50">
                                    <div className="font-bold text-gray-800 text-sm tracking-tight">{row.itemcode}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-medium">{row.descripcion}</div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-gray-400 border-y border-gray-50">
                                    {row.stock_teorico}
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-black text-azul-bersa border-y border-gray-50">
                                    {row.reporte_fisico}
                                </td>
                                <td className={`px-6 py-4 text-center font-mono font-black rounded-r-2xl border-y border-r border-gray-50 ${
                                    row.diferencia < 0 ? 'text-red-500 bg-red-50' : 
                                    row.diferencia > 0 ? 'text-naranja-bersa bg-violet-50' : 'text-green-500 bg-green-50'
                                }`}>
                                    {row.diferencia > 0 ? `+${row.diferencia}` : row.diferencia}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && (
                    <div className="p-24 text-center flex flex-col items-center gap-4">
                        <div className="h-8 w-8 border-4 border-azul-bersa/20 border-t-azul-bersa rounded-full animate-spin"></div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Analizando Ambiente de Pruebas...</p>
                    </div>
                )}
                {!loading && datosFiltrados.length === 0 && (
                    <div className="p-24 text-center text-gray-300 text-xs font-bold uppercase italic flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        No se encontraron registros para mostrar.
                    </div>
                )}
            </div>
        </div>
    );
};
export default LiveCompTab;
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

export default function CompInvTab() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { accessToken } = useAuth();

    const fetchData = async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/inventory-comparison', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch (err) { 
            console.error(err);
            setData([]);
        } finally { setLoading(false); }
    };

    const handleClosing = async () => {
        if (!window.confirm("¿Confirmas que deseas cerrar la semana? Esto congelará los datos actuales en el historial.")) return;
        setIsClosing(true);
        try {
            const res = await fetch('/api/admin/inventory-closing', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                alert("✅ Cierre exitoso. Datos guardados en Historial_Inventarios.");
                fetchData();
            } else {
                const err = await res.json();
                alert("❌ Error: " + err.error);
            }
        } catch (err) { alert("Error de conexión"); }
        finally { setIsClosing(false); }
    };

    const filteredData = data.filter(row => 
        row.codigo_almacen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.itemcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isOldReport = (dateString) => {
        if (!dateString) return false;
        const reportDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - reportDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    };

    useEffect(() => { fetchData(); }, [accessToken]);

    return (
        <div className="p-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* ENCABEZADO */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h3 className="text-azul-bersa font-black uppercase text-xl tracking-tight mb-3">
                        Comparativo de Inventarios
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
                            placeholder="Filtrar por almacén o código de producto..."
                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-azul-bersa outline-none w-full lg:w-96 transition-all shadow-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleClosing}
                    disabled={isClosing || loading}
                    className="bg-red-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black hover:bg-red-700 transition-all shadow-xl disabled:opacity-50 uppercase tracking-[0.2em] active:scale-95"
                >
                    {isClosing ? 'PROCESANDO CIERRE...' : 'REALIZAR CIERRE SEMANAL'}
                </button>
            </div>

            {/* TABLA COMPARATIVA */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                    <thead>
                        <tr className="text-azul-bersa/50 text-[10px] uppercase font-black tracking-widest">
                            <th className="px-6 py-4">Almacén</th>
                            <th className="px-6 py-4">Producto / ID</th>
                            <th className="px-6 py-4 text-center">Stock Teórico</th>
                            <th className="px-6 py-4 text-center">Reporte Físico</th>
                            <th className="px-6 py-4 text-center">Diferencia</th>
                            <th className="px-6 py-4 text-center">Último Reporte</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, i) => {
                            const dateRed = isOldReport(row.fecha_conteo);
                            
                            return (
                                <tr key={i} className="group hover:bg-gray-50/80 transition-colors">
                                    <td className="px-6 py-4 rounded-l-2xl font-black text-azul-bersa text-xs border-y border-l border-gray-50">
                                        {row.codigo_almacen}
                                    </td>
                                    
                                    <td className="px-6 py-4 border-y border-gray-50">
                                        <div className="font-black text-gray-800 text-sm tracking-tighter">{row.itemcode}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold truncate max-w-[200px]">{row.descripcion}</div>
                                    </td>

                                    <td className="px-6 py-4 text-center font-mono font-bold text-gray-400 border-y border-gray-50 bg-gray-50/30">
                                        {row.stock_teorico}
                                    </td>

                                    <td className="px-6 py-4 text-center font-mono font-black text-azul-bersa border-y border-gray-50">
                                        {row.stock_fisico}
                                    </td>

                                    <td className={`px-6 py-4 text-center font-mono font-black border-y border-gray-50 ${
                                        row.diferencia < 0 ? 'text-red-500 bg-red-50' : 
                                        row.diferencia > 0 ? 'text-naranja-bersa bg-violet-50' : 'text-green-500 bg-green-50'
                                    }`}>
                                        {row.diferencia > 0 ? `+${row.diferencia}` : row.diferencia}
                                    </td>

                                    <td className={`px-6 py-4 text-center rounded-r-2xl border-y border-r border-gray-50 ${
                                        dateRed ? 'bg-red-100/50' : ''
                                    }`}>
                                        {row.fecha_conteo ? (
                                            <div className={`flex flex-col items-center ${dateRed ? 'animate-pulse' : ''}`}>
                                                <span className={`text-[10px] font-black ${dateRed ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {new Date(row.fecha_conteo).toLocaleDateString('es-MX')}
                                                </span>
                                                <span className={`text-[8px] font-bold uppercase ${dateRed ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {new Date(row.fecha_conteo).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-gray-300 font-black uppercase italic">Sin Captura</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* LOADING / EMPTY STATES */}
                {loading && (
                    <div className="p-24 text-center animate-pulse">
                        <div className="h-8 w-8 border-4 border-azul-bersa/20 border-t-azul-bersa rounded-full mx-auto mb-4 animate-spin"></div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Calculando Diferencias SQL...</p>
                    </div>
                )}

                {!loading && filteredData.length === 0 && (
                    <div className="p-24 text-center">
                        <p className="text-gray-400 text-xs font-black uppercase italic tracking-widest">
                            No hay datos para mostrar en este filtro.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
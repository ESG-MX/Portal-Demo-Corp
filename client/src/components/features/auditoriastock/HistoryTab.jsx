import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Search, Archive, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../../../utils/selectStyles';

const HistoryTab = ({ logic }) => {
    const { authFetch } = useAuth();
    const { 
        historial, totalHistorial, fetchHistorial, loading,
        availableDates, fetchAvailableDates 
    } = logic;
    const [almacenes, setAlmacenes] = useState([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState('TODOS');
    const [filtro, setFiltro] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    const [searchDate, setSearchDate] = useState('');

    const almacenOptions = useMemo(() => [
        { value: 'TODOS', label: '🌍 TODAS LAS UNIDADES' },
        ...almacenes.map(al => ({ value: al.whscode, label: al.whsdesc || al.whsname }))
    ], [almacenes]);

    const dateOptions = useMemo(() => [
        { value: '', label: '📅 TODOS LOS CIERRES' },
        ...(availableDates || []).map(item => ({
            value: item.fecha_cierre,
            label: new Date(item.fecha_cierre + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: '2-digit' })
        }))
    ], [availableDates]);

    useEffect(() => {
        if (!authFetch?.get) return;
        const getAlmacenes = async () => {
            try {
                const res = await authFetch.get('/api/admin/almacenes');
                setAlmacenes(Array.isArray(res.data) ? res.data : []);
            } catch (e) { console.error("Error cargando almacenes", e); }
        };
        getAlmacenes();
    }, [authFetch]);
    useEffect(() => {
        if (fetchAvailableDates) {
            fetchAvailableDates(almacenSeleccionado);
        }
    }, [fetchAvailableDates, almacenSeleccionado]);
    useEffect(() => {
        fetchHistorial({
            whCode: almacenSeleccionado,
            searchDate,
            page: currentPage,
            limit: itemsPerPage
        });
    }, [almacenSeleccionado, searchDate, currentPage, itemsPerPage, fetchHistorial]);

    const datosFiltradosLocalmente = useMemo(() => 
        (historial || []).filter(row => 
            JSON.stringify(row).toLowerCase().includes(filtro.toLowerCase())
        ), [historial, filtro]);

    const descargarCSV = async () => {
        if (totalHistorial === 0 || !authFetch?.get) return;
        setDownloading(true);
        try {
            const params = new URLSearchParams({ whCode: almacenSeleccionado, searchDate, page: 1, limit: 1000000 });
            const res = await authFetch.get(`/api/auditoria/historial?${params.toString()}`);
            let allData = res.data.data || [];
            const headers = Object.keys(allData[0] || {});
            if (headers.length === 0) return alert("No hay columnas para exportar");
            const csvRows = [
                headers.map(h => `"${h}"`).join(','), 
                ...allData.map(row => headers.map(f => `"${String(row[f] || '').replace(/"/g, '""')}"`).join(','))
            ];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Historial_${almacenSeleccionado}.csv`;
            link.click();
        } catch (error) { alert("Error al descargar"); } finally { setDownloading(false); }
    };
    const totalPages = Math.ceil(totalHistorial / itemsPerPage);
    return (
        <div className="p-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="flex flex-col gap-4">
                    <h3 className="text-azul-bersa font-black uppercase text-xl flex items-center gap-2">
                        <Archive className="w-5 h-5" /> Historial de Cierres
                    </h3>
                    <div className="flex flex-wrap items-end gap-3 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="w-64">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Unidad</label>
                            <Select 
                                options={almacenOptions}
                                styles={customSelectStyles}
                                value={almacenOptions.find(opt => opt.value === almacenSeleccionado)}
                                onChange={(opt) => {
                                    setAlmacenSeleccionado(opt.value);
                                    setCurrentPage(1); 
                                    setSearchDate(''); 
                                }}
                            />
                        </div>
                        <div className="w-64">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Fecha de Cierre</label>
                            <Select 
                                options={dateOptions}
                                styles={customSelectStyles}
                                value={dateOptions.find(opt => opt.value === searchDate)}
                                onChange={(opt) => { setSearchDate(opt.value); setCurrentPage(1); }}
                            />
                        </div>
                        <div className="w-64 relative">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Buscador Local</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
                                <input 
                                    type="text"
                                    placeholder="Producto, código..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-azul-bersa outline-none focus:ring-2 focus:ring-azul-bersa/20 transition-all"
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={descargarCSV} disabled={loading || downloading || totalHistorial === 0}
                    className="bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 disabled:opacity-50">
                    {downloading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Descargar CSV
                </button>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                <div className="bg-naranja-bersa text-white p-4 font-black text-[11px] tracking-widest px-10 italic uppercase">
                    Historial de Cierres de Inventario
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2 px-4">
                        <thead>
                            <tr className="text-azul-bersa/50 text-[10px] uppercase font-black">
                                <th className="px-4 py-4">Fecha Cierre</th>
                                <th className="px-4 py-4">Almacén</th>
                                <th className="px-4 py-4">ItemCode</th>
                                <th className="px-4 py-4">Descripción</th>
                                <th className="px-4 py-4 text-center">Teórico</th>
                                <th className="px-4 py-4 text-center">Físico</th>
                                <th className="px-4 py-4 text-center">Dif.</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold text-gray-600">
                            {!loading && datosFiltradosLocalmente.map((row, i) => (
                                <tr key={row.ID || row.id || i} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-3 border-y border-l rounded-l-xl border-gray-50 font-medium">
                                        {new Date(row.fecha_cierre).toLocaleDateString('es-MX', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-4 py-3 border-y border-gray-50 text-azul-bersa">{row.codigo_almacen}</td>
                                    <td className="px-4 py-3 border-y border-gray-50">{row.codigo_articulo}</td>
                                    <td className="px-4 py-3 border-y border-gray-50 text-[11px] uppercase font-black text-gray-700">
                                        {(() => {
                                            const name = [row.producto, row.descripcion, row.ItemName].find(n => n && typeof n === 'string' && !n.toLowerCase().includes('vinculado'));
                                            return name ? name : (
                                                <span className="text-naranja-bersa italic font-bold text-[9px]">⚠️ {row.codigo_articulo || 'S/C'} (SIN MAESTRO)</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 border-y border-gray-50 text-center">{row.stock_teorico_momento}</td>
                                    <td className="px-4 py-3 border-y border-gray-50 text-center">{row.stock_fisico_reportado}</td>
                                    <td className={`px-4 py-3 border-y border-r rounded-r-xl border-gray-50 text-center ${row.diferencia !== 0 ? 'text-red-500' : 'text-green-500'}`}>{row.diferencia}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {loading && <div className="p-20 text-center font-black text-gray-400">CARGANDO...</div>}
            </div>
            {totalPages > 1 && (
    <div className="flex justify-between items-center mt-6 text-xs font-bold text-gray-500">
        <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 disabled:opacity-50"
        >
            Anterior
        </button>
        <span>Página {currentPage} de {totalPages}</span>
        <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages} 
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 disabled:opacity-50"
        >
            Siguiente
        </button>
    </div>
)}
        </div>
    );
};
export default HistoryTab;